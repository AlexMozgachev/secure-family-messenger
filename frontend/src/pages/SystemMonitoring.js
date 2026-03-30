import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';

export default function SystemMonitoring() {
  const [metrics, setMetrics] = useState({
    cpu_usage: 0,
    ram_usage: 0,
    disk_usage: 0,
    uptime: 0,
    network_in: 0,
    network_out: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchMetrics();
    const interval = setInterval(fetchMetrics, 5000);
    return () => clearInterval(interval);
  }, []);

  const fetchMetrics = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get('/api/admin/system/monitoring', {
        headers: { Authorization: `Bearer ${token}` }
      });
      console.log('Metrics response:', response.data);
      setMetrics(response.data);
      setError(null);
    } catch (err) {
      console.error('Error fetching metrics:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="p-6 text-center">Загрузка данных...</div>;
  if (error) return <div className="p-6 text-center text-red-500">Ошибка: {error}</div>;

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Мониторинг системы</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>CPU</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{metrics.cpu_usage}%</div>
            <div className="text-sm text-gray-500">Использование процессора</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>ОЗУ</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{metrics.ram_usage}%</div>
            <div className="text-sm text-gray-500">Использование памяти</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Диск</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{metrics.disk_usage}%</div>
            <div className="text-sm text-gray-500">Использование диска</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Время работы</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{metrics.uptime} ч</div>
            <div className="text-sm text-gray-500">Аптайм сервера</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Входящий трафик</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{metrics.network_in} MB</div>
            <div className="text-sm text-gray-500">За сегодня</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Исходящий трафик</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{metrics.network_out} MB</div>
            <div className="text-sm text-gray-500">За сегодня</div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
