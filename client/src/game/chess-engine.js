/**
 * chess-engine.js — Core chess logic
 *
 * Pure chess rules engine: board state, move generation, validation,
 * check / checkmate / stalemate detection, and special moves.
 */

export class ChessEngine {
  constructor() {
    this.board = [];
    this.castling = { wK: true, wQ: true, bK: true, bQ: true };
    this.enPassant = null;
    this.halfMoveClock = 0;
    this.moveHistory = [];
    this._listeners = {};
    this.reset();
  }

  reset() {
    this.board = this._createInitialBoard();
    this.castling = { wK: true, wQ: true, bK: true, bQ: true };
    this.enPassant = null;
    this.halfMoveClock = 0;
    this.moveHistory = [];
    this.emit('reset');
  }

  _createInitialBoard() {
    const b = Array.from({ length: 8 }, () => Array(8).fill(null));
    const order = ['R', 'N', 'B', 'Q', 'K', 'B', 'N', 'R'];
    for (let c = 0; c < 8; c++) {
      b[0][c] = { type: order[c], color: 'b' };
      b[1][c] = { type: 'P', color: 'b' };
      b[6][c] = { type: 'P', color: 'w' };
      b[7][c] = { type: order[c], color: 'w' };
    }
    return b;
  }

  getPiece(r, c) {
    return ChessEngine.isValid(r, c) ? this.board[r][c] : undefined;
  }

  static isValid(r, c) { return r >= 0 && r <= 7 && c >= 0 && c <= 7; }

  static toAlgebraic(r, c) {
    return String.fromCharCode(97 + c) + (8 - r);
  }

  static fromAlgebraic(sq) {
    return { row: 8 - Number(sq[1]), col: sq.charCodeAt(0) - 97 };
  }

  findKing(color) {
    for (let r = 0; r < 8; r++)
      for (let c = 0; c < 8; c++) {
        const p = this.board[r][c];
        if (p && p.type === 'K' && p.color === color) return { row: r, col: c };
      }
    return null;
  }

  isSquareAttackedBy(row, col, atkColor) {
    const pr = atkColor === 'w' ? row + 1 : row - 1;
    for (const dc of [-1, 1]) {
      const pc = col + dc;
      if (ChessEngine.isValid(pr, pc)) {
        const p = this.board[pr][pc];
        if (p && p.type === 'P' && p.color === atkColor) return true;
      }
    }

    for (const [dr, dc] of [[-2,-1],[-2,1],[-1,-2],[-1,2],[1,-2],[1,2],[2,-1],[2,1]]) {
      const nr = row + dr, nc = col + dc;
      if (ChessEngine.isValid(nr, nc)) {
        const p = this.board[nr][nc];
        if (p && p.type === 'N' && p.color === atkColor) return true;
      }
    }

    for (let dr = -1; dr <= 1; dr++)
      for (let dc = -1; dc <= 1; dc++) {
        if (!dr && !dc) continue;
        const nr = row + dr, nc = col + dc;
        if (ChessEngine.isValid(nr, nc)) {
          const p = this.board[nr][nc];
          if (p && p.type === 'K' && p.color === atkColor) return true;
        }
      }

    for (const [dr, dc] of [[-1,-1],[-1,1],[1,-1],[1,1]]) {
      let r = row + dr, c = col + dc;
      while (ChessEngine.isValid(r, c)) {
        const p = this.board[r][c];
        if (p) {
          if (p.color === atkColor && (p.type === 'B' || p.type === 'Q')) return true;
          break;
        }
        r += dr; c += dc;
      }
    }

    for (const [dr, dc] of [[-1,0],[1,0],[0,-1],[0,1]]) {
      let r = row + dr, c = col + dc;
      while (ChessEngine.isValid(r, c)) {
        const p = this.board[r][c];
        if (p) {
          if (p.color === atkColor && (p.type === 'R' || p.type === 'Q')) return true;
          break;
        }
        r += dr; c += dc;
      }
    }

    return false;
  }

  isInCheck(color) {
    const k = this.findKing(color);
    return k ? this.isSquareAttackedBy(k.row, k.col, color === 'w' ? 'b' : 'w') : false;
  }

