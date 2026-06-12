import React, { useState, useEffect, useRef } from 'react';
import Board from './Board';
import { ChessEngine } from '../game/chess-engine';
import { playMoveSound, playCaptureSound, playCheckSound, playGameEndSound } from '../game/sounds';

// Back-Rank Mate in 1 for White
const PUZZLE_FEN = '6k1/5ppp/8/8/8/8/5PPP/R5K1 w - - 0 1';

export default function PuzzleHero() {
  const [boardData, setBoardData] = useState(null);
  const [lastMove, setLastMove] = useState(null);
  const [status, setStatus] = useState('playing'); // 'playing', 'solved', 'failed'
  
  const [selectedSquare, setSelectedSquare] = useState(null);
  const [validMoves, setValidMoves] = useState([]);

  const engineRef = useRef(new ChessEngine());

  useEffect(() => {
    resetPuzzle();
  }, []);

  const resetPuzzle = () => {
    engineRef.current.fromFEN(PUZZLE_FEN);
    setBoardData(engineRef.current.toJSON());
    setLastMove(null);
    setSelectedSquare(null);
    setValidMoves([]);
    setStatus('playing');
  };

  const checkSolution = (fromRow, fromCol, toRow, toCol) => {
    // Solution: Ra8# (from 7,0 to 0,0)
    return fromRow === 7 && fromCol === 0 && toRow === 0 && toCol === 0;
  };

  const executeMove = (fromRow, fromCol, toRow, toCol) => {
    if (status === 'solved') return;

    const moves = engineRef.current.getLegalMoves(fromRow, fromCol);
    const move = moves.find(m => m.to.row === toRow && m.to.col === toCol);
    
    if (move) {
      // Optimistically update the board
      engineRef.current.makeMove(move);
      setBoardData(engineRef.current.toJSON());
      setLastMove({ from: { row: fromRow, col: fromCol }, to: { row: toRow, col: toCol } });
      
      const isCorrect = checkSolution(fromRow, fromCol, toRow, toCol);

      if (isCorrect) {
        setStatus('solved');
        playCheckSound(); // Checkmate sound
        setTimeout(playGameEndSound, 300);
        setSelectedSquare(null);
        setValidMoves([]);
      } else {
        setStatus('failed');
        if (move.captured) playCaptureSound(); else playMoveSound();
        
        // Revert after short delay
        setTimeout(() => {
          engineRef.current.fromFEN(PUZZLE_FEN);
          setBoardData(engineRef.current.toJSON());
          setLastMove(null);
          setSelectedSquare(null);
          setValidMoves([]);
          setStatus('playing');
        }, 1000);
      }
    }
  };

  const handleSquareClick = (r, c) => {
    if (status !== 'playing') return;

    if (selectedSquare) {
      const move = validMoves.find(m => m.to.row === r && m.to.col === c);
      if (move) {
        executeMove(selectedSquare.row, selectedSquare.col, r, c);
        return;
      }
    }

    const piece = boardData?.board[r][c];
    if (piece && piece.color === 'w') {
      setSelectedSquare({ row: r, col: c });
      setValidMoves(engineRef.current.getLegalMoves(r, c));
    } else {
      setSelectedSquare(null);
      setValidMoves([]);
    }
  };

  const handleDragMove = (fromRow, fromCol, toRow, toCol) => {
    if (status !== 'playing') return;
    executeMove(fromRow, fromCol, toRow, toCol);
  };

  if (!boardData) return null;

  return (
    <div className="puzzle-hero-wrapper">
      <div className="puzzle-board-container">
        <Board 
          board={boardData.board}
          color="w"
          onSquareClick={handleSquareClick}
          onDragMove={handleDragMove}
          selectedSquare={selectedSquare}
          validMoves={validMoves}
          lastMove={lastMove}
          inCheck={engineRef.current.isInCheck('w') ? 'w' : engineRef.current.isInCheck('b') ? 'b' : null}
        />
        
        {status === 'solved' && (
          <div className="puzzle-overlay puzzle-solved">
            <h2>🎉 Puzzle Solved!</h2>
            <button className="btn-primary" onClick={resetPuzzle}>Play Again</button>
          </div>
        )}
        
        {status === 'failed' && (
          <div className="puzzle-overlay puzzle-failed">
            <h2>❌ Try Again!</h2>
          </div>
        )}
      </div>
    </div>
  );
}
