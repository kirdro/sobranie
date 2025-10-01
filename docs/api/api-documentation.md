# 📚 Sobranie API - Полная документация

## 🔗 Базовый URL

```
https://api.sobranie.yaropolk.tech
```

## 🔐 Аутентификация

Большинство endpoints требуют JWT токен в заголовке:

```
Authorization: Bearer <ваш_jwt_токен>
```

---

## 📖 Содержание

1. [🔐 Аутентификация (Auth)](#-аутентификация-auth)
2. [👤 Пользователи (Users)](#-пользователи-users)
3. [⭕ Круги/Группы (Circles)](#-кругигруппы-circles)
4. [📝 Посты (Posts)](#-посты-posts)
5. [🔔 Уведомления (Notifications)](#-уведомления-notifications)
6. [🤖 ИИ-Ассистент (Assistant)](#-ии-ассистент-assistant)
7. [⚡ Реалтайм (Realtime)](#-реалтайм-realtime)
8. [🧭 Навигация (Navigation)](#-навигация-navigation)
9. [💊 Системные endpoints](#-системные-endpoints)

---

# 🔐 Аутентификация (Auth)

## POST /auth/register

**Регистрация нового пользователя**

### Запрос

```http
POST /auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "securepassword123",
  "firstName": "Иван",        // опционально
  "lastName": "Иванов"        // опционально
}
```

### Ответы

**200 OK** - Успешная регистрация

```json
{
	"accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
	"tokenType": "Bearer",
	"expiresIn": 86400,
	"user": {
		"id": "user_123",
		"email": "user@example.com",
		"firstName": "Иван",
		"lastName": "Иванов",
		"role": "user"
	}
}
```

**409 Conflict** - Пользователь уже существует

```json
{
	"error": "User already exists",
	"message": "Пользователь с таким email уже существует"
}
```

---

## POST /auth/login

**Авторизация пользователя**

### Запрос

```http
POST /auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "securepassword123"
}
```

### Ответы

**200 OK** - Успешная авторизация

```json
{
	"accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
	"tokenType": "Bearer",
	"expiresIn": 86400,
	"user": {
		"id": "user_123",
		"email": "user@example.com",
		"firstName": "Иван",
		"lastName": "Иванов",
		"role": "user"
	}
}
```

**401 Unauthorized** - Неверные учетные данные

```json
{
	"error": "Invalid credentials",
	"message": "Неверный email или пароль"
}
```

**403 Forbidden** - Аккаунт деактивирован

```json
{
	"error": "Account disabled",
	"message": "Аккаунт деактивирован"
}
```

---

## GET /auth/me

**Получение информации о текущем пользователе**

### Запрос

```http
GET /auth/me
Authorization: Bearer <token>
```

### Ответы

**200 OK**

```json
{
	"id": "user_123",
	"email": "user@example.com",
	"firstName": "Иван",
	"lastName": "Иванов",
	"role": "user",
	"isActive": true,
	"createdAt": "2024-01-15T10:30:00.000Z",
	"teamId": null,
	"avatarId": null
}
```

**401 Unauthorized** - Токен отсутствует или недействителен

---

## POST /auth/change-password

**Смена пароля**

### Запрос

```http
POST /auth/change-password
Authorization: Bearer <token>
Content-Type: application/json

{
  "currentPassword": "oldpassword123",
  "newPassword": "newpassword456"
}
```

### Ответы

**200 OK**

```json
{
	"success": true,
	"message": "Пароль успешно изменен"
}
```

**401 Unauthorized** - Неверный текущий пароль или токен

---

# 👤 Пользователи (Users)

## GET /users/

**Получение списка пользователей**

### Запрос

```http
GET /users/?page=1&limit=20
Authorization: Bearer <token>
```

### Query параметры

- `page` (опционально) - номер страницы (по умолчанию: 1)
- `limit` (опционально) - количество на странице (по умолчанию: 20)

### Ответы

**200 OK**

```json
{
	"items": [
		{
			"id": "user_123",
			"email": "user@example.com",
			"firstName": "Иван",
			"lastName": "Иванов",
			"role": "user",
			"isActive": true,
			"createdAt": "2024-01-15T10:30:00.000Z"
		}
	],
	"total": 156,
	"page": 1,
	"limit": 20
}
```

---

## GET /users/:id

**Получение пользователя по ID**

### Запрос

```http
GET /users/user_123
Authorization: Bearer <token>
```

### Ответы

**200 OK**

```json
{
	"id": "user_123",
	"email": "user@example.com",
	"firstName": "Иван",
	"lastName": "Иванов",
	"role": "user",
	"isActive": true,
	"createdAt": "2024-01-15T10:30:00.000Z",
	"updatedAt": "2024-01-15T10:30:00.000Z",
	"teamId": null,
	"avatarId": null
}
```

**404 Not Found** - Пользователь не найден

---

# ⭕ Круги/Группы (Circles)

## GET /circles/

**Получение списка кругов**

### Запрос

```http
GET /circles/?page=1&limit=20
```

### Ответы

**200 OK**

```json
{
	"items": [
		{
			"id": "circle_123",
			"name": "Разработка",
			"description": "Круг для обсуждения разработки",
			"isPrivate": false,
			"memberCount": 42,
			"createdAt": "2024-01-15T10:30:00.000Z",
			"createdBy": "user_123"
		}
	],
	"total": 15,
	"page": 1,
	"limit": 20
}
```

---

## GET /circles/:id

**Получение круга по ID**

### Запрос

```http
GET /circles/circle_123
```

### Ответы

**200 OK**

```json
{
	"id": "circle_123",
	"name": "Разработка",
	"description": "Круг для обсуждения разработки",
	"isPrivate": false,
	"memberCount": 42,
	"createdAt": "2024-01-15T10:30:00.000Z",
	"createdBy": "user_123"
}
```

---

# 📝 Посты (Posts)

## GET /posts/

**Получение списка постов**

### Запрос

```http
GET /posts/?page=1&limit=20
```

### Ответы

**200 OK**

```json
{
	"items": [
		{
			"id": "post_123",
			"authorId": "user_123",
			"content": "Это содержимое поста",
			"circleId": "circle_123",
			"attachments": ["https://example.com/image1.jpg"],
			"tags": ["разработка", "api"],
			"likesCount": 15,
			"commentsCount": 3,
			"createdAt": "2024-01-15T10:30:00.000Z",
			"updatedAt": "2024-01-15T10:30:00.000Z"
		}
	],
	"total": 250,
	"page": 1,
	"limit": 20
}
```

---

## POST /posts/

**Создание нового поста**

### Запрос

```http
POST /posts/
Authorization: Bearer <token>
Content-Type: application/json

{
  "authorId": "user_123",
  "content": "Содержимое нового поста",
  "circleId": "circle_123",                              // опционально
  "attachments": ["https://example.com/image1.jpg"],     // опционально
  "tags": ["разработка", "api"]                          // опционально
}
```

### Ответы

**201 Created**

```json
{
	"id": "post_456",
	"authorId": "user_123",
	"content": "Содержимое нового поста",
	"circleId": "circle_123",
	"attachments": ["https://example.com/image1.jpg"],
	"tags": ["разработка", "api"],
	"likesCount": 0,
	"commentsCount": 0,
	"createdAt": "2024-01-15T11:45:00.000Z",
	"updatedAt": "2024-01-15T11:45:00.000Z"
}
```

---

# 🔔 Уведомления (Notifications)

## GET /notifications/

**Получение уведомлений пользователя**

### Запрос

```http
GET /notifications/
Authorization: Bearer <token>
```

### Ответы

**200 OK**

```json
{
	"items": [
		{
			"id": "notification_123",
			"type": "like",
			"title": "Новый лайк",
			"message": "Иван Иванов лайкнул ваш пост",
			"isRead": false,
			"createdAt": "2024-01-15T10:30:00.000Z",
			"relatedId": "post_123"
		}
	],
	"total": 25,
	"unreadCount": 5
}
```

### Типы уведомлений

- `like` - лайк поста
- `comment` - комментарий к посту
- `follow` - новый подписчик
- `mention` - упоминание в посте

---

# 🤖 ИИ-Ассистент (Assistant)

## GET /assistant/modes

**Получение доступных режимов ассистента**

### Запрос

```http
GET /assistant/modes
```

### Ответы

**200 OK**

```json
{
	"items": [
		{
			"id": "general",
			"name": "Общий ассистент",
			"description": "Универсальный ИИ-помощник",
			"capabilities": ["текст", "анализ", "советы"]
		}
	]
}
```

---

## POST /assistant/sessions

**Создание новой сессии с ассистентом**

### Запрос

```http
POST /assistant/sessions
Authorization: Bearer <token>
Content-Type: application/json

{
  "mode": "general"  // опционально
}
```

### Ответы

**201 Created**

```json
{
	"sessionId": "session_1234567890123",
	"mode": "general",
	"createdAt": "2024-01-15T10:30:00.000Z",
	"status": "active"
}
```

---

# ⚡ Реалтайм (Realtime)

## GET /realtime/health

**Проверка статуса реалтайм сервисов**

### Запрос

```http
GET /realtime/health
```

### Ответы

**200 OK**

```json
{
	"status": "ok",
	"connections": {
		"websocket": 42,
		"sse": 15,
		"total": 57
	},
	"uptime": 86400,
	"features": {
		"websocket": true,
		"sse": true,
		"webrtc": false
	}
}
```

---

## WebSocket /realtime/ws

**WebSocket соединение для реалтайм коммуникации**

### Подключение

```javascript
const ws = new WebSocket('wss://api.sobranie.yaropolk.tech/realtime/ws');

// Аутентификация
ws.send(
	JSON.stringify({
		type: 'auth',
		token: 'your_jwt_token',
	}),
);
```

### Отправка сообщений

```javascript
// Подписка на канал
ws.send(
	JSON.stringify({
		type: 'subscribe',
		channel: 'posts',
	}),
);

// Отправка сообщения в канал
ws.send(
	JSON.stringify({
		type: 'message',
		channel: 'posts',
		data: {
			action: 'new_post',
			postId: 'post_123',
		},
	}),
);
```

### Получение сообщений

```javascript
ws.onmessage = (event) => {
	const message = JSON.parse(event.data);
	console.log('Received:', message);
};
```

---

## GET /realtime/sse/:channel

**Server-Sent Events для получения обновлений**

### Запрос

```javascript
const eventSource = new EventSource(
	'https://api.sobranie.yaropolk.tech/realtime/sse/posts?token=your_jwt_token',
);

eventSource.onmessage = (event) => {
	const data = JSON.parse(event.data);
	console.log('SSE update:', data);
};
```

### Доступные каналы

- `posts` - обновления постов
- `notifications` - уведомления
- `messages` - личные сообщения

---

## POST /realtime/broadcast

**Отправка широковещательного сообщения**

### Запрос

```http
POST /realtime/broadcast
Authorization: Bearer <token>
Content-Type: application/json

{
  "type": "notification",
  "channel": "posts",
  "data": {
    "message": "Новый пост опубликован",
    "postId": "post_123"
  }
}
```

### Ответы

**200 OK**

```json
{
	"success": true,
	"message": "Broadcast sent"
}
```

---

# 🧭 Навигация (Navigation)

## GET /navigation/links

**Получение ссылок навигационного меню**

### Запрос

```http
GET /navigation/links
```

### Ответы

**200 OK**

```json
{
	"items": [
		{
			"id": "home",
			"title": "Главная",
			"url": "/",
			"icon": "home",
			"order": 1,
			"isExternal": false
		},
		{
			"id": "circles",
			"title": "Круги",
			"url": "/circles",
			"icon": "group",
			"order": 2,
			"isExternal": false
		}
	]
}
```

---

# 💊 Системные endpoints

## GET /healthz

**Проверка здоровья API**

### Запрос

```http
GET /healthz
```

### Ответы

**200 OK**

```json
{
	"status": "ok"
}
```

---

## GET /swagger

**OpenAPI документация (Swagger UI)**

### Запрос

```http
GET /swagger
```

Откроется интерактивная документация API.

---

# 📊 Коды ошибок

| Код | Описание                                         |
| --- | ------------------------------------------------ |
| 200 | Успешный запрос                                  |
| 201 | Ресурс создан                                    |
| 400 | Неверный запрос                                  |
| 401 | Не авторизован                                   |
| 403 | Доступ запрещен                                  |
| 404 | Ресурс не найден                                 |
| 409 | Конфликт (например, пользователь уже существует) |
| 500 | Внутренняя ошибка сервера                        |

---

# 🔧 Примеры использования

## Полный цикл аутентификации

```javascript
// 1. Регистрация
const registerResponse = await fetch(
	'https://api.sobranie.yaropolk.tech/auth/register',
	{
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({
			email: 'user@example.com',
			password: 'securepassword123',
			firstName: 'Иван',
		}),
	},
);

const { accessToken } = await registerResponse.json();

// 2. Использование токена для запросов
const userResponse = await fetch('https://api.sobranie.yaropolk.tech/auth/me', {
	headers: { Authorization: `Bearer ${accessToken}` },
});

const user = await userResponse.json();
console.log('Current user:', user);
```

## Создание поста и подписка на обновления

```javascript
// 1. Создание поста
const postResponse = await fetch('https://api.sobranie.yaropolk.tech/posts/', {
	method: 'POST',
	headers: {
		'Content-Type': 'application/json',
		Authorization: `Bearer ${accessToken}`,
	},
	body: JSON.stringify({
		authorId: user.id,
		content: 'Мой первый пост в Sobranie!',
		tags: ['первый_пост', 'соцсеть'],
	}),
});

// 2. Подписка на обновления через WebSocket
const ws = new WebSocket('wss://api.sobranie.yaropolk.tech/realtime/ws');

ws.onopen = () => {
	// Аутентификация
	ws.send(
		JSON.stringify({
			type: 'auth',
			token: accessToken,
		}),
	);

	// Подписка на обновления постов
	ws.send(
		JSON.stringify({
			type: 'subscribe',
			channel: 'posts',
		}),
	);
};

ws.onmessage = (event) => {
	const message = JSON.parse(event.data);
	if (message.type === 'new_post') {
		console.log('Новый пост:', message.data);
	}
};
```

---

# 🚀 Для ИИ-агентов

При интеграции с ИИ-агентами обратите внимание:

1. **Аутентификация обязательна** для большинства endpoints
2. **Rate limiting** может применяться к API запросам
3. **WebSocket соединения** поддерживают реалтайм обновления
4. **SSE endpoints** альтернатива WebSocket для односторонней связи
5. **Все даты** возвращаются в формате ISO 8601 UTC
6. **Пагинация** поддерживается через параметры `page` и `limit`

## Рекомендуемый порядок интеграции:

1. Реализовать аутентификацию (`/auth/register`, `/auth/login`)
2. Получить информацию о пользователе (`/auth/me`)
3. Интегрировать основные endpoints (посты, круги, пользователи)
4. Добавить реалтайм функции (WebSocket/SSE)
5. Интегрировать ИИ-ассистента (`/assistant/*`)

---

**🎯 API готово к использованию!** Все endpoints протестированы и работают на продакшене.

**Версия документации:** 1.0  
**Дата обновления:** 29 сентября 2024  
**API URL:** https://api.sobranie.yaropolk.tech
