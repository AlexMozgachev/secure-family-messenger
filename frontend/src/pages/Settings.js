import { useState, useEffect } from 'react';
import axios from 'axios';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Textarea } from '../components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Label } from '../components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { Badge } from '../components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Server, Shield, Database, MessageSquare, Ban, MapPin, Trash2, Plus, AlertTriangle, CheckCircle, XCircle, Monitor, Download, Upload, Save } from 'lucide-react';
import { toast } from 'sonner';
import Security from './Security';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const Settings = ({ language, t }) => {
  const [settings, setSettings] = useState(null);
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showBackupDialog, setShowBackupDialog] = useState(false);
  const [showRestoreDialog, setShowRestoreDialog] = useState(false);
  const [backupOptions, setBackupOptions] = useState({
    include_settings: true,
    include_users: true,
    include_messages: true
  });
  const [backupData, setBackupData] = useState('');
  const [restoreData, setRestoreData] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [settingsRes, roomsRes] = await Promise.all([
        axios.get(`${API}/admin/settings`).catch(() => ({ data: null })),
        axios.get(`${API}/admin/rooms/stats`)
      ]);
      
      setSettings(settingsRes.data);
      setRooms(roomsRes.data.rooms || []);
    } catch (error) {
      console.error('Error loading settings:', error);
      toast.error(t('error_loading'));
    } finally {
      setLoading(false);
    }
  };

  const handleSaveSettings = async () => {
    try {
      await axios.put(`${API}/admin/settings`, settings);
      toast.success(t('settings_saved'));
      loadData();
    } catch (error) {
      toast.error(t('error_operation'));
    }
  };

  const handleRenewSSL = async (forDomain) => {
    try {
      await axios.post(`${API}/admin/ssl/renew`, { for_domain: forDomain });
      toast.success(t('ssl_renewed'));
      loadData();
    } catch (error) {
      toast.error(t('error_operation'));
    }
  };

  const handleCreateBackup = async () => {
    try {
      const response = await axios.post(`${API}/admin/backup`, backupOptions);
      setBackupData(response.data.backup_data);
      
      // Download backup
      const blob = new Blob([response.data.backup_data], { type: 'application/json' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `backup-${new Date().toISOString()}.json`;
      a.click();
      
      toast.success(t('backup_created'));
      setShowBackupDialog(false);
    } catch (error) {
      toast.error(t('error_operation'));
    }
  };

  const handleRestoreBackup = async () => {
    if (!restoreData) {
      toast.error(t('fill_all_fields'));
      return;
    }

    try {
      const response = await axios.post(`${API}/admin/restore`, { backup_data: restoreData });
      toast.success(t('backup_restored'));
      setShowRestoreDialog(false);
      setRestoreData('');
      loadData();
    } catch (error) {
      toast.error(error.response?.data?.detail || t('error_operation'));
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return t('never');
    const date = new Date(dateString);
    return date.toLocaleString(language === 'ru' ? 'ru-RU' : 'en-US');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-white text-xl">Загрузка...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">{t('settings')}</h2>
          <p className="text-slate-400">Управление настройками сервера</p>
        </div>
      </div>

      <Tabs defaultValue="server" className="w-full">
        <TabsList className="glass border-slate-700">
          <TabsTrigger value="server" className="data-[state=active]:bg-slate-700">
            <Server className="w-4 h-4 mr-2" />
            {t('server_settings')}
          </TabsTrigger>
          <TabsTrigger value="ssl" className="data-[state=active]:bg-slate-700">
            <Shield className="w-4 h-4 mr-2" />
            {t('ssl_management')}
          </TabsTrigger>
          <TabsTrigger value="backup" className="data-[state=active]:bg-slate-700">
            <Database className="w-4 h-4 mr-2" />
            {t('backup_restore')}
          </TabsTrigger>
          <TabsTrigger value="chats" className="data-[state=active]:bg-slate-700">
            <MessageSquare className="w-4 h-4 mr-2" />
            {t('chats_metadata')}
          </TabsTrigger>
          <TabsTrigger value="security" className="data-[state=active]:bg-slate-700">
            <Ban className="w-4 h-4 mr-2" />
            {t('security')}
          </TabsTrigger>
        </TabsList>

        {/* Server Settings */}
        <TabsContent value="server" className="space-y-4">
          <Card className="glass border-slate-700">
            <CardHeader>
              <CardTitle className="text-white">{t('server_settings')}</CardTitle>
              <CardDescription className="text-slate-400">
                Основные настройки сервера
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label className="text-slate-200">{t('server_name')}</Label>
                <Input
                  value={settings?.server_name || ''}
                  onChange={(e) => setSettings({ ...settings, server_name: e.target.value })}
                  className="bg-slate-800 border-slate-600 text-white"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-slate-200">{t('connection_settings')}</Label>
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-slate-800 rounded-lg">
                    <p className="text-slate-400 text-sm mb-1">Тип подключения</p>
                    <p className="text-white font-semibold">{settings?.connection_type === 'domain' ? 'Домен' : 'IP адрес'}</p>
                  </div>
                  <div className="p-4 bg-slate-800 rounded-lg">
                    <p className="text-slate-400 text-sm mb-1">
                      {settings?.connection_type === 'domain' ? t('current_domain') : t('current_ip')}
                    </p>
                    <p className="text-white font-mono">
                      {settings?.connection_type === 'domain' ? settings?.domain : settings?.ip_address}
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-slate-200">
                  {settings?.connection_type === 'domain' ? 'Домен' : 'IP адрес'}
                </Label>
                <Input
                  value={settings?.connection_type === 'domain' ? (settings?.domain || '') : (settings?.ip_address || '')}
                  onChange={(e) => {
                    if (settings?.connection_type === 'domain') {
                      setSettings({ ...settings, domain: e.target.value });
                    } else {
                      setSettings({ ...settings, ip_address: e.target.value });
                    }
                  }}
                  className="bg-slate-800 border-slate-600 text-white"
                  placeholder={settings?.connection_type === 'domain' ? 'messenger.example.com' : '192.168.1.1'}
                />
              </div>

              <Button
                onClick={handleSaveSettings}
                className="bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white"
              >
                <Save className="w-4 h-4 mr-2" />
                {t('save_settings')}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* SSL Management */}
        <TabsContent value="ssl" className="space-y-4">
          <Card className="glass border-slate-700">
            <CardHeader>
              <CardTitle className="text-white">{t('ssl_management')}</CardTitle>
              <CardDescription className="text-slate-400">
                Управление SSL сертификатами
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 bg-slate-800 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-slate-400 text-sm">{t('ssl_status')}</p>
                    {settings?.ssl_enabled ? (
                      <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/50">
                        <CheckCircle className="w-3 h-3 mr-1" />
                        Активен
                      </Badge>
                    ) : (
                      <Badge className="bg-slate-500/20 text-slate-400 border-slate-500/50">
                        <XCircle className="w-3 h-3 mr-1" />
                        Неактивен
                      </Badge>
                    )}
                  </div>
                  {settings?.ssl_expires_at && (
                    <p className="text-white text-sm">
                      {t('ssl_expires')}: {formatDate(settings.ssl_expires_at)}
                    </p>
                  )}
                </div>

                <div className="p-4 bg-slate-800 rounded-lg">
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="auto_ssl"
                      checked={settings?.ssl_auto_renew || false}
                      onChange={(e) => setSettings({ ...settings, ssl_auto_renew: e.target.checked })}
                      className="w-4 h-4"
                    />
                    <label htmlFor="auto_ssl" className="text-slate-300 text-sm">
                      {t('auto_renew_ssl')}
                    </label>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                {!settings?.ssl_enabled && (
                  <Button
                    onClick={() => handleInstallSSL()}
                    className="w-full bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white"
                  >
                    <Shield className="w-4 h-4 mr-2" />
                    {t('install_ssl_certificate')}
                  </Button>
                )}
                
                {settings?.ssl_enabled && (
                  <div className="flex gap-3">
                    <Button
                      onClick={() => handleRenewSSL(true)}
                      className="flex-1 bg-gradient-to-r from-emerald-500 to-cyan-600 hover:from-emerald-600 hover:to-cyan-700 text-white"
                    >
                      <Shield className="w-4 h-4 mr-2" />
                      {t('renew_domain_ssl')}
                    </Button>
                    <Button
                      onClick={() => handleRenewSSL(false)}
                      variant="outline"
                      className="flex-1 border-slate-600 text-slate-300 hover:bg-slate-800"
                    >
                      <Shield className="w-4 h-4 mr-2" />
                      {t('renew_ip_ssl')}
                    </Button>
                  </div>
                )}
              </div>

              <Button
                onClick={handleSaveSettings}
                className="w-full bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white"
              >
                <Save className="w-4 h-4 mr-2" />
                {t('save_settings')}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Backup & Restore */}
        <TabsContent value="backup" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="glass border-slate-700">
              <CardHeader>
                <CardTitle className="text-white">{t('create_backup')}</CardTitle>
                <CardDescription className="text-slate-400">
                  Создать резервную копию данных
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="backup_settings"
                      checked={backupOptions.include_settings}
                      onChange={(e) => setBackupOptions({ ...backupOptions, include_settings: e.target.checked })}
                      className="w-4 h-4"
                    />
                    <label htmlFor="backup_settings" className="text-slate-300 text-sm">
                      {t('include_settings')}
                    </label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="backup_users"
                      checked={backupOptions.include_users}
                      onChange={(e) => setBackupOptions({ ...backupOptions, include_users: e.target.checked })}
                      className="w-4 h-4"
                    />
                    <label htmlFor="backup_users" className="text-slate-300 text-sm">
                      {t('include_users')}
                    </label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="backup_chats"
                      checked={backupOptions.include_messages}
                      onChange={(e) => setBackupOptions({ ...backupOptions, include_messages: e.target.checked })}
                      className="w-4 h-4"
                    />
                    <label htmlFor="backup_chats" className="text-slate-300 text-sm">
                      {t('include_chats')}
                    </label>
                  </div>
                </div>

                <Dialog open={showBackupDialog} onOpenChange={setShowBackupDialog}>
                  <DialogTrigger asChild>
                    <Button className="w-full bg-gradient-to-r from-emerald-500 to-cyan-600 hover:from-emerald-600 hover:to-cyan-700 text-white">
                      <Download className="w-4 h-4 mr-2" />
                      {t('create_backup')}
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="glass border-slate-700">
                    <DialogHeader>
                      <DialogTitle className="text-white">Создать бэкап?</DialogTitle>
                      <DialogDescription className="text-slate-400">
                        Файл будет автоматически скачан
                      </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                      <Button onClick={handleCreateBackup} className="bg-gradient-to-r from-emerald-500 to-cyan-600 hover:from-emerald-600 hover:to-cyan-700 text-white">
                        {t('create_backup')}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </CardContent>
            </Card>

            <Card className="glass border-slate-700">
              <CardHeader>
                <CardTitle className="text-white">{t('restore_backup')}</CardTitle>
                <CardDescription className="text-slate-400">
                  Восстановить из резервной копии
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-slate-200">JSON бэкап</Label>
                  <Textarea
                    value={restoreData}
                    onChange={(e) => setRestoreData(e.target.value)}
                    className="bg-slate-800 border-slate-600 text-white font-mono text-xs"
                    placeholder='{"version": "1.0.0", ...}'
                    rows={6}
                  />
                </div>

                <input
                  type="file"
                  accept=".json"
                  onChange={(e) => {
                    const file = e.target.files[0];
                    if (file) {
                      const reader = new FileReader();
                      reader.onload = (e) => setRestoreData(e.target.result);
                      reader.readAsText(file);
                    }
                  }}
                  className="hidden"
                  id="restore-file"
                />

                <div className="flex gap-3">
                  <Button
                    onClick={() => document.getElementById('restore-file').click()}
                    variant="outline"
                    className="flex-1 border-slate-600 text-slate-300 hover:bg-slate-800"
                  >
                    <Upload className="w-4 h-4 mr-2" />
                    {t('upload_backup')}
                  </Button>
                  <Dialog open={showRestoreDialog} onOpenChange={setShowRestoreDialog}>
                    <DialogTrigger asChild>
                      <Button
                        className="flex-1 bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 text-white"
                        disabled={!restoreData}
                      >
                        {t('restore_backup')}
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="glass border-slate-700">
                      <DialogHeader>
                        <DialogTitle className="text-white">Восстановить из бэкапа?</DialogTitle>
                        <DialogDescription className="text-slate-400">
                          Это действие перезапишет существующие данные
                        </DialogDescription>
                      </DialogHeader>
                      <DialogFooter>
                        <Button onClick={handleRestoreBackup} className="bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 text-white">
                          {t('restore_backup')}
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Chats Metadata */}
        <TabsContent value="chats" className="space-y-4">
          <Card className="glass border-slate-700">
            <CardHeader>
              <CardTitle className="text-white">{t('chats_metadata')}</CardTitle>
              <CardDescription className="text-slate-400">
                {t('no_messages_content')}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow className="border-slate-700">
                    <TableHead className="text-slate-300">{t('chat_name')}</TableHead>
                    <TableHead className="text-slate-300">{t('chat_type')}</TableHead>
                    <TableHead className="text-slate-300">{t('members')}</TableHead>
                    <TableHead className="text-slate-300">{t('messages_count')}</TableHead>
                    <TableHead className="text-slate-300">{t('last_active')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rooms.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-slate-400 py-8">
                        Нет чатов
                      </TableCell>
                    </TableRow>
                  ) : (
                    rooms.map((room) => (
                      <TableRow key={room.id} className="border-slate-700">
                        <TableCell className="text-white">{room.name}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="border-slate-600 text-slate-400">
                            {room.type === 'direct' ? t('direct_chat') : t('group_chat')}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-slate-300">
                          <div className="flex flex-wrap gap-1">
                            {room.members?.slice(0, 3).map((member, idx) => (
                              <Badge key={idx} className="bg-cyan-500/20 text-cyan-400 border-cyan-500/50 text-xs">
                                {member}
                              </Badge>
                            ))}
                            {room.members?.length > 3 && (
                              <Badge className="bg-slate-700 text-slate-300 text-xs">
                                +{room.members.length - 3}
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-slate-400">{room.message_count}</TableCell>
                        <TableCell className="text-slate-400 text-sm">{formatDate(room.last_activity)}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Security - integrated from separate page */}
        <TabsContent value="security">
          <Security language={language} t={t} />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Settings;
