import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';

import { ChessEngine } from './game/chess-engine.js';
import { ProgressiveGame } from './game/progressive.js';

dotenv.config();

const app = express();
const httpServer = createServer(app);

// -- CORS Configuration --
const DEFAULT_ORIGINS = [
  'http://localhost:5173',
  'http://localhost:3000',
  'https://progressive-chess.vercel.app',
  'https://123chess.vercel.app',
];

const ALLOWED_ORIGINS = process.env.ALLOWED_ORIGINS
  ? [...new Set([
      ...process.env.ALLOWED_ORIGINS.split(',').map(s => s.trim()),
      ...DEFAULT_ORIGINS,
    ])]
  : DEFAULT_ORIGINS;

const io = new Server(httpServer, {
  cors: {
    origin: ALLOWED_ORIGINS,
    methods: ['GET', 'POST'],
    credentials: true
  }
});

let prisma;
try {
  prisma = new PrismaClient({});
} catch (err) {
  console.error('Failed to initialize Prisma:', err.message);
  prisma = null;
}

app.use(cors({
  origin: ALLOWED_ORIGINS,
  credentials: true
}));
app.use(express.json());

// -- Health Check --
app.get('/', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

const JWT_SECRET = process.env.JWT_SECRET || 'supersecretkey';

// -- Auth Endpoints --
app.post('/api/auth/register', async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required' });
  }
  if (username.length < 3) {
    return res.status(400).json({ error: 'Username must be at least 3 characters' });
  }
  if (password.length < 4) {
    return res.status(400).json({ error: 'Password must be at least 4 characters' });
  }

  try {
    if (!prisma) {
      return res.status(500).json({ error: 'Database not available. Please check server configuration.' });
    }

    const existing = await prisma.user.findUnique({ where: { username } });
    if (existing) return res.status(400).json({ error: 'Username taken' });

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: { username, passwordHash }
    });

    const token = jwt.sign({ userId: user.id, username: user.username }, JWT_SECRET);
    res.json({ token, user: { id: user.id, username: user.username, wins: user.wins, losses: user.losses } });
  } catch (err) {
    console.error('Register error:', err.message);
    if (err.code === 'P2002') {
      return res.status(400).json({ error: 'Username already taken' });
    }
    res.status(500).json({ error: 'Database connection failed. Make sure the server is configured correctly.' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required' });
  }

  try {
    if (!prisma) {
      return res.status(500).json({ error: 'Database not available. Please check server configuration.' });
    }

    const user = await prisma.user.findUnique({ where: { username } });
    if (!user) return res.status(400).json({ error: 'Invalid credentials' });

    const isValid = await bcrypt.compare(password, user.passwordHash);
    if (!isValid) return res.status(400).json({ error: 'Invalid credentials' });

    const token = jwt.sign({ userId: user.id, username: user.username }, JWT_SECRET);
    res.json({ token, user: { id: user.id, username: user.username, wins: user.wins, losses: user.losses } });
  } catch (err) {
    console.error('Login error:', err.message);
    res.status(500).json({ error: 'Database connection failed. Make sure the server is configured correctly.' });
  }
});

