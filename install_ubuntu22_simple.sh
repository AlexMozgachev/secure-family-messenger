#!/bin/bash

# =============================================================================
# Secure Messenger Builder - Простая установка Ubuntu 22.04 LTS
# Версия: 2.0 - Без SSL, максимально простая и надежная установка
# =============================================================================

set -e

# Цвета для вывода
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m'

# Функции для вывода
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_header() {
    echo -e "${PURPLE}[STEP]${NC} $1"
}

# Проверка версии Ubuntu
check_ubuntu_version() {
    print_header "Проверка системы..."
    
    if [ -f /etc/os-release ]; then
        . /etc/os-release
        if [[ "$VERSION_ID" == "22.04" ]]; then
            print_success "Ubuntu 22.04 LTS ✓"
        else
            print_warning "Обнаружена Ubuntu $VERSION_ID. Рекомендуется 22.04 LTS"
        fi
    fi
}

# Проверка прав root
check_root() {
    if [[ $EUID -ne 0 ]]; then
        print_error "Запустите с правами root: sudo bash install_ubuntu22_simple.sh"
        exit 1
    fi
}

# Автоматическое определение IP
get_server_ip() {
    print_status "Определение IP адреса..."
    
    # Пробуем получить внешний IPv4
    SERVER_IP=$(curl -4 -s --max-time 5 ifconfig.me 2>/dev/null || \
               curl -4 -s --max-time 5 ipinfo.io/ip 2>/dev/null || \
               hostname -I | grep -oE '\b([0-9]{1,3}\.){3}[0-9]{1,3}\b' | head -1)
    
    # Если не удалось - используем localhost
    if [ -z "$SERVER_IP" ] || [[ "$SERVER_IP" =~ ":" ]]; then
        SERVER_IP="127.0.0.1"
        print_warning "Используется localhost. Для внешнего доступа измените в настройках"
    else
        print_success "IP адрес: $SERVER_IP"
    fi
}

print_intro() {
    clear
    echo -e "${CYAN}================================================================${NC}"
    echo -e "${CYAN}       🚀 Secure Messenger Builder v2.0 - Ubuntu 22.04       ${NC}"
    echo -e "${CYAN}================================================================${NC}"
    echo -e "${GREEN}✨ Простая установка без SSL (настраивается в админке)${NC}"
    echo -e "${GREEN}🐍 Python 3.10 + FastAPI + Pydantic${NC}"
    echo -e "${GREEN}⚛️  Node.js 20 + React 18 + Router Dom 6${NC}"  
    echo -e "${GREEN}🗄️ MongoDB 6.0 + современные пакеты${NC}"
    echo ""
    echo -e "${YELLOW}⏱️  Время установки: 3-5 минут${NC}"
    echo ""
}

# Обновление системы
update_system() {
    print_header "Обновление системы..."
    
    export DEBIAN_FRONTEND=noninteractive
    apt update && apt upgrade -y
    
    # Базовые пакеты (без SSL утилит)
    apt install -y \
        curl \
        wget \
        git \
        vim \
        htop \
        unzip \
        software-properties-common \
        apt-transport-https \
        ca-certificates \
        gnupg \
        lsb-release \
        build-essential \
        ufw \
        net-tools
    
    print_success "Система обновлена"
}

# Установка Python 3.10
install_python() {
    print_header "Установка Python 3.10..."
    
    apt install -y \
        python3 \
        python3-pip \
        python3-venv \
        python3-dev \
        python3-setuptools \
        python3-wheel
    
    python3 -m pip install --upgrade pip
    
    print_success "Python 3.10 готов"
}

# Установка Node.js 20
install_nodejs() {
    print_header "Установка Node.js 20..."
    
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
    apt install -y nodejs
    npm install -g yarn
    
    print_success "Node.js 20 + Yarn готовы"
}

# Установка MongoDB 6.0
install_mongodb() {
    print_header "Установка MongoDB 6.0..."
    
    curl -fsSL https://pgp.mongodb.com/server-6.0.asc | gpg -o /usr/share/keyrings/mongodb-server-6.0.gpg --dearmor
    echo "deb [ arch=amd64,arm64 signed-by=/usr/share/keyrings/mongodb-server-6.0.gpg ] https://repo.mongodb.org/apt/ubuntu jammy/mongodb-org/6.0 multiverse" | tee /etc/apt/sources.list.d/mongodb-org-6.0.list
    
    apt update && apt install -y mongodb-org
    systemctl start mongod && systemctl enable mongod
    
    print_success "MongoDB 6.0 запущена"
}

# Настройка файрвола
setup_firewall() {
    print_header "Настройка файрвола..."
    
    ufw --force enable
    ufw default deny incoming
    ufw default allow outgoing
    ufw allow ssh
    ufw allow 80
    ufw allow 443
    ufw allow 3000
    ufw allow 8001
    
    print_success "Файрвол настроен"
}

