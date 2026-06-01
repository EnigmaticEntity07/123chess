/**
 * progressive.js — Progressive chess variant manager
 *
 * Modified to enforce Italian rule-set only.
 */

export class ProgressiveGame {
  constructor(engine) {
    this.engine = engine;
    this.currentPlayer = 'w';
    this.sequenceNumber = 1;
    this.movesAllowed = 1;
    this.movesMade = 0;
    this.currentSequenceMoves = [];
    this.sequences = [];
    this.noProgressCount = 0;
    this.gameOver = false;
    this.gameResult = null;
    this._listeners = {};
  }

  reset() {
    this.engine.reset();
    this.currentPlayer = 'w';
    this.sequenceNumber = 1;
    this.movesAllowed = 1;
    this.movesMade = 0;
    this.currentSequenceMoves = [];
    this.sequences = [];
    this.noProgressCount = 0;
    this.gameOver = false;
    this.gameResult = null;
    this.emit('reset');
    this.emit('turnUpdate', this.getTurnInfo());
  }

  getTurnInfo() {
    return {
      player:         this.currentPlayer,
      sequenceNumber: this.sequenceNumber,
      movesAllowed:   this.movesAllowed,
      movesMade:      this.movesMade,
      movesRemaining: this.movesAllowed - this.movesMade,
      gameOver:       this.gameOver,
      gameResult:     this.gameResult,
    };
  }

  getLegalMoves(row, col) {
    if (this.gameOver) return [];

    const piece = this.engine.getPiece(row, col);
    if (!piece || piece.color !== this.currentPlayer) return [];

    let moves = this.engine.getLegalMoves(row, col);

    /* — Italian rule: no check except on last move — */
    if (this.movesMade < this.movesAllowed - 1) {
      moves = moves.filter(m => !this._wouldGiveCheck(m));
    }

    /* — En passant only on first move of sequence — */
    if (this.movesMade > 0) {
      moves = moves.filter(m => !m.enPassant);
    }

    return moves;
  }

  makeMove(from, to, promotion) {
    if (this.gameOver) return null;

    const legalMoves = this.getLegalMoves(from.row, from.col);
    const move = legalMoves.find(m =>
      m.to.row === to.row && m.to.col === to.col &&
      ((!promotion && !m.promotion) || m.promotion === promotion)
    );

    if (!move) return null;

    const record = this.engine.makeMove(move);
    if (!record) return null;

    this.movesMade++;
    this.currentSequenceMoves.push(record);

    const hadProgress = this.currentSequenceMoves.some(m => m.captured || m.piece.type === 'P');

    if (record.isCheckmate) {
      this._endGame({
        result:  'checkmate',
        winner:  this.currentPlayer,
        message: `${this.currentPlayer === 'w' ? 'White' : 'Black'} wins by checkmate!`,
      });
      this._finishSequence(hadProgress);
      return record;
    }

    if (record.isStalemate) {
      this._endGame({
        result:  'stalemate',
        winner:  null,
        message: 'Draw by stalemate.',
      });
      this._finishSequence(hadProgress);
      return record;
    }

    if (this.movesMade >= this.movesAllowed) {
      this._finishSequence(hadProgress);
      this._advanceTurn();
      this._checkPostTurn();
      this.emit('turnUpdate', this.getTurnInfo());
    } else {
      if (!this._hasAnyLegalMoves()) {
        this._finishSequence(hadProgress);
        this._advanceTurn();
        this._checkPostTurn();
        this.emit('turnUpdate', this.getTurnInfo());
      } else {
        this.emit('turnUpdate', this.getTurnInfo());
      }
    }

    return record;
  }

  undoLastMove() {
    if (this.movesMade === 0 || this.gameOver) return null;

    const record = this.engine.undoMove();
    if (!record) return null;

    this.movesMade--;
    this.currentSequenceMoves.pop();
    this.emit('turnUpdate', this.getTurnInfo());
    this.emit('undo', record);
    return record;
  }

  _wouldGiveCheck(move) {
    const { from, to } = move;
    const piece = this.engine.board[from.row][from.col];
    const captured = this.engine.board[to.row][to.col];

    this.engine.board[to.row][to.col] = piece;
    this.engine.board[from.row][from.col] = null;

    let epCap = null;
    if (move.enPassant) {
      epCap = this.engine.board[from.row][to.col];
      this.engine.board[from.row][to.col] = null;
    }

    let origType = null;
    if (move.promotion) { origType = piece.type; piece.type = move.promotion; }

    const enemy = piece.color === 'w' ? 'b' : 'w';
    const givesCheck = this.engine.isInCheck(enemy);

    if (move.promotion) piece.type = origType;
    this.engine.board[from.row][from.col] = piece;
    this.engine.board[to.row][to.col] = captured;
    if (move.enPassant) this.engine.board[from.row][to.col] = epCap;

    return givesCheck;
  }

  _hasAnyLegalMoves() {
    for (let r = 0; r < 8; r++)
      for (let c = 0; c < 8; c++) {
        const p = this.engine.board[r][c];
        if (p && p.color === this.currentPlayer && this.getLegalMoves(r, c).length > 0)
          return true;
      }
    return false;
  }

  _finishSequence(hadProgress) {
    this.sequences.push({
      sequenceNumber: this.sequenceNumber,
      player:         this.currentPlayer,
      moves:          [...this.currentSequenceMoves],
    });

    if (hadProgress) {
      this.noProgressCount = 0;
    } else {
      this.noProgressCount++;
    }

    this.emit('sequenceComplete', this.sequences[this.sequences.length - 1]);
  }

  _advanceTurn() {
    this.currentPlayer = this.currentPlayer === 'w' ? 'b' : 'w';
    this.sequenceNumber++;
    this.movesAllowed = this.sequenceNumber;
    this.movesMade = 0;
    this.currentSequenceMoves = [];
  }

  _checkPostTurn() {
    const color = this.currentPlayer;
    const enemy = color === 'w' ? 'b' : 'w';

    if (this.engine.isInCheck(color)) {
      if (!this.engine.hasLegalMoves(color)) {
        this._endGame({
          result: 'checkmate',
          winner: enemy,
          message: `${enemy === 'w' ? 'White' : 'Black'} wins by checkmate!`,
        });
        return;
      }
    }

    if (!this.engine.hasLegalMoves(color)) {
      this._endGame({
        result: 'stalemate',
        winner: null,
        message: 'Draw by stalemate.',
      });
      return;
    }

    if (this.noProgressCount >= 10) {
      this._endGame({
        result: 'draw',
        winner: null,
        message: 'Draw — 10 consecutive turns without captures or pawn moves.',
      });
    }
  }

  _endGame(result) {
    this.gameOver = true;
    this.gameResult = result;
    this.emit('gameOver', result);
  }

  on(evt, fn)  { (this._listeners[evt] ??= []).push(fn); }
  off(evt, fn) { if (this._listeners[evt]) this._listeners[evt] = this._listeners[evt].filter(f => f !== fn); }
  emit(evt, d) { (this._listeners[evt] || []).forEach(fn => fn(d)); }
}
