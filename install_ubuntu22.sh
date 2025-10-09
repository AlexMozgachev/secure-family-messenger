#!/bin/bash

# =============================================================================
# Secure Messenger Builder - Установка для Ubuntu 22.04 LTS
# Оптимизированная версия с современными пакетами
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
    print_header "Проверка версии Ubuntu..."
    
    if [ -f /etc/os-release ]; then
        . /etc/os-release
        if [[ "$VERSION_ID" == "22.04" ]]; then
            print_success "Ubuntu 22.04 LTS обнаружена ✓"
        else
            print_warning "Обнаружена Ubuntu $VERSION_ID. Рекомендуется Ubuntu 22.04 LTS"
            read -p "Продолжить установку? (y/N): " -n 1 -r
            echo
            if [[ ! $REPLY =~ ^[Yy]$ ]]; then
                print_error "Установка отменена"
                exit 1
            fi
        fi
    else
        print_warning "Не удалось определить версию Ubuntu"
    fi
}

# Проверка прав root
check_root() {
    if [[ $EUID -ne 0 ]]; then
        print_error "Этот скрипт должен быть запущен с правами root (sudo)"
        exit 1
    fi
}

# Получение IP адреса
get_server_ip() {
    SERVER_IP=$(curl -s ifconfig.me 2>/dev/null || curl -s ipinfo.io/ip 2>/dev/null || hostname -I | awk '{print $1}')
    if [ -z "$SERVER_IP" ]; then
        SERVER_IP="127.0.0.1"
    fi
    print_status "IP сервера: $SERVER_IP"
}

print_intro() {
    clear
    echo -e "${CYAN}================================================================${NC}"
    echo -e "${CYAN}    🚀 Secure Messenger Builder - Ubuntu 22.04 LTS Setup     ${NC}"
    echo -e "${CYAN}================================================================${NC}"
    echo -e "${GREEN}✨ Оптимизированная установка для современных пакетов${NC}"
    echo -e "${GREEN}🐍 Python 3.10 + FastAPI 0.109 + Pydantic 2.5${NC}"
    echo -e "${GREEN}⚛️  Node.js 20 + React 18.2 + Router Dom 6.20${NC}"  
    echo -e "${GREEN}🗄️ MongoDB 6.0 + Motor 3.3${NC}"
    echo ""
}

# Обновление системы
update_system() {
    print_header "Обновление системы Ubuntu 22.04..."
    
    export DEBIAN_FRONTEND=noninteractive
    
    # Обновление пакетов
    apt update && apt upgrade -y
    
    # Установка базовых пакетов
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
        openssl
    
    print_success "Система обновлена"
}

# Установка Python 3.10
install_python() {
    print_header "Настройка Python 3.10..."
    
    # Python 3.10 уже есть в Ubuntu 22.04
    apt install -y \
        python3 \
        python3-pip \
        python3-venv \
        python3-dev \
        python3-setuptools \
        python3-wheel
    
    # Обновление pip до последней версии
    python3 -m pip install --upgrade pip
    
    PYTHON_VERSION=$(python3 --version)
    print_success "Python установлен: $PYTHON_VERSION"
}

# Установка Node.js 20
install_nodejs() {
    print_header "Установка Node.js 20 LTS..."
    
    # Установка Node.js 20 из NodeSource
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
    apt install -y nodejs
    
    # Установка Yarn
    npm install -g yarn
    
    NODE_VERSION=$(node --version)
    YARN_VERSION=$(yarn --version)
    print_success "Node.js установлен: $NODE_VERSION"
    print_success "Yarn установлен: $YARN_VERSION"
}

# Установка MongoDB 6.0
install_mongodb() {
    print_header "Установка MongoDB 6.0..."
    
    # Импорт ключа MongoDB
    curl -fsSL https://pgp.mongodb.com/server-6.0.asc | gpg -o /usr/share/keyrings/mongodb-server-6.0.gpg --dearmor
    
    # Добавление репозитория
    echo "deb [ arch=amd64,arm64 signed-by=/usr/share/keyrings/mongodb-server-6.0.gpg ] https://repo.mongodb.org/apt/ubuntu jammy/mongodb-org/6.0 multiverse" | tee /etc/apt/sources.list.d/mongodb-org-6.0.list
    
    # Обновление и установка
    apt update
    apt install -y mongodb-org
    
    # Настройка автозапуска
    systemctl start mongod
    systemctl enable mongod
    
    print_success "MongoDB 6.0 установлена и запущена"
}

# Настройка файрвола
setup_firewall() {
    print_header "Настройка файрвола..."
    
    # Включение UFW
    ufw --force enable
    ufw default deny incoming
    ufw default allow outgoing
    
    # Разрешение портов
    ufw allow ssh
    ufw allow 80
    ufw allow 443
    ufw allow 3000  # React
    ufw allow 8001  # FastAPI
    
    print_success "Файрвол настроен"
}