# Загрузка кода
clone_repository() {
    print_header "Загрузка Secure Messenger Builder..."
    
    cd /opt
    if [ -d "Secure-Messenger-Builder" ]; then
        cd Secure-Messenger-Builder && git pull
    else
        git clone https://github.com/DenKedr/Secure-Messenger-Builder.git
        cd Secure-Messenger-Builder
    fi
    
    chown -R root:root /opt/Secure-Messenger-Builder
    print_success "Код загружен"
}

# Настройка Backend
setup_backend() {
    print_header "Настройка Backend..."
    
    cd /opt/Secure-Messenger-Builder/backend
    
    # Виртуальная среда Python
    rm -rf venv
    python3 -m venv venv
    source venv/bin/activate
    pip install --upgrade pip
    
    # Установка зависимостей
    if [ -f "requirements_ubuntu22.txt" ]; then
        pip install -r requirements_ubuntu22.txt
    else
        # Fallback - устанавливаем базовые пакеты
        pip install fastapi==0.109.1 uvicorn[standard]==0.24.0 motor==3.3.2 pymongo==4.6.1 python-dotenv==1.0.0 python-multipart==0.0.6 passlib[bcrypt]==1.7.4 bcrypt==4.1.2 pydantic==2.5.3 psutil==5.9.6 requests==2.31.0 PyJWT==2.8.0
    fi
    
    # Конфигурация (БЕЗ SSL)
    cat > .env << EOF
MONGO_URL=mongodb://localhost:27017
DB_NAME=secure_messenger
CORS_ORIGINS=*
JWT_SECRET=$(openssl rand -base64 32 2>/dev/null || echo "secure-$(date +%s)")
FRONTEND_URL=http://$SERVER_IP:3000
SSL_ENABLED=false
SERVER_IP=$SERVER_IP
EOF
    
    deactivate
    print_success "Backend готов"
}

# Настройка Frontend
setup_frontend() {
    print_header "Настройка Frontend..."
    
    cd /opt/Secure-Messenger-Builder/frontend
    
    # Создаем чистый package.json без warnings
    cp package.json package.json.backup 2>/dev/null || true
    
    cat > package.json << 'EOF'
{
  "name": "frontend",
  "version": "0.1.0",
  "private": true,
  "dependencies": {
    "@hookform/resolvers": "^3.3.4",
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
    "axios": "^1.6.5",
    "class-variance-authority": "^0.7.0",
    "clsx": "^2.1.0",
    "cmdk": "^0.2.1",
    "date-fns": "^3.2.0",
    "embla-carousel-react": "^8.0.0",
    "input-otp": "^1.2.4",
    "lucide-react": "^0.316.0",
    "next-themes": "^0.2.1",
    "react": "^18.2.0",
    "react-day-picker": "8.10.0",
    "react-dom": "^18.2.0",
    "react-hook-form": "^7.49.3",
    "react-resizable-panels": "^1.0.9",
    "react-router-dom": "^6.20.1",
    "sonner": "^1.4.0",
    "tailwind-merge": "^2.2.1",
    "tailwindcss-animate": "^1.0.7",
    "vaul": "^0.9.0",
    "zod": "^3.22.4",
    "web-vitals": "^3.5.2"
  },
  "scripts": {
    "start": "craco start",
    "build": "craco build",
    "test": "craco test --watchAll=false"
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
    "@craco/craco": "^7.1.0",
    "autoprefixer": "^10.4.17",
    "postcss": "^8.4.35",
    "tailwindcss": "^3.4.1"
  }
}
EOF
    print_status "Создан оптимизированный package.json без warnings"
    
    # Конфигурация
    cat > .env << EOF
REACT_APP_BACKEND_URL=http://$SERVER_IP:8001
EOF
    
    # Установка зависимостей
    rm -rf node_modules yarn.lock 2>/dev/null || true
    yarn install
    
    print_success "Frontend готов"
}

# Создание сервисов
create_services() {
    print_header "Создание сервисов..."
    
    # Backend сервис
    cat > /etc/systemd/system/secure-messenger-backend.service << 'EOF'
[Unit]
Description=Secure Messenger Backend
After=network.target mongod.service
Requires=mongod.service

[Service]
Type=simple
User=root
WorkingDirectory=/opt/Secure-Messenger-Builder/backend
Environment=PATH=/opt/Secure-Messenger-Builder/backend/venv/bin
ExecStart=/opt/Secure-Messenger-Builder/backend/venv/bin/uvicorn server:app --host 0.0.0.0 --port 8001
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
EOF

    # Frontend сервис
    cat > /etc/systemd/system/secure-messenger-frontend.service << 'EOF'
[Unit]
Description=Secure Messenger Frontend
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=/opt/Secure-Messenger-Builder/frontend
Environment=PATH=/usr/local/bin:/usr/bin:/bin
Environment=CI=true
ExecStart=/usr/bin/yarn start
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
EOF
    
    systemctl daemon-reload
    systemctl enable mongod secure-messenger-backend secure-messenger-frontend
    print_success "Сервисы созданы"
}

