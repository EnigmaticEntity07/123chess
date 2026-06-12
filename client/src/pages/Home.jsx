import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import { HERO_KNIGHT_SVG } from '../game/pieces';
import { API_URL } from '../config';
import { useAuth } from '../context/AuthContext';

export default function Home() {
  const navigate = useNavigate();
  const { login, user } = useAuth();
  const [isGuestLoading, setIsGuestLoading] = useState(false);
  const [error, setError] = useState('');

  // Cursor tracking for spotlight + knight parallax
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const knightRef = useRef(null);

  const handleMouseMove = useCallback((e) => {
    setMousePos({ x: e.clientX, y: e.clientY });

    // Knight 3D tilt effect
    if (knightRef.current) {
      const rect = knightRef.current.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      const deltaX = (e.clientX - centerX) / (rect.width / 2);
      const deltaY = (e.clientY - centerY) / (rect.height / 2);

      const rotateY = Math.max(-15, Math.min(15, deltaX * 12));
      const rotateX = Math.max(-15, Math.min(15, -deltaY * 12));

      knightRef.current.style.transform =
        `perspective(600px) rotateY(${rotateY}deg) rotateX(${rotateX}deg) scale(1.02)`;
    }
  }, []);

  // Mock player count
  const [playerCount, setPlayerCount] = useState(142);
  useEffect(() => {
    const interval = setInterval(() => {
      setPlayerCount(prev => prev + Math.floor(Math.random() * 7) - 3);
    }, 4000);
    return () => clearInterval(interval);
  }, []);

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
      }
    } catch (err) {
      setError('Cannot reach the server.');
      console.error(err);
    } finally {
      setIsGuestLoading(false);
    }
  };

  return (
    <div onMouseMove={handleMouseMove}>
      {/* Interactive cursor-tracking background */}
      <div className="homepage-bg">
        <div className="cursor-grid" />
        <div
          className="cursor-spotlight"
          style={{ left: mousePos.x, top: mousePos.y }}
        />
      </div>

      <div className="container" style={{ position: 'relative', zIndex: 1 }}>
        <Navbar />

        <div className="hero-split">
          {/* Left: Typography & CTA */}
          <div className="hero-content">
            <div className="server-status fade-slide-up delay-1">
              <div className="status-dot" />
              <span>{playerCount} players online</span>
            </div>

            <h1 className="fade-slide-up delay-2">
              The Chess Experience, Reimagined
            </h1>

            <p className="fade-slide-up delay-3">
              Progressive chess where every turn escalates the tension. 
              White makes 1 move, Black makes 2, White makes 3 — can you survive the snowball?
            </p>

            {error && (
              <p className="auth-error fade-slide-up" style={{ marginBottom: '1rem', color: '#ef4444' }}>
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

          {/* Right: Floating 3D Knight */}
          <div className="hero-visual fade-slide-up delay-5">
            <div className="knight-glow" />
            <div
              ref={knightRef}
              className="floating-knight"
              dangerouslySetInnerHTML={{ __html: HERO_KNIGHT_SVG }}
            />
          </div>
        </div>

        {/* Action Cards */}
        <div className="action-cards">
          <Link to={user ? '/lobby' : '/register'} className="action-card fade-slide-up delay-3">
            <div className="action-card-icon">⚔️</div>
            <h3>Play Online</h3>
            <p>Challenge players in real-time progressive chess matches.</p>
          </Link>

          <Link to="/local-game" className="action-card fade-slide-up delay-4">
            <div className="action-card-icon">👥</div>
            <h3>Local Hotseat</h3>
            <p>Pass & play with a friend on the same device.</p>
          </Link>

          <div className="action-card disabled fade-slide-up delay-5">
            <div className="action-card-icon">🤖</div>
            <h3>Play Computer</h3>
            <p>Coming soon — test your skills against our engine.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