# Клонирование репозитория
clone_repository() {
    print_header "Загрузка Secure Messenger Builder..."
    
    cd /opt
    if [ -d "Secure-Messenger-Builder" ]; then
        print_warning "Обновление существующей установки..."
        cd Secure-Messenger-Builder
        git stash 2>/dev/null || true
        git pull
    else
        git clone https://github.com/DenKedr/Secure-Messenger-Builder.git
        cd Secure-Messenger-Builder
    fi
    
    chown -R root:root /opt/Secure-Messenger-Builder
    chmod -R 755 /opt/Secure-Messenger-Builder
    
    print_success "Код загружен в /opt/Secure-Messenger-Builder"
}

# Настройка Backend (Python)
setup_backend() {
    print_header "Настройка Backend (Python 3.10 + FastAPI)..."
    
    cd /opt/Secure-Messenger-Builder/backend
    
    # Создание виртуальной среды
    rm -rf venv
    python3 -m venv venv
    source venv/bin/activate
    
    # Обновление pip в venv
    pip install --upgrade pip setuptools wheel
    
    # Создание requirements для Ubuntu 22.04
    cat > requirements_ubuntu22.txt << 'EOF'
fastapi==0.109.1
uvicorn[standard]==0.24.0
motor==3.3.2
pymongo==4.6.1
python-dotenv==1.0.0
python-multipart==0.0.6
python-jose[cryptography]==3.3.0
passlib[bcrypt]==1.7.4
bcrypt==4.1.2
pydantic==2.5.3
pydantic-core==2.14.6
psutil==5.9.6
requests==2.31.0
cryptography==42.0.2
PyJWT==2.8.0
email-validator==2.1.0
anyio==4.2.0
starlette==0.35.1
sniffio==1.3.0
typing-extensions==4.9.0
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
httptools==0.6.1
pyyaml==6.0.1
uvloop==0.19.0
watchfiles==0.21.0
websockets==12.0
EOF
    
    # Установка зависимостей
    print_status "Установка Python зависимостей..."
    pip install -r requirements_ubuntu22.txt
    
    # Создание .env файла
    print_status "Создание конфигурации Backend..."
    cat > .env << EOF
MONGO_URL=mongodb://localhost:27017
DB_NAME=secure_messenger
CORS_ORIGINS=*
JWT_SECRET=$(openssl rand -base64 32)
FRONTEND_URL=http://$SERVER_IP:3000
EOF
    
    deactivate
    print_success "Backend настроен (FastAPI + Python 3.10)"
}

# Настройка Frontend (React)
setup_frontend() {
    print_header "Настройка Frontend (React 18.2 + Node.js 20)..."
    
    cd /opt/Secure-Messenger-Builder/frontend
    
    # Создание package.json для Ubuntu 22.04
    cat > package_ubuntu22.json << 'EOF'
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
    "cra-template": "1.2.0",
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
    "react-scripts": "5.0.1",
    "sonner": "^1.4.0",
    "tailwind-merge": "^2.2.1",
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
    "@eslint/js": "9.0.0",
    "autoprefixer": "^10.4.17",
    "eslint": "9.0.0",
    "eslint-plugin-import": "2.29.1",
    "eslint-plugin-jsx-a11y": "6.8.0",
    "eslint-plugin-react": "7.34.0",
    "globals": "14.0.0",
    "postcss": "^8.4.35",
    "tailwindcss": "^3.4.1"
  }
}
EOF
    
    # Резервная копия и замена package.json
    cp package.json package.json.backup 2>/dev/null || true
    cp package_ubuntu22.json package.json
    
    # Создание .env файла
    print_status "Создание конфигурации Frontend..."
    cat > .env << EOF
REACT_APP_BACKEND_URL=http://$SERVER_IP:8001
EOF
    
    # Установка зависимостей
    print_status "Установка React зависимостей (может занять несколько минут)..."
    rm -rf node_modules yarn.lock
    yarn install
    
    print_success "Frontend настроен (React 18.2 + Node.js 20)"
}

# Создание systemd сервисов
create_services() {
    print_header "Создание системных сервисов..."
    
    # Backend сервис
    cat > /etc/systemd/system/secure-messenger-backend.service << 'EOF'
[Unit]
Description=Secure Messenger Backend (FastAPI)
After=network.target mongod.service
Requires=mongod.service

[Service]
Type=simple
User=root
WorkingDirectory=/opt/Secure-Messenger-Builder/backend
Environment=PATH=/opt/Secure-Messenger-Builder/backend/venv/bin
ExecStart=/opt/Secure-Messenger-Builder/backend/venv/bin/uvicorn server:app --host 0.0.0.0 --port 8001
Restart=always
RestartSec=10
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
EOF

    # Frontend сервис
    cat > /etc/systemd/system/secure-messenger-frontend.service << 'EOF'
[Unit]
Description=Secure Messenger Frontend (React)
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=/opt/Secure-Messenger-Builder/frontend
Environment=PATH=/usr/local/bin:/usr/bin:/bin
Environment=CI=true
Environment=PORT=3000
ExecStart=/usr/bin/yarn start
Restart=always
RestartSec=10
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
EOF
    
    # Перезагрузка systemd
    systemctl daemon-reload
    
    print_success "Системные сервисы созданы"
}

