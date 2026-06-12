import React, { useState, useRef, useCallback, useEffect } from 'react';
import { PIECE_SVG, ALL_PIECE_KEYS } from '../game/pieces';
import PromotionModal from './PromotionModal';

export default function Board({ board, color, onSquareClick, onDragMove, selectedSquare, validMoves, lastMove, inCheck, onPromotion }) {
  const isFlipped = color === 'b';
  const boardRef = useRef(null);
  
  // Drag state
  const [dragging, setDragging] = useState(null); // { row, col, piece }
  const [dragPos, setDragPos] = useState(null);   // { x, y } in viewport coords

  // Animation state: tracks pieces that just moved for slide animation
  const [animatingPiece, setAnimatingPiece] = useState(null);
  const prevBoardRef = useRef(null);

  // Promotion state
  const [pendingPromotion, setPendingPromotion] = useState(null); // { fromRow, fromCol, toRow, toCol, color }

  // Detect piece movement for animation
  useEffect(() => {
    if (lastMove && prevBoardRef.current) {
      const fromVisual = getSquarePixelCenter(lastMove.from.row, lastMove.from.col);
      const toVisual = getSquarePixelCenter(lastMove.to.row, lastMove.to.col);
      
      if (fromVisual && toVisual) {
        setAnimatingPiece({
          to: lastMove.to,
          offsetX: fromVisual.x - toVisual.x,
          offsetY: fromVisual.y - toVisual.y,
        });

        // Clear animation after it plays
        const timer = setTimeout(() => setAnimatingPiece(null), 160);
        return () => clearTimeout(timer);
      }
    }
    prevBoardRef.current = board;
  }, [board, lastMove]);

  function getSquarePixelCenter(row, col) {
    if (!boardRef.current) return null;
    const rect = boardRef.current.getBoundingClientRect();
    const squareSize = rect.width / 8;

    const displayRow = isFlipped ? 7 - row : row;
    const displayCol = isFlipped ? 7 - col : col;

    return {
      x: rect.left + displayCol * squareSize + squareSize / 2,
      y: rect.top + displayRow * squareSize + squareSize / 2,
    };
  }

  /**
   * Get the pixel position for the promotion modal anchor.
   */
  function getPromotionPosition(row, col) {
    if (!boardRef.current) return { x: 0, y: 0 };
    const rect = boardRef.current.getBoundingClientRect();
    const squareSize = rect.width / 8;

    const displayRow = isFlipped ? 7 - row : row;
    const displayCol = isFlipped ? 7 - col : col;

    return {
      x: rect.left + displayCol * squareSize + (squareSize / 2) - 37,
      y: rect.top + displayRow * squareSize,
    };
  }

  // Convert viewport coords to board row/col
  const viewportToSquare = useCallback((clientX, clientY) => {
    if (!boardRef.current) return null;
    const rect = boardRef.current.getBoundingClientRect();
    const squareSize = rect.width / 8;
    
    let displayCol = Math.floor((clientX - rect.left) / squareSize);
    let displayRow = Math.floor((clientY - rect.top) / squareSize);

    if (displayCol < 0 || displayCol > 7 || displayRow < 0 || displayRow > 7) return null;

    const row = isFlipped ? 7 - displayRow : displayRow;
    const col = isFlipped ? 7 - displayCol : displayCol;

    return { row, col };
  }, [isFlipped]);

  // Check if a move is a promotion
  const isPromotionMove = useCallback((fromRow, fromCol, toRow) => {
    const piece = board && board[fromRow] ? board[fromRow][fromCol] : null;
    if (!piece || piece.type !== 'P') return false;
    const promoRow = piece.color === 'w' ? 0 : 7;
    return toRow === promoRow;
  }, [board]);

  /**
   * Handle the completion of a move — checks for promotion first.
   */
  const completeMove = useCallback((fromRow, fromCol, toRow, toCol, viaDrag = false) => {
    if (isPromotionMove(fromRow, fromCol, toRow)) {
      const piece = board[fromRow][fromCol];
      if (onPromotion) {
        // Use the parent's promotion handler (async flow)
        setPendingPromotion({ fromRow, fromCol, toRow, toCol, color: piece.color });
      } else {
        // Fallback: auto-promote to Queen
        if (viaDrag && onDragMove) {
          onDragMove(fromRow, fromCol, toRow, toCol);
        } else {
          onSquareClick(toRow, toCol);
        }
      }
    } else {
      if (viaDrag && onDragMove) {
        onDragMove(fromRow, fromCol, toRow, toCol);
      } else {
        onSquareClick(toRow, toCol);
      }
    }
  }, [board, isPromotionMove, onPromotion, onDragMove, onSquareClick]);

  const handlePromotionSelect = useCallback((pieceType) => {
    if (!pendingPromotion) return;
    const { fromRow, fromCol, toRow, toCol } = pendingPromotion;
    setPendingPromotion(null);
    if (onPromotion) {
      onPromotion(fromRow, fromCol, toRow, toCol, pieceType);
    }
  }, [pendingPromotion, onPromotion]);

  const handlePromotionCancel = useCallback(() => {
    setPendingPromotion(null);
  }, []);

  // Mouse/touch handlers for drag
  const handlePointerDown = useCallback((e, r, c) => {
    if (pendingPromotion) return; // Don't allow drag while promotion modal is open
    const piece = board && board[r] ? board[r][c] : null;
    if (!piece || piece.color !== color) return;

    // Prevent text selection during drag
    e.preventDefault();

    setDragging({ row: r, col: c, piece });
    setDragPos({ x: e.clientX, y: e.clientY });

    // Also select the piece (for valid move display)
    onSquareClick(r, c);
  }, [board, color, onSquareClick, pendingPromotion]);

  useEffect(() => {
    if (!dragging) return;

    const handleMove = (e) => {
      const clientX = e.touches ? e.touches[0].clientX : e.clientX;
      const clientY = e.touches ? e.touches[0].clientY : e.clientY;
      setDragPos({ x: clientX, y: clientY });
    };

    const handleUp = (e) => {
      const clientX = e.changedTouches ? e.changedTouches[0].clientX : e.clientX;
      const clientY = e.changedTouches ? e.changedTouches[0].clientY : e.clientY;
      
      const target = viewportToSquare(clientX, clientY);

      if (target) {
        // Check if it's a valid move
        const isValid = validMoves.find(m => m.to.row === target.row && m.to.col === target.col);
        if (isValid && (target.row !== dragging.row || target.col !== dragging.col)) {
          completeMove(dragging.row, dragging.col, target.row, target.col, true);
        }
      }

      setDragging(null);
      setDragPos(null);
    };

    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', handleUp);
    window.addEventListener('touchmove', handleMove, { passive: false });
    window.addEventListener('touchend', handleUp);

    return () => {
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleUp);
      window.removeEventListener('touchmove', handleMove);
      window.removeEventListener('touchend', handleUp);
    };
  }, [dragging, validMoves, viewportToSquare, completeMove]);

  const handleSquareClick = useCallback((r, c) => {
    if (pendingPromotion) return;
    if (!dragging) {
      // If there's already a selected square and this is a valid destination
      if (selectedSquare) {
        const isValid = validMoves.find(m => m.to.row === r && m.to.col === c);
        if (isValid) {
          completeMove(selectedSquare.row, selectedSquare.col, r, c, false);
          return;
        }
      }
      onSquareClick(r, c);
    }
  }, [dragging, pendingPromotion, selectedSquare, validMoves, completeMove, onSquareClick]);

  const renderSquare = (r, c) => {
    const isLight = (r + c) % 2 === 0;
    const piece = board && board[r] ? board[r][c] : null;
    const isSelected = selectedSquare?.row === r && selectedSquare?.col === c;
    const isValidMove = validMoves.find(m => m.to.row === r && m.to.col === c);
    const isDragSource = dragging && dragging.row === r && dragging.col === c;

    const isLastMove = lastMove && (
      (lastMove.from.row === r && lastMove.from.col === c) ||
      (lastMove.to.row === r && lastMove.to.col === c)
    );

    const isKingInCheck = inCheck && piece && piece.type === 'K' && piece.color === inCheck;

    let className = `board-square ${isLight ? 'square-light' : 'square-dark'}`;
    if (isSelected) className += ` square-selected ${isLight ? 'square-light' : 'square-dark'}`;
    if (isValidMove) {
      className += piece ? ' square-valid-capture' : ' square-valid-move';
    }
    if (isLastMove && !isSelected) className += ' square-last-move';
    if (isKingInCheck) className += ' square-check';

    // Animation style for the piece that just moved
    let pieceStyle = {};
    if (animatingPiece && animatingPiece.to.row === r && animatingPiece.to.col === c) {
      pieceStyle = {
        transform: `translate(${animatingPiece.offsetX}px, ${animatingPiece.offsetY}px)`,
        transition: 'none',
        animation: 'piece-slide 0.15s ease-in-out forwards',
      };
    }

    // Coordinate labels
    const displayRow = isFlipped ? 7 - r : r;
    const displayCol = isFlipped ? 7 - c : c;
    const showRankLabel = displayCol === 0;
    const showFileLabel = displayRow === 7;

    return (
      <div 
        key={`${r}-${c}`} 
        className={className}
        onMouseDown={(e) => handlePointerDown(e, r, c)}
        onTouchStart={(e) => handlePointerDown(e.touches[0].clientX !== undefined ? e : e, r, c)}
        onClick={() => handleSquareClick(r, c)}
      >
        {showRankLabel && (
          <span className={`coord-label rank-label ${isLight ? 'coord-dark' : 'coord-light'}`}>
            {8 - r}
          </span>
        )}
        {showFileLabel && (
          <span className={`coord-label file-label ${isLight ? 'coord-dark' : 'coord-light'}`}>
            {String.fromCharCode(97 + c)}
          </span>
        )}
        {piece && !isDragSource && (
          <div 
            className="piece-svg"
            style={pieceStyle}
            dangerouslySetInnerHTML={{ __html: PIECE_SVG[piece.color + piece.type] }}
          />
        )}
        {piece && isDragSource && (
          <div 
            className="piece-svg piece-ghost"
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

  // Calculate promotion modal position
  let promoPos = null;
  let promoDirection = 'down';
  if (pendingPromotion) {
    promoPos = getPromotionPosition(pendingPromotion.toRow, pendingPromotion.toCol);
    // If promoting on rank 8 (row 0), expand downward; on rank 1 (row 7), expand upward
    const displayRow = isFlipped ? 7 - pendingPromotion.toRow : pendingPromotion.toRow;
    promoDirection = displayRow < 4 ? 'down' : 'up';
    if (promoDirection === 'up') {
      // Adjust position: anchor at bottom of the square
      const rect = boardRef.current?.getBoundingClientRect();
      if (rect) {
        const squareSize = rect.width / 8;
        promoPos.y = promoPos.y + squareSize - (75 * 4); // 4 options × 75px each
      }
    }
  }

  return (
    <div className="board-container" ref={boardRef}>
      {/* Hidden SVG preload — forces browser to parse all piece paths on mount */}
      <div className="piece-preload" aria-hidden="true">
        {ALL_PIECE_KEYS.map(key => (
          <div key={key} dangerouslySetInnerHTML={{ __html: PIECE_SVG[key] }} />
        ))}
      </div>

      {rows}

      {/* Floating drag ghost */}
      {dragging && dragPos && (
        <div 
          className="drag-piece"
          style={{
            position: 'fixed',
            left: dragPos.x - 37,
            top: dragPos.y - 37,
            width: 75,
            height: 75,
            pointerEvents: 'none',
            zIndex: 1000,
            filter: 'drop-shadow(0 6px 12px rgba(0,0,0,0.6))',
            transform: 'scale(1.15)',
          }}
          dangerouslySetInnerHTML={{ __html: PIECE_SVG[dragging.piece.color + dragging.piece.type] }}
        />
      )}

      {/* Promotion modal */}
      {pendingPromotion && promoPos && (
        <PromotionModal
          color={pendingPromotion.color}
          position={promoPos}
          direction={promoDirection}
          onSelect={handlePromotionSelect}
          onCancel={handlePromotionCancel}
        />
      )}
    </div>
  );
}