  _pseudoMoves(r, c) {
    const p = this.board[r][c];
    if (!p) return [];
    switch (p.type) {
      case 'P': return this._pawnMoves(r, c, p.color);
      case 'N': return this._knightMoves(r, c, p.color);
      case 'K': return this._kingMoves(r, c, p.color);
      case 'R': return this._slidingMoves(r, c, p.color, [[-1,0],[1,0],[0,-1],[0,1]]);
      case 'B': return this._slidingMoves(r, c, p.color, [[-1,-1],[-1,1],[1,-1],[1,1]]);
      case 'Q': return this._slidingMoves(r, c, p.color,
        [[-1,-1],[-1,1],[1,-1],[1,1],[-1,0],[1,0],[0,-1],[0,1]]);
      default: return [];
    }
  }

  _pawnMoves(row, col, color) {
    const mvs = [];
    const dir = color === 'w' ? -1 : 1;
    const startRow = color === 'w' ? 6 : 1;
    const promoRow = color === 'w' ? 0 : 7;
    const r1 = row + dir;

    const addMove = (tr, tc, extra = {}) => {
      if (tr === promoRow) {
        for (const pr of ['Q', 'R', 'B', 'N'])
          mvs.push({ from: { row, col }, to: { row: tr, col: tc }, promotion: pr, ...extra });
      } else {
        mvs.push({ from: { row, col }, to: { row: tr, col: tc }, ...extra });
      }
    };

    if (ChessEngine.isValid(r1, col) && !this.board[r1][col]) {
      addMove(r1, col);
      const r2 = row + 2 * dir;
      if (row === startRow && !this.board[r2][col]) {
        mvs.push({ from: { row, col }, to: { row: r2, col } });
      }
    }

    for (const dc of [-1, 1]) {
      const nc = col + dc;
      if (!ChessEngine.isValid(r1, nc)) continue;
      const t = this.board[r1][nc];
      if (t && t.color !== color) addMove(r1, nc);
      if (this.enPassant && this.enPassant.row === r1 && this.enPassant.col === nc) {
        mvs.push({ from: { row, col }, to: { row: r1, col: nc }, enPassant: true });
      }
    }
    return mvs;
  }

  _slidingMoves(row, col, color, dirs) {
    const mvs = [];
    for (const [dr, dc] of dirs) {
      let r = row + dr, c = col + dc;
      while (ChessEngine.isValid(r, c)) {
        const t = this.board[r][c];
        if (t) {
          if (t.color !== color) mvs.push({ from: { row, col }, to: { row: r, col: c } });
          break;
        }
        mvs.push({ from: { row, col }, to: { row: r, col: c } });
        r += dr; c += dc;
      }
    }
    return mvs;
  }

  _knightMoves(row, col, color) {
    const mvs = [];
    for (const [dr, dc] of [[-2,-1],[-2,1],[-1,-2],[-1,2],[1,-2],[1,2],[2,-1],[2,1]]) {
      const r = row + dr, c = col + dc;
      if (ChessEngine.isValid(r, c)) {
        const t = this.board[r][c];
        if (!t || t.color !== color) mvs.push({ from: { row, col }, to: { row: r, col: c } });
      }
    }
    return mvs;
  }

  _kingMoves(row, col, color) {
    const mvs = [];
    const enemy = color === 'w' ? 'b' : 'w';
    const backRow = color === 'w' ? 7 : 0;

    for (let dr = -1; dr <= 1; dr++)
      for (let dc = -1; dc <= 1; dc++) {
        if (!dr && !dc) continue;
        const r = row + dr, c = col + dc;
        if (ChessEngine.isValid(r, c)) {
          const t = this.board[r][c];
          if (!t || t.color !== color) mvs.push({ from: { row, col }, to: { row: r, col: c } });
        }
      }

    if (row === backRow && col === 4) {
      if (this.castling[color + 'K'] &&
          !this.board[backRow][5] && !this.board[backRow][6] &&
          !this.isSquareAttackedBy(backRow, 4, enemy) &&
          !this.isSquareAttackedBy(backRow, 5, enemy) &&
          !this.isSquareAttackedBy(backRow, 6, enemy)) {
        mvs.push({ from: { row, col }, to: { row: backRow, col: 6 }, castling: 'K' });
      }
      if (this.castling[color + 'Q'] &&
          !this.board[backRow][3] && !this.board[backRow][2] && !this.board[backRow][1] &&
          !this.isSquareAttackedBy(backRow, 4, enemy) &&
          !this.isSquareAttackedBy(backRow, 3, enemy) &&
          !this.isSquareAttackedBy(backRow, 2, enemy)) {
        mvs.push({ from: { row, col }, to: { row: backRow, col: 2 }, castling: 'Q' });
      }
    }

    return mvs;
  }

