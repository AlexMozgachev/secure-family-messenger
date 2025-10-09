# Инструкция по автономной установке Secure Messenger

Эта инструкция позволяет установить Secure Messenger в offline режиме со всеми зависимостями.

## Предварительная подготовка (на машине с интернетом)

### 1. Скачать необходимое ПО

Скачайте и сохраните на USB/внешний диск:

#### Linux (Ubuntu 20.04+)
- **Python 3.11+**: https://www.python.org/downloads/
- **Node.js 18+**: https://nodejs.org/
- **MongoDB 4.4+**: https://www.mongodb.com/try/download/community
- **Yarn**: https://classic.yarnpkg.com/en/docs/install

### 2. Скачать зависимости Python

```bash
# На машине с интернетом
cd backend
pip download -r requirements.txt -d ../offline-packages/python
```

### 3. Скачать зависимости Node.js

```bash
# На машине с интернетом
cd frontend
yarn install
cd ..

# Создать архив node_modules
tar -czf offline-packages/frontend-node-modules.tar.gz frontend/node_modules
```

### 4. Создать полный пакет

```bash
# Создать архив всего проекта
tar -czf secure-messenger-offline.tar.gz \
  backend/ \
  frontend/ \
  mobile/ \
  docs/ \
  offline-packages/ \
  README.md \
  INSTALLATION.md \
  .gitignore
```

## Установка (на машине без интернета)

### 1. Установка базового ПО

#### Linux (Ubuntu/Debian)

```bash
# Установите Python 3.11
sudo dpkg -i python3.11*.deb

# Установите Node.js
sudo dpkg -i nodejs*.deb

# Установите MongoDB
sudo dpkg -i mongodb*.deb

# Запустите MongoDB
sudo systemctl start mongod
sudo systemctl enable mongod
```

### 2. Распаковка проекта

```bash
# Распаковать архив
tar -xzf secure-messenger-offline.tar.gz
cd secure-messenger
```

### 3. Установка Python зависимостей

```bash
# Создать виртуальное окружение
cd backend
python3 -m venv venv
source venv/bin/activate  # Linux/Mac

# Установить зависимости из offline пакетов
pip install --no-index --find-links=../offline-packages/python -r requirements.txt
```

### 4. Установка Node.js зависимостей

```bash
# Распаковать node_modules
cd ../frontend
tar -xzf ../offline-packages/frontend-node-modules.tar.gz

# Или, если есть Yarn offline mirror
yarn install --offline
```

### 5. Настройка переменных окружения

#### Backend (.env)

```bash
cd ../backend
cat > .env << EOF
MONGO_URL=mongodb://localhost:27017
DB_NAME=secure_messenger
CORS_ORIGINS=*
JWT_SECRET=$(openssl rand -hex 32)
FRONTEND_URL=http://localhost:3000
EOF
```

#### Frontend (.env)

```bash
cd ../frontend
cat > .env << EOF
REACT_APP_BACKEND_URL=http://localhost:8001
EOF
```

### 6. Запуск приложения

#### Запуск Backend

```bash
cd backend
source venv/bin/activate
uvicorn server:app --host 0.0.0.0 --port 8001
```

#### Запуск Frontend (в новом терминале)

```bash
cd frontend
yarn start
```

## Автозапуск при перезагрузке

### Создание systemd сервисов

#### Backend сервис

```bash
sudo cat > /etc/systemd/system/secure-messenger-backend.service << EOF
[Unit]
Description=Secure Messenger Backend
After=network.target mongod.service

[Service]
Type=simple
User=$USER
WorkingDirectory=/path/to/secure-messenger/backend
Environment="PATH=/path/to/secure-messenger/backend/venv/bin"
ExecStart=/path/to/secure-messenger/backend/venv/bin/uvicorn server:app --host 0.0.0.0 --port 8001
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF
```

#### Frontend сервис

```bash
sudo cat > /etc/systemd/system/secure-messenger-frontend.service << EOF
[Unit]
Description=Secure Messenger Frontend
After=network.target

[Service]
Type=simple
User=$USER
WorkingDirectory=/path/to/secure-messenger/frontend
ExecStart=/usr/bin/yarn start
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF
```

#### Включение сервисов

