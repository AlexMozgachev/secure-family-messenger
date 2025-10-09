#!/bin/bash

# =============================================================================
# Исправление установки Secure Messenger Builder для Ubuntu 20.04
# =============================================================================

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_status "Исправление установки Secure Messenger Builder..."

# Остановка сервисов если они запущены
print_status "Остановка сервисов..."
systemctl stop secure-messenger-backend 2>/dev/null || true
systemctl stop secure-messenger-frontend 2>/dev/null || true

# Переход в директорию проекта
cd /opt/Secure-Messenger-Builder/backend

# Создание совместимого requirements.txt
print_status "Создание совместимого requirements.txt..."
cat > requirements_ubuntu20.txt << 'EOF'
fastapi==0.104.1
uvicorn[standard]==0.24.0
motor==3.3.1
pymongo==4.5.0
python-dotenv==1.0.0
python-multipart==0.0.6
python-jose[cryptography]==3.3.0
passlib[bcrypt]==1.7.4
bcrypt==4.0.1
pydantic==2.5.3
pydantic-core==2.14.6
psutil==5.9.6
requests==2.31.0
cryptography==41.0.7
PyJWT==2.8.0
email-validator==2.1.0
anyio==3.7.1
starlette==0.27.0
sniffio==1.3.0
typing-extensions==4.8.0
click==8.1.7
h11==0.14.0
idna==3.6
certifi==2023.11.17
charset-normalizer==3.3.2
dnspython==2.4.2
ecdsa==0.18.0
six==1.16.0
cffi==1.16.0
pycparser==2.21
urllib3==2.1.0
EOF

# Пересоздание виртуальной среды
print_status "Пересоздание виртуальной среды Python..."
rm -rf venv
python3 -m venv venv
source venv/bin/activate

# Установка совместимых зависимостей
print_status "Установка совместимых зависимостей..."
pip install --upgrade pip
pip install -r requirements_ubuntu20.txt

print_success "Python зависимости установлены"
deactivate

# Проверка/создание .env файлов
print_status "Проверка конфигурационных файлов..."

# Backend .env
if [ ! -f .env ]; then
    SERVER_IP=$(curl -s ifconfig.me 2>/dev/null || curl -s ipinfo.io/ip 2>/dev/null || hostname -I | awk '{print $1}')
    [ -z "$SERVER_IP" ] && SERVER_IP="localhost"
    
    cat > .env << EOF
MONGO_URL=mongodb://localhost:27017
DB_NAME=secure_messenger
CORS_ORIGINS=*
JWT_SECRET=$(openssl rand -base64 32)
FRONTEND_URL=http://$SERVER_IP:3000
EOF
    print_success "Backend .env создан"
fi

# Frontend .env
cd ../frontend
if [ ! -f .env ]; then
    SERVER_IP=$(curl -s ifconfig.me 2>/dev/null || curl -s ipinfo.io/ip 2>/dev/null || hostname -I | awk '{print $1}')
    [ -z "$SERVER_IP" ] && SERVER_IP="localhost"
    
    cat > .env << EOF
REACT_APP_BACKEND_URL=http://$SERVER_IP:8001
EOF
    print_success "Frontend .env создан"
fi

# Переустановка frontend зависимостей если нужно
if [ ! -d node_modules ]; then
    print_status "Установка frontend зависимостей..."
    yarn install
    print_success "Frontend зависимости установлены"
fi

# Запуск сервисов
print_status "Запуск сервисов..."
systemctl start mongod
systemctl start secure-messenger-backend
sleep 5
systemctl start secure-messenger-frontend

# Проверка статуса
print_status "Проверка статуса сервисов..."
sleep 10

echo ""
echo "=== Статус MongoDB ==="
systemctl status mongod --no-pager -l | head -10

echo ""
echo "=== Статус Backend ==="
systemctl status secure-messenger-backend --no-pager -l | head -10

echo ""
echo "=== Статус Frontend ==="
systemctl status secure-messenger-frontend --no-pager -l | head -10

echo ""
echo "=== Открытые порты ==="
netstat -tlnp | grep -E ':3000|:8001|:27017' || echo "Сервисы еще запускаются..."

print_success "Исправление завершено!"

SERVER_IP=$(curl -s ifconfig.me 2>/dev/null || curl -s ipinfo.io/ip 2>/dev/null || hostname -I | awk '{print $1}')
[ -z "$SERVER_IP" ] && SERVER_IP="localhost"

echo ""
echo -e "${GREEN}================================================================${NC}"
echo -e "${GREEN}                    ✅ ИСПРАВЛЕНИЕ ЗАВЕРШЕНО!                   ${NC}"
echo -e "${GREEN}================================================================${NC}"
echo ""
echo -e "${BLUE}📱 Веб-интерфейс:${NC}     http://$SERVER_IP:3000"
echo -e "${BLUE}🔧 API документация:${NC}  http://$SERVER_IP:8001/docs"
echo -e "${BLUE}👤 Админ-панель:${NC}      http://$SERVER_IP:3000/admin"
echo ""
echo -e "${YELLOW}🔍 Если проблемы остались, проверьте логи:${NC}"
echo "sudo journalctl -u secure-messenger-backend -f"
echo "sudo journalctl -u secure-messenger-frontend -f"