# Создание админ пользователя
create_admin() {
    print_header "Создание администратора..."
    
    cd /opt/Secure-Messenger-Builder/backend
    source venv/bin/activate
    
    python3 -c "
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from passlib.context import CryptContext
import uuid

async def create_admin():
    try:
        client = AsyncIOMotorClient('mongodb://localhost:27017')
        db = client.secure_messenger
        
        pwd_context = CryptContext(schemes=['bcrypt'], deprecated='auto')
        admin_user = {
            'id': str(uuid.uuid4()),
            'username': 'admin',
            'password_hash': pwd_context.hash('admin123'),
            'display_name': 'Administrator',
            'is_admin': True,
            'is_blocked': False,
            'role': 'admin'
        }
        
        existing = await db.users.find_one({'username': 'admin'})
        if not existing:
            await db.users.insert_one(admin_user)
            print('Админ создан: admin/admin123')
        else:
            print('Админ уже существует')
    except Exception as e:
        print(f'Ошибка: {e}')

asyncio.run(create_admin())
" 2>/dev/null || print_warning "Админ будет создан при первом запуске"
    
    deactivate
}

# Запуск всех сервисов
start_services() {
    print_header "Запуск сервисов..."
    
    systemctl restart mongod
    sleep 2
    systemctl start secure-messenger-backend
    sleep 3
    systemctl start secure-messenger-frontend
    
    print_success "Сервисы запущены"
}

# Проверка установки
verify_installation() {
    print_header "Проверка установки..."
    
    sleep 5
    
    echo ""
    print_status "Статус сервисов:"
    systemctl is-active mongod && echo "✅ MongoDB" || echo "❌ MongoDB"
    systemctl is-active secure-messenger-backend && echo "✅ Backend" || echo "❌ Backend" 
    systemctl is-active secure-messenger-frontend && echo "✅ Frontend" || echo "❌ Frontend"
    
    echo ""
    print_status "Открытые порты:"
    netstat -tlnp 2>/dev/null | grep -E ':3000|:8001' | head -2 || echo "Порты загружаются..."
}

# Финальная информация
show_results() {
    clear
    echo -e "${GREEN}================================================================${NC}"
    echo -e "${GREEN}            🎉 УСТАНОВКА ЗАВЕРШЕНА УСПЕШНО! 🎉             ${NC}"
    echo -e "${GREEN}================================================================${NC}"
    echo ""
    echo -e "${CYAN}🚀 Secure Messenger Builder v2.0 готов!${NC}"
    echo ""
    echo -e "${YELLOW}📱 Адреса для доступа:${NC}"
    echo -e "   🌐 Главная страница:  ${GREEN}http://$SERVER_IP:3000${NC}"
    echo -e "   👤 Админ-панель:      ${GREEN}http://$SERVER_IP:3000/admin${NC}"
    echo -e "   🔧 API документация:  ${GREEN}http://$SERVER_IP:8001/docs${NC}"
    echo ""
    echo -e "${YELLOW}🔑 Данные для входа:${NC}"
    echo -e "   Логин:    ${GREEN}admin${NC}"
    echo -e "   Пароль:   ${GREEN}admin123${NC}"
    echo ""
    echo -e "${BLUE}⚙️  SSL сертификаты настраиваются в админ-панели (Настройки → SSL)${NC}"
    echo ""
    echo -e "${YELLOW}🛠️ Управление:${NC}"
    echo "   sudo systemctl restart secure-messenger-*"
    echo "   sudo journalctl -u secure-messenger-backend -f"
    echo ""
    echo -e "${GREEN}Откройте http://$SERVER_IP:3000/admin для начала работы!${NC}"
    echo -e "${GREEN}================================================================${NC}"
}

# Обработка ошибок
handle_error() {
    print_error "Ошибка на шаге $1"
    exit 1
}

trap 'handle_error $LINENO' ERR

# Главная функция
main() {
    print_intro
    check_root
    check_ubuntu_version
    get_server_ip
    
    update_system
    install_python
    install_nodejs
    install_mongodb
    setup_firewall
    clone_repository
    setup_backend
    setup_frontend
    create_services
    create_admin
    start_services
    verify_installation
    show_results
}

# Запуск
main "$@"