#!/bin/bash

echo "🚀 Starting Secure Messenger..."

# Запуск MongoDB
docker start messenger-mongo 2>/dev/null || docker run -d --name messenger-mongo -p 27017:27017 -v mongo_data:/data/db mongo:6

# Запуск Nginx
sudo systemctl start nginx

# Запуск бэкенда (в фоне, но с выводом логов)
cd ~/messenger/Secure-Messenger-Builder
source venv/bin/activate
cd backend
export MONGO_URL="mongodb://localhost:27017/messenger"
export SECRET_KEY="${SECRET_KEY:-supersecretkey12345}"
uvicorn server:app --host 0.0.0.0 --port 8001 --reload
