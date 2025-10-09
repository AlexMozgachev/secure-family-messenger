import { useState, useEffect } from 'react';
import { Routes, Route, Link, useLocation } from 'react-router-dom';
import axios from 'axios';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Label } from '../components/ui/label';
import { Alert, AlertDescription } from '../components/ui/alert';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { Badge } from '../components/ui/badge';
import { Users, MessageSquare, Shield, UserPlus, Ban, Trash2, Key, LogOut, RefreshCw, CheckCircle, XCircle, Activity, ShieldCheck, Languages, LayoutDashboard, Settings as SettingsIcon, Monitor } from 'lucide-react';
import { toast } from 'sonner';
import { translations } from '../i18n/translations';
import Settings from './Settings';
import SystemMonitoring from './SystemMonitoring';

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
  const [showUserDevices, setShowUserDevices] = useState(false);
  const [userDevices, setUserDevices] = useState([]);
  const [devicesLoading, setDevicesLoading] = useState(false);
  const [newUser, setNewUser] = useState({
    username: '',
    password: '',
    display_name: ''
  });
  const [newPassword, setNewPassword] = useState('');
  const [currentUser, setCurrentUser] = useState(null);
  const [language, setLanguage] = useState(localStorage.getItem('language') || 'ru');
  
  const t = (key) => translations[language][key] || key;
  
  const isActive = (path) => location.pathname === path;

  useEffect(() => {
    const user = localStorage.getItem('user');
    if (user) {
      setCurrentUser(JSON.parse(user));
    }
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [usersRes, statsRes] = await Promise.all([
        axios.get(`${API}/admin/users`),
        axios.get(`${API}/admin/stats`)
      ]);
      
      setUsers(usersRes.data);
      setStats(statsRes.data);
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Ошибка загрузки данных');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateUser = async () => {
    if (!newUser.username || !newUser.password) {
      toast.error('Заполните все обязательные поля');
      return;
    }

    try {
      await axios.post(`${API}/admin/users`, newUser);
      toast.success('Пользователь создан успешно');
      setShowCreateUser(false);
      setNewUser({ username: '', password: '', display_name: '' });
      loadData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Ошибка создания пользователя');
    }
  };

  const handleBlockUser = async (userId, isBlocked) => {
    try {
      const endpoint = isBlocked ? 'unblock' : 'block';
      await axios.put(`${API}/admin/users/${userId}/${endpoint}`);
      toast.success(isBlocked ? 'Пользователь разблокирован' : 'Пользователь заблокирован');
      loadData();
    } catch (error) {
      toast.error('Ошибка изменения статуса пользователя');
    }
  };

  const handleDeleteUser = async (userId) => {
    if (!window.confirm('Вы уверены, что хотите удалить этого пользователя?')) {
      return;
    }

    try {
      await axios.delete(`${API}/admin/users/${userId}`);
      toast.success('Пользователь удалён');
      loadData();
    } catch (error) {
      toast.error('Ошибка удаления пользователя');
    }
  };

  const handleResetPassword = async () => {
    if (!newPassword || newPassword.length < 6) {
      toast.error(t('password_min_length'));
      return;
    }

    try {
      const formData = new FormData();
      formData.append('new_password', newPassword);
      
      await axios.put(`${API}/admin/users/${selectedUser.id}/password`, formData);
      toast.success(t('password_reset'));
      setShowResetPassword(false);
      setNewPassword('');
      setSelectedUser(null);
    } catch (error) {
      toast.error(t('error_operation'));
    }
  };

  const handleChangeRole = async (makeAdmin) => {
    try {
      const formData = new FormData();
      formData.append('is_admin', makeAdmin);
      
      await axios.put(`${API}/admin/users/${selectedUser.id}/role`, formData);
      toast.success(t('role_changed'));
      setShowChangeRole(false);
      setSelectedUser(null);
      loadData();
    } catch (error) {
      toast.error(error.response?.data?.detail || t('error_operation'));
    }
  };

  const toggleLanguage = () => {
    const newLang = language === 'ru' ? 'en' : 'ru';
    setLanguage(newLang);
    localStorage.setItem('language', newLang);
  };

  const handleViewUserDevices = async (user) => {
    setSelectedUser(user);
    setShowUserDevices(true);
    setDevicesLoading(true);
    setUserDevices([]);
    
    try {
      const response = await axios.get(`${API}/users/${user.id}/devices`);
      setUserDevices(response.data);
    } catch (error) {
      console.error('Error loading user devices:', error);
      toast.error('Ошибка загрузки устройств пользователя');
    } finally {
      setDevicesLoading(false);
    }
  };

  const handleDisconnectUserDevice = async (sessionId) => {
    if (!window.confirm('Отключить это устройство?')) {
      return;
    }

    try {
      await axios.delete(`${API}/devices/${sessionId}`);
      toast.success('Устройство отключено');
      // Перезагрузить список устройств
      if (selectedUser) {
        handleViewUserDevices(selectedUser);
      }
    } catch (error) {
      toast.error('Ошибка отключения устройства');
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Никогда';
    const date = new Date(dateString);
    return date.toLocaleString('ru-RU');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
        <div className="text-white text-xl">Загрузка...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Header */}
      <header className="glass border-b border-slate-700 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-6">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-lg flex items-center justify-center">
                  <Shield className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-white">Secure Messenger</h1>
                  <p className="text-sm text-slate-400">{t('admin_panel')}</p>
                </div>
              </div>
              
              <nav className="flex items-center space-x-2">
                <Link to="/admin">
                  <Button
                    variant={isActive('/admin') ? 'default' : 'ghost'}
                    className={isActive('/admin') ? 'bg-slate-700' : 'text-slate-300 hover:bg-slate-800'}
                  >
                    <LayoutDashboard className="w-4 h-4 mr-2" />
                    {t('dashboard')}
                  </Button>
                </Link>
                <Link to="/admin/settings">
                  <Button
                    variant={isActive('/admin/settings') ? 'default' : 'ghost'}
                    className={isActive('/admin/settings') ? 'bg-slate-700' : 'text-slate-300 hover:bg-slate-800'}
                  >
                    <SettingsIcon className="w-4 h-4 mr-2" />
                    {t('settings')}
                  </Button>
                </Link>
              </nav>
            </div>
            <div className="flex items-center space-x-4">
              <Button
                onClick={toggleLanguage}
                variant="outline"
                className="border-slate-600 text-slate-300 hover:bg-slate-800"
                data-testid="language-toggle-btn"
              >
                <Languages className="w-4 h-4 mr-2" />
                {language.toUpperCase()}
              </Button>
              <div className="text-right">
                <p className="text-sm font-medium text-white">{currentUser?.display_name}</p>
                <p className="text-xs text-slate-400">{t('administrator')}</p>
              </div>
              <Button
                onClick={onLogout}
                variant="outline"
                className="border-slate-600 text-slate-300 hover:bg-slate-800"
                data-testid="logout-btn"
              >
                <LogOut className="w-4 h-4 mr-2" />
                {t('logout')}
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Routes>
          <Route path="/" element={
            <>
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="glass border-slate-700 card-hover">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-slate-400 text-sm font-medium">{t('users')}</p>
                  <p className="text-3xl font-bold text-white mt-1" data-testid="stat-total-users">{stats.total_users}</p>
                </div>
                <div className="w-12 h-12 bg-cyan-500/10 rounded-lg flex items-center justify-center">
                  <Users className="w-6 h-6 text-cyan-400" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="glass border-slate-700 card-hover">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-slate-400 text-sm font-medium">{t('rooms')}</p>
                  <p className="text-3xl font-bold text-white mt-1" data-testid="stat-total-rooms">{stats.total_rooms}</p>
                </div>
                <div className="w-12 h-12 bg-blue-500/10 rounded-lg flex items-center justify-center">
                  <MessageSquare className="w-6 h-6 text-blue-400" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="glass border-slate-700 card-hover">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-slate-400 text-sm font-medium">{t('messages')}</p>
                  <p className="text-3xl font-bold text-white mt-1" data-testid="stat-total-messages">{stats.total_messages}</p>
                </div>
                <div className="w-12 h-12 bg-emerald-500/10 rounded-lg flex items-center justify-center">
                  <Activity className="w-6 h-6 text-emerald-400" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="glass border-slate-700 card-hover">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-slate-400 text-sm font-medium">{t('blocked')}</p>
                  <p className="text-3xl font-bold text-white mt-1" data-testid="stat-blocked-users">{stats.blocked_users}</p>
                </div>
                <div className="w-12 h-12 bg-red-500/10 rounded-lg flex items-center justify-center">
                  <Ban className="w-6 h-6 text-red-400" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* System Monitoring */}
        <SystemMonitoring 
          language={language} 
          t={t} 
        />

        {/* Users Table */}
        <Card className="glass border-slate-700">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-white text-xl">Пользователи</CardTitle>
                <CardDescription className="text-slate-400">Управление учётными записями</CardDescription>
              </div>
              <div className="flex space-x-3">
                <Button
                  onClick={loadData}
                  variant="outline"
                  className="border-slate-600 text-slate-300 hover:bg-slate-800"
                  data-testid="refresh-btn"
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Обновить
                </Button>
                <Dialog open={showCreateUser} onOpenChange={setShowCreateUser}>
                  <DialogTrigger asChild>
                    <Button
                      className="bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white"
                      data-testid="create-user-btn"
                    >
                      <UserPlus className="w-4 h-4 mr-2" />
                      Создать пользователя
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="glass border-slate-700">
                    <DialogHeader>
                      <DialogTitle className="text-white">Новый пользователь</DialogTitle>
                      <DialogDescription className="text-slate-400">
                        Создайте новую учётную запись пользователя
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div className="space-y-2">
                        <Label htmlFor="new-username" className="text-slate-200">Логин *</Label>
                        <Input
                          id="new-username"
                          value={newUser.username}
                          onChange={(e) => setNewUser({ ...newUser, username: e.target.value })}
                          className="bg-slate-800 border-slate-600 text-white"
                          data-testid="new-user-username-input"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="new-password" className="text-slate-200">Пароль *</Label>
                        <Input
                          id="new-password"
                          type="password"
                          value={newUser.password}
                          onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                          className="bg-slate-800 border-slate-600 text-white"
                          data-testid="new-user-password-input"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="new-display-name" className="text-slate-200">Отображаемое имя</Label>
                        <Input
                          id="new-display-name"
                          value={newUser.display_name}
                          onChange={(e) => setNewUser({ ...newUser, display_name: e.target.value })}
                          className="bg-slate-800 border-slate-600 text-white"
                        />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button
                        onClick={handleCreateUser}
                        className="bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white"
                        data-testid="create-user-submit-btn"
                      >
                        Создать
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-slate-700 hover:bg-slate-800/50">
                    <TableHead className="text-slate-300">Логин</TableHead>
                    <TableHead className="text-slate-300">Отображаемое имя</TableHead>
                    <TableHead className="text-slate-300">Статус</TableHead>
                    <TableHead className="text-slate-300">Роль</TableHead>
                    <TableHead className="text-slate-300">Последний вход</TableHead>
                    <TableHead className="text-slate-300 text-right">Действия</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((user) => (
                    <TableRow key={user.id} className="border-slate-700 hover:bg-slate-800/30">
                      <TableCell className="font-medium text-white">{user.username}</TableCell>
                      <TableCell className="text-slate-300">{user.display_name}</TableCell>
                      <TableCell>
                        {user.is_blocked ? (
                          <Badge variant="destructive" className="bg-red-500/20 text-red-400 border-red-500/50">
                            <XCircle className="w-3 h-3 mr-1" />
                            Заблокирован
                          </Badge>
                        ) : (
                          <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/50">
                            <CheckCircle className="w-3 h-3 mr-1" />
                            Активен
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {user.is_admin ? (
                          <Badge className="bg-cyan-500/20 text-cyan-400 border-cyan-500/50">Админ</Badge>
                        ) : (
                          <Badge variant="outline" className="border-slate-600 text-slate-400">Пользователь</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-slate-400 text-sm">{formatDate(user.last_login)}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end space-x-2">
                          <Button
                            size="sm"
                            variant="outline"
                            className="border-slate-600 text-slate-300 hover:bg-slate-800"
                            onClick={() => {
                              setSelectedUser(user);
                              setShowResetPassword(true);
                            }}
                            data-testid={`reset-password-btn-${user.username}`}
                          >
                            <Key className="w-4 h-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="border-purple-600 text-purple-400 hover:bg-purple-900/20"
                            onClick={() => {
                              setSelectedUser(user);
                              setShowChangeRole(true);
                            }}
                            disabled={user.id === currentUser?.id}
                            data-testid={`change-role-btn-${user.username}`}
                          >
                            <ShieldCheck className="w-4 h-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="border-blue-600 text-blue-400 hover:bg-blue-900/20"
                            onClick={() => handleViewUserDevices(user)}
                            data-testid={`view-devices-btn-${user.username}`}
                          >
                            <Monitor className="w-4 h-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className={user.is_blocked ? 'border-emerald-600 text-emerald-400 hover:bg-emerald-900/20' : 'border-red-600 text-red-400 hover:bg-red-900/20'}
                            onClick={() => handleBlockUser(user.id, user.is_blocked)}
                            disabled={user.is_admin}
                            data-testid={`block-user-btn-${user.username}`}
                          >
                            <Ban className="w-4 h-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="border-red-600 text-red-400 hover:bg-red-900/20"
                            onClick={() => handleDeleteUser(user.id)}
                            disabled={user.is_admin}
                            data-testid={`delete-user-btn-${user.username}`}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
            </>
          } />
          <Route path="/settings" element={<Settings language={language} t={t} />} />
        </Routes>
      </main>

      {/* Reset Password Dialog */}
      <Dialog open={showResetPassword} onOpenChange={setShowResetPassword}>
        <DialogContent className="glass border-slate-700">
          <DialogHeader>
            <DialogTitle className="text-white">{t('reset_password_title')}</DialogTitle>
            <DialogDescription className="text-slate-400">
              {t('reset_password_desc')} {selectedUser?.username}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="reset-password" className="text-slate-200">{t('new_password')}</Label>
              <Input
                id="reset-password"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="bg-slate-800 border-slate-600 text-white"
                placeholder={t('min_6_chars')}
                data-testid="reset-password-input"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowResetPassword(false);
                setNewPassword('');
                setSelectedUser(null);
              }}
              className="border-slate-600 text-slate-300 hover:bg-slate-800"
            >
              {t('cancel')}
            </Button>
            <Button
              onClick={handleResetPassword}
              className="bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white"
              data-testid="reset-password-submit-btn"
            >
              {t('reset_password')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Change Role Dialog */}
      <Dialog open={showChangeRole} onOpenChange={setShowChangeRole}>
        <DialogContent className="glass border-slate-700">
          <DialogHeader>
            <DialogTitle className="text-white">{t('change_role_title')}</DialogTitle>
            <DialogDescription className="text-slate-400">
              {t('change_role_desc')}: {selectedUser?.username}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="text-center space-y-4">
              <p className="text-slate-300">
                {t('role')}: <span className="font-semibold text-white">{selectedUser?.is_admin ? t('admin') : t('user')}</span>
              </p>
              <div className="flex gap-3 justify-center">
                <Button
                  onClick={() => handleChangeRole(true)}
                  disabled={selectedUser?.is_admin}
                  className="bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700 text-white"
                  data-testid="make-admin-btn"
                >
                  <ShieldCheck className="w-4 h-4 mr-2" />
                  {t('make_admin')}
                </Button>
                <Button
                  onClick={() => handleChangeRole(false)}
                  disabled={!selectedUser?.is_admin}
                  variant="outline"
                  className="border-slate-600 text-slate-300 hover:bg-slate-800"
                  data-testid="make-user-btn"
                >
                  {t('make_user')}
                </Button>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowChangeRole(false);
                setSelectedUser(null);
              }}
              className="border-slate-600 text-slate-300 hover:bg-slate-800"
            >
              {t('cancel')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminDashboard;
