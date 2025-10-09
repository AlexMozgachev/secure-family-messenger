# Secure Messenger Mobile App

Мобильное приложение Secure Messenger на Expo (React Native).

## Статус

🚧 **В разработке** 🚧

## Планируемые функции

### Ядро
- ☑️ E2E шифрование сообщений
- ☑️ Регистрация и вход
- ☑️ Личные чаты 1-на-1
- ☑️ Групповые чаты
- ☑️ Real-time доставка сообщений (WebSocket)

### Медиа
- ☑️ Отправка изображений
- ☑️ Отправка файлов
- ☑️ Голосовые сообщения
- ☑️ Видео сообщения

### Звонки (WebRTC)
- ☑️ Аудио звонки
- ☑️ Видео звонки
- ☑️ Групповые звонки

### Дополнительно
- ☑️ QR-код онбординг
- ☑️ Push-уведомления
- ☑️ Реакции на сообщения
- ☑️ Голосования/опросы
- ☑️ Биометрическая аутентификация

## Технологии

- **Expo** - React Native фреймворк
- **React Native** - мобильный UI
- **Expo SecureStore** - безопасное хранение ключей
- **React Native WebRTC** - звонки
- **expo-crypto** - криптография
- **axios** - HTTP клиент
- **socket.io-client** - WebSocket

## Установка

### Предварительные требования

```bash
npm install -g expo-cli
```

### Установка зависимостей

```bash
cd mobile
npm install
```

### Запуск

```bash
expo start
```

### Сборка

**Android (APK)**:
```bash
expo build:android -t apk
```

**iOS (IPA)**:
```bash
expo build:ios -t archive
```

## Конфигурация

Создайте файл `config.js`:

```javascript
export default {
  API_URL: 'https://your-server.com',
  WS_URL: 'wss://your-server.com',
};
```

## E2E Шифрование

### Использование

```javascript
import { generateKeyPair, encrypt, decrypt } from './crypto';

// Генерация ключей
const { publicKey, privateKey } = await generateKeyPair();

// Шифрование
const encrypted = await encrypt(message, recipientPublicKey);

// Расшифровка
const decrypted = await decrypt(encryptedMessage, privateKey);
```

## QR-код Онбординг

Приложение поддерживает быструю настройку через QR-код:

```json
{
  "server_url": "https://your-server.com",
  "username": "user123",
  "password": "secure_password"
}
```

## Структура проекта

```
mobile/
├── src/
│   ├── screens/       # Экраны
│   ├── components/    # Компоненты
│   ├── navigation/    # Навигация
│   ├── services/      # API сервисы
│   ├── crypto/        # E2E криптография
│   ├── utils/         # Утилиты
│   └── store/         # State management
├── assets/            # Изображения, шрифты
├── app.json           # Expo конфигурация
├── package.json
└── README.md
```

## Сборка для Production

### Android

1. Настройте `app.json`
2. Создайте keystore
3. Запустите сборку:

```bash
expo build:android -t app-bundle
```

### iOS

1. Настройте Apple Developer аккаунт
2. Настройте `app.json`
3. Запустите сборку:

```bash
expo build:ios -t archive
```

## Тестирование

```bash
npm test
```

## Отладка

Используйте React Native Debugger:

```bash
open "rndebugger://set-debugger-loc?host=localhost&port=19000"
```

## Частые проблемы

### Проблемы с WebSocket
- Убедитесь, что сервер доступен
- Проверьте URL в конфигурации

### Проблемы с криптографией
- Проверьте наличие ключей в SecureStore
- Перегенерируйте ключи при необходимости

## Лицензия

MIT License
