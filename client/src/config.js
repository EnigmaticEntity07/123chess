const isProd = import.meta.env.PROD;
// Check if VITE_API_URL is set in environment (Vercel settings), otherwise fallback
export const API_URL = import.meta.env.VITE_API_URL || (isProd 
  ? 'https://progressive-chess-production.up.railway.app' 
  : 'http://localhost:3001');