import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { io } from 'socket.io-client';
import Board from '../components/Board';
import ChessClock from '../components/ChessClock';
import Navbar from '../components/Navbar';
import { ChessEngine } from '../game/chess-engine';
import { useAuth } from '../context/AuthContext';
import { ProgressiveGame } from '../game/progressive';
import { API_URL } from '../config';
import { playMoveSound, playCaptureSound, playCheckSound, playGameEndSound } from '../game/sounds';

export default function Game() {
  const { roomId } = useParams();
  const [searchParams] = useSearchParams();
  const myColor = searchParams.get('color'); // 'w' or 'b'
  const navigate = useNavigate();
  const { user } = useAuth();

  const [socket, setSocket] = useState(null);
  const [game, setGame] = useState(null);
  
  const [boardData, setBoardData] = useState(null);
  const [turnInfo, setTurnInfo] = useState(null);
  
  const [selectedSquare, setSelectedSquare] = useState(null);
  const [validMoves, setValidMoves] = useState([]);
  const [lastMove, setLastMove] = useState(null);

  // Clock state
  const [clocks, setClocks] = useState({ w: 0, b: 0 });
  const [timeControl, setTimeControl] = useState(null);
  const [playerNames, setPlayerNames] = useState({ w: 'White', b: 'Black' });

  // Resign / Draw state
  const [drawOfferSent, setDrawOfferSent] = useState(false);
  const [drawOfferReceived, setDrawOfferReceived] = useState(false);
  const [gameOverInfo, setGameOverInfo] = useState(null);

  // Optimistic UI: store pre-move board for rollback
  const prevBoardRef = useRef(null);

  useEffect(() => {
    const s = io(API_URL);
    setSocket(s);

    s.on('connect', () => {
      if (user && user.id) {
        s.emit('connect_to_game', { roomId, userId: user.id });
      }
    });

    s.on('game_started', (data) => {
      const { turnInfo, board, timeControl: tc, clocks: serverClocks, playerNames: names } = data;
      setTurnInfo(turnInfo);
      setBoardData(board);
      if (tc) setTimeControl(tc);
      if (serverClocks) setClocks(serverClocks);
      if (names) setPlayerNames(names);
      
      const engine = new ChessEngine();
      engine.fromJSON(board);
      const progGame = new ProgressiveGame(engine);
      progGame.currentPlayer = turnInfo.player;
      progGame.sequenceNumber = turnInfo.sequenceNumber;
      progGame.movesAllowed = turnInfo.movesAllowed;
      progGame.movesMade = turnInfo.movesMade;
      setGame(progGame);
    });

    s.on('move_made', (data) => {
      const { move, turnInfo, board, clocks: serverClocks } = data;
      setTurnInfo(turnInfo);
      setBoardData(board);
      setLastMove(move);
      if (serverClocks) setClocks(serverClocks);

      setGame(prev => {
        if (!prev) return prev;
        const newEngine = new ChessEngine();
        newEngine.fromJSON(board);
        const newGame = new ProgressiveGame(newEngine);
        newGame.currentPlayer = turnInfo.player;
        newGame.sequenceNumber = turnInfo.sequenceNumber;
        newGame.movesAllowed = turnInfo.movesAllowed;
        newGame.movesMade = turnInfo.movesMade;
        newGame.gameOver = turnInfo.gameOver;
        newGame.gameResult = turnInfo.gameResult;
        return newGame;
      });
      
      setSelectedSquare(null);
      setValidMoves([]);

      // Play sounds
      if (move) {
        if (move.isCheckmate || move.givesCheck) {
          playCheckSound();
        } else if (move.captured) {
          playCaptureSound();
        } else {
          playMoveSound();
        }
      }
    });

    s.on('clock_update', (data) => {
      const { clocks: serverClocks } = data;
      if (serverClocks) setClocks(serverClocks);
    });

    s.on('game_over', (data) => {
      setGameOverInfo(data);
      if (data.clocks) setClocks(data.clocks);
      playGameEndSound();
    });

    s.on('draw_offered', (data) => {
      setDrawOfferReceived(true);
    });

    s.on('draw_declined', () => {
      setDrawOfferSent(false);
    });

    s.on('error', (msg) => {
      console.error('Socket error:', msg);
    });

    return () => s.disconnect();
  }, [roomId]);

  const handleSquareClick = useCallback((r, c) => {
    if (!game || !socket) return;
    if (gameOverInfo || turnInfo?.gameOver) return;
    if (turnInfo?.player !== myColor) return;

    if (selectedSquare) {
      // Check if clicked on a valid move
      const move = validMoves.find(m => m.to.row === r && m.to.col === c);
      if (move) {
        executeMove(selectedSquare.row, selectedSquare.col, r, c, move);
        return;
      }
    }

    // Select piece
    const piece = boardData?.board[r][c];
    if (piece && piece.color === myColor) {
      setSelectedSquare({ row: r, col: c });
      setValidMoves(game.getLegalMoves(r, c));
    } else {
      setSelectedSquare(null);
      setValidMoves([]);
    }
  }, [game, socket, selectedSquare, validMoves, boardData, myColor, turnInfo, gameOverInfo]);

  const handleDragMove = useCallback((fromRow, fromCol, toRow, toCol) => {
    if (!game || !socket) return;
    if (gameOverInfo || turnInfo?.gameOver) return;
    if (turnInfo?.player !== myColor) return;

    const moves = game.getLegalMoves(fromRow, fromCol);
    const move = moves.find(m => m.to.row === toRow && m.to.col === toCol);
    if (move) {
      executeMove(fromRow, fromCol, toRow, toCol, move);
    }
  }, [game, socket, turnInfo, myColor, gameOverInfo]);

  const executeMove = useCallback((fromRow, fromCol, toRow, toCol, move) => {
    let promotion = null;
    if (move.promotion) {
      promotion = 'Q'; // auto-promote to Queen
    }

    // Optimistic UI: apply move locally first
    prevBoardRef.current = boardData;
    
    // Create optimistic board state
    const optimisticBoard = JSON.parse(JSON.stringify(boardData));
    const piece = optimisticBoard.board[fromRow][fromCol];
    optimisticBoard.board[toRow][toCol] = piece;
    optimisticBoard.board[fromRow][fromCol] = null;
    if (promotion && piece) {
      piece.type = promotion;
    }
    // Handle en passant removal
    if (move.enPassant) {
      optimisticBoard.board[fromRow][toCol] = null;
    }
    // Handle castling rook
    if (move.castling) {
      const br = toRow;
      if (move.castling === 'K') {
        optimisticBoard.board[br][5] = optimisticBoard.board[br][7];
        optimisticBoard.board[br][7] = null;
      } else {
        optimisticBoard.board[br][3] = optimisticBoard.board[br][0];
        optimisticBoard.board[br][0] = null;
      }
    }

    setBoardData(optimisticBoard);
    setLastMove({ from: { row: fromRow, col: fromCol }, to: { row: toRow, col: toCol } });
    setSelectedSquare(null);
    setValidMoves([]);

    // Play sound immediately (optimistic)
    if (move.captured || move.enPassant) {
      playCaptureSound();
    } else {
      playMoveSound();
    }

    // Send to server
    socket.emit('make_move', {
      roomId,
      from: { row: fromRow, col: fromCol },
      to: { row: toRow, col: toCol },
      promotion
    });
  }, [boardData, socket, roomId]);

  const handleResign = () => {
    if (!socket || gameOverInfo) return;
    if (window.confirm('Are you sure you want to resign?')) {
      socket.emit('resign', { roomId });
    }
  };

  const handleOfferDraw = () => {
    if (!socket || gameOverInfo || drawOfferSent) return;
    socket.emit('offer_draw', { roomId });
    setDrawOfferSent(true);
  };

  const handleDrawResponse = (accepted) => {
    if (!socket) return;
    socket.emit('respond_draw', { roomId, accepted });
    setDrawOfferReceived(false);
  };

  // Determine check state
  const checkColor = turnInfo && !turnInfo.gameOver && game && game.engine
    ? (game.engine.isInCheck('w') ? 'w' : game.engine.isInCheck('b') ? 'b' : null)
    : null;

  // Determine clock active color
  const activeClockColor = (turnInfo && !turnInfo.gameOver && !gameOverInfo) ? turnInfo.player : null;

  // Determine which player is on top vs bottom
  const topColor = myColor === 'w' ? 'b' : 'w';
  const bottomColor = myColor;

  const isGameOver = gameOverInfo || turnInfo?.gameOver;

  if (!boardData) {
    return (
      <>
        <Navbar />
        <div className="container" style={{ textAlign: 'center', marginTop: '4rem' }}>
          <div className="waiting-screen">
            <div className="waiting-spinner"></div>
            <h2>Waiting for opponent to join...</h2>
            <p style={{ marginTop: '1rem' }}>Share the game link with a friend or wait for someone from the lobby.</p>
            <div style={{ marginTop: '1rem', display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
              <input type="text" readOnly value={window.location.href} className="input-field" style={{ marginBottom: 0, width: '300px' }} />
              <button 
                className="btn-secondary" 
                onClick={(e) => {
                  navigator.clipboard.writeText(window.location.href);
                  e.target.innerText = 'Copied!';
                  setTimeout(() => e.target.innerText = 'Copy Link', 2000);
                }}
              >
                Copy Link
              </button>
            </div>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Navbar />
      <div className="container game-layout">
        <div className="board-area">
          {/* Opponent clock (top) */}
          {timeControl && (
            <ChessClock
              timeMs={clocks[topColor]}
              isActive={activeClockColor === topColor}
              playerName={playerNames[topColor] || (topColor === 'w' ? 'White' : 'Black')}
              isPlayer={false}
            />
          )}

          <Board 
            board={boardData.board}
            color={myColor}
            onSquareClick={handleSquareClick}
            onDragMove={handleDragMove}
            selectedSquare={selectedSquare}
            validMoves={validMoves}
            lastMove={lastMove}
            inCheck={checkColor}
          />

          {/* Player clock (bottom) */}
          {timeControl && (
            <ChessClock
              timeMs={clocks[bottomColor]}
              isActive={activeClockColor === bottomColor}
              playerName={playerNames[bottomColor] || (bottomColor === 'w' ? 'White' : 'Black')}
              isPlayer={true}
            />
          )}
        </div>
        
        <div className="sidebar">
          <div className="turn-indicator">
            <h3>{turnInfo?.player === 'w' ? 'White' : 'Black'}'s Turn</h3>
            <p>Move {turnInfo?.movesMade + 1} of {turnInfo?.movesAllowed}</p>
          </div>

          {/* Draw offer received prompt */}
          {drawOfferReceived && !isGameOver && (
            <div className="draw-offer-prompt">
              <p style={{ marginBottom: '0.75rem', fontWeight: 600 }}>🤝 Draw offered!</p>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button className="btn-primary" style={{ flex: 1, padding: '10px' }} onClick={() => handleDrawResponse(true)}>
                  Accept
                </button>
                <button className="btn-secondary" style={{ flex: 1, padding: '10px' }} onClick={() => handleDrawResponse(false)}>
                  Decline
                </button>
              </div>
            </div>
          )}
          
          {/* Game Over panel */}
          {isGameOver && (
            <div className="game-over-panel">
              <h3>Game Over!</h3>
              <p>{gameOverInfo?.message || turnInfo?.gameResult?.message}</p>
              <button className="btn-primary" style={{ marginTop: '1rem', width: '100%' }} onClick={() => navigate('/lobby')}>
                Back to Lobby
              </button>
            </div>
          )}

          {/* Game Controls */}
          {!isGameOver && (
            <div className="game-controls">
              <button 
                className="btn-resign" 
                onClick={handleResign}
                title="Resign the game"
              >
                🏳️ Resign
              </button>
              <button 
                className="btn-draw" 
                onClick={handleOfferDraw}
                disabled={drawOfferSent}
                title={drawOfferSent ? 'Draw offer pending' : 'Offer a draw'}
              >
                {drawOfferSent ? '⏳ Offer Sent' : '🤝 Offer Draw'}
              </button>
            </div>
          )}
          
          <div style={{ marginTop: '1.5rem' }}>
            <h3 style={{ marginBottom: '1rem' }}>Match Info</h3>
            <p><strong>Variant:</strong> Italian Progressive</p>
            <p><strong>You play:</strong> {myColor === 'w' ? 'White' : 'Black'}</p>
            {timeControl && (
              <p><strong>Time:</strong> {Math.round(timeControl.baseMs / 60000)}+{Math.round(timeControl.incrementMs / 1000)}</p>
            )}
            <p style={{ marginTop: '1rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              In the Italian variant, you can only give check on the <strong>last</strong> move of your sequence.
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
