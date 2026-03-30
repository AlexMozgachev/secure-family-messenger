import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

export default function UserChat() {
  const [rooms, setRooms] = useState([]);
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [ws, setWs] = useState(null);
  const messagesEndRef = useRef(null);
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

  useEffect(() => {
    if (selectedRoom && token) {
      fetchMessages(selectedRoom.id);
      
      const socket = new WebSocket(`wss://${window.location.host}/ws/rooms/${selectedRoom.id}?token=${token}`);
      socket.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          setMessages(prev => [...prev, message]);
        } catch (e) {
          console.error('WebSocket error:', e);
        }
      };
      setWs(socket);
      return () => socket.close();
    }
  }, [selectedRoom, token]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const fetchRooms = async () => {
    try {
      const response = await axios.get('/api/rooms', { headers: { Authorization: `Bearer ${token}` } });
      setRooms(response.data);
      if (response.data.length > 0 && !selectedRoom) setSelectedRoom(response.data[0]);
      setLoading(false);
    } catch (error) {
      console.error('Error:', error);
      setLoading(false);
    }
  };

  const fetchMessages = async (roomId) => {
    try {
      const response = await axios.get(`/api/rooms/${roomId}/messages`, { headers: { Authorization: `Bearer ${token}` } });
      setMessages(response.data);
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const uploadImage = async (file) => {
    const formData = new FormData();
    formData.append('file', file);
    try {
      const response = await axios.post('/api/upload', formData, {
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'multipart/form-data' }
      });
      return response.data.file_url;
    } catch (error) {
      console.error('Upload error:', error);
      return null;
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() && !selectedFile) return;
    setUploading(true);
    let imageUrl = null;
    if (selectedFile) {
      imageUrl = await uploadImage(selectedFile);
      setSelectedFile(null);
    }
    try {
      await axios.post(`/api/rooms/${selectedRoom.id}/messages`, 
        { content: newMessage, image_url: imageUrl },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setNewMessage('');
    } catch (error) {
      console.error('Send error:', error);
    } finally {
      setUploading(false);
    }
  };

  const handleFileSelect = (e) => setSelectedFile(e.target.files[0]);
  const logout = () => { localStorage.clear(); navigate('/login'); };

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>Загрузка...</div>;

  return (
    <div style={{ display: 'flex', height: '100vh', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif' }}>
      {/* Список чатов — закреплённая шапка */}
      <div style={{ width: 320, background: '#fff', borderRight: '0.5px solid #e0e0e0', display: 'flex', flexDirection: 'column', height: '100vh' }}>
        <div style={{ position: 'sticky', top: 0, background: '#fff', zIndex: 10, padding: '20px 16px', borderBottom: '0.5px solid #e0e0e0' }}>
          <h2 style={{ fontSize: 24, fontWeight: 700 }}>Чаты</h2>
          <button onClick={logout} style={{ marginTop: 8, color: '#007AFF', background: 'none', border: 'none', fontSize: 14 }}>Выйти</button>
        </div>
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {rooms.map(room => (
            <div key={room.id} onClick={() => setSelectedRoom(room)} style={{ padding: '12px 16px', cursor: 'pointer', background: selectedRoom?.id === room.id ? '#e5e5ea' : '#fff', borderBottom: '0.5px solid #e0e0e0' }}>
              <div style={{ fontWeight: 600 }}>{room.name}</div>
              <div style={{ fontSize: 12, color: '#8e8e93' }}>{room.type === 'direct' ? 'Личный чат' : 'Групповой чат'}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Область чата — закреплённая шапка */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', height: '100vh' }}>
        {selectedRoom ? (
          <>
            <div style={{ position: 'sticky', top: 0, zIndex: 10, background: '#fff', padding: '12px 16px', borderBottom: '0.5px solid #e0e0e0' }}>
              <h2 style={{ fontSize: 17, fontWeight: 600 }}>{selectedRoom.name}</h2>
            </div>
            <div style={{ flex: 1, overflowY: 'auto', padding: '16px', background: 'linear-gradient(135deg, #1e3c72 0%, #2a5298 100%)', }}>
              {messages.map(msg => {
                const isOutgoing = msg.sender_id === user.id;
                return (
                  <div key={msg.id} style={{ display: 'flex', justifyContent: isOutgoing ? 'flex-end' : 'flex-start', marginBottom: 12 }}>
                    <div style={{
                      maxWidth: '70%',
                      padding: '8px 12px',
                      borderRadius: 18,
                      background: isOutgoing ? '#007AFF' : '#e5e5ea',
                      color: isOutgoing ? '#fff' : '#000',
                      borderBottomRightRadius: isOutgoing ? 4 : 18,
                      borderBottomLeftRadius: isOutgoing ? 18 : 4
                    }}>
                      <div style={{ fontSize: 12, opacity: 0.7, marginBottom: 4 }}>{msg.sender?.display_name || msg.sender?.username || msg.sender_id}</div>
                      {msg.image_url && (
                        <img src={msg.image_url} alt="image" style={{ maxWidth: '100%', borderRadius: 12, marginBottom: 8, cursor: 'pointer' }} onClick={() => window.open(msg.image_url)} />
                      )}
                      {msg.content && <div style={{ fontSize: 15 }}>{msg.content}</div>}
                      <div style={{ fontSize: 10, opacity: 0.6, marginTop: 4, textAlign: 'right' }}>{new Date(msg.created_at).toLocaleTimeString()}</div>
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>
            <div style={{ position: 'sticky', bottom: 0, background: '#fff', borderTop: '0.5px solid #e0e0e0', padding: '10px 16px' }}>
              <div style={{ display: 'flex', gap: 12 }}>
                <input type="file" accept="image/*" onChange={handleFileSelect} style={{ display: 'none' }} id="file-input" />
                <label htmlFor="file-input" style={{ background: '#f5f5f5', width: 40, height: 40, borderRadius: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: 20 }}>📷</label>
                <input type="text" value={newMessage} onChange={e => setNewMessage(e.target.value)} onKeyPress={e => e.key === 'Enter' && sendMessage()} placeholder="Сообщение" style={{ flex: 1, border: 'none', background: '#f5f5f5', padding: '10px 16px', borderRadius: 25, fontSize: 16 }} />
                <button onClick={sendMessage} disabled={uploading} style={{ background: '#007AFF', border: 'none', width: 40, height: 40, borderRadius: 50, color: '#fff', fontSize: 20, cursor: 'pointer' }}>➤</button>
              </div>
              {selectedFile && (
                <div style={{ marginTop: 8, fontSize: 12 }}>
                  📎 {selectedFile.name} <button onClick={() => setSelectedFile(null)} style={{ marginLeft: 8, color: 'red', background: 'none', border: 'none' }}>✕</button>
                </div>
              )}
            </div>
          </>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#8e8e93' }}>
            Выберите чат
          </div>
        )}
      </div>
    </div>
  );
}
