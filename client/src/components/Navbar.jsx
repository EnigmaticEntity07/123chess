import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <nav className="nav container">
      <Link to="/" className="nav-brand">
        ♟ <span>Progressive Chess</span>
      </Link>
      <div className="nav-links">
        {user ? (
          <>
            <span>{user.username} (W: {user.wins} L: {user.losses})</span>
            <Link to="/lobby" className="btn-secondary">Lobby</Link>
            <button onClick={handleLogout} className="btn-secondary" style={{ padding: '8px 16px' }}>Logout</button>
          </>
        ) : (
          <>
            <Link to="/login" className="btn-secondary">Login</Link>
            <Link to="/register" className="btn-primary">Play Now</Link>
          </>
        )}
      </div>
    </nav>
  );
}
