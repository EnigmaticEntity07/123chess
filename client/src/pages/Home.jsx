import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import PuzzleHero from '../components/PuzzleHero';
import { API_URL } from '../config';
import { useAuth } from '../context/AuthContext';

export default function Home() {
  const navigate = useNavigate();
  const { login, user } = useAuth();
  const [isGuestLoading, setIsGuestLoading] = useState(false);
  const [error, setError] = useState('');

  const handleGuestLogin = async () => {
    setIsGuestLoading(true);
    setError('');
    try {
      const res = await fetch(`${API_URL}/api/auth/guest`, { method: 'POST' });
      const data = await res.json();
      if (res.ok) {
        login(data.token, data.user);
        const params = new URLSearchParams(window.location.search);
        const redirect = params.get('redirect') || '/lobby';
        navigate(redirect);
      } else {
        setError('Guest login failed. Please try again.');
        console.error('Guest login failed');
      }
    } catch (err) {
      setError('Cannot reach the server. Make sure the backend is running on ' + API_URL);
      console.error('Cannot reach the server.', err);
    } finally {
      setIsGuestLoading(false);
    }
  };

  return (
    <>
      <div className="ambient-bg">
        <div className="orb orb-1"></div>
        <div className="orb orb-2"></div>
      </div>
      
      <Navbar />

      <div className="container" style={{ position: 'relative', zIndex: 1 }}>
        <div className="hero-split">
          
          {/* Left Column: Typography & Actions */}
          <div className="hero-content">
            <div className="server-status fade-slide-up delay-1">
              <div className="status-dot"></div>
              <span>Server Online</span>
            </div>

            <h1 className="fade-slide-up delay-2">
              Find the Winning Move
            </h1>
            
            <p className="fade-slide-up delay-3">
              Play our classic progressive variant where turns escalate, or solve the daily puzzle. 
              <strong> White to move and Mate in 1.</strong> Try it directly on the board!
            </p>
            
            {error && (
              <p className="auth-error fade-slide-up delay-3" style={{ marginBottom: '1rem', color: '#ef4444' }}>
                {error}
              </p>
            )}

            <div className="hero-buttons fade-slide-up delay-4">
              {!user ? (
                <>
                  <Link to="/register" className="btn-primary" style={{ fontSize: '1.1rem', padding: '14px 28px' }}>
                    Start Playing Free
                  </Link>
                  <button 
                    onClick={handleGuestLogin} 
                    disabled={isGuestLoading} 
                    className="btn-secondary" 
                    style={{ fontSize: '1.1rem', padding: '14px 28px', background: 'rgba(255,255,255,0.05)' }}
                  >
                    {isGuestLoading ? 'Connecting...' : 'Play as Guest'}
                  </button>
                </>
              ) : (
                <Link to="/lobby" className="btn-primary" style={{ fontSize: '1.1rem', padding: '14px 28px' }}>
                  Enter Lobby
                </Link>
              )}
            </div>
          </div>

          {/* Right Column: Interactive Puzzle Game */}
          <div className="hero-visual fade-slide-up delay-5">
            <PuzzleHero />
          </div>

        </div>

        {/* Game Modes Grid */}
        <div className="modes-grid">
          <Link to={user ? "/lobby" : "/register"} className="mode-card fade-slide-up delay-2">
            <div className="mode-icon">⚔️</div>
            <h3>Play Online</h3>
            <p>Challenge players from around the world in real-time matchmaking.</p>
          </Link>
          
          <Link to="/local" className="mode-card fade-slide-up delay-3">
            <div className="mode-icon">👥</div>
            <h3>Local Hotseat</h3>
            <p>Play with a friend on the same device. Perfect for in-person battles.</p>
          </Link>

          <div className="mode-card fade-slide-up delay-4" style={{ cursor: 'not-allowed', opacity: 0.8 }}>
            <div className="mode-icon" style={{ filter: 'grayscale(1)' }}>🤖</div>
            <h3>Play Computer</h3>
            <p>Coming soon. Test your skills against our advanced progressive engine.</p>
          </div>

          <div className="mode-card fade-slide-up delay-5" style={{ cursor: 'not-allowed', opacity: 0.8 }}>
            <div className="mode-icon" style={{ filter: 'grayscale(1)' }}>🧩</div>
            <h3>Daily Puzzles</h3>
            <p>Coming soon. Solve complex progressive mates and combinations.</p>
          </div>
        </div>

      </div>
    </>
  );
}
