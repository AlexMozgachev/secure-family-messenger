# Secure Messenger Builder

Автономный защищённый мессенджер с E2E шифрованием.

## Особенности

- ✅ **E2E шифрование**: Сквозное шифрование всех сообщений
- ✅ **Безопасность**: Сервер не имеет доступа к содержимому сообщений
- ✅ **Автономная работа**: Полный контроль над сервером
- ✅ **Real-time**: WebSocket для мгновенной доставки сообщений
- ✅ **Админ-панель**: Полнофункциональная панель управления с мониторингом
- ✅ **Системный мониторинг**: CPU, RAM, диск, сетевой трафик в реальном времени
- ✅ **Управление безопасностью**: Блокировка IP, мониторинг устройств, попытки входа
- ✅ **Бэкап и восстановление**: Полное резервное копирование данных
- ✅ **SSL управление**: Автоматическое обновление сертификатов
- ✅ **Мобильное приложение**: Expo (React Native) для iOS и Android

## Технологии

### Backend
- Python 3.11+
- FastAPI - REST API фреймворк
- MongoDB - база данных
- WebSocket - real-time общение
- PyJWT - аутентификация
- Passlib - хеширование паролей
- PSUtil - системный мониторинг

### Frontend (Admin Panel)
- React 19
- Tailwind CSS
- Shadcn UI
- Axios - HTTP клиент
- React Router - маршрутизация

### Mobile (coming soon)
- Expo (React Native)
- E2EE криптография
- WebRTC - голосовые/видео звонки

## 🚀 Быстрая установка

### ⚡ Ubuntu 22.04 LTS (рекомендуется) 🔥

```bash
# Исправленная установка для Ubuntu 22.04 LTS (IPv4 + без SSL)
curl -fsSL https://raw.githubusercontent.com/DenKedr/Secure-Messenger-Builder/main/install_ubuntu22_fixed.sh | sudo bash
```

```bash
# Исправление существующей установки (проблемы с IPv6/SSL)
curl -fsSL https://raw.githubusercontent.com/DenKedr/Secure-Messenger-Builder/main/fix_ipv6_ssl.sh | sudo bash
```

**Преимущества Ubuntu 22.04:**
- Python 3.10, Node.js 20, MongoDB 6.0 из коробки
- Полная совместимость всех зависимостей
- LTS поддержка до 2027 года
- **Время установки: 3-7 минут**

### ⚙️ Ubuntu 20.04 (совместимость)

```bash  
# Для Ubuntu 20.04 (с исправлениями совместимости)
curl -fsSL https://raw.githubusercontent.com/DenKedr/Secure-Messenger-Builder/main/install_ubuntu.sh | sudo bash
```

**После установки доступно:**
- 🌐 Веб-интерфейс: `http://YOUR_SERVER_IP:3000`
- 🔧 API: `http://YOUR_SERVER_IP:8001/docs`  
- 👤 Админ-панель: `http://YOUR_SERVER_IP:3000/admin`

---

### Ручная установка (для разработчиков)

1. **Запустите сервер**:
```bash
cd backend
python3 -m venv venv
source venv/bin/activate  # Linux/Mac
# или venv\Scripts\activate  # Windows
pip install -r requirements.txt
uvicorn server:app --host 0.0.0.0 --port 8001
```

2. **Запустите фронтенд**:
```bash
cd frontend
yarn install
yarn start
```

3. **Откройте браузер**:
   - Перейдите на `http://localhost:3000`
   - Следуйте инструкциям мастера установки
   - Введите логин и пароль администратора
   - Нажмите "Установить"

### Ручная установка

#### Предварительные требования
- Python 3.11+
- Node.js 18+
- MongoDB 4.4+
- Yarn

#### Установка зависимостей

**Backend**:
```bash
cd backend
pip install -r requirements.txt
```

**Frontend**:
```bash
cd frontend
yarn install
```

#### Настройка переменных окружения

**Backend** (`backend/.env`):
```env
MONGO_URL=mongodb://localhost:27017
DB_NAME=secure_messenger
CORS_ORIGINS=*
JWT_SECRET=your-secret-key-here
FRONTEND_URL=http://localhost:3000
```

**Frontend** (`frontend/.env`):
```env
REACT_APP_BACKEND_URL=http://localhost:8001
```

#### Запуск

**Backend**:
```bash
cd backend
uvicorn server:app --host 0.0.0.0 --port 8001 --reload
```

**Frontend**:
```bash
cd frontend
yarn start
```

## Использование

### Админ-панель

1. **Первый запуск** - пройдите мастер установки
2. **Вход** - используйте созданные логин и пароль
3. **Управление**:
   - Создание пользователей
   - Блокировка/разблокировка
   - Сброс пароля
   - Удаление пользователей
   - Просмотр статистики
   - Системный мониторинг (CPU, RAM, диск, трафик)
   - Управление безопасностью (IP блокировка, устройства)
   - Бэкап и восстановление данных
   - Управление SSL сертификатами

