import React, { useEffect, useState, useRef } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { io } from 'socket.io-client';
import Board from '../components/Board';
import Navbar from '../components/Navbar';
import { ChessEngine } from '../game/chess-engine';
import { useAuth } from '../context/AuthContext';
import { ProgressiveGame } from '../game/progressive';
import { API_URL } from '../config';

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

  useEffect(() => {
    const s = io(API_URL);
    setSocket(s);

    s.on('connect', () => {
      if (user && user.id) {
        s.emit('connect_to_game', { roomId, userId: user.id });
      }
    });

    s.on('game_started', (data) => {
      const { turnInfo, board } = data;
      setTurnInfo(turnInfo);
      setBoardData(board);
      
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
      const { move, turnInfo, board } = data;
      setTurnInfo(turnInfo);
      setBoardData(board);
      setLastMove(move);

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
    });

    return () => s.disconnect();
  }, [roomId]);

  const handleSquareClick = (r, c) => {
    if (!game || turnInfo?.player !== myColor || turnInfo?.gameOver) return;

    if (selectedSquare) {
      // Check if clicked on a valid move
      const move = validMoves.find(m => m.to.row === r && m.to.col === c);
      if (move) {
        // execute move locally for optimistic UI? For now just send to server.
        let promotion = null;
        if (move.promotion) {
          promotion = 'Q'; // auto-promote to Queen for simplicity
        }
        
        socket.emit('make_move', {
          roomId,
          from: selectedSquare,
          to: { row: r, col: c },
          promotion
        });
        
        setSelectedSquare(null);
        setValidMoves([]);
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
  };

  if (!boardData) {
    return (
      <>
        <Navbar />
        <div className="container" style={{ textAlign: 'center', marginTop: '4rem' }}>
          <h2>Waiting for opponent to join...</h2>
        </div>
      </>
    );
  }

  return (
    <>
      <Navbar />
      <div className="container game-layout">
        <Board 
          board={boardData.board}
          color={myColor}
          onSquareClick={handleSquareClick}
          selectedSquare={selectedSquare}
          validMoves={validMoves}
          lastMove={lastMove}
        />
        
        <div className="sidebar">
          <div className="turn-indicator">
            <h3>{turnInfo?.player === 'w' ? 'White' : 'Black'}'s Turn</h3>
            <p>Move {turnInfo?.movesMade + 1} of {turnInfo?.movesAllowed}</p>
          </div>
          
          {turnInfo?.gameOver && (
            <div style={{ padding: '1rem', background: 'rgba(255,51,102,0.1)', border: '1px solid var(--brand)', borderRadius: '8px', marginTop: '1rem' }}>
              <h3 style={{ color: 'var(--brand)' }}>Game Over!</h3>
              <p>{turnInfo.gameResult?.message}</p>
              <button className="btn-primary" style={{ marginTop: '1rem', width: '100%' }} onClick={() => navigate('/lobby')}>
                Back to Lobby
              </button>
            </div>
          )}
          
          <div style={{ marginTop: '2rem' }}>
            <h3 style={{ marginBottom: '1rem' }}>Match Info</h3>
            <p><strong>Variant:</strong> Italian Progressive</p>
            <p><strong>You play:</strong> {myColor === 'w' ? 'White' : 'Black'}</p>
            <p style={{ marginTop: '1rem', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
              In the Italian variant, you can only give check on the <strong>last</strong> move of your sequence.
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
