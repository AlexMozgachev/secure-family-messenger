#!/bin/bash

# Quick start script for Secure Messenger

echo "🚀 Starting Secure Messenger..."

# Check if .env file exists
if [ ! -f .env ]; then
    echo "📝 Creating .env from .env.example..."
    cp .env.example .env
fi

# Build and start containers
echo "🐳 Building and starting Docker containers..."
docker compose up -d --build

echo "✅ Secure Messenger is running!"
echo "🌐 Access the application at: http://localhost:3000"
echo "📱 For production, configure Nginx with SSL and use your domain"