### API Документация

После запуска backend доступна автоматическая документация API:
- Swagger UI: `http://localhost:8001/docs`
- ReDoc: `http://localhost:8001/redoc`

## E2E Шифрование

### Принцип работы

1. **Генерация ключей**:
   - Каждый клиент генерирует пару ключей (публичный/приватный)
   - Публичный ключ отправляется на сервер
   - Приватный ключ хранится только на устройстве

2. **Обмен ключами**:
   - Клиенты получают публичные ключи друг друга через сервер
   - Сервер не имеет доступа к приватным ключам

3. **Шифрование сообщений**:
   - Сообщения шифруются на клиенте перед отправкой
   - Сервер хранит только зашифрованные данные
   - Расшифровка происходит только на устройстве получателя

### Используемые алгоритмы

- **Обмен ключами**: X25519 (Curve25519)
- **Шифрование**: ChaCha20-Poly1305
- **Хеширование**: SHA-256

## Структура проекта

```
secure-messenger/
├── backend/              # FastAPI сервер
│   ├── server.py         # Основной файл приложения
│   ├── requirements.txt  # Python зависимости
│   ├── .env              # Переменные окружения
│   └── uploads/          # Загруженные файлы
│
├── frontend/            # React фронтенд
│   ├── public/           # Статические файлы
│   ├── src/
│   │   ├── components/   # UI компоненты
│   │   ├── pages/        # Страницы
│   │   │   ├── Installer.js
│   │   │   ├── AdminLogin.js
│   │   │   └── AdminDashboard.js
│   │   ├── App.js
│   │   └── App.css
│   ├── package.json      # Node.js зависимости
│   └── .env              # Переменные окружения
│
├── mobile/              # Expo мобильное приложение (скоро)
│   └── README.md         # Инструкция по сборке
│
└── README.md            # Этот файл
```

## API Endpoints

### Установка
- `GET /api/install/status` - Проверка статуса установки
- `POST /api/install` - Установка системы

### Аутентификация
- `POST /api/auth/register` - Регистрация
- `POST /api/auth/login` - Вход
- `GET /api/auth/me` - Текущий пользователь

### Пользователи
- `GET /api/users` - Список пользователей
- `GET /api/users/{user_id}` - Получить пользователя
- `PUT /api/users/public-key` - Обновить публичный ключ
- `GET /api/users/{user_id}/public-key` - Получить публичный ключ

### Чаты
- `POST /api/rooms` - Создать чат
- `GET /api/rooms` - Список чатов
- `GET /api/rooms/{room_id}` - Получить чат

### Сообщения
- `POST /api/messages` - Отправить сообщение
- `GET /api/rooms/{room_id}/messages` - Получить сообщения

### Админ
- `GET /api/admin/users` - Все пользователи
- `POST /api/admin/users` - Создать пользователя
- `PUT /api/admin/users/{user_id}/block` - Заблокировать
- `PUT /api/admin/users/{user_id}/unblock` - Разблокировать
- `DELETE /api/admin/users/{user_id}` - Удалить
- `PUT /api/admin/users/{user_id}/password` - Сбросить пароль
- `GET /api/admin/stats` - Статистика
- `GET /api/admin/system/monitoring` - Мониторинг системы
- `GET /api/admin/security/blocked-ips` - Заблокированные IP
- `POST /api/admin/security/block-ips` - Заблокировать IP
- `DELETE /api/admin/security/blocked-ips/{id}` - Разблокировать IP
- `GET /api/admin/devices` - Активные устройства
- `GET /api/admin/settings` - Настройки сервера
- `PUT /api/admin/settings` - Обновить настройки
- `POST /api/admin/backup` - Создать бэкап
- `POST /api/admin/restore` - Восстановить из бэкапа
- `POST /api/admin/ssl/renew` - Обновить SSL

### Файлы
- `POST /api/upload` - Загрузить файл
- `GET /api/files/{file_name}` - Получить файл

### WebSocket
- `WS /ws/{user_id}` - Real-time подключение

### Health
- `GET /api/health` - Проверка здоровья сервиса

## Безопасность

### Рекомендации

1. **JWT Secret**: Измените `JWT_SECRET` в `.env` на сложную случайную строку
2. **MongoDB**: Используйте аутентификацию для MongoDB
3. **CORS**: Ограничьте CORS в production
4. **HTTPS**: Используйте HTTPS в production
5. **Резервные копии**: Регулярно создавайте бэкапы MongoDB

## Разработка

### Тестирование API

Используйте `curl` или Postman:

```bash
# Проверка health
curl http://localhost:8001/api/health

# Регистрация
curl -X POST http://localhost:8001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username":"test","password":"test123"}'

# Вход
curl -X POST http://localhost:8001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"test","password":"test123"}'
```

## Лицензия

MIT License

## Поддержка

Для вопросов и предложений создайте Issue в GitHub.

## Благодарности

- FastAPI
- React
- MongoDB
- Shadcn UI
- TailwindCSS
