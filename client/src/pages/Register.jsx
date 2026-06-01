import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { API_URL } from '../config';

export default function Register() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch(`${API_URL}/api/auth/register`, {
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
    try {
      const res = await fetch(`${API_URL}/api/auth/guest`, { method: 'POST' });
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

  return (
    <div className="auth-container">
      <div className="auth-box">
        <h2 style={{ textAlign: 'center', marginBottom: '2rem' }}>Create Account</h2>
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
          <button type="submit" className="btn-primary" style={{ width: '100%', marginBottom: '1rem' }}>Sign Up</button>
          <button type="button" onClick={handleGuestLogin} className="btn-secondary" style={{ width: '100%', background: '#333', color: 'white', border: '1px solid #555', padding: '12px', borderRadius: '4px', cursor: 'pointer' }}>Play as Guest</button>
        </form>
        <p style={{ textAlign: 'center', marginTop: '1rem' }}>
          Already have an account? <Link to="/login" style={{ color: 'var(--brand)' }}>Login</Link>
        </p>
      </div>
    </div>
  );
}