  _wouldLeaveInCheck(move, color) {
    const { from, to } = move;
    const mover = this.board[from.row][from.col];
    const captured = this.board[to.row][to.col];

    this.board[to.row][to.col] = mover;
    this.board[from.row][from.col] = null;

    let epCap = null;
    if (move.enPassant) {
      epCap = this.board[from.row][to.col];
      this.board[from.row][to.col] = null;
    }

    let origType = null;
    if (move.promotion) { origType = mover.type; mover.type = move.promotion; }

    const inCheck = this.isInCheck(color);

    if (move.promotion) mover.type = origType;
    this.board[from.row][from.col] = mover;
    this.board[to.row][to.col] = captured;
    if (move.enPassant) this.board[from.row][to.col] = epCap;

    return inCheck;
  }

  getLegalMoves(row, col) {
    const p = this.board[row][col];
    if (!p) return [];
    return this._pseudoMoves(row, col).filter(m => !this._wouldLeaveInCheck(m, p.color));
  }

  getAllLegalMoves(color) {
    const all = [];
    for (let r = 0; r < 8; r++)
      for (let c = 0; c < 8; c++) {
        const p = this.board[r][c];
        if (p && p.color === color) all.push(...this.getLegalMoves(r, c));
      }
    return all;
  }

  hasLegalMoves(color) {
    for (let r = 0; r < 8; r++)
      for (let c = 0; c < 8; c++) {
        const p = this.board[r][c];
        if (p && p.color === color && this.getLegalMoves(r, c).length) return true;
      }
    return false;
  }

  makeMove(move) {
    const { from, to } = move;
    const piece = this.board[from.row][from.col];
    if (!piece) return null;

    const rec = {
      from: { ...from },
      to:   { ...to },
      piece: { ...piece },
      captured: null,
      promotion:  move.promotion || null,
      castling:   move.castling  || null,
      enPassant:  !!move.enPassant,
      capturedAt: null,
      prevEnPassant:     this.enPassant ? { ...this.enPassant } : null,
      prevCastling:      { ...this.castling },
      prevHalfMoveClock: this.halfMoveClock,
    };

    if (move.enPassant) {
      rec.captured   = { ...this.board[from.row][to.col] };
      rec.capturedAt = { row: from.row, col: to.col };
      this.board[from.row][to.col] = null;
    } else if (this.board[to.row][to.col]) {
      rec.captured = { ...this.board[to.row][to.col] };
      rec.capturedAt = { row: to.row, col: to.col };
    }

    this.board[to.row][to.col] = piece;
    this.board[from.row][from.col] = null;

    if (move.promotion) piece.type = move.promotion;

    if (move.castling) {
      const br = to.row;
      if (move.castling === 'K') {
        this.board[br][5] = this.board[br][7];
        this.board[br][7] = null;
      } else {
        this.board[br][3] = this.board[br][0];
        this.board[br][0] = null;
      }
    }

    this.enPassant = null;
    if (piece.type === 'P' && Math.abs(to.row - from.row) === 2) {
      this.enPassant = { row: (from.row + to.row) / 2, col: from.col };
    }

    if (piece.type === 'K') {
      this.castling[piece.color + 'K'] = false;
      this.castling[piece.color + 'Q'] = false;
    }
    if (piece.type === 'R') {
      if (from.row === 7 && from.col === 0) this.castling.wQ = false;
      if (from.row === 7 && from.col === 7) this.castling.wK = false;
      if (from.row === 0 && from.col === 0) this.castling.bQ = false;
      if (from.row === 0 && from.col === 7) this.castling.bK = false;
    }
    if (rec.captured && rec.captured.type === 'R') {
      const cr = rec.capturedAt.row, cc = rec.capturedAt.col;
      if (cr === 7 && cc === 0) this.castling.wQ = false;
      if (cr === 7 && cc === 7) this.castling.wK = false;
      if (cr === 0 && cc === 0) this.castling.bQ = false;
      if (cr === 0 && cc === 7) this.castling.bK = false;
    }

    this.halfMoveClock = (piece.type === 'P' || rec.captured) ? 0 : this.halfMoveClock + 1;

    const enemy = piece.color === 'w' ? 'b' : 'w';
    rec.givesCheck    = this.isInCheck(enemy);
    rec.isCheckmate   = rec.givesCheck && !this.hasLegalMoves(enemy);
    rec.isStalemate   = !rec.givesCheck && !this.hasLegalMoves(enemy);

    rec.notation = this._notation(rec);

    this.moveHistory.push(rec);
    this.emit('move', rec);
    return rec;
  }

