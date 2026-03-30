import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

export default function UserChat() {
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const token = localStorage.getItem('token');
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  useEffect(() => {
    if (!token) {
      navigate('/login');
      return;
    }
    fetchRooms();
  }, [token, navigate]);

  const fetchRooms = async () => {
    try {
      const response = await axios.get('/api/rooms', { headers: { Authorization: `Bearer ${token}` } });
      setRooms(response.data);
      setLoading(false);
    } catch (error) {
      console.error('Error loading rooms:', error);
      setLoading(false);
    }
  };

  const openRoom = (roomId, roomName) => {
    navigate(`/chat/room/${roomId}/${encodeURIComponent(roomName)}`);
  };

  const logout = () => {
    localStorage.clear();
    navigate('/login');
  };

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>Загрузка...</div>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: '#fff' }}>
      <div style={{ padding: '20px 16px', borderBottom: '1px solid #e0e0e0' }}>
        <h2 style={{ fontSize: 24, fontWeight: 700 }}>Чаты</h2>
        <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
          <button onClick={logout} style={{ color: '#007AFF', background: 'none', border: 'none', fontSize: 14 }}>Выйти</button>
        </div>
      </div>
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {rooms.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center', color: '#8e8e93' }}>
            Нет доступных чатов
          </div>
        ) : (
          rooms.map(room => (
            <div
              key={room.id}
              onClick={() => openRoom(room.id, room.name)}
              style={{
                padding: '16px',
                cursor: 'pointer',
                borderBottom: '1px solid #e0e0e0',
                transition: 'background 0.2s'
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = '#f5f5f5'}
              onMouseLeave={(e) => e.currentTarget.style.background = '#fff'}
            >
              <div style={{ fontWeight: 600 }}>{room.name}</div>
              <div style={{ fontSize: 12, color: '#8e8e93', marginTop: 4 }}>
                {room.type === 'direct' ? 'Личный чат' : 'Групповой чат'} • {room.members?.length || 0} участников
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
