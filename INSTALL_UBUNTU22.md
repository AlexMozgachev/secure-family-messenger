# 🚀 Secure Messenger Builder - Ubuntu 22.04 LTS

## ⚡ Быстрая установка (рекомендуется)

```bash
# Одной командой на чистом Ubuntu 22.04 LTS
curl -fsSL https://raw.githubusercontent.com/DenKedr/Secure-Messenger-Builder/main/install_ubuntu22.sh | sudo bash
```

## 🎯 Оптимизация для Ubuntu 22.04 LTS

### ✅ **Что работает из коробки:**
- **Python 3.10** - идеальная совместимость с FastAPI/Pydantic
- **Node.js 20** - поддержка всех современных React пакетов  
- **MongoDB 6.0** - последняя стабильная версия
- **Все зависимости** - проверенные версии без конфликтов

### 📦 **Версии пакетов:**

**Backend (Python 3.10):**
- FastAPI: 0.109.1
- Pydantic: 2.5.3  
- Uvicorn: 0.24.0
- Motor: 3.3.2
- PyMongo: 4.6.1

**Frontend (Node.js 20):**
- React: 18.2.0
- React Router Dom: 6.20.1
- Современные Radix UI компоненты
- TailwindCSS: 3.4.1

**Системные компоненты:**
- MongoDB: 6.0
- Python: 3.10 (из Ubuntu 22.04)
- Node.js: 20.x LTS

## ⏱️ Время установки: 3-7 минут

## 🌐 После установки доступно:

- **Веб-интерфейс**: `http://YOUR_SERVER_IP:3000`
- **API документация**: `http://YOUR_SERVER_IP:8001/docs`  
- **Админ-панель**: `http://YOUR_SERVER_IP:3000/admin`

## 🔧 Управление сервисами:

```bash
# Статус всех сервисов
sudo systemctl status secure-messenger-*

# Перезапуск сервисов
sudo systemctl restart secure-messenger-backend
sudo systemctl restart secure-messenger-frontend

# Просмотр логов
sudo journalctl -u secure-messenger-backend -f
sudo journalctl -u secure-messenger-frontend -f
```

## 🆘 Устранение проблем:

```bash
# Проверить открытые порты
netstat -tlnp | grep -E ':3000|:8001'

# Проверить MongoDB
sudo systemctl status mongod

# Проверить конфигурацию
cat /opt/Secure-Messenger-Builder/backend/.env
cat /opt/Secure-Messenger-Builder/frontend/.env
```

## 📁 Структура файлов:

- **Код**: `/opt/Secure-Messenger-Builder`
- **Backend**: `/opt/Secure-Messenger-Builder/backend`
- **Frontend**: `/opt/Secure-Messenger-Builder/frontend`
- **Логи**: `journalctl -u secure-messenger-*`

## 🔒 После установки:

1. ✅ Смените пароли в админ-панели
2. ✅ Настройте SSL для production  
3. ✅ Создайте резервные копии
4. ✅ Ограничьте доступ к MongoDB

## 💡 Преимущества Ubuntu 22.04:

- ✅ **LTS поддержка до 2027**
- ✅ **Стабильные пакеты** - все работает из коробки
- ✅ **Быстрая установка** - никаких конфликтов зависимостей
- ✅ **Production ready** - проверено в продакшене
- ✅ **Современные версии** - Python 3.10, Node.js 20, MongoDB 6.0

---

**🎉 Наслаждайтесь стабильной работой на Ubuntu 22.04 LTS!**