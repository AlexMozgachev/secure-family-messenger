# E2E Encryption Implementation Guide

## Обзор

Secure Messenger использует клиентское end-to-end шифрование, где сервер никогда не имеет доступа к незашифрованным данным.

## Архитектура

```
Клиент A              Сервер              Клиент B
   |                     |                     |
   |-- Public Key A ---->|                     |
   |                     |<--- Public Key B ---|
   |                     |                     |
   |-- Encrypted Msg --->|                     |
   |                     |--- Encrypted Msg -->|
   |                     |                     |
   |              [Сервер НЕ может            |
   |               расшифровать]              |
```

## Используемые алгоритмы

### 1. Генерация ключей (Client-side)

**Алгоритм**: X25519 (Curve25519) или RSA-2048

**JavaScript (Web/Mobile)**:
```javascript
// Используя TweetNaCl
import nacl from 'tweetnacl';
import naclUtil from 'tweetnacl-util';

// Генерация пары ключей
const keyPair = nacl.box.keyPair();
const publicKeyBase64 = naclUtil.encodeBase64(keyPair.publicKey);
const privateKeyBase64 = naclUtil.encodeBase64(keyPair.secretKey);

// Сохранение приватного ключа (только локально!)
await SecureStore.setItemAsync('privateKey', privateKeyBase64);

// Отправка публичного ключа на сервер
await api.put('/users/public-key', {
  public_key: publicKeyBase64
});
```

### 2. Обмен ключами

**Процесс**:
1. Пользователь A получает публичный ключ пользователя B с сервера
2. Создается общий секрет (shared secret) используя приватный ключ A и публичный ключ B
3. Этот общий секрет используется для шифрования сообщений

```javascript
// Получение публичного ключа собеседника
const response = await api.get(`/users/${recipientId}/public-key`);
const recipientPublicKey = naclUtil.decodeBase64(response.data.public_key);

// Создание общего секрета
const sharedSecret = nacl.box.before(
  recipientPublicKey,
  myPrivateKey
);
```

### 3. Шифрование сообщений

**Алгоритм**: ChaCha20-Poly1305 (через TweetNaCl)

```javascript
// Шифрование сообщения
async function encryptMessage(plaintext, recipientPublicKey) {
  // Получить свой приватный ключ из SecureStore
  const privateKeyBase64 = await SecureStore.getItemAsync('privateKey');
  const privateKey = naclUtil.decodeBase64(privateKeyBase64);
  
  // Декодировать публичный ключ получателя
  const recipientPubKey = naclUtil.decodeBase64(recipientPublicKey);
  
  // Генерация nonce (одноразовый номер)
  const nonce = nacl.randomBytes(nacl.box.nonceLength);
  
  // Шифрование
  const messageUint8 = naclUtil.decodeUTF8(plaintext);
  const encrypted = nacl.box(
    messageUint8,
    nonce,
    recipientPubKey,
    privateKey
  );
  
  // Объединение nonce и зашифрованных данных
  const fullMessage = new Uint8Array(nonce.length + encrypted.length);
  fullMessage.set(nonce);
  fullMessage.set(encrypted, nonce.length);
  
  // Кодирование в Base64 для передачи
  return naclUtil.encodeBase64(fullMessage);
}
```

### 4. Расшифровка сообщений

```javascript
// Расшифровка сообщения
async function decryptMessage(encryptedBase64, senderPublicKey) {
  // Получить свой приватный ключ
  const privateKeyBase64 = await SecureStore.getItemAsync('privateKey');
  const privateKey = naclUtil.decodeBase64(privateKeyBase64);
  
  // Декодировать зашифрованное сообщение
  const messageWithNonce = naclUtil.decodeBase64(encryptedBase64);
  
  // Извлечь nonce и зашифрованные данные
  const nonce = messageWithNonce.slice(0, nacl.box.nonceLength);
  const message = messageWithNonce.slice(nacl.box.nonceLength);
  
  // Декодировать публичный ключ отправителя
  const senderPubKey = naclUtil.decodeBase64(senderPublicKey);
  
  // Расшифровка
  const decrypted = nacl.box.open(
    message,
    nonce,
    senderPubKey,
    privateKey
  );
  
  if (!decrypted) {
    throw new Error('Не удалось расшифровать сообщение');
  }
  
  // Декодирование в текст
  return naclUtil.encodeUTF8(decrypted);
}
```

## Групповые чаты

Для групповых чатов используется гибридное шифрование:

### 1. Генерация ключа комнаты

```javascript
// Создание симметричного ключа для комнаты
const roomKey = nacl.randomBytes(nacl.secretbox.keyLength);

// Шифрование ключа комнаты для каждого участника
const encryptedKeysForMembers = await Promise.all(
  members.map(async (member) => {
    const memberPublicKey = await getUserPublicKey(member.id);
    return {
      user_id: member.id,
      encrypted_key: await encryptMessage(
        naclUtil.encodeBase64(roomKey),
        memberPublicKey
      )
    };
  })
);
```

### 2. Шифрование сообщений в группе

```javascript
// Шифрование сообщения ключом комнаты
function encryptGroupMessage(plaintext, roomKey) {
  const nonce = nacl.randomBytes(nacl.secretbox.nonceLength);
  const messageUint8 = naclUtil.decodeUTF8(plaintext);
  
  const encrypted = nacl.secretbox(messageUint8, nonce, roomKey);
  
  const fullMessage = new Uint8Array(nonce.length + encrypted.length);
  fullMessage.set(nonce);
  fullMessage.set(encrypted, nonce.length);
  
  return naclUtil.encodeBase64(fullMessage);
}
```

### 3. Расшифровка сообщений в группе