app.post('/api/auth/guest', (req, res) => {
  try {
    const guestId = 'guest_' + Math.random().toString(36).substring(2, 10);
    const guestUsername = 'Guest_' + Math.floor(1000 + Math.random() * 9000);

    const token = jwt.sign({ userId: guestId, username: guestUsername }, JWT_SECRET);
    res.json({ token, user: { id: guestId, username: guestUsername, wins: 0, losses: 0 } });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

app.get('/api/users/me', async (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No token' });
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    if (typeof decoded.userId === 'string' && decoded.userId.startsWith('guest_')) {
      return res.json({ user: { id: decoded.userId, username: decoded.username, wins: 0, losses: 0 } });
    }
    if (!prisma) {
      return res.status(500).json({ error: 'Database not available' });
    }
    const user = await prisma.user.findUnique({ where: { id: decoded.userId } });
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json({ user: { id: user.id, username: user.username, wins: user.wins, losses: user.losses } });
  } catch (err) {
    res.status(401).json({ error: 'Invalid token' });
  }
});

// =====================================================================
// GAME ROOMS
// =====================================================================
// room map: roomId -> {
//   id, players, game, host, sockets, hostName,
//   timeControl: { baseMs, incrementMs },
//   clocks: { w: ms, b: ms },
//   lastMoveTimestamp: number|null,
//   clockInterval: NodeJS.Timeout|null,
//   drawOffer: null | 'w' | 'b',
//   playerNames: { w: string, b: string }
// }
const rooms = new Map();

// Helper: find which color a socket is in a room
function getColorBySocket(room, socketId) {
  if (room.sockets.w === socketId) return 'w';
  if (room.sockets.b === socketId) return 'b';
  return null;
}

// Helper: clear clock interval for a room
function clearRoomClock(room) {
  if (room.clockInterval) {
    clearInterval(room.clockInterval);
    room.clockInterval = null;
  }
}

// Helper: start clock ticking for a room
function startRoomClock(room) {
  clearRoomClock(room);

  // No time control means untimed
  if (!room.timeControl || room.timeControl.baseMs <= 0) return;

  room.lastMoveTimestamp = Date.now();

  room.clockInterval = setInterval(() => {
    if (!room.lastMoveTimestamp) return;

    const now = Date.now();
    const elapsed = now - room.lastMoveTimestamp;
    const activeColor = room.game.currentPlayer;
    room.clocks[activeColor] = Math.max(0, room.clocks[activeColor] - elapsed);
    room.lastMoveTimestamp = now;

    // Broadcast clock update
    io.to(room.id).emit('clock_update', {
      clocks: { ...room.clocks },
      activeColor
    });

    // Check for timeout
    if (room.clocks[activeColor] <= 0) {
      clearRoomClock(room);
      const winner = activeColor === 'w' ? 'b' : 'w';

      room.game.gameOver = true;
      room.game.gameResult = {
        result: 'timeout',
        winner,
        message: `${winner === 'w' ? 'White' : 'Black'} wins on time!`
      };

      io.to(room.id).emit('game_over', {
        result: 'timeout',
        winner,
        message: `${winner === 'w' ? 'White' : 'Black'} wins on time!`,
        clocks: { ...room.clocks }
      });

      // Update DB
      updateDbForResult(room, winner);
      rooms.delete(room.id);
    }
  }, 100);
}

// Helper: update DB wins/losses
async function updateDbForResult(room, winnerColor) {
  if (!prisma) return;
  try {
    if (winnerColor) {
      const loserColor = winnerColor === 'w' ? 'b' : 'w';
      const winnerId = room.players[winnerColor];
      const loserId = room.players[loserColor];

      if (winnerId && typeof winnerId === 'number') {
        await prisma.user.update({ where: { id: winnerId }, data: { wins: { increment: 1 } } });
      }
      if (loserId && typeof loserId === 'number') {
        await prisma.user.update({ where: { id: loserId }, data: { losses: { increment: 1 } } });
      }
    }
  } catch (err) {
    console.error('DB update error:', err.message);
  }
}

// Helper: build lobby room list
function getLobbyRooms() {
  return Array.from(rooms.values())
    .filter(r => !r.players.w || !r.players.b)
    .map(r => ({
      id: r.id,
      hostName: r.hostName,
      timeControl: r.timeControl
    }));
}

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  // ── LOBBY ──
  socket.on('join_lobby', () => {
    socket.join('lobby');
    socket.emit('lobby_rooms', getLobbyRooms());
  });

  // ── CREATE ROOM ──
  socket.on('create_room', (data) => {
    const { userId, username, timeControl } = data;
    const roomId = Math.random().toString(36).substring(2, 8);

    const engine = new ChessEngine();
    const game = new ProgressiveGame(engine);

    // Parse time control: { baseMinutes, incrementSeconds }
    const baseMs = timeControl ? timeControl.baseMinutes * 60 * 1000 : 0;
    const incrementMs = timeControl ? timeControl.incrementSeconds * 1000 : 0;

    rooms.set(roomId, {
      id: roomId,
      host: userId,
      hostName: username,
      players: { w: userId, b: null },
      playerNames: { w: username, b: null },
      sockets: { w: socket.id, b: null },
      game: game,
      timeControl: baseMs > 0 ? { baseMs, incrementMs } : null,
      clocks: { w: baseMs, b: baseMs },
      lastMoveTimestamp: null,
      clockInterval: null,
      drawOffer: null
    });

    socket.join(roomId);
    socket.emit('room_created', { roomId, color: 'w' });
    io.to('lobby').emit('lobby_rooms', getLobbyRooms());
  });

  // ── JOIN ROOM ──
  socket.on('join_room', (data) => {
    const { roomId, userId, username } = data;
    const room = rooms.get(roomId);
    if (!room) {
      socket.emit('error', 'Room not found');
      return;
    }
    if (room.players.w && room.players.b) {
      socket.emit('error', 'Room full');
      return;
    }

    const color = room.players.w ? 'b' : 'w';
    room.players[color] = userId;
    room.playerNames[color] = username;
    room.sockets[color] = socket.id;

    socket.join(roomId);
    socket.emit('room_joined', { roomId, color });

    // Build game started payload
    const payload = {
      players: room.players,
      playerNames: room.playerNames,
      turnInfo: room.game.getTurnInfo(),
      board: room.game.engine.toJSON(),
      timeControl: room.timeControl,
      clocks: { ...room.clocks }
    };

    io.to(roomId).emit('game_started', payload);

    // Start clock if timed
    if (room.timeControl) {
      startRoomClock(room);
    }

    // Update lobby
    io.to('lobby').emit('lobby_rooms', getLobbyRooms());
  });

  // ── RECONNECT TO GAME ──
  socket.on('connect_to_game', (data) => {
    const { roomId, userId } = data;
    const room = rooms.get(roomId);
    if (!room) return;

    socket.join(roomId);
    if (room.players.w === userId) room.sockets.w = socket.id;
    else if (room.players.b === userId) room.sockets.b = socket.id;

    if (room.players.w && room.players.b) {
      const payload = {
        players: room.players,
        playerNames: room.playerNames,
        turnInfo: room.game.getTurnInfo(),
        board: room.game.engine.toJSON(),
        timeControl: room.timeControl,
        clocks: { ...room.clocks }
      };
      io.to(roomId).emit('game_started', payload);
    }
  });

  // ── MAKE MOVE ──
  socket.on('make_move', async (data) => {
    const { roomId, from, to, promotion } = data;
    const room = rooms.get(roomId);
    if (!room) return;
    if (room.game.gameOver) return;

    // Verify it's the correct player's turn
    const color = getColorBySocket(room, socket.id);
    if (!color || color !== room.game.currentPlayer) {
      socket.emit('error', 'Not your turn');
      return;
    }

    const game = room.game;

    // Handle clock: deduct time from the moving player, add increment
    if (room.timeControl && room.lastMoveTimestamp) {
      const now = Date.now();
      const elapsed = now - room.lastMoveTimestamp;
      room.clocks[color] = Math.max(0, room.clocks[color] - elapsed);

      // Check if time ran out during this move
      if (room.clocks[color] <= 0) {
        clearRoomClock(room);
        const winner = color === 'w' ? 'b' : 'w';
        game.gameOver = true;
        game.gameResult = {
          result: 'timeout',
          winner,
          message: `${winner === 'w' ? 'White' : 'Black'} wins on time!`
        };
        io.to(roomId).emit('game_over', {
          result: 'timeout',
          winner,
          message: `${winner === 'w' ? 'White' : 'Black'} wins on time!`,
          clocks: { ...room.clocks }
        });
        await updateDbForResult(room, winner);
        rooms.delete(roomId);
        return;
      }

      // Add increment
      room.clocks[color] += room.timeControl.incrementMs;
      room.lastMoveTimestamp = now;
    }

    const record = game.makeMove(from, to, promotion);

    if (record) {
      // Clear draw offer on any move
      room.drawOffer = null;

      io.to(roomId).emit('move_made', {
        move: record,
        turnInfo: game.getTurnInfo(),
        board: game.engine.toJSON(),
        clocks: { ...room.clocks }
      });

      if (game.gameOver) {
        clearRoomClock(room);

        io.to(roomId).emit('game_over', {
          result: game.gameResult.result,
          winner: game.gameResult.winner,
          message: game.gameResult.message,
          clocks: { ...room.clocks }
        });

        if (game.gameResult.result === 'checkmate') {
          await updateDbForResult(room, game.gameResult.winner);
        }
        rooms.delete(roomId);
      }
    } else {
      socket.emit('error', 'Invalid move');
    }
  });

  // ── RESIGN ──
  socket.on('resign', (data) => {
    const { roomId } = data;
    const room = rooms.get(roomId);
    if (!room) return;
    if (room.game.gameOver) return;

    const resignColor = getColorBySocket(room, socket.id);
    if (!resignColor) return;

    const winner = resignColor === 'w' ? 'b' : 'w';

    clearRoomClock(room);

    room.game.gameOver = true;
    room.game.gameResult = {
      result: 'resignation',
      winner,
      message: `${winner === 'w' ? 'White' : 'Black'} wins by resignation!`
    };

    io.to(roomId).emit('game_over', {
      result: 'resignation',
      winner,
      message: `${winner === 'w' ? 'White' : 'Black'} wins by resignation!`,
      clocks: room.clocks ? { ...room.clocks } : null
    });

    updateDbForResult(room, winner);
    rooms.delete(roomId);
  });

  // ── OFFER DRAW ──
  socket.on('offer_draw', (data) => {
    const { roomId } = data;
    const room = rooms.get(roomId);
    if (!room) return;
    if (room.game.gameOver) return;

    const offerColor = getColorBySocket(room, socket.id);
    if (!offerColor) return;

    // Can't offer if there's already a pending offer
    if (room.drawOffer) {
      socket.emit('error', 'Draw already offered');
      return;
    }

    room.drawOffer = offerColor;

    // Send to opponent
    const opponentColor = offerColor === 'w' ? 'b' : 'w';
    const opponentSocketId = room.sockets[opponentColor];
    if (opponentSocketId) {
      io.to(opponentSocketId).emit('draw_offered', { from: offerColor });
    }
  });

  // ── RESPOND TO DRAW ──
  socket.on('respond_draw', (data) => {
    const { roomId, accepted } = data;
    const room = rooms.get(roomId);
    if (!room) return;
    if (room.game.gameOver) return;
    if (!room.drawOffer) return;

    const responderColor = getColorBySocket(room, socket.id);
    if (!responderColor) return;

    // Only the opponent of the offerer can respond
    if (responderColor === room.drawOffer) return;

    if (accepted) {
      clearRoomClock(room);

      room.game.gameOver = true;
      room.game.gameResult = {
        result: 'draw_agreement',
        winner: null,
        message: 'Game drawn by mutual agreement.'
      };

      io.to(roomId).emit('game_over', {
        result: 'draw_agreement',
        winner: null,
        message: 'Game drawn by mutual agreement.',
        clocks: room.clocks ? { ...room.clocks } : null
      });

      rooms.delete(roomId);
    } else {
      // Declined — notify the offerer
      const offererSocketId = room.sockets[room.drawOffer];
      if (offererSocketId) {
        io.to(offererSocketId).emit('draw_declined');
      }
      room.drawOffer = null;
    }
  });

  // ── DISCONNECT ──
  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
    // Basic cleanup — could add abandon logic here
  });
});

const PORT = process.env.PORT || 3001;
httpServer.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
});
