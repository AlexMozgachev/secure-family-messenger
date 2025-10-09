import { useState, useEffect } from 'react';
import axios from 'axios';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Activity, Cpu, HardDrive, Wifi, Clock, Monitor, Users } from 'lucide-react';
import { toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const SystemMonitoring = ({ language, t, onViewDevices }) => {
  const [monitoring, setMonitoring] = useState(null);
  const [loading, setLoading] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);

  useEffect(() => {
    loadMonitoringData();
    
    let interval;
    if (autoRefresh) {
      interval = setInterval(loadMonitoringData, 30000); // Refresh every 30 seconds
    }
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [autoRefresh]);

  const loadMonitoringData = async () => {
    try {
      const response = await axios.get(`${API}/admin/system/monitoring`);
      setMonitoring(response.data);
    } catch (error) {
      console.error('Error loading monitoring data:', error);
      toast.error(t('error_loading'));
    } finally {
      setLoading(false);
    }
  };

  const formatNumber = (num) => {
    return typeof num === 'number' ? num.toLocaleString() : '0';
  };

  const getStatusColor = (percent) => {
    if (percent > 80) return 'text-red-400 border-red-500/50 bg-red-500/20';
    if (percent > 60) return 'text-yellow-400 border-yellow-500/50 bg-yellow-500/20';
    return 'text-emerald-400 border-emerald-500/50 bg-emerald-500/20';
  };

  const formatBytes = (bytes) => {
    if (bytes >= 1024) return `${(bytes / 1024).toFixed(1)} GB`;
    return `${bytes.toFixed(1)} MB`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-white text-lg">Загрузка мониторинга...</div>
      </div>
    );
  }

  if (!monitoring) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-slate-400">Нет данных мониторинга</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center">
            <Activity className="w-5 h-5 mr-2 text-cyan-400" />
            {t('system_monitoring')}
          </h2>
          <p className="text-slate-400 text-sm">{t('system_performance')}</p>
        </div>
        <div className="flex items-center space-x-3">
          <Button
            onClick={() => setAutoRefresh(!autoRefresh)}
            variant={autoRefresh ? 'default' : 'outline'}
            className={autoRefresh 
              ? 'bg-cyan-600 hover:bg-cyan-700' 
              : 'border-slate-600 text-slate-300 hover:bg-slate-800'
            }
            size="sm"
          >
            <Activity className="w-4 h-4 mr-2" />
            {autoRefresh ? 'Автообновление' : 'Обновить'}
          </Button>
          <Button
            onClick={onViewDevices}
            variant="outline"
            className="border-slate-600 text-slate-300 hover:bg-slate-800"
            size="sm"
          >
            <Monitor className="w-4 h-4 mr-2" />
            {t('view_devices_list')}
          </Button>
        </div>
      </div>

      {/* Monitoring Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* CPU Usage */}
        <Card className="glass border-slate-700">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-400 text-xs font-medium uppercase">{t('cpu_usage')}</p>
                <div className="flex items-center mt-1">
                  <p className="text-2xl font-bold text-white">{monitoring.cpu?.percent || 0}%</p>
                  <Badge className={`ml-2 text-xs ${getStatusColor(monitoring.cpu?.percent || 0)}`}>
                    {monitoring.cpu?.cores || 0} {t('cores')}
                  </Badge>
                </div>
                {monitoring.cpu?.load_avg_1min !== undefined && (
                  <p className="text-xs text-slate-500 mt-1">
                    {t('load_average')}: {monitoring.cpu.load_avg_1min}
                  </p>
                )}
              </div>
              <div className="w-12 h-12 bg-blue-500/10 rounded-lg flex items-center justify-center">
                <Cpu className="w-6 h-6 text-blue-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Memory Usage */}
        <Card className="glass border-slate-700">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-400 text-xs font-medium uppercase">{t('memory_usage')}</p>
                <div className="flex items-center mt-1">
                  <p className="text-2xl font-bold text-white">{monitoring.memory?.percent || 0}%</p>
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  {formatNumber(monitoring.memory?.used_gb)} / {formatNumber(monitoring.memory?.total_gb)} GB
                </p>
              </div>
              <div className="w-12 h-12 bg-purple-500/10 rounded-lg flex items-center justify-center">
                <Activity className="w-6 h-6 text-purple-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Disk Usage */}
        <Card className="glass border-slate-700">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-400 text-xs font-medium uppercase">{t('disk_usage')}</p>
                <div className="flex items-center mt-1">
                  <p className="text-2xl font-bold text-white">{monitoring.disk?.percent || 0}%</p>
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  {formatNumber(monitoring.disk?.used_gb)} / {formatNumber(monitoring.disk?.total_gb)} GB
                </p>
              </div>
              <div className="w-12 h-12 bg-emerald-500/10 rounded-lg flex items-center justify-center">
                <HardDrive className="w-6 h-6 text-emerald-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Network Traffic */}
        <Card className="glass border-slate-700">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-400 text-xs font-medium uppercase">{t('network_traffic')}</p>
                <div className="flex items-center mt-1">
                  <p className="text-2xl font-bold text-white">{formatBytes(monitoring.network?.total_mb || 0)}</p>
                </div>
                <div className="text-xs text-slate-500 mt-1 space-y-0.5">
                  <div>↑ {formatBytes(monitoring.network?.sent_mb || 0)}</div>
                  <div>↓ {formatBytes(monitoring.network?.received_mb || 0)}</div>
                </div>
              </div>
              <div className="w-12 h-12 bg-cyan-500/10 rounded-lg flex items-center justify-center">
                <Wifi className="w-6 h-6 text-cyan-400" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* System Uptime */}
      <Card className="glass border-slate-700">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <div className="w-10 h-10 bg-slate-700 rounded-lg flex items-center justify-center mr-4">
                <Clock className="w-5 h-5 text-slate-300" />
              </div>
              <div>
                <p className="text-slate-400 text-sm">{t('system_uptime')}</p>
                <p className="text-lg font-semibold text-white">
                  {formatNumber(monitoring.system?.uptime_hours)} {t('hours')}
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-xs text-slate-500">Последнее обновление</p>
              <p className="text-sm text-slate-300">
                {monitoring.system?.timestamp 
                  ? new Date(monitoring.system.timestamp).toLocaleTimeString(language === 'ru' ? 'ru-RU' : 'en-US')
                  : 'N/A'
                }
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default SystemMonitoring;