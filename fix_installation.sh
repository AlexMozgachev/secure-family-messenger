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
    # Используем localhost для избежания проблем с IPv6
    SERVER_IP="127.0.0.1"
    
    cat > .env << EOF
MONGO_URL=mongodb://localhost:27017
DB_NAME=secure_messenger
CORS_ORIGINS=*
JWT_SECRET=$(openssl rand -base64 32)
FRONTEND_URL=http://$SERVER_IP:3000
EOF
    print_success "Backend .env создан (localhost)"
fi

# Frontend .env
cd ../frontend
if [ ! -f .env ]; then
    # Используем localhost для избежания проблем с IPv6
    SERVER_IP="127.0.0.1"
    
    cat > .env << EOF
REACT_APP_BACKEND_URL=http://$SERVER_IP:8001
EOF
    print_success "Frontend .env создан (localhost)"
fi

# Исправление frontend зависимостей
print_status "Исправление frontend зависимостей..."

# Создание совместимого package.json для Ubuntu 20.04 + Node.js 18
cat > package_ubuntu20.json << 'EOF'
{
  "name": "frontend",
  "version": "0.1.0",
  "private": true,
  "dependencies": {
    "@hookform/resolvers": "^3.3.2",
    "@radix-ui/react-accordion": "^1.1.2",
    "@radix-ui/react-alert-dialog": "^1.0.5",
    "@radix-ui/react-aspect-ratio": "^1.0.3",
    "@radix-ui/react-avatar": "^1.0.4",
    "@radix-ui/react-checkbox": "^1.0.4",
    "@radix-ui/react-collapsible": "^1.0.3",
    "@radix-ui/react-context-menu": "^2.1.5",
    "@radix-ui/react-dialog": "^1.0.5",
    "@radix-ui/react-dropdown-menu": "^2.0.6",
    "@radix-ui/react-hover-card": "^1.0.7",
    "@radix-ui/react-label": "^2.0.2",
    "@radix-ui/react-menubar": "^1.0.4",
    "@radix-ui/react-navigation-menu": "^1.1.4",
    "@radix-ui/react-popover": "^1.0.7",
    "@radix-ui/react-progress": "^1.0.3",
    "@radix-ui/react-radio-group": "^1.1.3",
    "@radix-ui/react-scroll-area": "^1.0.5",
    "@radix-ui/react-select": "^2.0.0",
    "@radix-ui/react-separator": "^1.0.3",
    "@radix-ui/react-slider": "^1.1.2",
    "@radix-ui/react-slot": "^1.0.2",
    "@radix-ui/react-switch": "^1.0.3",
    "@radix-ui/react-tabs": "^1.0.4",
    "@radix-ui/react-toast": "^1.1.5",
    "@radix-ui/react-toggle": "^1.0.3",
    "@radix-ui/react-toggle-group": "^1.0.4",
    "@radix-ui/react-tooltip": "^1.0.7",
    "axios": "^1.6.2",
    "class-variance-authority": "^0.7.0",
    "clsx": "^2.0.0",
    "cmdk": "^0.2.0",
    "cra-template": "1.2.0",
    "date-fns": "^2.30.0",
    "embla-carousel-react": "^8.0.0",
    "input-otp": "^1.2.4",
    "lucide-react": "^0.294.0",
    "next-themes": "^0.2.1",
    "react": "^18.2.0",
    "react-day-picker": "8.9.1",
    "react-dom": "^18.2.0",
    "react-hook-form": "^7.48.2",
    "react-resizable-panels": "^0.0.55",
    "react-router-dom": "^6.20.1",
    "react-scripts": "5.0.1",
    "sonner": "^1.2.4",
    "tailwind-merge": "^2.1.0",
    "tailwindcss-animate": "^1.0.7",
    "vaul": "^0.9.0",
    "zod": "^3.22.4"
  },
  "scripts": {
    "start": "craco start",
    "build": "craco build",
    "test": "craco test"
  },
  "browserslist": {
    "production": [
      ">0.2%",
      "not dead",
      "not op_mini all"
    ],
    "development": [
      "last 1 chrome version",
      "last 1 firefox version",
      "last 1 safari version"
    ]
  },
  "devDependencies": {
    "@babel/plugin-proposal-private-property-in-object": "^7.21.11",
    "@craco/craco": "^7.1.0",
    "@eslint/js": "8.55.0",
    "autoprefixer": "^10.4.16",
    "eslint": "8.55.0",
    "eslint-plugin-import": "2.29.0",
    "eslint-plugin-jsx-a11y": "6.8.0",
    "eslint-plugin-react": "7.33.2",
    "globals": "13.23.0",
    "postcss": "^8.4.32",
    "tailwindcss": "^3.3.6"
  }
}
EOF

# Резервная копия оригинального package.json
cp package.json package.json.backup

# Замена на совместимую версию
cp package_ubuntu20.json package.json

# Удаление старых зависимостей
rm -rf node_modules yarn.lock

# Установка совместимых зависимостей
yarn install

print_success "Frontend зависимости исправлены (совместимые с Node.js 18)"

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