# Запуск сервисов
start_services() {
    print_header "Запуск сервисов..."
    
    # Включение автозапуска
    systemctl enable mongod
    systemctl enable secure-messenger-backend
    systemctl enable secure-messenger-frontend
    
    # Запуск сервисов по очереди
    systemctl restart mongod
    sleep 3
    
    systemctl start secure-messenger-backend
    sleep 5
    
    systemctl start secure-messenger-frontend
    sleep 3
    
    print_success "Сервисы запущены"
}

# Проверка установки
verify_installation() {
    print_header "Проверка установки..."
    
    echo ""
    print_status "Статус MongoDB:"
    systemctl is-active mongod && echo "✅ MongoDB: Работает" || echo "❌ MongoDB: Не работает"
    
    print_status "Статус Backend:"
    systemctl is-active secure-messenger-backend && echo "✅ Backend: Работает" || echo "❌ Backend: Не работает"
    
    print_status "Статус Frontend:"
    systemctl is-active secure-messenger-frontend && echo "✅ Frontend: Работает" || echo "❌ Frontend: Не работает"
    
    echo ""
    print_status "Открытые порты:"
    netstat -tlnp 2>/dev/null | grep -E ':3000|:8001|:27017' || echo "Порты еще загружаются..."
    
    # Тест API
    sleep 10
    print_status "Тестирование API..."
    if curl -s http://localhost:8001/docs > /dev/null 2>&1; then
        echo "✅ Backend API: Доступен"
    else
        echo "⏳ Backend API: Загружается..."
    fi
}

# Финальная информация
show_final_info() {
    clear
    echo -e "${GREEN}================================================================${NC}"
    echo -e "${GREEN}           🎉 УСТАНОВКА ЗАВЕРШЕНА УСПЕШНО! 🎉              ${NC}"
    echo -e "${GREEN}================================================================${NC}"
    echo ""
    echo -e "${CYAN}🚀 Secure Messenger Builder готов к использованию!${NC}"
    echo ""
    echo -e "${YELLOW}📱 Доступ к приложению:${NC}"
    echo -e "   • Веб-интерфейс:    http://$SERVER_IP:3000"
    echo -e "   • API документация: http://$SERVER_IP:8001/docs"
    echo -e "   • Админ-панель:     http://$SERVER_IP:3000/admin"
    echo ""
    echo -e "${YELLOW}🛠️ Управление сервисами:${NC}"
    echo "   sudo systemctl restart secure-messenger-backend"
    echo "   sudo systemctl restart secure-messenger-frontend"
    echo "   sudo systemctl status secure-messenger-*"
    echo ""
    echo -e "${YELLOW}📋 Логи для диагностики:${NC}"
    echo "   sudo journalctl -u secure-messenger-backend -f"
    echo "   sudo journalctl -u secure-messenger-frontend -f"
    echo ""
    echo -e "${YELLOW}📁 Файлы проекта:${NC}"
    echo "   Код:        /opt/Secure-Messenger-Builder"
    echo "   Backend:    /opt/Secure-Messenger-Builder/backend"
    echo "   Frontend:   /opt/Secure-Messenger-Builder/frontend"
    echo ""
    echo -e "${RED}⚠️ Важно:${NC}"
    echo "   1. Смените пароли по умолчанию в админ-панели"
    echo "   2. Настройте SSL для production"
    echo "   3. Создайте резервные копии"
    echo ""
    echo -e "${GREEN}Готово! Откройте http://$SERVER_IP:3000 в браузере${NC}"
    echo -e "${GREEN}================================================================${NC}"
}

# Обработка ошибок
handle_error() {
    print_error "Ошибка на линии $1. Код: $2"
    print_error "Проверьте логи выше для диагностики"
    echo ""
    print_status "Для получения помощи:"
    echo "1. Сохраните вывод этого скрипта"
    echo "2. Проверьте логи: journalctl -xe"
    echo "3. Создайте issue на GitHub"
    exit $2
}

trap 'handle_error $LINENO $?' ERR

# Основная функция
main() {
    print_intro
    
    # Проверки системы
    check_root
    check_ubuntu_version
    get_server_ip
    
    print_status "Начинаем установку на Ubuntu 22.04 LTS..."
    echo ""
    
    # Установка компонентов
    update_system
    install_python
    install_nodejs  
    install_mongodb
    setup_firewall
    
    # Настройка приложения
    clone_repository
    setup_backend
    setup_frontend
    
    # Системные сервисы
    create_services
    start_services
    
    # Проверка и финализация
    verify_installation
    show_final_info
}

# Запуск установки
main "$@"