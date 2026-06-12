/**
 * pieces.js — Inline SVG chess piece definitions
 *
 * "Modern Symmetrical" style pieces for a premium, sleek aesthetic.
 * Perfectly mirrored along X=22.5 (except Knights, which face left).
 * High contrast with 1.5px strokes and distinct inner details.
 */

export const PIECE_SVG = {};

const basePaths = `
  <path d="M12.5 35 c 0 -4 3 -7 10 -7 s 10 3 10 7 z" stroke-linecap="round"/>
  <path d="M11 35 h 23 v 2 h -23 z" stroke-linecap="round"/>
  <path d="M11 37 h 23 v 2 h -23 z" stroke-linecap="round"/>
`;

/* ───────────────────────────────────────
   WHITE PIECES
   ─────────────────────────────────────── */

PIECE_SVG['wK'] = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 45 45">
  <g fill="#fff" fill-rule="evenodd" stroke="#000" stroke-width="1.5" stroke-linejoin="round">
    <path d="M22.5 11.5 v-6 M19.5 8.5 h6" stroke-linecap="round" stroke-width="2"/>
    <path d="M22.5 25 c 6 0 10 -4 10 -10 c -2 0 -3 2 -4 3 c -1.5 -4 -10.5 -4 -12 0 c -1 -1 -2 -3 -4 -3 c 0 6 4 10 10 10 z" />
    ${basePaths}
  </g>
</svg>`;

PIECE_SVG['wQ'] = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 45 45">
  <g fill="#fff" fill-rule="evenodd" stroke="#000" stroke-width="1.5" stroke-linejoin="round">
    <path d="M9 26 c 2 -8 3 -14 3 -14 l 4.5 9 l 6 -13 l 6 13 l 4.5 -9 c 0 0 1 6 3 14 z" stroke-linecap="round"/>
    <circle cx="12" cy="12" r="2" />
    <circle cx="16.5" cy="21" r="2" opacity="0"/>
    <circle cx="22.5" cy="8" r="2" />
    <circle cx="33" cy="12" r="2" />
    ${basePaths}
  </g>
</svg>`;

PIECE_SVG['wR'] = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 45 45">
  <g fill="#fff" fill-rule="evenodd" stroke="#000" stroke-width="1.5" stroke-linejoin="round">
    <path d="M12 14 h 21 v 14 h -21 z" />
    <path d="M11 14 v -4 h 5 v 3 h 4 v -3 h 5 v 3 h 4 v -3 h 5 v 4 z" stroke-linecap="round"/>
    <path d="M12.5 28 l -1.5 7 h 23 l -1.5 -7 z" stroke-linecap="round"/>
    ${basePaths.replace('<path d="M12.5 35 c 0 -4 3 -7 10 -7 s 10 3 10 7 z" stroke-linecap="round"/>', '')}
  </g>
</svg>`;

PIECE_SVG['wB'] = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 45 45">
  <g fill="#fff" fill-rule="evenodd" stroke="#000" stroke-width="1.5" stroke-linejoin="round">
    <path d="M22.5 8 c -5 0 -8 5 -8 11 c 0 6 5 9 8 9 c 3 0 8 -3 8 -9 c 0 -6 -3 -11 -8 -11 z" stroke-linecap="round"/>
    <circle cx="22.5" cy="8" r="2" />
    <path d="M 22.5 12 L 22.5 19 M 19 15.5 L 26 15.5" stroke-linecap="round" fill="none" />
    ${basePaths}
  </g>
</svg>`;

PIECE_SVG['wN'] = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 45 45">
  <g fill="#fff" fill-rule="evenodd" stroke="#000" stroke-width="1.5" stroke-linejoin="round">
    <path d="M22 10 c 10.5 1 16.5 8 16 25 H 15 c 0 -9 10 -6.5 8 -21" stroke-linecap="round"/>
    <path d="M24 18 c .38 2.91 -5.55 7.37 -8 9 c -3 2 -2.82 4.34 -5 4 c -1.042 -.94 1.41 -3.04 0 -3 c -1 0 .19 1.23 -1 2 c -1 0 -4.003 1 -4 -4 c 0 -2 6 -12 6 -12 s 1.89 -1.9 2 -3.5 c -.73 -.994 -.5 -2 -.5 -3 c 1 -1 3 2.5 3 2.5 h 2 s .78 -1.992 2.5 -3 c 1 0 1 3 1 3" stroke-linecap="round"/>
    <circle cx="14" cy="16" r="1" fill="#000" stroke="none" />
    ${basePaths.replace('<path d="M12.5 35 c 0 -4 3 -7 10 -7 s 10 3 10 7 z" stroke-linecap="round"/>', '')}
  </g>
</svg>`;

PIECE_SVG['wP'] = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 45 45">
  <g fill="#fff" fill-rule="evenodd" stroke="#000" stroke-width="1.5" stroke-linejoin="round">
    <circle cx="22.5" cy="14" r="5" stroke-linecap="round"/>
    <path d="M22.5 19 c -3 0 -5 2 -5 5 c 0 4 2 4 2 4 c 0 0 -2 3 -4 7 h 14 c -2 -4 -4 -7 -4 -7 c 0 0 2 0 2 -4 c 0 -3 -2 -5 -5 -5 z" stroke-linecap="round"/>
    ${basePaths}
  </g>
</svg>`;

/* ───────────────────────────────────────
   BLACK PIECES (Filled with dark grey)
   ─────────────────────────────────────── */

const blackFill = "#222";

