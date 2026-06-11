const isProd = import.meta.env.PROD;
export const API_URL = isProd 
  ? 'https://progressive-chess-production.up.railway.app' 
  : 'http://localhost:3001';