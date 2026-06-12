import React from 'react';
import { PIECE_SVG } from '../game/pieces';

/**
 * PromotionModal — floating piece-choice overlay shown when a pawn
 * reaches the promotion rank. Appears directly over the promotion square
 * so it feels spatially connected to the action.
 *
 * Props:
 *   color    – 'w' | 'b' (piece color to promote into)
 *   position – { x, y } pixel position to anchor the modal
 *   direction – 'down' | 'up' (expand direction based on board orientation)
 *   onSelect – (pieceType: string) => void
 *   onCancel – () => void
 */
export default function PromotionModal({ color, position, direction = 'down', onSelect, onCancel }) {
  const pieces = ['Q', 'R', 'B', 'N'];
  const isUp = direction === 'up';

  return (
    <>
      {/* Backdrop */}
      <div className="promotion-overlay" onClick={onCancel} />

      {/* Modal */}
      <div
        className={`promotion-modal ${isUp ? 'promotion-up' : ''}`}
        style={{
          left: position.x,
          top: position.y,
          transformOrigin: isUp ? 'bottom center' : 'top center',
        }}
      >
        {pieces.map(type => (
          <div
            key={type}
            className="promotion-option"
            onClick={() => onSelect(type)}
            title={
              type === 'Q' ? 'Queen' :
              type === 'R' ? 'Rook' :
              type === 'B' ? 'Bishop' : 'Knight'
            }
          >
            <div
              className="piece-svg"
              dangerouslySetInnerHTML={{ __html: PIECE_SVG[color + type] }}
            />
          </div>
        ))}
      </div>
    </>
  );
}