PIECE_SVG['bK'] = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 45 45">
  <g fill="${blackFill}" fill-rule="evenodd" stroke="#000" stroke-width="1.5" stroke-linejoin="round">
    <path d="M22.5 11.5 v-6 M19.5 8.5 h6" stroke-linecap="round" stroke-width="2" stroke="#fff"/>
    <path d="M22.5 25 c 6 0 10 -4 10 -10 c -2 0 -3 2 -4 3 c -1.5 -4 -10.5 -4 -12 0 c -1 -1 -2 -3 -4 -3 c 0 6 4 10 10 10 z" />
    <path d="M12.5 35 c 0 -4 3 -7 10 -7 s 10 3 10 7 z" stroke-linecap="round"/>
    <path d="M11 35 h 23 v 2 h -23 z" stroke-linecap="round"/>
    <path d="M11 37 h 23 v 2 h -23 z" stroke-linecap="round"/>
  </g>
</svg>`;

PIECE_SVG['bQ'] = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 45 45">
  <g fill="${blackFill}" fill-rule="evenodd" stroke="#000" stroke-width="1.5" stroke-linejoin="round">
    <path d="M9 26 c 2 -8 3 -14 3 -14 l 4.5 9 l 6 -13 l 6 13 l 4.5 -9 c 0 0 1 6 3 14 z" stroke-linecap="round"/>
    <circle cx="12" cy="12" r="2" stroke="#fff"/>
    <circle cx="22.5" cy="8" r="2" stroke="#fff"/>
    <circle cx="33" cy="12" r="2" stroke="#fff"/>
    <path d="M12.5 35 c 0 -4 3 -7 10 -7 s 10 3 10 7 z" stroke-linecap="round"/>
    <path d="M11 35 h 23 v 2 h -23 z" stroke-linecap="round"/>
    <path d="M11 37 h 23 v 2 h -23 z" stroke-linecap="round"/>
  </g>
</svg>`;

PIECE_SVG['bR'] = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 45 45">
  <g fill="${blackFill}" fill-rule="evenodd" stroke="#000" stroke-width="1.5" stroke-linejoin="round">
    <path d="M12 14 h 21 v 14 h -21 z" />
    <path d="M11 14 v -4 h 5 v 3 h 4 v -3 h 5 v 3 h 4 v -3 h 5 v 4 z" stroke-linecap="round"/>
    <path d="M12.5 28 l -1.5 7 h 23 l -1.5 -7 z" stroke-linecap="round"/>
    <path d="M11 35 h 23 v 2 h -23 z" stroke-linecap="round"/>
    <path d="M11 37 h 23 v 2 h -23 z" stroke-linecap="round"/>
  </g>
</svg>`;

PIECE_SVG['bB'] = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 45 45">
  <g fill="${blackFill}" fill-rule="evenodd" stroke="#000" stroke-width="1.5" stroke-linejoin="round">
    <path d="M22.5 8 c -5 0 -8 5 -8 11 c 0 6 5 9 8 9 c 3 0 8 -3 8 -9 c 0 -6 -3 -11 -8 -11 z" stroke-linecap="round"/>
    <circle cx="22.5" cy="8" r="2" stroke="#fff"/>
    <path d="M 22.5 12 L 22.5 19 M 19 15.5 L 26 15.5" stroke-linecap="round" stroke="#fff" fill="none" />
    <path d="M12.5 35 c 0 -4 3 -7 10 -7 s 10 3 10 7 z" stroke-linecap="round"/>
    <path d="M11 35 h 23 v 2 h -23 z" stroke-linecap="round"/>
    <path d="M11 37 h 23 v 2 h -23 z" stroke-linecap="round"/>
  </g>
</svg>`;

PIECE_SVG['bN'] = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 45 45">
  <g fill="${blackFill}" fill-rule="evenodd" stroke="#000" stroke-width="1.5" stroke-linejoin="round">
    <path d="M22 10 c 10.5 1 16.5 8 16 25 H 15 c 0 -9 10 -6.5 8 -21" stroke-linecap="round"/>
    <path d="M24 18 c .38 2.91 -5.55 7.37 -8 9 c -3 2 -2.82 4.34 -5 4 c -1.042 -.94 1.41 -3.04 0 -3 c -1 0 .19 1.23 -1 2 c -1 0 -4.003 1 -4 -4 c 0 -2 6 -12 6 -12 s 1.89 -1.9 2 -3.5 c -.73 -.994 -.5 -2 -.5 -3 c 1 -1 3 2.5 3 2.5 h 2 s .78 -1.992 2.5 -3 c 1 0 1 3 1 3" stroke-linecap="round"/>
    <circle cx="14" cy="16" r="1" fill="#fff" stroke="none" />
    <path d="M11 35 h 23 v 2 h -23 z" stroke-linecap="round"/>
    <path d="M11 37 h 23 v 2 h -23 z" stroke-linecap="round"/>
  </g>
</svg>`;

PIECE_SVG['bP'] = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 45 45">
  <g fill="${blackFill}" fill-rule="evenodd" stroke="#000" stroke-width="1.5" stroke-linejoin="round">
    <circle cx="22.5" cy="14" r="5" stroke-linecap="round"/>
    <path d="M22.5 19 c -3 0 -5 2 -5 5 c 0 4 2 4 2 4 c 0 0 -2 3 -4 7 h 14 c -2 -4 -4 -7 -4 -7 c 0 0 2 0 2 -4 c 0 -3 -2 -5 -5 -5 z" stroke-linecap="round"/>
    <path d="M12.5 35 c 0 -4 3 -7 10 -7 s 10 3 10 7 z" stroke-linecap="round"/>
    <path d="M11 35 h 23 v 2 h -23 z" stroke-linecap="round"/>
    <path d="M11 37 h 23 v 2 h -23 z" stroke-linecap="round"/>
  </g>
</svg>`;

export const ALL_PIECE_KEYS = ['wK','wQ','wR','wB','wN','wP','bK','bQ','bR','bB','bN','bP'];
