import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { API_URL } from '../config';

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isGuestLoading, setIsGuestLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch(`${API_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      const data = await res.json();
      if (res.ok) {
        login(data.token, data.user);
        navigate('/lobby');
      } else {
        setError(data.error);
      }
    } catch (err) {
      setError('Network error');
    }
  };

  const handleGuestLogin = async () => {
    setIsGuestLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/auth/guest`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      const data = await res.json();
      if (res.ok) {
        login(data.token, data.user);
        navigate('/lobby');
      } else {
        setError(data.error);
      }
    } catch (err) {
      setError('Network error');
    } finally {
      setIsGuestLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-box">
        <h2 style={{ textAlign: 'center', marginBottom: '2rem' }}>Welcome Back</h2>
        {error && <p style={{ color: 'var(--brand)', marginBottom: '1rem', textAlign: 'center' }}>{error}</p>}
        <form onSubmit={handleSubmit}>
          <input 
            type="text" 
            placeholder="Username" 
            className="input-field" 
            value={username} 
            onChange={e => setUsername(e.target.value)} 
            required 
          />
          <input 
            type="password" 
            placeholder="Password" 
            className="input-field" 
            value={password} 
            onChange={e => setPassword(e.target.value)} 
            required 
          />
          <button type="submit" className="btn-primary" style={{ width: '100%', marginBottom: '1rem' }}>Login</button>
          <button type="button" onClick={handleGuestLogin} disabled={isGuestLoading} className="btn-secondary" style={{ width: '100%', background: '#333', color: 'white', border: '1px solid #555', padding: '12px', borderRadius: '4px', cursor: isGuestLoading ? 'not-allowed' : 'pointer', opacity: isGuestLoading ? 0.7 : 1 }}>{isGuestLoading ? 'Connecting...' : 'Play as Guest'}</button>
        </form>
        <p style={{ textAlign: 'center', marginTop: '1rem' }}>
          Don't have an account? <Link to="/register" style={{ color: 'var(--brand)' }}>Sign up</Link>
        </p>
      </div>
    </div>
  );
}
