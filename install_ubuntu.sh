#!/bin/bash

# =============================================================================
# Secure Messenger Builder - Автоматическая установка для Ubuntu 20.04
# =============================================================================

set -e  # Остановить скрипт при любой ошибке

# Цвета для вывода
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

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

# Проверка прав root
check_root() {
    if [[ $EUID -ne 0 ]]; then
        print_error "Этот скрипт должен быть запущен с правами root (sudo)"
        exit 1
    fi
}

# Получение IP адреса сервера
get_server_ip() {
    SERVER_IP=$(curl -s ifconfig.me 2>/dev/null || curl -s ipinfo.io/ip 2>/dev/null || hostname -I | awk '{print $1}')
    if [ -z "$SERVER_IP" ]; then
        SERVER_IP="localhost"
    fi
}

print_header() {
    clear
    echo -e "${BLUE}================================================================${NC}"
    echo -e "${BLUE}     🚀 Secure Messenger Builder - Установка Ubuntu 20.04     ${NC}"
    echo -e "${BLUE}================================================================${NC}"
    echo ""
}

# Обновление системы и установка базовых пакетов
install_system_packages() {
    print_status "Обновление системы и установка базовых пакетов..."
    
    # Обновление системы
    apt update && apt upgrade -y
    
    # Установка базовых пакетов
    apt install -y \
        curl \
        wget \
        git \
        vim \
        htop \
        ufw \
        software-properties-common \
        apt-transport-https \
        ca-certificates \
        gnupg \
        lsb-release \
        build-essential
    
    print_success "Базовые пакеты установлены"
}

# Установка Python и зависимостей
install_python() {
    print_status "Установка Python и зависимостей..."
    
    apt install -y \
        python3 \
        python3-pip \
        python3-venv \
        python3-dev \
        python3-setuptools \
        python3-wheel
    
    # Обновление pip
    python3 -m pip install --upgrade pip
    
    print_success "Python установлен: $(python3 --version)"
}

# Установка Node.js и Yarn
install_nodejs() {
    print_status "Установка Node.js и Yarn..."
    
    # Добавление репозитория NodeSource
    curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
    apt install -y nodejs
    
    # Установка Yarn
    npm install -g yarn
    
    print_success "Node.js установлен: $(node --version)"
    print_success "Yarn установлен: $(yarn --version)"
}

# Установка MongoDB
install_mongodb() {
    print_status "Установка MongoDB..."
    
    # Импорт публичного ключа
    wget -qO - https://www.mongodb.org/static/pgp/server-4.4.asc | apt-key add -
    
    # Создание файла списка источников
    echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu focal/mongodb-org/4.4 multiverse" | tee /etc/apt/sources.list.d/mongodb-org-4.4.list
    
    # Обновление локальной базы пакетов
    apt update
    
    # Установка MongoDB
    apt install -y mongodb-org
    
    # Запуск и включение автозапуска
    systemctl start mongod
    systemctl enable mongod
    
    print_success "MongoDB установлен и запущен"
}

# Настройка файрвола
setup_firewall() {
    print_status "Настройка файрвола..."
    
    # Базовые правила
    ufw --force enable
    ufw default deny incoming
    ufw default allow outgoing
    
    # SSH
    ufw allow ssh
    ufw allow 22
    
    # HTTP/HTTPS
    ufw allow 80
    ufw allow 443
    
    # Приложение
    ufw allow 3000  # Frontend
    ufw allow 8001  # Backend API
    
    print_success "Файрвол настроен"
}

# Клонирование репозитория
clone_repository() {
    print_status "Клонирование репозитория..."
    
    cd /opt
    if [ -d "Secure-Messenger-Builder" ]; then
        print_warning "Директория уже существует, обновляем..."
        cd Secure-Messenger-Builder
        git pull
    else
        git clone https://github.com/DenKedr/Secure-Messenger-Builder.git
        cd Secure-Messenger-Builder
    fi
    
    # Установка владельца
    chown -R root:root /opt/Secure-Messenger-Builder
    chmod -R 755 /opt/Secure-Messenger-Builder
    
    print_success "Репозиторий клонирован в /opt/Secure-Messenger-Builder"
}

# Установка Python зависимостей
setup_backend() {
    print_status "Настройка Backend..."
    
    cd /opt/Secure-Messenger-Builder/backend
    
    # Создание виртуальной среды
    python3 -m venv venv
    
    # Активация и установка зависимостей
    source venv/bin/activate
    pip install --upgrade pip
    
    # Попробуем установить с совместимыми версиями для Ubuntu 20.04
    if [ -f "../requirements_ubuntu20.txt" ]; then
        print_status "Установка совместимых зависимостей для Ubuntu 20.04..."
        pip install -r ../requirements_ubuntu20.txt
    else
        print_status "Установка стандартных зависимостей..."
        pip install -r requirements.txt || {
            print_warning "Ошибка установки requirements.txt, пробуем минимальную установку..."
            pip install fastapi==0.104.1 uvicorn[standard]==0.24.0 motor==3.3.1 pymongo==4.5.0 python-dotenv==1.0.0 python-multipart==0.0.6 passlib[bcrypt]==1.7.4 bcrypt==4.0.1 pydantic==2.5.3 psutil==5.9.6 requests==2.31.0 PyJWT==2.8.0
        }
    fi
    deactivate
    
    # Создание .env файла
    cat > .env << EOF
MONGO_URL=mongodb://localhost:27017
DB_NAME=secure_messenger
CORS_ORIGINS=*
JWT_SECRET=$(openssl rand -base64 32)
FRONTEND_URL=http://$SERVER_IP:3000
EOF
    
    print_success "Backend настроен"
}

