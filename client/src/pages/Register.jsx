import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { API_URL } from '../config';

export default function Register() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isGuestLoading, setIsGuestLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      const data = await res.json();
      if (res.ok) {
        login(data.token, data.user);
        const params = new URLSearchParams(window.location.search);
        const redirect = params.get('redirect') || '/lobby';
        navigate(redirect);
      } else {
        setError(data.error || 'Registration failed');
      }
    } catch (err) {
      setError('Cannot reach the server. Make sure the backend is running on ' + API_URL);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGuestLogin = async () => {
    setIsGuestLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/auth/guest`, { method: 'POST' });
      const data = await res.json();
      if (res.ok) {
        login(data.token, data.user);
        const params = new URLSearchParams(window.location.search);
        const redirect = params.get('redirect') || '/lobby';
        navigate(redirect);
      } else {
        setError('Guest login failed');
      }
    } catch (err) {
      setError('Cannot reach the server. Make sure the backend is running on ' + API_URL);
    } finally {
      setIsGuestLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-box">
        <h2 style={{ textAlign: 'center', marginBottom: '2rem' }}>Create Account</h2>
        {error && <p className="auth-error">{error}</p>}
        <form onSubmit={handleSubmit}>
          <input 
            type="text" 
            placeholder="Username (min 3 chars)" 
            className="input-field" 
            value={username} 
            onChange={e => setUsername(e.target.value)} 
            required 
            disabled={isLoading}
            minLength={3}
          />
          <input 
            type="password" 
            placeholder="Password (min 4 chars)" 
            className="input-field" 
            value={password} 
            onChange={e => setPassword(e.target.value)} 
            required 
            disabled={isLoading}
            minLength={4}
          />
          <button 
            type="submit" 
            className="btn-primary" 
            style={{ width: '100%', marginBottom: '1rem' }}
            disabled={isLoading}
          >
            {isLoading ? 'Creating account...' : 'Sign Up'}
          </button>
          <button 
            type="button" 
            onClick={handleGuestLogin} 
            disabled={isGuestLoading || isLoading}
            className="btn-secondary" 
            style={{ width: '100%' }}
          >
            {isGuestLoading ? 'Connecting...' : 'Play as Guest'}
          </button>
        </form>
        <p style={{ textAlign: 'center', marginTop: '1rem' }}>
          Already have an account? <Link to="/login" style={{ color: 'var(--brand)' }}>Login</Link>
        </p>
      </div>
    </div>
  );
}
