import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { useNavigate, useParams } from 'react-router-dom';

export default function ChatRoom() {
  const { roomId, roomName } = useParams();
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [ws, setWs] = useState(null);
  const [wsConnected, setWsConnected] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const containerRef = useRef(null);
  const navigate = useNavigate();
  const token = localStorage.getItem('token');
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  useEffect(() => {
    if (!token) {
      navigate('/login');
      return;
    }
    if (!roomId) {
      navigate('/chat');
      return;
    }
    fetchMessages();
    connectWebSocket();
    
    return () => {
      if (ws) ws.close();
    };
  }, [roomId, token]);

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  // Принудительный скролл при фокусе на поле ввода
  useEffect(() => {
    const handleFocus = () => {
      setTimeout(() => {
        if (messagesEndRef.current) {
          messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
        }
        // Дополнительный скролл для iOS
        window.scrollTo(0, document.body.scrollHeight);
      }, 100);
    };
    
    const inputElement = inputRef.current;
    if (inputElement) {
      inputElement.addEventListener('focus', handleFocus);
      return () => inputElement.removeEventListener('focus', handleFocus);
    }
  }, []);

  const connectWebSocket = () => {
    const socket = new WebSocket(`wss://${window.location.host}/ws/rooms/${roomId}?token=${token}`);
    socket.onopen = () => setWsConnected(true);
    socket.onmessage = (event) => {
      const message = JSON.parse(event.data);
      setMessages(prev => [...prev, message]);
    };
    socket.onclose = () => setWsConnected(false);
    setWs(socket);
  };

  const fetchMessages = async () => {
    try {
      const response = await axios.get(`/api/rooms/${roomId}/messages`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setMessages(response.data);
      setLoading(false);
    } catch (error) {
      console.error('Error loading messages:', error);
      setLoading(false);
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
      await axios.post(`/api/rooms/${roomId}/messages`, 
        { content: newMessage, image_url: imageUrl },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setNewMessage('');
      setTimeout(() => {
        if (messagesEndRef.current) {
          messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
        }
      }, 100);
    } catch (error) {
      console.error('Send error:', error);
    } finally {
      setUploading(false);
    }
  };

  const handleFileSelect = (e) => setSelectedFile(e.target.files[0]);
  const goBack = () => navigate('/chat');

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>Загрузка...</div>;

  return (
    <div 
      ref={containerRef}
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100vh',
        width: '100%',
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'linear-gradient(135deg, #1e3c72 0%, #2a5298 100%)',
        overflow: 'hidden'
      }}
    >
      {/* Шапка чата */}
      <div style={{
        flexShrink: 0,
        background: '#fff',
        padding: '12px 16px',
        paddingTop: 'max(12px, env(safe-area-inset-top))',
        borderBottom: '1px solid #e0e0e0',
        display: 'flex',
        alignItems: 'center',
        gap: 16
      }}>
        <button onClick={goBack} style={{
          background: 'none',
          border: 'none',
          fontSize: 24,
          cursor: 'pointer',
          color: '#007AFF',
          padding: 0,
          width: 32,
          height: 32,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>←</button>
        <h2 style={{ fontSize: 17, fontWeight: 600, margin: 0, flex: 1 }}>{decodeURIComponent(roomName || 'Чат')}</h2>
        <div style={{ fontSize: 12 }}>
          {!wsConnected && <span style={{ color: '#ff6b6b' }}>🔴</span>}
          {wsConnected && <span style={{ color: '#34C759' }}>🟢</span>}
        </div>
      </div>

      {/* Сообщения */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        padding: '16px',
        WebkitOverflowScrolling: 'touch'
      }}>
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
                <div style={{ fontSize: 10, opacity: 0.6, marginTop: 4, textAlign: 'right' }}>
                  {new Date(msg.created_at).toLocaleTimeString()}
                  {isOutgoing && ' ✓'}
                </div>
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Панель ввода */}
      <div style={{
        flexShrink: 0,
        background: '#fff',
        borderTop: '1px solid #e0e0e0',
        padding: '12px',
        paddingBottom: 'max(12px, env(safe-area-inset-bottom))'
      }}>
        <textarea
          ref={inputRef}
          value={newMessage}
          onChange={e => setNewMessage(e.target.value)}
          onKeyPress={e => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              sendMessage();
            }
          }}
          placeholder="Сообщение"
          rows={1}
          style={{
            width: '100%',
            border: 'none',
            background: '#f5f5f5',
            padding: '12px 16px',
            borderRadius: 20,
            fontSize: 16,
            fontFamily: 'inherit',
            resize: 'none',
            outline: 'none',
            maxHeight: 100,
            overflowY: 'auto',
            boxSizing: 'border-box'
          }}
        />
        
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 10 }}>
          <div style={{ display: 'flex', gap: 12 }}>
            <input type="file" accept="image/*" onChange={handleFileSelect} style={{ display: 'none' }} id="file-input" />
            <label htmlFor="file-input" style={{
              background: '#f5f5f5',
              width: 40,
              height: 40,
              borderRadius: 50,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              fontSize: 20
            }}>📷</label>
          </div>
          <button onClick={sendMessage} disabled={uploading} style={{
            background: '#007AFF',
            border: 'none',
            width: 80,
            height: 40,
            borderRadius: 20,
            color: '#fff',
            fontSize: 16,
            fontWeight: 500,
            cursor: 'pointer',
            opacity: uploading ? 0.6 : 1
          }}>
            {uploading ? '⏳' : 'Отправить'}
          </button>
        </div>
        
        {selectedFile && (
          <div style={{ marginTop: 10, fontSize: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
            <span>📎 {selectedFile.name}</span>
            <button onClick={() => setSelectedFile(null)} style={{ color: 'red', background: 'none', border: 'none' }}>✕</button>
          </div>
        )}
      </div>
    </div>
  );
}
