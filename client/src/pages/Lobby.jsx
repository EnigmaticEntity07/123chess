import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { io } from 'socket.io-client';
import { useAuth } from '../context/AuthContext';
import Navbar from '../components/Navbar';

export default function Lobby() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [rooms, setRooms] = useState([]);
  const [socket, setSocket] = useState(null);

  useEffect(() => {
    const s = io('http://localhost:3001');
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

  const handleCreateRoom = () => {
    if (socket) {
      socket.emit('create_room', { userId: user.id, username: user.username });
    }
  };

  const handleJoinRoom = (roomId) => {
    if (socket) {
      socket.emit('join_room', { roomId, userId: user.id, username: user.username });
    }
  };

  return (
    <>
      <Navbar />
      <div className="container">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
          <h2>Multiplayer Lobby</h2>
          <button className="btn-primary" onClick={handleCreateRoom}>+ Create New Game</button>
        </div>

        {rooms.length === 0 ? (
          <p style={{ textAlign: 'center', marginTop: '4rem' }}>No active games looking for players. Create one!</p>
        ) : (
          <div className="room-list">
            {rooms.map(room => (
              <div key={room.id} className="room-card">
                <div>
                  <h3 style={{ color: 'white', marginBottom: '5px' }}>Match {room.id}</h3>
                  <p>Host: {room.hostName}</p>
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
