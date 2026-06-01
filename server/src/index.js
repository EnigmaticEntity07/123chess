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
const io = new Server(httpServer, {
  cors: { origin: '*' }
});
const prisma = new PrismaClient({});

app.use(cors());
app.use(express.json());

const JWT_SECRET = process.env.JWT_SECRET || 'supersecretkey';

// -- Auth Endpoints --
app.post('/api/auth/register', async (req, res) => {
  const { username, password } = req.body;
  try {
    const existing = await prisma.user.findUnique({ where: { username } });
    if (existing) return res.status(400).json({ error: 'Username taken' });

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: { username, passwordHash }
    });

    const token = jwt.sign({ userId: user.id, username: user.username }, JWT_SECRET);
    res.json({ token, user: { id: user.id, username: user.username, wins: user.wins, losses: user.losses } });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  const { username, password } = req.body;
  try {
    const user = await prisma.user.findUnique({ where: { username } });
    if (!user) return res.status(400).json({ error: 'Invalid credentials' });

    const isValid = await bcrypt.compare(password, user.passwordHash);
    if (!isValid) return res.status(400).json({ error: 'Invalid credentials' });

    const token = jwt.sign({ userId: user.id, username: user.username }, JWT_SECRET);
    res.json({ token, user: { id: user.id, username: user.username, wins: user.wins, losses: user.losses } });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

app.get('/api/users/me', async (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No token' });
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const user = await prisma.user.findUnique({ where: { id: decoded.userId } });
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json({ user: { id: user.id, username: user.username, wins: user.wins, losses: user.losses } });
  } catch (err) {
    res.status(401).json({ error: 'Invalid token' });
  }
});

// -- Game Rooms --
// room map: roomId -> { id, players: { w: userId, b: userId }, game: ProgressiveGame, host: userId, sockets: { w: socketId, b: socketId } }
const rooms = new Map();

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  socket.on('join_lobby', () => {
    socket.join('lobby');
    const availableRooms = Array.from(rooms.values()).filter(r => !r.players.w || !r.players.b).map(r => ({
      id: r.id,
      hostName: r.hostName
    }));
    socket.emit('lobby_rooms', availableRooms);
  });

  socket.on('create_room', (data) => {
    const { userId, username } = data;
    const roomId = Math.random().toString(36).substring(2, 8);
    
    const engine = new ChessEngine();
    const game = new ProgressiveGame(engine);
    
    rooms.set(roomId, {
      id: roomId,
      host: userId,
      hostName: username,
      players: { w: userId, b: null },
      sockets: { w: socket.id, b: null },
      game: game
    });

    socket.join(roomId);
    socket.emit('room_created', { roomId, color: 'w' });
    io.to('lobby').emit('lobby_rooms', Array.from(rooms.values()).filter(r => !r.players.w || !r.players.b).map(r => ({ id: r.id, hostName: r.hostName })));
  });

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
    room.sockets[color] = socket.id;

    socket.join(roomId);
    socket.emit('room_joined', { roomId, color });
    io.to(roomId).emit('game_started', {
      players: room.players,
      turnInfo: room.game.getTurnInfo(),
      board: room.game.engine.toJSON()
    });

    // Update lobby
    io.to('lobby').emit('lobby_rooms', Array.from(rooms.values()).filter(r => !r.players.w || !r.players.b).map(r => ({ id: r.id, hostName: r.hostName })));
  });

  socket.on('make_move', async (data) => {
    const { roomId, from, to, promotion } = data;
    const room = rooms.get(roomId);
    if (!room) return;

    // Optional: Add logic to ensure the correct user is making the move
    const game = room.game;
    const record = game.makeMove(from, to, promotion);

    if (record) {
      io.to(roomId).emit('move_made', {
        move: record,
        turnInfo: game.getTurnInfo(),
        board: game.engine.toJSON()
      });

      if (game.gameOver) {
        // Update DB
        if (game.gameResult.result === 'checkmate') {
          const winnerColor = game.gameResult.winner;
          const loserColor = winnerColor === 'w' ? 'b' : 'w';
          const winnerId = room.players[winnerColor];
          const loserId = room.players[loserColor];

          if (winnerId) await prisma.user.update({ where: { id: winnerId }, data: { wins: { increment: 1 } } });
          if (loserId) await prisma.user.update({ where: { id: loserId }, data: { losses: { increment: 1 } } });
        }
        rooms.delete(roomId);
      }
    } else {
      socket.emit('error', 'Invalid move');
    }
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
    // basic cleanup
  });
});

const PORT = process.env.PORT || 3001;
httpServer.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
