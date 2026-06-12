import React, { useEffect, useState, useRef } from 'react';
import Board from './Board';
import { ChessEngine } from '../game/chess-engine';

const OPERA_GAME_MOVES = [
  { from: { row: 6, col: 4 }, to: { row: 4, col: 4 } }, // e4
  { from: { row: 1, col: 4 }, to: { row: 3, col: 4 } }, // e5
  { from: { row: 7, col: 6 }, to: { row: 5, col: 5 } }, // Nf3
  { from: { row: 1, col: 3 }, to: { row: 2, col: 3 } }, // d6
  { from: { row: 6, col: 3 }, to: { row: 4, col: 3 } }, // d4
  { from: { row: 0, col: 2 }, to: { row: 4, col: 6 } }, // Bg4
  { from: { row: 4, col: 3 }, to: { row: 3, col: 4 } }, // dxe5
  { from: { row: 4, col: 6 }, to: { row: 5, col: 5 } }, // Bxf3
  { from: { row: 7, col: 3 }, to: { row: 5, col: 5 } }, // Qxf3
  { from: { row: 2, col: 3 }, to: { row: 3, col: 4 } }, // dxe5
  { from: { row: 7, col: 5 }, to: { row: 4, col: 2 } }, // Bc4
  { from: { row: 0, col: 6 }, to: { row: 2, col: 5 } }, // Nf6
  { from: { row: 5, col: 5 }, to: { row: 5, col: 1 } }, // Qb3
  { from: { row: 0, col: 3 }, to: { row: 1, col: 4 } }, // Qe7
  { from: { row: 7, col: 1 }, to: { row: 5, col: 2 } }, // Nc3
  { from: { row: 1, col: 2 }, to: { row: 2, col: 2 } }, // c6
  { from: { row: 7, col: 2 }, to: { row: 3, col: 6 } }, // Bg5
  { from: { row: 1, col: 1 }, to: { row: 3, col: 1 } }, // b5
  { from: { row: 5, col: 2 }, to: { row: 3, col: 1 } }, // Nxb5
  { from: { row: 2, col: 2 }, to: { row: 3, col: 1 } }, // cxb5
  { from: { row: 4, col: 2 }, to: { row: 3, col: 1 } }, // Bxb5+
  { from: { row: 0, col: 1 }, to: { row: 1, col: 3 } }, // Nbd7
  { from: { row: 7, col: 4 }, to: { row: 7, c: 2 }, castling: 'Q' }, // O-O-O
  { from: { row: 0, col: 0 }, to: { row: 0, col: 3 } }, // Rd8
  { from: { row: 7, col: 3 }, to: { row: 1, col: 3 } }, // Rxd7
  { from: { row: 0, col: 3 }, to: { row: 1, col: 3 } }, // Rxd7
  { from: { row: 7, col: 0 }, to: { row: 7, col: 3 } }, // Rd1
  { from: { row: 1, col: 4 }, to: { row: 2, col: 4 } }, // Qe6
  { from: { row: 3, col: 1 }, to: { row: 1, col: 3 } }, // Bxd7+
  { from: { row: 2, col: 5 }, to: { row: 1, col: 3 } }, // Nxd7
  { from: { row: 5, col: 1 }, to: { row: 0, col: 1 } }, // Qb8+
  { from: { row: 1, col: 3 }, to: { row: 0, col: 1 } }, // Nxb8
  { from: { row: 7, col: 3 }, to: { row: 0, col: 3 } }, // Rd8#
];

export default function GhostGame() {
  const [boardData, setBoardData] = useState(null);
  const [lastMove, setLastMove] = useState(null);
  const engineRef = useRef(new ChessEngine());
  const moveIndexRef = useRef(0);

  useEffect(() => {
    // Initial board state
    setBoardData(engineRef.current.toJSON());

    const interval = setInterval(() => {
      const moves = OPERA_GAME_MOVES;
      const idx = moveIndexRef.current;

      if (idx >= moves.length) {
        // Game over, wait a bit, then reset
        if (idx === moves.length + 3) {
          engineRef.current.reset();
          moveIndexRef.current = 0;
          setBoardData(engineRef.current.toJSON());
          setLastMove(null);
        } else {
          moveIndexRef.current++;
        }
      } else {
        // Play next move
        const move = moves[idx];
        
        // Find legal move matching from/to
        let actualMove = null;
        if (move.castling) {
            actualMove = { from: { row: move.from.row, col: move.from.col }, to: { row: 7, col: 2 }, castling: move.castling }; // O-O-O white
        } else {
            // we can just force it to maintain pure ghost visual or use engine.
            const legals = engineRef.current.getLegalMoves(move.from.row, move.from.col);
            actualMove = legals.find(m => m.to.row === move.to.row && m.to.col === move.to.col);
        }

        if (actualMove) {
            engineRef.current.makeMove(actualMove);
            setBoardData(engineRef.current.toJSON());
            setLastMove({ from: move.from, to: move.to });
        }
        
        moveIndexRef.current++;
      }
    }, 1500);

    return () => clearInterval(interval);
  }, []);

  if (!boardData) return null;

  return (
    <div className="ghost-game-wrapper">
      <Board 
        board={boardData.board}
        color="w"
        onSquareClick={() => {}}
        onDragMove={() => {}}
        selectedSquare={null}
        validMoves={[]}
        lastMove={lastMove}
        inCheck={engineRef.current.isInCheck('w') ? 'w' : engineRef.current.isInCheck('b') ? 'b' : null}
      />
    </div>
  );
}
