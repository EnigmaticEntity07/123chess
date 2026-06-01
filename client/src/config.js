const isProd = import.meta.env.PROD;
const defaultUrl = isProd ? 'https://progressive-chess-production.up.railway.app' : 'http://localhost:3001';
const rawUrl = import.meta.env.VITE_API_URL || defaultUrl;
export const API_URL = rawUrl.replace(/\/$/, '');