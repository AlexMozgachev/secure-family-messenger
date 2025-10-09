# 🚀 Быстрая установка на Ubuntu 20.04

## ⚡ Одной командой (рекомендуется)

```bash
# Скачать и запустить установочный скрипт
curl -fsSL https://raw.githubusercontent.com/DenKedr/Secure-Messenger-Builder/main/install_ubuntu.sh | sudo bash
```

## 📋 Альтернативный способ

```bash
# 1. Скачать скрипт
wget https://raw.githubusercontent.com/DenKedr/Secure-Messenger-Builder/main/install_ubuntu.sh

# 2. Сделать исполнимым
chmod +x install_ubuntu.sh

# 3. Запустить установку
sudo ./install_ubuntu.sh
```

## 🛠️ Что установится автоматически:

- ✅ **Python 3** с виртуальной средой
- ✅ **Node.js 18** и Yarn
- ✅ **MongoDB 4.4** 
- ✅ **Git** и базовые утилиты
- ✅ **Файрвол** с правильными правилами
- ✅ **Системные сервисы** для автозапуска
- ✅ **Secure Messenger Builder** из GitHub

## ⏱️ Время установки: 5-10 минут

## 🌐 После установки доступно:

- **Веб-интерфейс**: `http://YOUR_SERVER_IP:3000`
- **API документация**: `http://YOUR_SERVER_IP:8001/docs`  
- **Админ-панель**: `http://YOUR_SERVER_IP:3000/admin`

## 🔧 Управление сервисами:

```bash
# Статус всех сервисов
sudo systemctl status secure-messenger-*

# Перезапуск Backend
sudo systemctl restart secure-messenger-backend

# Перезапуск Frontend  
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

# Перезапуск всех сервисов
sudo systemctl restart mongod secure-messenger-backend secure-messenger-frontend
```

## 📁 Файлы проекта:

- **Код**: `/opt/Secure-Messenger-Builder`
- **Конфиг Backend**: `/opt/Secure-Messenger-Builder/backend/.env`
- **Конфиг Frontend**: `/opt/Secure-Messenger-Builder/frontend/.env`

## 🔒 Безопасность:

⚠️ **После установки обязательно:**
1. Смените пароли в админ-панели
2. Настройте SSL для production
3. Ограничьте доступ к MongoDB
4. Сделайте резервную копию

---

**Готово! Приложение установлено и готово к использованию! 🎉**