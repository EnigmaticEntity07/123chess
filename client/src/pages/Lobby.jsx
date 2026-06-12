import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { io } from 'socket.io-client';
import { useAuth } from '../context/AuthContext';
import Navbar from '../components/Navbar';
import { API_URL } from '../config';

const TIME_PRESETS = [
  { label: 'Bullet 1+0',    baseMinutes: 1,  incrementSeconds: 0 },
  { label: 'Bullet 2+1',    baseMinutes: 2,  incrementSeconds: 1 },
  { label: 'Blitz 3+0',     baseMinutes: 3,  incrementSeconds: 0 },
  { label: 'Blitz 3+2',     baseMinutes: 3,  incrementSeconds: 2 },
  { label: 'Blitz 5+0',     baseMinutes: 5,  incrementSeconds: 0 },
  { label: 'Blitz 5+3',     baseMinutes: 5,  incrementSeconds: 3 },
  { label: 'Rapid 10+0',    baseMinutes: 10, incrementSeconds: 0 },
  { label: 'Rapid 15+10',   baseMinutes: 15, incrementSeconds: 10 },
  { label: 'Classical 30+0', baseMinutes: 30, incrementSeconds: 0 },
  { label: 'Unlimited',     baseMinutes: 0,  incrementSeconds: 0 },
];

export default function Lobby() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [rooms, setRooms] = useState([]);
  const [socket, setSocket] = useState(null);
  const [selectedPreset, setSelectedPreset] = useState(4); // default: Blitz 5+0
  const [isCustom, setIsCustom] = useState(false);
  const [customMinutes, setCustomMinutes] = useState(10);
  const [customIncrement, setCustomIncrement] = useState(0);

  useEffect(() => {
    const s = io(API_URL);
    setSocket(s);

    s.on('connect', () => {
      s.emit('join_lobby');
    });

    s.on('lobby_rooms', (availableRooms) => {
      setRooms(availableRooms);
    });

    s.on('room_created', ({ roomId, color }) => {
      navigate(`/game/${roomId}?color=${color}`);
    });

    s.on('room_joined', ({ roomId, color }) => {
      navigate(`/game/${roomId}?color=${color}`);
    });

    s.on('error', (msg) => {
      alert(msg);
    });

    return () => {
      s.disconnect();
    };
  }, [navigate]);

  const getTimeControl = () => {
    if (isCustom) {
      return { baseMinutes: customMinutes, incrementSeconds: customIncrement };
    }
    const preset = TIME_PRESETS[selectedPreset];
    return { baseMinutes: preset.baseMinutes, incrementSeconds: preset.incrementSeconds };
  };

  const handleCreateRoom = () => {
    if (socket) {
      const timeControl = getTimeControl();
      socket.emit('create_room', { userId: user.id, username: user.username, timeControl });
    }
  };

  const handleJoinRoom = (roomId) => {
    if (socket) {
      socket.emit('join_room', { roomId, userId: user.id, username: user.username });
    }
  };

  const formatTimeLabel = (tc) => {
    if (!tc || tc.baseMs <= 0) return 'Unlimited';
    const mins = Math.round(tc.baseMs / 60000);
    const inc = Math.round(tc.incrementMs / 1000);
    return `${mins}+${inc}`;
  };

  return (
    <>
      <Navbar />
      <div className="container">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
          <h2>Multiplayer Lobby</h2>
        </div>

        {/* Time Control Selector */}
        <div className="time-control-section">
          <h3 style={{ marginBottom: '1rem' }}>⏱ Time Control</h3>
          <div className="time-control-grid">
            {TIME_PRESETS.map((preset, idx) => (
              <button
                key={idx}
                className={`time-control-card ${!isCustom && selectedPreset === idx ? 'active' : ''}`}
                onClick={() => { setSelectedPreset(idx); setIsCustom(false); }}
              >
                <span className="tc-label">{preset.label}</span>
                {preset.baseMinutes > 0 ? (
                  <span className="tc-detail">{preset.baseMinutes}:{String(preset.incrementSeconds).padStart(2, '0')}</span>
                ) : (
                  <span className="tc-detail">∞</span>
                )}
              </button>
            ))}
            <button
              className={`time-control-card ${isCustom ? 'active' : ''}`}
              onClick={() => setIsCustom(true)}
            >
              <span className="tc-label">Custom</span>
              <span className="tc-detail">⚙</span>
            </button>
          </div>

          {isCustom && (
            <div className="custom-time-inputs">
              <div className="custom-input-group">
                <label>Minutes</label>
                <input
                  type="number"
                  className="input-field"
                  value={customMinutes}
                  onChange={e => setCustomMinutes(Math.max(1, Math.min(180, parseInt(e.target.value) || 1)))}
                  min={1}
                  max={180}
                />
              </div>
              <div className="custom-input-group">
                <label>Increment (sec)</label>
                <input
                  type="number"
                  className="input-field"
                  value={customIncrement}
                  onChange={e => setCustomIncrement(Math.max(0, Math.min(60, parseInt(e.target.value) || 0)))}
                  min={0}
                  max={60}
                />
              </div>
            </div>
          )}

          <button className="btn-primary create-game-btn" onClick={handleCreateRoom}>
            + Create New Game
          </button>
        </div>

        {/* Room List */}
        <h3 style={{ marginTop: '2rem', marginBottom: '1rem' }}>Open Games</h3>
        {rooms.length === 0 ? (
          <p style={{ textAlign: 'center', marginTop: '2rem', color: 'var(--text-secondary)' }}>No active games looking for players. Create one!</p>
        ) : (
          <div className="room-list">
            {rooms.map(room => (
              <div key={room.id} className="room-card">
                <div>
                  <h3 style={{ color: 'var(--text-primary)', marginBottom: '5px' }}>Match {room.id}</h3>
                  <p>Host: {room.hostName}</p>
                  {room.timeControl && (
                    <p style={{ color: 'var(--brand)', fontSize: '0.9rem', marginTop: '4px' }}>
                      ⏱ {formatTimeLabel(room.timeControl)}
                    </p>
                  )}
                  {!room.timeControl && (
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '4px' }}>
                      ∞ Unlimited
                    </p>
                  )}
                </div>
                <button className="btn-secondary" onClick={() => handleJoinRoom(room.id)}>Join Match</button>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
