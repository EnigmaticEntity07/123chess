import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import Board from '../components/Board';
import Navbar from '../components/Navbar';
import GameTools from '../components/GameTools';
import { ChessEngine } from '../game/chess-engine';
import { ProgressiveGame } from '../game/progressive';
import { playMoveSound, playCaptureSound, playCheckSound, playGameEndSound } from '../game/sounds';

export default function LocalGame() {
  const navigate = useNavigate();

  const [game, setGame] = useState(null);
  const [boardData, setBoardData] = useState(null);
  const [turnInfo, setTurnInfo] = useState(null);
  
  const [selectedSquare, setSelectedSquare] = useState(null);
  const [validMoves, setValidMoves] = useState([]);
  const [lastMove, setLastMove] = useState(null);

  useEffect(() => {
    // Initialize local game
    const engine = new ChessEngine();
    const progGame = new ProgressiveGame(engine);
    setGame(progGame);
    setBoardData(engine.toJSON());
    setTurnInfo(progGame.getTurnInfo());
  }, []);

  const handleSquareClick = useCallback((r, c) => {
    if (!game || turnInfo?.gameOver) return;

    // Both colors are playable locally, so we always use the current player
    const myColor = turnInfo.player;

    if (selectedSquare) {
      const move = validMoves.find(m => m.to.row === r && m.to.col === c);
      if (move) {
        // Don't execute promotion moves here — Board handles them via onPromotion
        if (move.promotion) return;
        executeMove(selectedSquare.row, selectedSquare.col, r, c, move);
        return;
      }
    }

    const piece = boardData?.board[r][c];
    if (piece && piece.color === myColor) {
      setSelectedSquare({ row: r, col: c });
      setValidMoves(game.getLegalMoves(r, c));
    } else {
      setSelectedSquare(null);
      setValidMoves([]);
    }
  }, [game, selectedSquare, validMoves, boardData, turnInfo, executeMove]);

  const handleDragMove = useCallback((fromRow, fromCol, toRow, toCol) => {
    if (!game || turnInfo?.gameOver) return;
    const moves = game.getLegalMoves(fromRow, fromCol);
    const move = moves.find(m => m.to.row === toRow && m.to.col === toCol);
    if (move) {
      // Don't execute promotion moves here — Board handles them via onPromotion
      if (move.promotion) return;
      executeMove(fromRow, fromCol, toRow, toCol, move);
    }
  }, [game, turnInfo, executeMove]);

  const handlePromotion = useCallback((fromRow, fromCol, toRow, toCol, pieceType) => {
    if (!game || turnInfo?.gameOver) return;
    executeMove(fromRow, fromCol, toRow, toCol, null, pieceType);
  }, [game, turnInfo, executeMove]);

  const executeMove = useCallback((fromRow, fromCol, toRow, toCol, move, promotion = null) => {
    const promoType = promotion || (move?.promotion ? move.promotion : null);

    const record = game.makeMove({ row: fromRow, col: fromCol }, { row: toRow, col: toCol }, promoType);
    if (record) {
      setBoardData(game.engine.toJSON());
      const newTurnInfo = game.getTurnInfo();
      setTurnInfo(newTurnInfo);
      setLastMove({ from: { row: fromRow, col: fromCol }, to: { row: toRow, col: toCol } });
      setSelectedSquare(null);
      setValidMoves([]);

      if (newTurnInfo.gameOver) {
        playGameEndSound();
      } else if (record.isCheckmate || record.givesCheck) {
        playCheckSound();
      } else if (record.captured || record.enPassant) {
        playCaptureSound();
      } else {
        playMoveSound();
      }
    }
  }, [game]);

  const handleResign = () => {
    if (turnInfo?.gameOver) return;
    if (window.confirm('Are you sure you want to resign the game?')) {
      const winner = turnInfo.player === 'w' ? 'b' : 'w';
      game.gameOver = true;
      game.gameResult = {
        result: 'resignation',
        winner,
        message: `${winner === 'w' ? 'White' : 'Black'} wins by resignation!`
      };
      setTurnInfo(game.getTurnInfo());
      playGameEndSound();
    }
  };

  /* ── FEN Load ── */
  const handleFENLoad = useCallback((fen) => {
    if (!game) return;
    // Reload game state from the engine (which was already updated by GameTools)
    setBoardData(game.engine.toJSON());
    setTurnInfo(game.getTurnInfo());
    setLastMove(null);
    setSelectedSquare(null);
    setValidMoves([]);
  }, [game]);

  /* ── Algebraic Notation Move ── */
  const handleNotationMove = useCallback((from, to, promotion) => {
    if (!game || turnInfo?.gameOver) return;

    const moves = game.getLegalMoves(from.row, from.col);
    const move = moves.find(m =>
      m.to.row === to.row && m.to.col === to.col &&
      ((!promotion && !m.promotion) || m.promotion === promotion)
    );
    if (move) {
      executeMove(from.row, from.col, to.row, to.col, move, promotion);
    }
  }, [game, turnInfo, executeMove]);

  const checkColor = turnInfo && !turnInfo.gameOver && game && game.engine
    ? (game.engine.isInCheck('w') ? 'w' : game.engine.isInCheck('b') ? 'b' : null)
    : null;

  const isGameOver = turnInfo?.gameOver;

  if (!boardData) {
    return null;
  }

  // Board is always oriented to white for hotseat
  const boardColor = 'w';

  // Determine PGN result string
  const pgnResult = isGameOver
    ? (turnInfo.gameResult?.winner === 'w' ? '1-0' : turnInfo.gameResult?.winner === 'b' ? '0-1' : '1/2-1/2')
    : '*';

  return (
    <>
      <Navbar />
      <div className="container game-layout">
        <div className="board-area">
          <Board 
            board={boardData.board}
            color={boardColor}
            onSquareClick={handleSquareClick}
            onDragMove={handleDragMove}
            onPromotion={handlePromotion}
            selectedSquare={selectedSquare}
            validMoves={validMoves}
            lastMove={lastMove}
            inCheck={checkColor}
          />

          {/* Game Tools Panel */}
          <GameTools
            engine={game?.engine}
            game={game}
            activeColor={turnInfo?.player || 'w'}
            onFENLoad={handleFENLoad}
            onMove={handleNotationMove}
            playerNames={{ w: 'White', b: 'Black' }}
            gameResult={pgnResult}
            disableFEN={false}
            disableNotation={!game || isGameOver}
          />
        </div>
        
        <div className="sidebar">
          <div className="turn-indicator">
            <h3>{turnInfo?.player === 'w' ? 'White' : 'Black'}'s Turn</h3>
            <p>Move {turnInfo?.movesMade + 1} of {turnInfo?.movesAllowed}</p>
          </div>
          
          {isGameOver && (
            <div className="game-over-panel">
              <h3>Game Over!</h3>
              <p>{turnInfo?.gameResult?.message}</p>
              <button className="btn-primary" style={{ marginTop: '1rem', width: '100%' }} onClick={() => window.location.reload()}>
                Play Again
              </button>
              <button className="btn-secondary" style={{ marginTop: '0.5rem', width: '100%' }} onClick={() => navigate('/')}>
                Back Home
              </button>
            </div>
          )}

          {!isGameOver && (
            <div className="game-controls">
              <button className="btn-resign" onClick={handleResign} title="Resign the game">
                🏳️ Resign
              </button>
            </div>
          )}
          
          <div style={{ marginTop: '1.5rem' }}>
            <h3 style={{ marginBottom: '1rem' }}>Match Info</h3>
            <p><strong>Variant:</strong> Italian Progressive (Hotseat)</p>
            <p style={{ marginTop: '1rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              In the Italian variant, you can only give check on the <strong>last</strong> move of your sequence.
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