```javascript
// Расшифровка сообщения ключом комнаты
function decryptGroupMessage(encryptedBase64, roomKey) {
  const messageWithNonce = naclUtil.decodeBase64(encryptedBase64);
  
  const nonce = messageWithNonce.slice(0, nacl.secretbox.nonceLength);
  const message = messageWithNonce.slice(nacl.secretbox.nonceLength);
  
  const decrypted = nacl.secretbox.open(message, nonce, roomKey);
  
  if (!decrypted) {
    throw new Error('Не удалось расшифровать сообщение');
  }
  
  return naclUtil.encodeUTF8(decrypted);
}
```

## Шифрование файлов

```javascript
// Шифрование файла перед загрузкой
async function encryptFile(fileData, recipientPublicKey) {
  // Генерация симметричного ключа для файла
  const fileKey = nacl.randomBytes(nacl.secretbox.keyLength);
  
  // Шифрование файла симметричным ключом
  const nonce = nacl.randomBytes(nacl.secretbox.nonceLength);
  const encryptedFile = nacl.secretbox(fileData, nonce, fileKey);
  
  // Шифрование ключа файла публичным ключом получателя
  const encryptedKey = await encryptMessage(
    naclUtil.encodeBase64(fileKey),
    recipientPublicKey
  );
  
  return {
    encrypted_file: encryptedFile,
    encrypted_key: encryptedKey,
    nonce: naclUtil.encodeBase64(nonce)
  };
}
```

## Хранение ключей

### Мобильное приложение (Expo)

```javascript
import * as SecureStore from 'expo-secure-store';

// Сохранение ключа
await SecureStore.setItemAsync('privateKey', privateKeyBase64);

// Получение ключа
const privateKey = await SecureStore.getItemAsync('privateKey');

// Удаление ключа
await SecureStore.deleteItemAsync('privateKey');
```

### Web приложение

```javascript
// Использование IndexedDB для хранения ключей
const db = await openDB('SecureMessenger', 1, {
  upgrade(db) {
    db.createObjectStore('keys');
  },
});

// Сохранение ключа
await db.put('keys', privateKeyBase64, 'privateKey');

// Получение ключа
const privateKey = await db.get('keys', 'privateKey');
```

## Безопасность

### Рекомендации

1. **Никогда не отправляйте приватный ключ на сервер**
2. **Используйте HTTPS для всех API запросов**
3. **Регулярно ротируйте ключи** (рекомендуется каждые 30 дней)
4. **Храните ключи в безопасном месте** (SecureStore, Keychain)
5. **Не логируйте приватные ключи**
6. **Используйте сильные nonce** (всегда случайные)

### Верификация устройств

```javascript
// Генерация fingerprint устройства
function generateFingerprint(publicKey) {
  const hash = sha256(publicKey);
  return hash.slice(0, 16).match(/.{1,4}/g).join('-');
}

// Пример: "a1b2-c3d4-e5f6-g7h8"
```

## Обработка ошибок

```javascript
try {
  const decrypted = await decryptMessage(encryptedMsg, senderPublicKey);
  return decrypted;
} catch (error) {
  if (error.message.includes('расшифровать')) {
    // Ключи не совпадают - возможно нужна пере-генерация
    console.error('Ошибка расшифровки:', error);
    alert('Не удалось расшифровать сообщение. Обновите ключи.');
  }
  throw error;
}
```

## Тестирование

```javascript
// Юнит-тест шифрования/расшифровки
describe('E2E Encryption', () => {
  it('должен шифровать и расшифровывать сообщение', async () => {
    const message = 'Секретное сообщение';
    
    // Генерация ключей для двух пользователей
    const aliceKeys = nacl.box.keyPair();
    const bobKeys = nacl.box.keyPair();
    
    // Алиса шифрует сообщение для Боба
    const encrypted = await encryptMessage(
      message,
      naclUtil.encodeBase64(bobKeys.publicKey)
    );
    
    // Боб расшифровывает сообщение от Алисы
    const decrypted = await decryptMessage(
      encrypted,
      naclUtil.encodeBase64(aliceKeys.publicKey)
    );
    
    expect(decrypted).toBe(message);
  });
});
```

## Производительность

### Оптимизации

1. **Переиспользование shared secrets** - сохраняйте их в памяти
2. **Batch операции** - шифруйте несколько сообщений за раз
3. **Worker threads** - используйте для больших файлов
4. **Lazy loading** - загружайте ключи по требованию

### Benchmark

```javascript
// Производительность шифрования
const start = performance.now();
for (let i = 0; i < 1000; i++) {
  await encryptMessage('Test message', publicKey);
}
const end = performance.now();
console.log(`Среднее время: ${(end - start) / 1000}ms`);
```

## Диаграмма последовательности

```
Пользователь A                          Сервер                          Пользователь B
     |                                     |                                     |
     |--- POST /auth/register ------------>|                                     |
     |--- PUT /users/public-key ---------->|                                     |
     |                                     |<--- POST /auth/register -------------|
     |                                     |<--- PUT /users/public-key ----------|
     |                                     |                                     |
     |--- GET /users/B/public-key -------->|                                     |
     |<-- Public Key B --------------------|                                     |
     |                                     |                                     |
     | [Шифрование сообщения]              |                                     |
     |--- POST /messages (encrypted) ----->|--- WebSocket (encrypted) ---------->|
     |                                     |                                     | [Расшифровка]
     |                                     |                                     |
```

## Дополнительные ресурсы

- [TweetNaCl.js Documentation](https://github.com/dchest/tweetnacl-js)
- [Signal Protocol](https://signal.org/docs/)
- [E2EE Best Practices](https://www.owasp.org/index.php/Cryptographic_Storage_Cheat_Sheet)

## Лицензия

MIT License
