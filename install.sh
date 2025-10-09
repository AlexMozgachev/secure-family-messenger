#!/bin/bash

# Secure Messenger - Скрипт автоматической установки
# Использование: ./install.sh

set -e

# Цвета для вывода
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}"
echo "============================================"
echo "  Secure Messenger - Автоустановка"
echo "============================================"
echo -e "${NC}"

# Проверка прав root
if [ "$EUID" -ne 0 ]; then 
  echo -e "${RED}Пожалуйста, запустите скрипт с правами root (sudo)${NC}"
  exit 1
fi

# Определение ОС
if [ -f /etc/os-release ]; then
    . /etc/os-release
    OS=$ID
    VER=$VERSION_ID
else
    echo -e "${RED}Не удалось определить операционную систему${NC}"
    exit 1
fi

echo -e "${YELLOW}Обнаружена ОС: $OS $VER${NC}"

# Установка необходимых пакетов
echo -e "${GREEN}[1/7] Установка базовых пакетов...${NC}"

if [ "$OS" = "ubuntu" ] || [ "$OS" = "debian" ]; then
    apt-get update
    apt-get install -y python3.11 python3.11-venv python3-pip nodejs npm mongodb-org curl
    npm install -g yarn
elif [ "$OS" = "centos" ] || [ "$OS" = "rhel" ]; then
    yum install -y python3.11 nodejs npm mongodb-org curl
    npm install -g yarn
else
    echo -e "${RED}Неподдерживаемая ОС: $OS${NC}"
    exit 1
fi

# Запуск MongoDB
echo -e "${GREEN}[2/7] Запуск MongoDB...${NC}"
systemctl start mongod
systemctl enable mongod

# Установка Python зависимостей
echo -e "${GREEN}[3/7] Установка Python зависимостей...${NC}"
cd backend
python3.11 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
deactivate
cd ..

# Установка Node.js зависимостей
echo -e "${GREEN}[4/7] Установка Node.js зависимостей...${NC}"
cd frontend
yarn install
cd ..

# Создание .env файлов
echo -e "${GREEN}[5/7] Настройка конфигурации...${NC}"

# Backend .env
JWT_SECRET=$(openssl rand -hex 32)
cat > backend/.env << EOF
MONGO_URL=mongodb://localhost:27017
DB_NAME=secure_messenger
CORS_ORIGINS=*
JWT_SECRET=$JWT_SECRET
FRONTEND_URL=http://localhost:3000
EOF

# Frontend .env
cat > frontend/.env << EOF
REACT_APP_BACKEND_URL=http://localhost:8001
EOF

# Создание systemd сервисов
echo -e "${GREEN}[6/7] Создание systemd сервисов...${NC}"

INSTALL_DIR=$(pwd)

# Backend service
cat > /etc/systemd/system/secure-messenger-backend.service << EOF
[Unit]
Description=Secure Messenger Backend
After=network.target mongod.service

[Service]
Type=simple
User=$SUDO_USER
WorkingDirectory=$INSTALL_DIR/backend
Environment="PATH=$INSTALL_DIR/backend/venv/bin"
ExecStart=$INSTALL_DIR/backend/venv/bin/uvicorn server:app --host 0.0.0.0 --port 8001
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF

# Frontend service
cat > /etc/systemd/system/secure-messenger-frontend.service << EOF
[Unit]
Description=Secure Messenger Frontend
After=network.target

[Service]
Type=simple
User=$SUDO_USER
WorkingDirectory=$INSTALL_DIR/frontend
ExecStart=/usr/bin/yarn start
Restart=always
RestartSec=10
Environment="PORT=3000"

[Install]
WantedBy=multi-user.target
EOF

# Включение и запуск сервисов
echo -e "${GREEN}[7/7] Запуск сервисов...${NC}"
systemctl daemon-reload
systemctl enable secure-messenger-backend
systemctl enable secure-messenger-frontend
systemctl start secure-messenger-backend
systemctl start secure-messenger-frontend

# Проверка статуса
sleep 5

echo -e "${GREEN}"
echo "============================================"
echo "  Установка завершена!"
echo "============================================"
echo -e "${NC}"

echo -e "${YELLOW}Проверка сервисов:${NC}"
systemctl status secure-messenger-backend --no-pager | head -5
systemctl status secure-messenger-frontend --no-pager | head -5

echo ""
echo -e "${GREEN}✅ Backend: http://localhost:8001${NC}"
echo -e "${GREEN}✅ Frontend: http://localhost:3000${NC}"
echo -e "${GREEN}✅ API Docs: http://localhost:8001/docs${NC}"
echo ""
echo -e "${YELLOW}Для просмотра логов:${NC}"
echo "  journalctl -u secure-messenger-backend -f"
echo "  journalctl -u secure-messenger-frontend -f"
echo ""
echo -e "${YELLOW}Для остановки/запуска:${NC}"
echo "  sudo systemctl stop secure-messenger-backend"
echo "  sudo systemctl start secure-messenger-backend"
echo ""
echo -e "${GREEN}Откройте http://localhost:3000 в браузере для начала работы!${NC}"
