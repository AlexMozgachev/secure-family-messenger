#!/bin/bash

# =============================================================================
# Исправление IPv6/SSL проблем для существующих установок
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

print_status "Исправление IPv6/SSL проблем..."

# Определение IPv4 адреса
get_ipv4_address() {
    print_status "Определение правильного IP адреса..."
    
    echo ""
    echo "Выберите тип подключения:"
    echo "1) Использовать localhost (127.0.0.1)"
    echo "2) Получить внешний IPv4 адрес автоматически"  
    echo "3) Ввести IP адрес вручную"
    echo ""
    read -p "Ваш выбор (1-3): " IP_CHOICE
    
    case $IP_CHOICE in
        1)
            NEW_IP="127.0.0.1"
            ;;
        2)
            # Приоритет IPv4
            NEW_IP=$(curl -4 -s --max-time 10 ifconfig.me 2>/dev/null || \
                    curl -4 -s --max-time 10 ipinfo.io/ip 2>/dev/null || \
                    hostname -I | grep -oE '\b([0-9]{1,3}\.){3}[0-9]{1,3}\b' | head -1)
            
            if [ -z "$NEW_IP" ] || [[ "$NEW_IP" =~ ":" ]]; then
                print_error "Не удалось получить IPv4 адрес"
                NEW_IP="127.0.0.1"
            fi
            ;;
        3)
            read -p "Введите IPv4 адрес: " NEW_IP
            if [ -z "$NEW_IP" ]; then
                NEW_IP="127.0.0.1"
            fi
            ;;
        *)
            NEW_IP="127.0.0.1"
            ;;
    esac
    
    print_success "Установлен IP: $NEW_IP"
}

# Остановка сервисов
print_status "Остановка сервисов..."
systemctl stop secure-messenger-frontend 2>/dev/null || true
systemctl stop secure-messenger-backend 2>/dev/null || true

# Получение нового IP
get_ipv4_address

# Исправление конфигурации backend
print_status "Исправление конфигурации Backend..."
cd /opt/Secure-Messenger-Builder/backend

# Обновление .env
cat > .env << EOF
MONGO_URL=mongodb://localhost:27017
DB_NAME=secure_messenger
CORS_ORIGINS=*
JWT_SECRET=$(openssl rand -base64 32 2>/dev/null || echo "fallback-secret-$(date +%s)")
FRONTEND_URL=http://$NEW_IP:3000
SKIP_SSL=true
SERVER_IP=$NEW_IP
EOF

print_success "Backend .env обновлен"

# Исправление конфигурации frontend
print_status "Исправление конфигурации Frontend..."
cd /opt/Secure-Messenger-Builder/frontend

cat > .env << EOF
REACT_APP_BACKEND_URL=http://$NEW_IP:8001
EOF

print_success "Frontend .env обновлен"

# Запуск сервисов
print_status "Запуск сервисов..."
systemctl start secure-messenger-backend
sleep 5
systemctl start secure-messenger-frontend

# Проверка статуса
print_status "Проверка статуса..."
sleep 10

echo ""
echo "=== Статус сервисов ==="
systemctl is-active secure-messenger-backend && echo "✅ Backend: Работает" || echo "❌ Backend: Не работает"
systemctl is-active secure-messenger-frontend && echo "✅ Frontend: Работает" || echo "❌ Frontend: Не работает"

echo ""
echo "=== Открытые порты ==="
netstat -tlnp | grep -E ':3000|:8001' || echo "Порты загружаются..."

echo ""
print_success "Исправление завершено!"
echo ""
echo -e "${GREEN}📱 Новые адреса:${NC}"
echo -e "   • Веб-интерфейс:    http://$NEW_IP:3000"
echo -e "   • API документация: http://$NEW_IP:8001/docs"
echo -e "   • Админ-панель:     http://$NEW_IP:3000/admin"
echo ""
echo -e "${YELLOW}Логин: admin, Пароль: admin123${NC}"