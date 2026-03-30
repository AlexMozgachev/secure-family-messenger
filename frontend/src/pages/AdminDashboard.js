import { useState, useEffect } from 'react';
import { Routes, Route, Link, useLocation } from 'react-router-dom';
import axios from 'axios';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Label } from '../components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { Badge } from '../components/ui/badge';
import { Users, MessageSquare, UserPlus, Ban, Trash2, Key, LogOut, RefreshCw, CheckCircle, XCircle, Activity, ShieldCheck, Languages, LayoutDashboard, Settings as SettingsIcon, Monitor } from 'lucide-react';
import { toast } from 'sonner';
import { translations } from '../i18n/translations';
import SystemMonitoring from './SystemMonitoring';
import Rooms from './Rooms';
import Settings from './Settings';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const AdminDashboard = ({ onLogout }) => {
  const location = useLocation();
  const [users, setUsers] = useState([]);
  const [stats, setStats] = useState({
    total_users: 0,
    total_rooms: 0,
    total_messages: 0,
    blocked_users: 0
  });
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState(null);
  const [showCreateUser, setShowCreateUser] = useState(false);
  const [showResetPassword, setShowResetPassword] = useState(false);
  const [showChangeRole, setShowChangeRole] = useState(false);
  const [newUser, setNewUser] = useState({
    username: '',
    password: '',
    display_name: ''
  });
  const [newPassword, setNewPassword] = useState('');
  const [currentUser, setCurrentUser] = useState(null);
  const [language, setLanguage] = useState(localStorage.getItem('language') || 'ru');
  
  const t = (key) => translations[language][key] || key;

  useEffect(() => {
    fetchCurrentUser();
    fetchUsers();
    fetchStats();
  }, []);

  const fetchCurrentUser = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API}/auth/me`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setCurrentUser(response.data);
    } catch (error) {
      console.error('Error fetching current user:', error);
    }
  };

  const fetchUsers = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API}/admin/users`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setUsers(response.data);
    } catch (error) {
      console.error('Error fetching users:', error);
      toast.error('Ошибка загрузки пользователей');
    }
  };

  const fetchStats = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API}/admin/stats`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setStats(response.data);
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateUser = async () => {
    try {
      const token = localStorage.getItem('token');
      await axios.post(`${API}/admin/users`, newUser, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Пользователь создан');
      setShowCreateUser(false);
      setNewUser({ username: '', password: '', display_name: '' });
      fetchUsers();
      fetchStats();
    } catch (error) {
      console.error('Error creating user:', error);
      toast.error('Ошибка создания пользователя');
    }
  };

  const handleResetPassword = async () => {
    try {
      const token = localStorage.getItem('token');
      await axios.put(`${API}/admin/users/${selectedUser.id}/password`, 
        { password: newPassword },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success('Пароль сброшен');
      setShowResetPassword(false);
      setNewPassword('');
    } catch (error) {
      console.error('Error resetting password:', error);
      toast.error('Ошибка сброса пароля');
    }
  };

  const handleBlockUser = async (userId, block) => {
    try {
      const token = localStorage.getItem('token');
      await axios.put(`${API}/admin/users/${userId}/${block ? 'block' : 'unblock'}`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success(block ? 'Пользователь заблокирован' : 'Пользователь разблокирован');
      fetchUsers();
      fetchStats();
    } catch (error) {
      console.error('Error blocking/unblocking user:', error);
      toast.error('Ошибка');
    }
  };

  const handleChangeRole = async () => {
    try {
      const token = localStorage.getItem('token');
      await axios.put(`${API}/admin/users/${selectedUser.id}/role`, 
        { is_admin: selectedUser.is_admin },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success('Роль изменена');
      setShowChangeRole(false);
      fetchUsers();
    } catch (error) {
      console.error('Error changing role:', error);
      toast.error('Ошибка изменения роли');
    }
  };

  const handleDeleteUser = async (userId) => {
    if (!window.confirm('Удалить пользователя?')) return;
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`${API}/admin/users/${userId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Пользователь удалён');
      fetchUsers();
      fetchStats();
    } catch (error) {
      console.error('Error deleting user:', error);
      toast.error('Ошибка удаления пользователя');
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center h-screen">Загрузка...</div>;
  }

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Sidebar */}
      <div className="w-64 bg-white border-r flex flex-col">
        <div className="p-4 border-b">
          <h2 className="text-xl font-bold">Secure Messenger</h2>
          <p className="text-sm text-gray-500">Панель администратора</p>
        </div>
        
        <div className="flex-1 p-4 space-y-2">
          <Link to="/admin">
            <Button variant={location.pathname === '/admin' ? "default" : "outline"} className="justify-start w-full">
              <LayoutDashboard className="mr-2 h-4 w-4" />
              Панель
            </Button>
          </Link>
          
          <Link to="/admin/users">
            <Button variant={location.pathname === '/admin/users' ? "default" : "outline"} className="justify-start w-full">
              <Users className="mr-2 h-4 w-4" />
              Пользователи
            </Button>
          </Link>
          
          <Link to="/admin/rooms">
            <Button variant={location.pathname === '/admin/rooms' ? "default" : "outline"} className="justify-start w-full">
              <MessageSquare className="mr-2 h-4 w-4" />
              Комнаты
            </Button>
          </Link>
          
          <Link to="/admin/monitoring">
            <Button variant={location.pathname === '/admin/monitoring' ? "default" : "outline"} className="justify-start w-full">
              <Activity className="mr-2 h-4 w-4" />
              Мониторинг
            </Button>
          </Link>
          
          <Link to="/admin/settings">
            <Button variant={location.pathname === '/admin/settings' ? "default" : "outline"} className="justify-start w-full">
              <SettingsIcon className="mr-2 h-4 w-4" />
              Настройки
            </Button>
          </Link>
        </div>
        
        <div className="p-4 border-t">
          <Button variant="ghost" className="justify-start w-full text-red-500" onClick={onLogout}>
            <LogOut className="mr-2 h-4 w-4" />
            Выйти
          </Button>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 overflow-auto">
        <Routes>
          <Route path="/" element={
            <div className="p-6">
              <h1 className="text-2xl font-bold mb-6">Панель управления</h1>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card>
                  <CardHeader>
                    <CardTitle>{stats.total_users}</CardTitle>
                    <CardDescription>Пользователей</CardDescription>
                  </CardHeader>
                </Card>
                <Card>
                  <CardHeader>
                    <CardTitle>{stats.total_rooms}</CardTitle>
                    <CardDescription>Комнат</CardDescription>
                  </CardHeader>
                </Card>
                <Card>
                  <CardHeader>
                    <CardTitle>{stats.total_messages}</CardTitle>
                    <CardDescription>Сообщений</CardDescription>
                  </CardHeader>
                </Card>
                <Card>
                  <CardHeader>
                    <CardTitle>{stats.blocked_users}</CardTitle>
                    <CardDescription>Заблокировано</CardDescription>
                  </CardHeader>
                </Card>
              </div>
            </div>
          } />
          
          <Route path="/users" element={
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold">Пользователи</h1>
                <Button onClick={() => setShowCreateUser(true)}>
                  <UserPlus className="mr-2 h-4 w-4" />
                  Создать пользователя
                </Button>
              </div>
              
              <div className="bg-white rounded-lg shadow">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Логин</TableHead>
                      <TableHead>Отображаемое имя</TableHead>
                      <TableHead>Роль</TableHead>
                      <TableHead>Статус</TableHead>
                      <TableHead>Действия</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users.map(user => (
                      <TableRow key={user.id}>
                        <TableCell>{user.username}</TableCell>
                        <TableCell>{user.display_name}</TableCell>
                        <TableCell>
                          <Badge variant={user.is_admin ? "default" : "secondary"}>
                            {user.is_admin ? 'Админ' : 'Пользователь'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={user.is_blocked ? "destructive" : "success"}>
                            {user.is_blocked ? 'Заблокирован' : 'Активен'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button size="sm" variant="outline" onClick={() => {
                              setSelectedUser(user);
                              setShowResetPassword(true);
                            }}>
                              <Key className="h-4 w-4" />
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => {
                              setSelectedUser(user);
                              setShowChangeRole(true);
                            }}>
                              <ShieldCheck className="h-4 w-4" />
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => handleBlockUser(user.id, !user.is_blocked)}>
                              {user.is_blocked ? <CheckCircle className="h-4 w-4" /> : <Ban className="h-4 w-4" />}
                            </Button>
                            <Button size="sm" variant="destructive" onClick={() => handleDeleteUser(user.id)}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          } />
          
          <Route path="/rooms" element={<Rooms />} />
          <Route path="/monitoring" element={<SystemMonitoring />} />
          <Route path="/settings" element={<Settings />} />
        </Routes>
      </div>

      {/* Create User Dialog */}
      <Dialog open={showCreateUser} onOpenChange={setShowCreateUser}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Создать пользователя</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Логин</Label>
              <Input value={newUser.username} onChange={e => setNewUser({...newUser, username: e.target.value})} />
            </div>
            <div>
              <Label>Пароль</Label>
              <Input type="password" value={newUser.password} onChange={e => setNewUser({...newUser, password: e.target.value})} />
            </div>
            <div>
              <Label>Отображаемое имя</Label>
              <Input value={newUser.display_name} onChange={e => setNewUser({...newUser, display_name: e.target.value})} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateUser(false)}>Отмена</Button>
            <Button onClick={handleCreateUser}>Создать</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reset Password Dialog */}
      <Dialog open={showResetPassword} onOpenChange={setShowResetPassword}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Сброс пароля</DialogTitle>
            <DialogDescription>Пользователь: {selectedUser?.username}</DialogDescription>
          </DialogHeader>
          <div>
            <Label>Новый пароль</Label>
            <Input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowResetPassword(false)}>Отмена</Button>
            <Button onClick={handleResetPassword}>Сохранить</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Change Role Dialog */}
      <Dialog open={showChangeRole} onOpenChange={setShowChangeRole}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Изменение роли</DialogTitle>
            <DialogDescription>Пользователь: {selectedUser?.username}</DialogDescription>
          </DialogHeader>
          <div>
            <Label>Роль</Label>
            <select 
              className="w-full border rounded p-2"
              value={selectedUser?.is_admin ? 'admin' : 'user'}
              onChange={e => setSelectedUser({...selectedUser, is_admin: e.target.value === 'admin'})}
            >
              <option value="user">Пользователь</option>
              <option value="admin">Администратор</option>
            </select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowChangeRole(false)}>Отмена</Button>
            <Button onClick={handleChangeRole}>Сохранить</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminDashboard;
