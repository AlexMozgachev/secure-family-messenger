import { useState } from 'react';
import axios from 'axios';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Label } from '../components/ui/label';
import { Alert, AlertDescription } from '../components/ui/alert';
import { CheckCircle2, Server, Shield, Lock, Database } from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const Installer = ({ onComplete }) => {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    admin_username: '',
    admin_password: '',
    admin_display_name: '',
    server_name: 'Secure Messenger',
    connection_type: 'ip',
    domain: '',
    ip_address: '',
    auto_ssl: false
  });
  const [installing, setInstalling] = useState(false);
  const [installComplete, setInstallComplete] = useState(false);
  const [error, setError] = useState('');
  const [credentials, setCredentials] = useState(null);

  const handleInputChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
    setError('');
  };

  const validateStep = () => {
    if (step === 2) {
      if (formData.connection_type === 'domain' && !formData.domain) {
        setError('Введите домен');
        return false;
      }
      if (formData.connection_type === 'ip' && !formData.ip_address) {
        setError('Введите IP адрес');
        return false;
      }
    }
    if (step === 3) {
      if (!formData.admin_username || !formData.admin_password) {
        setError('Логин и пароль обязательны');
        return false;
      }
      if (formData.admin_password.length < 6) {
        setError('Пароль должен быть не менее 6 символов');
        return false;
      }
    }
    return true;
  };

  const handleNext = () => {
    if (validateStep()) {
      setStep(step + 1);
      setError('');
    }
  };

  const handleInstall = async () => {
    if (!validateStep()) return;

    setInstalling(true);
    setError('');

    try {
      const response = await axios.post(`${API}/install`, formData);
      
      setCredentials({
        username: formData.admin_username,
        password: formData.admin_password,
        server_url: response.data.server_url
      });
      
      setInstallComplete(true);
      
      setTimeout(() => {
        onComplete();
      }, 3000);
    } catch (err) {
      setError(err.response?.data?.detail || 'Ошибка установки. Попробуйте снова.');
    } finally {
      setInstalling(false);
    }
  };

  const features = [
    { icon: Shield, title: 'E2E шифрование', description: 'Сквозное шифрование всех сообщений' },
    { icon: Lock, title: 'Безопасность', description: 'Защита данных на уровне протокола' },
    { icon: Server, title: 'Автономная работа', description: 'Полный контроль над сервером' },
    { icon: Database, title: 'Собственная БД', description: 'Данные хранятся локально' }
  ];

  if (installComplete) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
        <Card className="w-full max-w-lg glass border-emerald-500/20 animate-fadeIn">
          <CardHeader className="text-center space-y-4">
            <div className="mx-auto w-20 h-20 bg-emerald-500/10 rounded-full flex items-center justify-center">
              <CheckCircle2 className="w-12 h-12 text-emerald-400" />
            </div>
            <CardTitle className="text-3xl font-bold text-white">Установка завершена!</CardTitle>
            <CardDescription className="text-slate-300 text-lg">
              Система успешно установлена и готова к использованию
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <Alert className="bg-slate-800/50 border-slate-700">
              <AlertDescription className="text-slate-300">
                <div className="space-y-2">
                  <p className="font-semibold text-white">Данные для входа:</p>
                  <p><span className="text-slate-400">Логин:</span> <span className="font-mono text-emerald-400">{credentials?.username}</span></p>
                  <p><span className="text-slate-400">Пароль:</span> <span className="font-mono text-emerald-400">{credentials?.password}</span></p>
                </div>
              </AlertDescription>
            </Alert>
            <p className="text-center text-slate-400 text-sm">
              Перенаправление на страницу входа...
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <Card className="w-full max-w-2xl glass border-slate-700 animate-fadeIn">
        <CardHeader className="text-center space-y-2">
          <div className="mx-auto w-16 h-16 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-2xl flex items-center justify-center mb-4">
            <Shield className="w-9 h-9 text-white" />
          </div>
          <CardTitle className="text-3xl font-bold text-white">Secure Messenger Builder</CardTitle>
          <CardDescription className="text-slate-300 text-base">
            Автономный защищённый мессенджер с E2E шифрованием
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-8">
          {/* Step Indicator */}
          <div className="flex items-center justify-center space-x-2">
            {[1, 2, 3, 4].map((s) => (
              <div key={s} className="flex items-center">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold transition-all ${
                    s === step
                      ? 'bg-cyan-500 text-white scale-110'
                      : s < step
                      ? 'bg-emerald-500 text-white'
                      : 'bg-slate-700 text-slate-400'
                  }`}
                >
                  {s < step ? <CheckCircle2 className="w-5 h-5" /> : s}
                </div>
                {s < 4 && (
                  <div
                    className={`w-12 h-1 mx-1 transition-all ${
                      s < step ? 'bg-emerald-500' : 'bg-slate-700'
                    }`}
                  />
                )}
              </div>
            ))}
          </div>

          {/* Step 1: Welcome */}
          {step === 1 && (
            <div className="space-y-6 animate-fadeIn">
              <div className="text-center space-y-3">
                <h3 className="text-2xl font-semibold text-white">Добро пожаловать!</h3>
                <p className="text-slate-300 max-w-md mx-auto">
                  Эта установка настроит защищённый мессенджер с полным шифрованием сообщений
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {features.map((feature, index) => (
                  <div
                    key={index}
                    className="p-4 bg-slate-800/50 rounded-xl border border-slate-700 hover:border-cyan-500/50 transition-all"
                  >
                    <feature.icon className="w-8 h-8 text-cyan-400 mb-3" />
                    <h4 className="text-white font-semibold mb-1">{feature.title}</h4>
                    <p className="text-slate-400 text-sm">{feature.description}</p>
                  </div>
                ))}
              </div>

              <Button
                onClick={handleNext}
                className="w-full bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white font-semibold py-6 text-lg btn-hover"
                data-testid="welcome-next-btn"
              >
                Начать установку
              </Button>
            </div>
          )}

          {/* Step 2: Connection Type */}
          {step === 2 && (
            <div className="space-y-6 animate-fadeIn">
              <div className="text-center space-y-2">
                <h3 className="text-2xl font-semibold text-white">Тип подключения</h3>
                <p className="text-slate-300">
                  Выберите способ подключения к серверу
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <button
                  onClick={() => setFormData({ ...formData, connection_type: 'ip' })}
                  className={`p-6 rounded-xl border-2 transition-all ${
                    formData.connection_type === 'ip'
                      ? 'border-cyan-500 bg-cyan-500/10'
                      : 'border-slate-700 bg-slate-800/50 hover:border-slate-600'
                  }`}
                >
                  <h4 className="text-white font-semibold text-lg mb-2">IP Адрес</h4>
                  <p className="text-slate-400 text-sm mb-3">
                    Самоподписанный SSL сертификат
                  </p>
                  <Input
                    type="text"
                    value={formData.ip_address}
                    onChange={(e) => setFormData({ ...formData, ip_address: e.target.value })}
                    className="bg-slate-800 border-slate-600 text-white"
                    placeholder="192.168.1.1"
                    disabled={formData.connection_type !== 'ip'}
                  />
                </button>

                <button
                  onClick={() => setFormData({ ...formData, connection_type: 'domain' })}
                  className={`p-6 rounded-xl border-2 transition-all ${
                    formData.connection_type === 'domain'
                      ? 'border-cyan-500 bg-cyan-500/10'
                      : 'border-slate-700 bg-slate-800/50 hover:border-slate-600'
                  }`}
                >
                  <h4 className="text-white font-semibold text-lg mb-2">Домен</h4>
                  <p className="text-slate-400 text-sm mb-3">
                    Let's Encrypt SSL сертификат
                  </p>
                  <Input
                    type="text"
                    value={formData.domain}
                    onChange={(e) => setFormData({ ...formData, domain: e.target.value })}
                    className="bg-slate-800 border-slate-600 text-white"
                    placeholder="messenger.example.com"
                    disabled={formData.connection_type !== 'domain'}
                  />
                </button>
              </div>

              {formData.connection_type === 'domain' && (
                <div className="flex items-center space-x-2 p-4 bg-slate-800/50 rounded-lg">
                  <input
                    type="checkbox"
                    id="auto_ssl"
                    checked={formData.auto_ssl}
                    onChange={(e) => setFormData({ ...formData, auto_ssl: e.target.checked })}
                    className="w-4 h-4"
                  />
                  <label htmlFor="auto_ssl" className="text-slate-300 text-sm">
                    Автоматически обновлять SSL сертификат
                  </label>
                </div>
              )}

              {error && (
                <Alert className="bg-red-500/10 border-red-500/50" data-testid="error-alert">
                  <AlertDescription className="text-red-400">{error}</AlertDescription>
                </Alert>
              )}

              <div className="flex space-x-3">
                <Button
                  onClick={() => setStep(1)}
                  variant="outline"
                  className="flex-1 border-slate-600 text-slate-300 hover:bg-slate-800 py-6"
                >
                  Назад
                </Button>
                <Button
                  onClick={handleNext}
                  className="flex-1 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white font-semibold py-6 btn-hover"
                >
                  Далее
                </Button>
              </div>
            </div>
          )}

          {/* Step 3: Admin Credentials */}
          {step === 3 && (
            <div className="space-y-6 animate-fadeIn">
              <div className="text-center space-y-2">
                <h3 className="text-2xl font-semibold text-white">Создание учётной записи администратора</h3>
                <p className="text-slate-300">
                  Введите данные для входа в админ-панель
                </p>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="admin_username" className="text-slate-200 font-medium">
                    Логин администратора *
                  </Label>
                  <Input
                    id="admin_username"
                    name="admin_username"
                    type="text"
                    placeholder="admin"
                    value={formData.admin_username}
                    onChange={handleInputChange}
                    className="bg-slate-800 border-slate-600 text-white placeholder:text-slate-500 focus:border-cyan-500"
                    data-testid="admin-username-input"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="admin_password" className="text-slate-200 font-medium">
                    Пароль *
                  </Label>
                  <Input
                    id="admin_password"
                    name="admin_password"
                    type="password"
                    placeholder="Минимум 6 символов"
                    value={formData.admin_password}
                    onChange={handleInputChange}
                    className="bg-slate-800 border-slate-600 text-white placeholder:text-slate-500 focus:border-cyan-500"
                    data-testid="admin-password-input"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="admin_display_name" className="text-slate-200 font-medium">
                    Отображаемое имя (необязательно)
                  </Label>
                  <Input
                    id="admin_display_name"
                    name="admin_display_name"
                    type="text"
                    placeholder="Администратор"
                    value={formData.admin_display_name}
                    onChange={handleInputChange}
                    className="bg-slate-800 border-slate-600 text-white placeholder:text-slate-500 focus:border-cyan-500"
                  />
                </div>
              </div>

              {error && (
                <Alert className="bg-red-500/10 border-red-500/50" data-testid="error-alert">
                  <AlertDescription className="text-red-400">{error}</AlertDescription>
                </Alert>
              )}

              <div className="flex space-x-3">
                <Button
                  onClick={() => setStep(2)}
                  variant="outline"
                  className="flex-1 border-slate-600 text-slate-300 hover:bg-slate-800 py-6"
                >
                  Назад
                </Button>
                <Button
                  onClick={handleNext}
                  className="flex-1 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white font-semibold py-6 btn-hover"
                  data-testid="credentials-next-btn"
                >
                  Далее
                </Button>
              </div>
            </div>
          )}

          {/* Step 4: Confirm Installation */}
          {step === 4 && (
            <div className="space-y-6 animate-fadeIn">
              <div className="text-center space-y-2">
                <h3 className="text-2xl font-semibold text-white">Подтверждение установки</h3>
                <p className="text-slate-300">
                  Проверьте данные перед началом установки
                </p>
              </div>

              <div className="bg-slate-800/50 rounded-xl p-6 space-y-4 border border-slate-700">
                <div className="flex justify-between items-center pb-3 border-b border-slate-700">
                  <span className="text-slate-400">Логин администратора:</span>
                  <span className="font-semibold text-white font-mono">{formData.admin_username}</span>
                </div>
                <div className="flex justify-between items-center pb-3 border-b border-slate-700">
                  <span className="text-slate-400">Отображаемое имя:</span>
                  <span className="font-semibold text-white">{formData.admin_display_name || formData.admin_username}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">Название сервера:</span>
                  <span className="font-semibold text-white">{formData.server_name}</span>
                </div>
              </div>

              <Alert className="bg-cyan-500/10 border-cyan-500/50">
                <AlertDescription className="text-cyan-300">
                  <p className="font-semibold mb-1">Что будет установлено:</p>
                  <ul className="list-disc list-inside space-y-1 text-sm">
                    <li>MongoDB база данных (автоматически)</li>
                    <li>FastAPI сервер с E2EE поддержкой</li>
                    <li>WebSocket для real-time сообщений</li>
                    <li>Админ-панель управления</li>
                  </ul>
                </AlertDescription>
              </Alert>

              {error && (
                <Alert className="bg-red-500/10 border-red-500/50" data-testid="error-alert">
                  <AlertDescription className="text-red-400">{error}</AlertDescription>
                </Alert>
              )}

              <div className="flex space-x-3">
                <Button
                  onClick={() => setStep(3)}
                  variant="outline"
                  className="flex-1 border-slate-600 text-slate-300 hover:bg-slate-800 py-6"
                  disabled={installing}
                >
                  Назад
                </Button>
                <Button
                  onClick={handleInstall}
                  className="flex-1 bg-gradient-to-r from-emerald-500 to-cyan-600 hover:from-emerald-600 hover:to-cyan-700 text-white font-semibold py-6 btn-hover"
                  disabled={installing}
                  data-testid="install-btn"
                >
                  {installing ? (
                    <span className="flex items-center justify-center">
                      <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Установка...
                    </span>
                  ) : (
                    'Установить'
                  )}
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Installer;