# Установка Frontend зависимостей
setup_frontend() {
    print_status "Настройка Frontend..."
    
    cd /opt/Secure-Messenger-Builder/frontend
    
    # Установка зависимостей
    yarn install
    
    # Создание .env файла
    cat > .env << EOF
REACT_APP_BACKEND_URL=http://$SERVER_IP:8001
EOF
    
    print_success "Frontend настроен"
}

# Создание системных сервисов
create_services() {
    print_status "Создание системных сервисов..."
    
    # Backend сервис
    cat > /etc/systemd/system/secure-messenger-backend.service << EOF
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
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF

    # Frontend сервис
    cat > /etc/systemd/system/secure-messenger-frontend.service << EOF
[Unit]
Description=Secure Messenger Frontend
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=/opt/Secure-Messenger-Builder/frontend
Environment=PATH=/usr/local/bin:/usr/bin:/bin
ExecStart=/usr/bin/yarn start
Restart=always
RestartSec=10
Environment=CI=true

[Install]
WantedBy=multi-user.target
EOF
    
    # Перезагрузка systemd
    systemctl daemon-reload
    
    print_success "Системные сервисы созданы"
}

# Запуск сервисов
start_services() {
    print_status "Запуск сервисов..."
    
    # Включение автозапуска
    systemctl enable secure-messenger-backend
    systemctl enable secure-messenger-frontend
    
    # Запуск сервисов
    systemctl start secure-messenger-backend
    sleep 5
    systemctl start secure-messenger-frontend
    
    print_success "Сервисы запущены"
}

# Проверка статуса
check_services() {
    print_status "Проверка статуса сервисов..."
    
    echo ""
    echo -e "${YELLOW}=== Статус MongoDB ===${NC}"
    systemctl status mongod --no-pager -l
    
    echo ""
    echo -e "${YELLOW}=== Статус Backend ===${NC}"
    systemctl status secure-messenger-backend --no-pager -l
    
    echo ""
    echo -e "${YELLOW}=== Статус Frontend ===${NC}"
    systemctl status secure-messenger-frontend --no-pager -l
    
    echo ""
    echo -e "${YELLOW}=== Открытые порты ===${NC}"
    netstat -tlnp | grep -E ':3000|:8001|:27017'
}

# Финальная информация
print_final_info() {
    print_success "Установка завершена!"
    
    echo ""
    echo -e "${GREEN}================================================================${NC}"
    echo -e "${GREEN}                    🎉 УСТАНОВКА ЗАВЕРШЕНА!                     ${NC}"
    echo -e "${GREEN}================================================================${NC}"
    echo ""
    echo -e "${BLUE}📱 Веб-интерфейс:${NC}     http://$SERVER_IP:3000"
    echo -e "${BLUE}🔧 API документация:${NC}  http://$SERVER_IP:8001/docs"
    echo -e "${BLUE}👤 Админ-панель:${NC}      http://$SERVER_IP:3000/admin"
    echo ""
    echo -e "${YELLOW}📋 Команды управления:${NC}"
    echo "  Перезапуск Backend:   sudo systemctl restart secure-messenger-backend"
    echo "  Перезапуск Frontend:  sudo systemctl restart secure-messenger-frontend"
    echo "  Просмотр логов:       sudo journalctl -u secure-messenger-backend -f"
    echo "  Статус сервисов:      sudo systemctl status secure-messenger-*"
    echo ""
    echo -e "${YELLOW}📁 Директории:${NC}"
    echo "  Код приложения:       /opt/Secure-Messenger-Builder"
    echo "  Backend логи:         sudo journalctl -u secure-messenger-backend"
    echo "  Frontend логи:        sudo journalctl -u secure-messenger-frontend"
    echo ""
    echo -e "${RED}⚠️  ВАЖНО:${NC}"
    echo "  1. Измените пароли по умолчанию в админ-панели"
    echo "  2. Настройте SSL для production"
    echo "  3. Сделайте резервную копию конфигурации"
    echo ""
}

# Обработка ошибок
handle_error() {
    print_error "Произошла ошибка на линии $1. Код выхода: $2"
    print_error "Проверьте логи выше для получения подробной информации"
    exit $2
}

trap 'handle_error $LINENO $?' ERR

# Основная функция установки
main() {
    print_header
    
    # Проверки
    check_root
    get_server_ip
    
    print_status "Начинаем установку на IP: $SERVER_IP"
    echo ""
    
    # Установка компонентов
    install_system_packages
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
    
    # Проверка
    sleep 10
    check_services
    
    # Финальная информация
    print_final_info
}

# Запуск установки
main "$@"
EOF