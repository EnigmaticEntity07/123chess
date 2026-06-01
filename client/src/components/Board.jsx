import React from 'react';
import { PIECE_SVG } from '../game/pieces';

export default function Board({ board, color, onSquareClick, selectedSquare, validMoves, lastMove }) {
  const isFlipped = color === 'b';
  
  const getSquareLabel = (r, c) => {
    return String.fromCharCode(97 + c) + (8 - r);
  };

  const renderSquare = (r, c) => {
    const isLight = (r + c) % 2 === 0;
    const piece = board && board[r] ? board[r][c] : null;
    const isSelected = selectedSquare?.row === r && selectedSquare?.col === c;
    const isValidMove = validMoves.find(m => m.to.row === r && m.to.col === c);
    
    // Check if it's part of the last move to highlight
    const isLastMove = lastMove && (
      (lastMove.from.row === r && lastMove.from.col === c) ||
      (lastMove.to.row === r && lastMove.to.col === c)
    );

    let className = `board-square ${isLight ? 'square-light' : 'square-dark'}`;
    if (isSelected) className += ' square-selected';
    if (isValidMove) {
      className += piece ? ' square-valid-capture' : ' square-valid-move';
    }
    if (isLastMove && !isSelected) {
      className += ' square-last-move'; // could add a CSS rule for this
    }

    return (
      <div 
        key={`${r}-${c}`} 
        className={className}
        onClick={() => onSquareClick(r, c)}
      >
        {piece && (
          <div 
            className="piece-svg"
            dangerouslySetInnerHTML={{ __html: PIECE_SVG[piece.color + piece.type] }}
          />
        )}
      </div>
    );
  };

  const rows = [];
  for (let i = 0; i < 8; i++) {
    const r = isFlipped ? 7 - i : i;
    const cols = [];
    for (let j = 0; j < 8; j++) {
      const c = isFlipped ? 7 - j : j;
      cols.push(renderSquare(r, c));
    }
    rows.push(
      <div key={`row-${r}`} className="board-row">
        {cols}
      </div>
    );
  }

  return (
    <div className="board-container">
      {rows}
    </div>
  );
}