  undoMove() {
    if (!this.moveHistory.length) return null;
    const rec = this.moveHistory.pop();

    const piece = this.board[rec.to.row][rec.to.col];
    if (rec.promotion) piece.type = 'P';

    this.board[rec.from.row][rec.from.col] = piece;
    this.board[rec.to.row][rec.to.col] = null;

    if (rec.captured) {
      this.board[rec.capturedAt.row][rec.capturedAt.col] = { ...rec.captured };
    }

    if (rec.castling) {
      const br = rec.to.row;
      if (rec.castling === 'K') {
        this.board[br][7] = this.board[br][5];
        this.board[br][5] = null;
      } else {
        this.board[br][0] = this.board[br][3];
        this.board[br][3] = null;
      }
    }

    this.enPassant     = rec.prevEnPassant;
    this.castling      = { ...rec.prevCastling };
    this.halfMoveClock = rec.prevHalfMoveClock;

    this.emit('undo', rec);
    return rec;
  }

  _notation(rec) {
    if (rec.castling === 'K') return 'O-O'  + (rec.isCheckmate ? '#' : rec.givesCheck ? '+' : '');
    if (rec.castling === 'Q') return 'O-O-O'+ (rec.isCheckmate ? '#' : rec.givesCheck ? '+' : '');

    let n = '';
    const { piece, from, to } = rec;

    if (piece.type !== 'P') {
      n += piece.type;
    } else if (rec.captured) {
      n += String.fromCharCode(97 + from.col);
    }

    if (rec.captured) n += 'x';
    n += ChessEngine.toAlgebraic(to.row, to.col);
    if (rec.promotion) n += '=' + rec.promotion;
    if (rec.isCheckmate) n += '#';
    else if (rec.givesCheck) n += '+';
    return n;
  }

  isCheckmate(color) { return this.isInCheck(color) && !this.hasLegalMoves(color); }
  isStalemate(color) { return !this.isInCheck(color) && !this.hasLegalMoves(color); }

  /* ─── FEN Support ─── */

  /**
   * Generate FEN string from current board state.
   * @param {string} activeColor - 'w' or 'b'
   * @param {number} fullMoveNumber - full move counter (default 1)
   * @returns {string} FEN string
   */
  toFEN(activeColor = 'w', fullMoveNumber = 1) {
    const pieceChar = { K: 'K', Q: 'Q', R: 'R', B: 'B', N: 'N', P: 'P' };
    
    // 1. Piece placement
    const rows = [];
    for (let r = 0; r < 8; r++) {
      let row = '';
      let empty = 0;
      for (let c = 0; c < 8; c++) {
        const p = this.board[r][c];
        if (!p) {
          empty++;
        } else {
          if (empty > 0) { row += empty; empty = 0; }
          const ch = pieceChar[p.type];
          row += p.color === 'w' ? ch : ch.toLowerCase();
        }
      }
      if (empty > 0) row += empty;
      rows.push(row);
    }
    const placement = rows.join('/');

    // 2. Active color
    const active = activeColor;

    // 3. Castling availability
    let castleStr = '';
    if (this.castling.wK) castleStr += 'K';
    if (this.castling.wQ) castleStr += 'Q';
    if (this.castling.bK) castleStr += 'k';
    if (this.castling.bQ) castleStr += 'q';
    if (!castleStr) castleStr = '-';

    // 4. En passant target square
    const ep = this.enPassant
      ? ChessEngine.toAlgebraic(this.enPassant.row, this.enPassant.col)
      : '-';

    // 5. Halfmove clock
    const halfMove = this.halfMoveClock;

    // 6. Fullmove number
    const fullMove = fullMoveNumber;

    return `${placement} ${active} ${castleStr} ${ep} ${halfMove} ${fullMove}`;
  }

