const rawUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001';
export const API_URL = rawUrl.replace(/\/$/, '');