```bash
sudo systemctl daemon-reload
sudo systemctl enable secure-messenger-backend
sudo systemctl enable secure-messenger-frontend
sudo systemctl start secure-messenger-backend
sudo systemctl start secure-messenger-frontend
```

#### Проверка статуса

```bash
sudo systemctl status secure-messenger-backend
sudo systemctl status secure-messenger-frontend
```

## Docker Установка (альтернатива)

### 1. Создать Docker Compose файл

```yaml
# docker-compose.yml
version: '3.8'

services:
  mongodb:
    image: mongo:4.4
    container_name: secure-messenger-db
    restart: always
    volumes:
      - mongodb_data:/data/db
    ports:
      - "27017:27017"

  backend:
    build: ./backend
    container_name: secure-messenger-backend
    restart: always
    ports:
      - "8001:8001"
    environment:
      - MONGO_URL=mongodb://mongodb:27017
      - DB_NAME=secure_messenger
      - CORS_ORIGINS=*
      - JWT_SECRET=your-secret-key
      - FRONTEND_URL=http://localhost:3000
    depends_on:
      - mongodb

  frontend:
    build: ./frontend
    container_name: secure-messenger-frontend
    restart: always
    ports:
      - "3000:3000"
    environment:
      - REACT_APP_BACKEND_URL=http://localhost:8001
    depends_on:
      - backend

volumes:
  mongodb_data:
```

### 2. Создать Dockerfile для Backend

```dockerfile
# backend/Dockerfile
FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 8001

CMD ["uvicorn", "server:app", "--host", "0.0.0.0", "--port", "8001"]
```

### 3. Создать Dockerfile для Frontend

```dockerfile
# frontend/Dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package.json yarn.lock ./
RUN yarn install --frozen-lockfile

COPY . .

EXPOSE 3000

CMD ["yarn", "start"]
```

### 4. Запуск

```bash
# Собрать и запустить
docker-compose up -d

# Просмотр логов
docker-compose logs -f

# Остановка
docker-compose down
```

## Проверка установки

### 1. Проверка Backend

```bash
curl http://localhost:8001/api/health
# Ожидаемый ответ: {"status":"healthy","database":"connected",...}
```

### 2. Проверка Frontend

Откройте в браузере: `http://localhost:3000`

### 3. Проверка MongoDB

```bash
mongo --eval "db.adminCommand('ping')"
# Ожидаемый ответ: { "ok" : 1 }
```

## Решение проблем

### Backend не запускается

```bash
# Проверьте логи
tail -f /var/log/secure-messenger-backend.log

# Проверьте порты
sudo netstat -tlnp | grep 8001
```

### MongoDB не подключается

```bash
# Проверьте статус MongoDB
sudo systemctl status mongod

# Запустите MongoDB
sudo systemctl start mongod
```

### Frontend не открывается

```bash
# Проверьте .env файл
cat frontend/.env

# Перезапустите frontend
cd frontend
yarn start
```

## Резервное копирование

### Бэкап MongoDB

```bash
# Создать бэкап
mongodump --out /backup/$(date +%Y%m%d)

# Восстановить из бэкапа
mongorestore /backup/20250101
```

### Автоматический бэкап (cron)

```bash
# Добавить в crontab
crontab -e

# Бэкап каждый день в 2:00
0 2 * * * mongodump --out /backup/$(date +\%Y\%m\%d)
```

## Обновление

```bash
# 1. Остановить сервисы
sudo systemctl stop secure-messenger-backend
sudo systemctl stop secure-messenger-frontend

# 2. Создать бэкап
mongodump --out /backup/before-update

# 3. Обновить код
git pull origin main
# или распаковать новый архив

# 4. Обновить зависимости
cd backend
source venv/bin/activate
pip install -r requirements.txt

cd ../frontend
yarn install

# 5. Запустить сервисы
sudo systemctl start secure-messenger-backend
sudo systemctl start secure-messenger-frontend
```

## Безопасность

### Настройка Firewall

```bash
# Открыть только необходимые порты
sudo ufw allow 3000/tcp  # Frontend
sudo ufw allow 8001/tcp  # Backend
sudo ufw enable
```

### Настройка SSL/TLS (рекомендуется)

Используйте Nginx как reverse proxy с Let's Encrypt.

## Поддержка

Для вопросов и проблем создайте Issue в GitHub репозитории.