  /**
   * Load board state from a FEN string.
   * @param {string} fen - Standard FEN string
   * @returns {boolean} true if parsed successfully
   */
  fromFEN(fen) {
    try {
      const parts = fen.trim().split(/\s+/);
      if (parts.length < 1) return false;

      const rows = parts[0].split('/');
      if (rows.length !== 8) return false;

      const pieceMap = {
        k: { type: 'K', color: 'b' }, q: { type: 'Q', color: 'b' },
        r: { type: 'R', color: 'b' }, b: { type: 'B', color: 'b' },
        n: { type: 'N', color: 'b' }, p: { type: 'P', color: 'b' },
        K: { type: 'K', color: 'w' }, Q: { type: 'Q', color: 'w' },
        R: { type: 'R', color: 'w' }, B: { type: 'B', color: 'w' },
        N: { type: 'N', color: 'w' }, P: { type: 'P', color: 'w' },
      };

      const newBoard = Array.from({ length: 8 }, () => Array(8).fill(null));

      for (let r = 0; r < 8; r++) {
        let c = 0;
        for (const ch of rows[r]) {
          if (ch >= '1' && ch <= '8') {
            c += parseInt(ch);
          } else if (pieceMap[ch]) {
            newBoard[r][c] = { ...pieceMap[ch] };
            c++;
          } else {
            return false;
          }
        }
        if (c !== 8) return false;
      }

      this.board = newBoard;

      // Parse castling
      this.castling = { wK: false, wQ: false, bK: false, bQ: false };
      if (parts.length > 2 && parts[2] !== '-') {
        for (const ch of parts[2]) {
          if (ch === 'K') this.castling.wK = true;
          if (ch === 'Q') this.castling.wQ = true;
          if (ch === 'k') this.castling.bK = true;
          if (ch === 'q') this.castling.bQ = true;
        }
      }

      // Parse en passant
      this.enPassant = null;
      if (parts.length > 3 && parts[3] !== '-') {
        this.enPassant = ChessEngine.fromAlgebraic(parts[3]);
      }

      // Parse halfmove clock
      this.halfMoveClock = parts.length > 4 ? parseInt(parts[4]) || 0 : 0;

      // Clear move history (FEN is a snapshot, history doesn't apply)
      this.moveHistory = [];

      this.emit('load');
      return true;
    } catch (e) {
      return false;
    }
  }

  /**
   * Generate PGN string from move history.
   * @param {object} metadata - Optional PGN header fields
   * @returns {string} PGN text
   */
  toPGN(metadata = {}) {
    const headers = [];
    const defaults = {
      Event: '123Chess Game',
      Site: 'https://123chess.app',
      Date: new Date().toISOString().split('T')[0].replace(/-/g, '.'),
      Round: '-',
      White: metadata.white || 'White',
      Black: metadata.black || 'Black',
      Result: metadata.result || '*',
    };

    const merged = { ...defaults, ...metadata };
    for (const [key, value] of Object.entries(merged)) {
      headers.push(`[${key} "${value}"]`);
    }

    // Build move text
    const moves = [];
    for (let i = 0; i < this.moveHistory.length; i++) {
      const rec = this.moveHistory[i];
      if (i % 2 === 0) {
        moves.push(`${Math.floor(i / 2) + 1}.`);
      }
      moves.push(rec.notation);
    }

    if (merged.Result !== '*') {
      moves.push(merged.Result);
    }

    return headers.join('\n') + '\n\n' + moves.join(' ') + '\n';
  }

  toJSON() {
    return {
      board:         this.board.map(r => r.map(p => p ? { ...p } : null)),
      castling:      { ...this.castling },
      enPassant:     this.enPassant ? { ...this.enPassant } : null,
      halfMoveClock: this.halfMoveClock,
      moveHistory:   this.moveHistory.map(m => ({
        ...m,
        piece:       { ...m.piece },
        captured:    m.captured ? { ...m.captured } : null,
        prevCastling:{ ...m.prevCastling },
      })),
    };
  }

  fromJSON(d) {
    this.board         = d.board.map(r => r.map(p => p ? { ...p } : null));
    this.castling      = { ...d.castling };
    this.enPassant     = d.enPassant ? { ...d.enPassant } : null;
    this.halfMoveClock = d.halfMoveClock;
    this.moveHistory   = d.moveHistory || [];
    this.emit('load');
  }

  clone() {
    const e = new ChessEngine();
    e.fromJSON(this.toJSON());
    return e;
  }

  on(evt, fn)  { (this._listeners[evt] ??= []).push(fn); }
  off(evt, fn) { if (this._listeners[evt]) this._listeners[evt] = this._listeners[evt].filter(f => f !== fn); }
  emit(evt, d) { (this._listeners[evt] || []).forEach(fn => fn(d)); }
}
