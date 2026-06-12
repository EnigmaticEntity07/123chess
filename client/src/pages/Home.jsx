import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import { API_URL } from '../config';
import { useAuth } from '../context/AuthContext';

export default function Home() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [isGuestLoading, setIsGuestLoading] = useState(false);

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
        console.error('Guest login failed');
      }
    } catch (err) {
      console.error('Cannot reach the server.');
    } finally {
      setIsGuestLoading(false);
    }
  };
  return (
    <>
      <Navbar />
      <div className="container hero">
        <h1>Next-Gen 123Chess</h1>
        <p style={{ fontSize: '1.2rem', marginBottom: '2rem' }}>
          Experience the intense Italian variant where each turn grows longer.<br/>
          White makes 1 move, Black makes 2, White makes 3... Can you survive the escalation?
        </p>
        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
          <Link to="/register" className="btn-primary" style={{ fontSize: '1.2rem', padding: '16px 32px' }}>
            Start Playing Free
          </Link>
          <button onClick={handleGuestLogin} disabled={isGuestLoading} className="btn-secondary" style={{ fontSize: '1.2rem', padding: '16px 32px', background: '#333', color: 'white', border: '1px solid #555', borderRadius: '4px', cursor: isGuestLoading ? 'not-allowed' : 'pointer', opacity: isGuestLoading ? 0.7 : 1 }}>
            {isGuestLoading ? 'Connecting...' : 'Play as Guest'}
          </button>
        </div>
      </div>
    </>
  );
}
