import React, { useState, useEffect } from 'react';
import axios from 'axios';

export default function Rooms() {
  const [rooms, setRooms] = useState([]);
  const [users, setUsers] = useState([]);
  const [newRoomName, setNewRoomName] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [showMembersModal, setShowMembersModal] = useState(false);
  const token = localStorage.getItem('token');

  useEffect(() => {
    fetchRooms();
    fetchUsers();
  }, []);

  const fetchRooms = async () => {
    try {
      const response = await axios.get('/api/rooms', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setRooms(response.data);
      setLoading(false);
    } catch (error) {
      console.error('Ошибка загрузки комнат:', error);
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      const response = await axios.get('/api/admin/users', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setUsers(response.data);
    } catch (error) {
      console.error('Ошибка загрузки пользователей:', error);
    }
  };

  const createRoom = async () => {
    if (!newRoomName.trim()) return;
    try {
      await axios.post('/api/rooms', 
        { name: newRoomName, type: 'group' },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setNewRoomName('');
      fetchRooms();
    } catch (error) {
      console.error('Ошибка создания комнаты:', error);
      alert('Ошибка создания комнаты: ' + (error.response?.data?.detail || error.message));
    }
  };

  const deleteRoom = async (roomId) => {
    if (!window.confirm('Удалить эту комнату?')) return;
    try {
      await axios.delete(`/api/rooms/${roomId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchRooms();
    } catch (error) {
      console.error('Ошибка удаления комнаты:', error);
      alert('Ошибка удаления комнаты');
    }
  };
const addMember = async (roomId, userId) => {
  if (!userId) {
    alert('Выберите пользователя');
    return;
  }
  
  try {
    console.log('Добавляем участника:', { roomId, userId });
    const response = await axios.post(
      `/api/rooms/${roomId}/members`,
      { user_id: userId },
      { 
        headers: { 
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        } 
      }
    );
    console.log('Успешно:', response.data);
    alert('Пользователь добавлен');
    fetchRooms();
    setShowMembersModal(false);
  } catch (error) {
    console.error('Ошибка добавления участника:', error);
    console.error('Ответ сервера:', error.response?.data);
    alert('Ошибка добавления участника: ' + JSON.stringify(error.response?.data || error.message));
  }
};

  const removeMember = async (roomId, userId) => {
    try {
      await axios.delete(`/api/rooms/${roomId}/members/${userId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      alert('Пользователь удалён');
      fetchRooms();
    } catch (error) {
      console.error('Ошибка удаления участника:', error);
      alert('Ошибка удаления участника');
    }
  };

  const openMembersModal = (room) => {
    setSelectedRoom(room);
    setShowMembersModal(true);
  };

  if (loading) return <div className="p-6">Загрузка комнат...</div>;

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-4">Управление комнатами</h2>
      
      <div className="mb-6 flex gap-2">
        <input
          type="text"
          value={newRoomName}
          onChange={(e) => setNewRoomName(e.target.value)}
          placeholder="Название новой комнаты"
          className="border rounded px-3 py-2 flex-1"
        />
        <button
          onClick={createRoom}
          className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600"
        >
          Создать комнату
        </button>
      </div>

      <div className="bg-white rounded shadow overflow-x-auto">
        <table className="min-w-full">
          <thead>
            <tr className="border-b bg-gray-50">
              <th className="text-left py-3 px-4">Название чата</th>
              <th className="text-left py-3 px-4">Тип</th>
              <th className="text-left py-3 px-4">Участники</th>
              <th className="text-left py-3 px-4">Сообщений</th>
              <th className="text-left py-3 px-4">Последняя активность</th>
              <th className="text-left py-3 px-4">Действия</th>
             </tr>
          </thead>
          <tbody>
            {rooms.map(room => (
              <tr key={room.id} className="border-b hover:bg-gray-50">
                <td className="py-2 px-4">{room.name}</td>
                <td className="py-2 px-4">{room.type === 'direct' ? 'Личный чат' : 'Групповой чат'}</td>
                <td className="py-2 px-4">{room.members?.length || 0}</td>
                <td className="py-2 px-4">0</td>
                <td className="py-2 px-4">{room.last_activity ? new Date(room.last_activity).toLocaleString() : '—'}</td>
                <td className="py-2 px-4">
                  <button
                    onClick={() => openMembersModal(room)}
                    className="bg-blue-500 text-white px-2 py-1 rounded text-sm mr-2 hover:bg-blue-600"
                  >
                    Участники
                  </button>
                  <button
                    onClick={() => deleteRoom(room.id)}
                    className="bg-red-500 text-white px-2 py-1 rounded text-sm hover:bg-red-600"
                  >
                    Удалить
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Модальное окно управления участниками */}
      {showMembersModal && selectedRoom && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-96 max-h-96 overflow-auto">
            <h3 className="text-xl font-bold mb-4">Участники комнаты: {selectedRoom.name}</h3>
            <div className="mb-4">
              <h4 className="font-semibold mb-2">Добавить участника</h4>
              <select
                onChange={(e) => addMember(selectedRoom.id, e.target.value)}
                className="w-full border rounded px-3 py-2"
                value=""
              >
                <option value="">Выберите пользователя</option>
                {users.filter(u => !selectedRoom.members?.some(m => m.id === u.id)).map(user => (
                  <option key={user.id} value={user.id}>{user.username}</option>
                ))}
              </select>
            </div>
            <div>
              <h4 className="font-semibold mb-2">Текущие участники</h4>
              <ul className="space-y-2">
                {selectedRoom.members?.map(member => (
                  <li key={member.id} className="flex justify-between items-center border-b py-2">
                    <span>{member.username}</span>
                    <button
                      onClick={() => removeMember(selectedRoom.id, member.id)}
                      className="text-red-500 hover:text-red-700 text-sm"
                    >
                      Удалить
                    </button>
                  </li>
                ))}
              </ul>
            </div>
            <button
              onClick={() => setShowMembersModal(false)}
              className="mt-4 w-full bg-gray-300 text-gray-700 py-2 rounded hover:bg-gray-400"
            >
              Закрыть
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
