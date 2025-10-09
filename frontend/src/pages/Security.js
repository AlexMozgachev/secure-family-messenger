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
import { Ban, MapPin, Trash2, Plus, AlertTriangle, CheckCircle, XCircle, Monitor } from 'lucide-react';
import { toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const Security = ({ language, t }) => {
  const [blockedIPs, setBlockedIPs] = useState([]);
  const [devices, setDevices] = useState([]);
  const [loginAttempts, setLoginAttempts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showBlockIP, setShowBlockIP] = useState(false);
  const [showDeviceMap, setShowDeviceMap] = useState(false);
  const [selectedDevice, setSelectedDevice] = useState(null);
  const [blockForm, setBlockForm] = useState({
    ip_addresses: '',
    reason: '',
    expires_hours: ''
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [ipsRes, devicesRes, attemptsRes] = await Promise.all([
        axios.get(`${API}/admin/security/blocked-ips`),
        axios.get(`${API}/admin/devices`),
        axios.get(`${API}/admin/security/login-attempts?limit=50`)
      ]);
      
      setBlockedIPs(ipsRes.data);
      setDevices(devicesRes.data);
      setLoginAttempts(attemptsRes.data);
    } catch (error) {
      console.error('Error loading security data:', error);
      toast.error(t('error_loading'));
    } finally {
      setLoading(false);
    }
  };

  const handleBlockIP = async () => {
    if (!blockForm.ip_addresses.trim()) {
      toast.error(t('fill_all_fields'));
      return;
    }

    try {
      const ips = blockForm.ip_addresses.split('\n').map(ip => ip.trim()).filter(ip => ip);
      
      await axios.post(`${API}/admin/security/block-ips`, {
        ip_addresses: ips,
        reason: blockForm.reason || 'Manual block',
        expires_hours: blockForm.expires_hours ? parseInt(blockForm.expires_hours) : null
      });
      
      toast.success(`Заблокировано IP: ${ips.length}`);
      setShowBlockIP(false);
      setBlockForm({ ip_addresses: '', reason: '', expires_hours: '' });
      loadData();
    } catch (error) {
      toast.error(error.response?.data?.detail || t('error_operation'));
    }
  };

  const handleUnblockIP = async (ipId) => {
    try {
      await axios.delete(`${API}/admin/security/blocked-ips/${ipId}`);
      toast.success('IP разблокирован');
      loadData();
    } catch (error) {
      toast.error(t('error_operation'));
    }
  };

  const handleDisconnectDevice = async (sessionId) => {
    if (!window.confirm('Отключить это устройство?')) {
      return;
    }

    try {
      await axios.delete(`${API}/devices/${sessionId}`);
      toast.success('Устройство отключено');
      loadData();
    } catch (error) {
      toast.error(t('error_operation'));
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
          <h2 className="text-2xl font-bold text-white">{t('security')}</h2>
          <p className="text-slate-400">Управление безопасностью системы</p>
        </div>
      </div>

      <Tabs defaultValue="blocked-ips" className="w-full">
        <TabsList className="glass border-slate-700">
          <TabsTrigger value="blocked-ips" className="data-[state=active]:bg-slate-700">
            <Ban className="w-4 h-4 mr-2" />
            {t('blocked_ips')}
          </TabsTrigger>
          <TabsTrigger value="devices" className="data-[state=active]:bg-slate-700">
            <Monitor className="w-4 h-4 mr-2" />
            {t('active_devices')}
          </TabsTrigger>
          <TabsTrigger value="attempts" className="data-[state=active]:bg-slate-700">
            <AlertTriangle className="w-4 h-4 mr-2" />
            {t('login_attempts')}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="blocked-ips" className="space-y-4">
          <Card className="glass border-slate-700">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-white">{t('blocked_ips')}</CardTitle>
                  <CardDescription className="text-slate-400">
                    Список заблокированных IP адресов
                  </CardDescription>
                </div>
                <Dialog open={showBlockIP} onOpenChange={setShowBlockIP}>
                  <DialogTrigger asChild>
                    <Button className="bg-gradient-to-r from-red-500 to-orange-600 hover:from-red-600 hover:to-orange-700 text-white">
                      <Plus className="w-4 h-4 mr-2" />
                      {t('block_ip')}
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="glass border-slate-700">
                    <DialogHeader>
                      <DialogTitle className="text-white">{t('add_ip_to_blacklist')}</DialogTitle>
                      <DialogDescription className="text-slate-400">
                        Добавьте IP адреса в чёрный список
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div className="space-y-2">
                        <Label htmlFor="ips" className="text-slate-200">IP адреса *</Label>
                        <Textarea
                          id="ips"
                          value={blockForm.ip_addresses}
                          onChange={(e) => setBlockForm({ ...blockForm, ip_addresses: e.target.value })}
                          className="bg-slate-800 border-slate-600 text-white"
                          placeholder="192.168.1.1"
                          rows={4}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="reason" className="text-slate-200">{t('reason')}</Label>
                        <Input
                          id="reason"
                          value={blockForm.reason}
                          onChange={(e) => setBlockForm({ ...blockForm, reason: e.target.value })}
                          className="bg-slate-800 border-slate-600 text-white"
                          placeholder="Подозрительная активность"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="expires" className="text-slate-200">{t('expires_hours')}</Label>
                        <Input
                          id="expires"
                          type="number"
                          value={blockForm.expires_hours}
                          onChange={(e) => setBlockForm({ ...blockForm, expires_hours: e.target.value })}
                          className="bg-slate-800 border-slate-600 text-white"
                          placeholder="Пусто = постоянно"
                        />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button onClick={handleBlockIP} className="bg-gradient-to-r from-red-500 to-orange-600 hover:from-red-600 hover:to-orange-700 text-white">
                        {t('block_ip')}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow className="border-slate-700">
                    <TableHead className="text-slate-300">{t('ip_address')}</TableHead>
                    <TableHead className="text-slate-300">{t('reason')}</TableHead>
                    <TableHead className="text-slate-300">{t('blocked_at')}</TableHead>
                    <TableHead className="text-slate-300">{t('expires_at')}</TableHead>
                    <TableHead className="text-slate-300 text-right">{t('actions')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {blockedIPs.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-slate-400 py-8">
                        Нет заблокированных IP адресов
                      </TableCell>
                    </TableRow>
                  ) : (
                    blockedIPs.map((ip) => (
                      <TableRow key={ip.id} className="border-slate-700">
                        <TableCell className="font-mono text-white">{ip.ip_address}</TableCell>
                        <TableCell className="text-slate-300">{ip.reason}</TableCell>
                        <TableCell className="text-slate-400 text-sm">{formatDate(ip.blocked_at)}</TableCell>
                        <TableCell className="text-slate-400 text-sm">
                          {ip.expires_at ? formatDate(ip.expires_at) : <Badge className="bg-slate-600 text-white border-slate-500 font-medium">{t('permanent')}</Badge>}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button size="sm" variant="outline" className="border-emerald-600 text-emerald-400 hover:bg-emerald-900/20" onClick={() => handleUnblockIP(ip.id)}>
                            {t('unblock')}
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="devices" className="space-y-4">
          <Card className="glass border-slate-700">
            <CardHeader>
              <CardTitle className="text-white">{t('active_devices')}</CardTitle>
              <CardDescription className="text-slate-400">Активные сессии устройств</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow className="border-slate-700">
                    <TableHead className="text-slate-300">ID</TableHead>
                    <TableHead className="text-slate-300">{t('device_name')}</TableHead>
                    <TableHead className="text-slate-300">{t('ip_address')}</TableHead>
                    <TableHead className="text-slate-300">{t('last_active')}</TableHead>
                    <TableHead className="text-slate-300">{t('gps_location')}</TableHead>
                    <TableHead className="text-slate-300 text-right">{t('actions')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {devices.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-slate-400 py-8">Нет активных устройств</TableCell>
                    </TableRow>
                  ) : (
                    devices.map((device) => (
                      <TableRow key={device.id} className="border-slate-700">
                        <TableCell className="text-white font-mono text-xs">{device.user_id.slice(0, 8)}...</TableCell>
                        <TableCell className="text-slate-300">{device.device_name}</TableCell>
                        <TableCell className="font-mono text-slate-300">{device.ip_address}</TableCell>
                        <TableCell className="text-slate-400 text-sm">{formatDate(device.last_active)}</TableCell>
                        <TableCell>
                          {device.gps_latitude && device.gps_longitude ? (
                            <Button size="sm" variant="outline" className="border-blue-600 text-blue-400" onClick={() => { setSelectedDevice(device); setShowDeviceMap(true); }}>
                              <MapPin className="w-3 h-3 mr-1" />
                              {t('view_map')}
                            </Button>
                          ) : (
                            <span className="text-slate-500 text-sm">{t('no_location')}</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button size="sm" variant="outline" className="border-red-600 text-red-400" onClick={() => handleDisconnectDevice(device.id)}>
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="attempts" className="space-y-4">
          <Card className="glass border-slate-700">
            <CardHeader>
              <CardTitle className="text-white">{t('login_attempts')}</CardTitle>
              <CardDescription className="text-slate-400">История попыток входа</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow className="border-slate-700">
                    <TableHead className="text-slate-300">{t('ip_address')}</TableHead>
                    <TableHead className="text-slate-300">{t('username')}</TableHead>
                    <TableHead className="text-slate-300">{t('status')}</TableHead>
                    <TableHead className="text-slate-300">{t('attempt_time')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loginAttempts.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center text-slate-400 py-8">Нет попыток входа</TableCell>
                    </TableRow>
                  ) : (
                    loginAttempts.map((attempt) => (
                      <TableRow key={attempt.id} className="border-slate-700">
                        <TableCell className="font-mono text-white">{attempt.ip_address}</TableCell>
                        <TableCell className="text-slate-300">{attempt.username || 'N/A'}</TableCell>
                        <TableCell>
                          {attempt.success ? (
                            <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/50">
                              <CheckCircle className="w-3 h-3 mr-1" />
                              {t('success')}
                            </Badge>
                          ) : (
                            <Badge className="bg-red-500/20 text-red-400 border-red-500/50">
                              <XCircle className="w-3 h-3 mr-1" />
                              {t('failed')}
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-slate-400 text-sm">{formatDate(attempt.attempted_at)}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={showDeviceMap} onOpenChange={setShowDeviceMap}>
        <DialogContent className="glass border-slate-700 max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-white">GPS Локация</DialogTitle>
            <DialogDescription className="text-slate-400">
              {selectedDevice?.device_name} - {selectedDevice?.ip_address}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            {selectedDevice && (
              <div className="space-y-4">
                <div className="bg-slate-800 p-4 rounded-lg space-y-2">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Широта:</span>
                    <span className="text-white font-mono">{selectedDevice.gps_latitude}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Долгота:</span>
                    <span className="text-white font-mono">{selectedDevice.gps_longitude}</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Security;
