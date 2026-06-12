import React, { useState, useRef } from 'react';
import { ChessEngine } from '../game/chess-engine';

/**
 * GameTools — tabbed panel with FEN input, PGN export, and algebraic notation input.
 *
 * Props:
 *   engine       – ChessEngine instance
 *   game         – ProgressiveGame instance (for getLegalMoves)
 *   activeColor  – 'w' | 'b' (current player's color)
 *   onFENLoad    – (fen: string) => void — called after successful FEN load
 *   onMove       – (from, to, promotion) => void — called when algebraic move is entered
 *   playerNames  – { w: string, b: string }
 *   gameResult   – string | null (e.g., '1-0', '0-1', '1/2-1/2')
 *   disableFEN   – boolean (disable FEN load in online games)
 *   disableNotation – boolean (disable notation input when it's not your turn)
 */
export default function GameTools({
  engine,
  game,
  activeColor,
  onFENLoad,
  onMove,
  playerNames = { w: 'White', b: 'Black' },
  gameResult = null,
  disableFEN = false,
  disableNotation = false,
}) {
  const [activeTab, setActiveTab] = useState('notation');
  const [fenInput, setFenInput] = useState('');
  const [notationInput, setNotationInput] = useState('');
  const [feedback, setFeedback] = useState(null); // { type: 'success' | 'error', message }
  const feedbackTimer = useRef(null);

  const showFeedback = (type, message) => {
    setFeedback({ type, message });
    if (feedbackTimer.current) clearTimeout(feedbackTimer.current);
    feedbackTimer.current = setTimeout(() => setFeedback(null), 3000);
  };

  /* ── FEN ── */
  const handleFENLoad = () => {
    if (!fenInput.trim() || !engine) return;
    const ok = engine.fromFEN(fenInput.trim());
    if (ok) {
      showFeedback('success', 'Position loaded from FEN');
      if (onFENLoad) onFENLoad(fenInput.trim());
      setFenInput('');
    } else {
      showFeedback('error', 'Invalid FEN string');
    }
  };

  const handleCopyFEN = () => {
    if (!engine) return;
    const fen = engine.toFEN(activeColor);
    navigator.clipboard.writeText(fen).then(() => {
      showFeedback('success', 'FEN copied to clipboard');
    }).catch(() => {
      showFeedback('error', 'Failed to copy');
    });
  };

  /* ── PGN ── */
  const handleExportPGN = () => {
    if (!engine) return;
    const pgnResult = gameResult || '*';
    const pgn = engine.toPGN({
      white: playerNames.w,
      black: playerNames.b,
      result: pgnResult,
    });
    navigator.clipboard.writeText(pgn).then(() => {
      showFeedback('success', 'PGN copied to clipboard');
    }).catch(() => {
      showFeedback('error', 'Failed to copy');
    });
  };

  /* ── Algebraic Notation Input ── */
  const handleNotationSubmit = (e) => {
    e.preventDefault();
    if (!game || !engine || !onMove || disableNotation) return;

    const input = notationInput.trim();
    if (!input) return;

    const result = parseAlgebraic(input, engine, game, activeColor);
    if (result) {
      onMove(result.from, result.to, result.promotion || null);
      setNotationInput('');
      setFeedback(null);
    } else {
      showFeedback('error', `Invalid or illegal move: "${input}"`);
    }
  };

  const tabs = [
    { id: 'notation', label: '⌨ Notation' },
    { id: 'fen', label: '📋 FEN' },
    { id: 'pgn', label: '📄 PGN' },
  ];

  return (
    <div className="game-tools">
      <div className="game-tools-header">
        {tabs.map(tab => (
          <button
            key={tab.id}
            className={`game-tools-tab ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="game-tools-body">
        {/* Algebraic Notation Tab */}
        {activeTab === 'notation' && (
          <form onSubmit={handleNotationSubmit}>
            <div className="tool-row">
              <input
                type="text"
                className="tool-input"
                placeholder="Type a move (e.g. e4, Nf3, O-O)"
                value={notationInput}
                onChange={e => setNotationInput(e.target.value)}
                disabled={disableNotation}
                autoComplete="off"
                spellCheck="false"
              />
              <button
                type="submit"
                className="tool-btn"
                disabled={disableNotation || !notationInput.trim()}
              >
                Move
              </button>
            </div>
            <div className="notation-help">
              Examples: <strong>e4</strong>, <strong>Nf3</strong>, <strong>Bxe5</strong>, <strong>O-O</strong>, <strong>e8=Q</strong>
            </div>
          </form>
        )}

        {/* FEN Tab */}
        {activeTab === 'fen' && (
          <>
            <div className="tool-row">
              <input
                type="text"
                className="tool-input"
                placeholder="Paste FEN string..."
                value={fenInput}
                onChange={e => setFenInput(e.target.value)}
                disabled={disableFEN}
                spellCheck="false"
              />
              <button
                className="tool-btn"
                onClick={handleFENLoad}
                disabled={disableFEN || !fenInput.trim()}
              >
                Load
              </button>
            </div>
            <div style={{ marginTop: '8px' }}>
              <button className="tool-btn tool-btn-secondary" onClick={handleCopyFEN}>
                Copy Current FEN
              </button>
            </div>
          </>
        )}

        {/* PGN Tab */}
        {activeTab === 'pgn' && (
          <div>
            <button className="tool-btn" onClick={handleExportPGN} style={{ width: '100%' }}>
              📋 Copy PGN to Clipboard
            </button>
            <div className="notation-help" style={{ marginTop: '10px' }}>
              Copies the full PGN of this game including all moves and metadata.
            </div>
          </div>
        )}

        {/* Feedback */}
        {feedback && (
          <div className={`tool-feedback ${feedback.type}`}>
            {feedback.message}
          </div>
        )}
      </div>
    </div>
  );
}


/* ═══════════════════════════════════════
   Algebraic Notation Parser
   ═══════════════════════════════════════ */

/**
 * Parse standard algebraic notation and find the matching legal move.
 * Supports: e4, Nf3, Bxe5, Rae1, R1a3, Qh4e1, O-O, O-O-O, e8=Q, exd5
 *
 * @returns {{ from: {row, col}, to: {row, col}, promotion: string|null }} | null
 */
function parseAlgebraic(input, engine, game, activeColor) {
  let text = input.replace(/[+#!?]+$/, '').trim();

  // Castling
  if (text === 'O-O' || text === '0-0') {
    return findCastlingMove(engine, game, activeColor, 'K');
  }
  if (text === 'O-O-O' || text === '0-0-0') {
    return findCastlingMove(engine, game, activeColor, 'Q');
  }

  // Parse promotion (e.g., e8=Q or e8Q)
  let promotion = null;
  const promoMatch = text.match(/=?([QRBN])$/);
  if (promoMatch) {
    promotion = promoMatch[1];
    text = text.replace(/=?[QRBN]$/, '');
  }

  // Parse destination square (last two characters should be file+rank)
  const destMatch = text.match(/([a-h])([1-8])$/);
  if (!destMatch) return null;
  const dest = ChessEngine.fromAlgebraic(destMatch[1] + destMatch[2]);
  text = text.replace(/([a-h])([1-8])$/, '');

  // Remove capture symbol
  text = text.replace('x', '');

  // Determine piece type
  let pieceType = 'P';
  if (text.length > 0 && text[0] >= 'A' && text[0] <= 'Z') {
    pieceType = text[0];
    text = text.slice(1);
  }

  // Disambiguation (file, rank, or both)
  let disambigFile = null;
  let disambigRank = null;
  for (const ch of text) {
    if (ch >= 'a' && ch <= 'h') disambigFile = ch.charCodeAt(0) - 97;
    if (ch >= '1' && ch <= '8') disambigRank = 8 - parseInt(ch);
  }

  // Search all legal moves for a match
  const allMoves = [];
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const p = engine.board[r][c];
      if (!p || p.color !== activeColor || p.type !== pieceType) continue;
      const moves = game.getLegalMoves(r, c);
      for (const m of moves) {
        if (m.to.row === dest.row && m.to.col === dest.col) {
          // Check promotion match
          if (promotion) {
            if (m.promotion !== promotion) continue;
          } else {
            if (m.promotion) continue;
          }
          // Check disambiguation
          if (disambigFile !== null && m.from.col !== disambigFile) continue;
          if (disambigRank !== null && m.from.row !== disambigRank) continue;
          allMoves.push(m);
        }
      }
    }
  }

  if (allMoves.length === 1) {
    return {
      from: allMoves[0].from,
      to: allMoves[0].to,
      promotion: allMoves[0].promotion || null,
    };
  }

  return null;
}

function findCastlingMove(engine, game, activeColor, side) {
  const backRow = activeColor === 'w' ? 7 : 0;
  const moves = game.getLegalMoves(backRow, 4);
  const target = moves.find(m => m.castling === side);
  if (target) {
    return {
      from: target.from,
      to: target.to,
      promotion: null,
    };
  }
  return null;
}
