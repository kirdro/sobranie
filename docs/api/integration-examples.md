# 🔌 Примеры интеграции Sobranie API

## 📋 Содержание

1. [JavaScript/TypeScript](#javascripttypescript)
2. [Python](#python)
3. [PHP](#php)
4. [cURL](#curl)
5. [Postman Collection](#postman-collection)

---

# JavaScript/TypeScript

## Базовый клиент API

```typescript
class SobranIeAPI {
	private baseURL = 'https://api.sobranie.yaropolk.tech';
	private token: string | null = null;

	constructor(token?: string) {
		this.token = token;
	}

	private async request(
		endpoint: string,
		options: RequestInit = {},
	): Promise<any> {
		const url = `${this.baseURL}${endpoint}`;
		const headers: HeadersInit = {
			'Content-Type': 'application/json',
			...options.headers,
		};

		if (this.token) {
			headers.Authorization = `Bearer ${this.token}`;
		}

		const response = await fetch(url, {
			...options,
			headers,
		});

		if (!response.ok) {
			const error = await response.json().catch(() => null);
			throw new Error(error?.message || `HTTP ${response.status}`);
		}

		return response.json();
	}

	// Аутентификация
	async register(data: {
		email: string;
		password: string;
		firstName?: string;
		lastName?: string;
	}) {
		const result = await this.request('/auth/register', {
			method: 'POST',
			body: JSON.stringify(data),
		});

		this.token = result.accessToken;
		return result;
	}

	async login(email: string, password: string) {
		const result = await this.request('/auth/login', {
			method: 'POST',
			body: JSON.stringify({ email, password }),
		});

		this.token = result.accessToken;
		return result;
	}

	async getProfile() {
		return this.request('/auth/me');
	}

	// Посты
	async getPosts(page = 1, limit = 20) {
		return this.request(`/posts/?page=${page}&limit=${limit}`);
	}

	async createPost(data: {
		authorId: string;
		content: string;
		circleId?: string;
		attachments?: string[];
		tags?: string[];
	}) {
		return this.request('/posts/', {
			method: 'POST',
			body: JSON.stringify(data),
		});
	}

	// WebSocket соединение
	connectWebSocket() {
		if (!this.token) {
			throw new Error('Authentication required for WebSocket');
		}

		const ws = new WebSocket(
			`wss://api.sobranie.yaropolk.tech/realtime/ws`,
		);

		ws.onopen = () => {
			// Аутентификация
			ws.send(
				JSON.stringify({
					type: 'auth',
					token: this.token,
				}),
			);
		};

		return ws;
	}

	// Server-Sent Events
	subscribeToChannel(channel: string) {
		if (!this.token) {
			throw new Error('Authentication required for SSE');
		}

		const eventSource = new EventSource(
			`${this.baseURL}/realtime/sse/${channel}?token=${this.token}`,
		);

		return eventSource;
	}
}

// Использование
const api = new SobranIeAPI();

// Регистрация
await api.register({
	email: 'user@example.com',
	password: 'securepassword123',
	firstName: 'Иван',
});

// Создание поста
const post = await api.createPost({
	authorId: 'user_123',
	content: 'Мой пост из TypeScript!',
	tags: ['typescript', 'api'],
});

// WebSocket
const ws = api.connectWebSocket();
ws.onmessage = (event) => {
	const message = JSON.parse(event.data);
	console.log('WebSocket message:', message);
};

// Подписка на канал
ws.send(
	JSON.stringify({
		type: 'subscribe',
		channel: 'posts',
	}),
);
```

## React Hook для API

```typescript
import { useState, useEffect, useCallback } from 'react';

export function useSobranIeAPI() {
	const [api] = useState(() => new SobranIeAPI());
	const [user, setUser] = useState(null);
	const [loading, setLoading] = useState(false);

	const login = useCallback(
		async (email: string, password: string) => {
			setLoading(true);
			try {
				const result = await api.login(email, password);
				setUser(result.user);
				return result;
			} finally {
				setLoading(false);
			}
		},
		[api],
	);

	const logout = useCallback(() => {
		api.token = null;
		setUser(null);
	}, [api]);

	useEffect(() => {
		// Проверяем сохраненный токен
		const savedToken = localStorage.getItem('sobranie_token');
		if (savedToken) {
			api.token = savedToken;
			api.getProfile()
				.then(setUser)
				.catch(() => logout());
		}
	}, [api, logout]);

	return {
		api,
		user,
		loading,
		login,
		logout,
		isAuthenticated: !!user,
	};
}
```

---

# Python

## Базовый клиент

```python
import requests
import json
from typing import Optional, Dict, Any
import websocket
import threading

class SobranIeAPI:
    def __init__(self, token: Optional[str] = None):
        self.base_url = 'https://api.sobranie.yaropolk.tech'
        self.token = token
        self.session = requests.Session()

    def _request(self, endpoint: str, method: str = 'GET', data: Optional[Dict] = None) -> Dict[Any, Any]:
        url = f"{self.base_url}{endpoint}"
        headers = {'Content-Type': 'application/json'}

        if self.token:
            headers['Authorization'] = f'Bearer {self.token}'

        kwargs = {'headers': headers}
        if data:
            kwargs['json'] = data

        response = self.session.request(method, url, **kwargs)
        response.raise_for_status()
        return response.json()

    # Аутентификация
    def register(self, email: str, password: str, first_name: str = None, last_name: str = None) -> Dict:
        data = {'email': email, 'password': password}
        if first_name:
            data['firstName'] = first_name
        if last_name:
            data['lastName'] = last_name

        result = self._request('/auth/register', 'POST', data)
        self.token = result['accessToken']
        return result

    def login(self, email: str, password: str) -> Dict:
        result = self._request('/auth/login', 'POST', {
            'email': email,
            'password': password
        })
        self.token = result['accessToken']
        return result

    def get_profile(self) -> Dict:
        return self._request('/auth/me')

    # Посты
    def get_posts(self, page: int = 1, limit: int = 20) -> Dict:
        return self._request(f'/posts/?page={page}&limit={limit}')

    def create_post(self, author_id: str, content: str, circle_id: str = None,
                   attachments: list = None, tags: list = None) -> Dict:
        data = {
            'authorId': author_id,
            'content': content
        }
        if circle_id:
            data['circleId'] = circle_id
        if attachments:
            data['attachments'] = attachments
        if tags:
            data['tags'] = tags

        return self._request('/posts/', 'POST', data)

    # WebSocket
    def connect_websocket(self, on_message=None, on_error=None):
        if not self.token:
            raise ValueError("Authentication required for WebSocket")

        def on_open(ws):
            # Аутентификация
            ws.send(json.dumps({
                'type': 'auth',
                'token': self.token
            }))

        def on_message_wrapper(ws, message):
            data = json.loads(message)
            if on_message:
                on_message(data)

        ws = websocket.WebSocketApp(
            "wss://api.sobranie.yaropolk.tech/realtime/ws",
            on_open=on_open,
            on_message=on_message_wrapper,
            on_error=on_error
        )

        # Запуск в отдельном потоке
        wst = threading.Thread(target=ws.run_forever)
        wst.daemon = True
        wst.start()

        return ws

# Использование
api = SobranIeAPI()

# Регистрация
user_data = api.register(
    email='user@example.com',
    password='securepassword123',
    first_name='Иван'
)

print(f"Пользователь создан: {user_data['user']['email']}")

# Создание поста
post = api.create_post(
    author_id=user_data['user']['id'],
    content='Мой пост из Python!',
    tags=['python', 'api']
)

print(f"Пост создан: {post['id']}")

# WebSocket
def handle_message(data):
    print(f"WebSocket message: {data}")

ws = api.connect_websocket(on_message=handle_message)

# Подписка на канал
ws.send(json.dumps({
    'type': 'subscribe',
    'channel': 'posts'
}))
```

---

# PHP

## Базовый клиент

```php
<?php

class SobranIeAPI {
    private $baseUrl = 'https://api.sobranie.yaropolk.tech';
    private $token = null;

    public function __construct($token = null) {
        $this->token = $token;
    }

    private function request($endpoint, $method = 'GET', $data = null) {
        $url = $this->baseUrl . $endpoint;

        $headers = [
            'Content-Type: application/json'
        ];

        if ($this->token) {
            $headers[] = 'Authorization: Bearer ' . $this->token;
        }

        $ch = curl_init();
        curl_setopt($ch, CURLOPT_URL, $url);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);
        curl_setopt($ch, CURLOPT_CUSTOMREQUEST, $method);

        if ($data && ($method === 'POST' || $method === 'PUT')) {
            curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($data));
        }

        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);

        $decoded = json_decode($response, true);

        if ($httpCode >= 400) {
            throw new Exception($decoded['message'] ?? 'HTTP Error ' . $httpCode);
        }

        return $decoded;
    }

    // Аутентификация
    public function register($email, $password, $firstName = null, $lastName = null) {
        $data = [
            'email' => $email,
            'password' => $password
        ];

        if ($firstName) $data['firstName'] = $firstName;
        if ($lastName) $data['lastName'] = $lastName;

        $result = $this->request('/auth/register', 'POST', $data);
        $this->token = $result['accessToken'];
        return $result;
    }

    public function login($email, $password) {
        $result = $this->request('/auth/login', 'POST', [
            'email' => $email,
            'password' => $password
        ]);
        $this->token = $result['accessToken'];
        return $result;
    }

    public function getProfile() {
        return $this->request('/auth/me');
    }

    // Посты
    public function getPosts($page = 1, $limit = 20) {
        return $this->request("/posts/?page={$page}&limit={$limit}");
    }

    public function createPost($authorId, $content, $circleId = null, $attachments = null, $tags = null) {
        $data = [
            'authorId' => $authorId,
            'content' => $content
        ];

        if ($circleId) $data['circleId'] = $circleId;
        if ($attachments) $data['attachments'] = $attachments;
        if ($tags) $data['tags'] = $tags;

        return $this->request('/posts/', 'POST', $data);
    }
}

// Использование
$api = new SobranIeAPI();

try {
    // Регистрация
    $userData = $api->register(
        'user@example.com',
        'securepassword123',
        'Иван'
    );

    echo "Пользователь создан: " . $userData['user']['email'] . "\n";

    // Создание поста
    $post = $api->createPost(
        $userData['user']['id'],
        'Мой пост из PHP!',
        null,
        null,
        ['php', 'api']
    );

    echo "Пост создан: " . $post['id'] . "\n";

} catch (Exception $e) {
    echo "Ошибка: " . $e->getMessage() . "\n";
}
?>
```

---

# cURL

## Примеры запросов

### Регистрация

```bash
curl -X POST https://api.sobranie.yaropolk.tech/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "securepassword123",
    "firstName": "Иван"
  }'
```

### Авторизация

```bash
curl -X POST https://api.sobranie.yaropolk.tech/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "securepassword123"
  }'
```

### Получение профиля

```bash
curl -X GET https://api.sobranie.yaropolk.tech/auth/me \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

### Создание поста

```bash
curl -X POST https://api.sobranie.yaropolk.tech/posts/ \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -d '{
    "authorId": "user_123",
    "content": "Мой пост через cURL!",
    "tags": ["curl", "api"]
  }'
```

### Получение списка постов

```bash
curl -X GET "https://api.sobranie.yaropolk.tech/posts/?page=1&limit=10"
```

### Проверка здоровья API

```bash
curl -X GET https://api.sobranie.yaropolk.tech/healthz
```

---

# Postman Collection

## JSON для импорта в Postman

```json
{
	"info": {
		"name": "Sobranie API",
		"description": "API для социальной платформы Sobranie",
		"version": "1.0"
	},
	"variable": [
		{
			"key": "baseUrl",
			"value": "https://api.sobranie.yaropolk.tech"
		},
		{
			"key": "token",
			"value": ""
		}
	],
	"item": [
		{
			"name": "Auth",
			"item": [
				{
					"name": "Register",
					"request": {
						"method": "POST",
						"header": [
							{
								"key": "Content-Type",
								"value": "application/json"
							}
						],
						"body": {
							"mode": "raw",
							"raw": "{\n  \"email\": \"user@example.com\",\n  \"password\": \"securepassword123\",\n  \"firstName\": \"Иван\"\n}"
						},
						"url": {
							"raw": "{{baseUrl}}/auth/register",
							"host": ["{{baseUrl}}"],
							"path": ["auth", "register"]
						}
					},
					"event": [
						{
							"listen": "test",
							"script": {
								"exec": [
									"if (pm.response.code === 200) {",
									"    const response = pm.response.json();",
									"    pm.collectionVariables.set('token', response.accessToken);",
									"}"
								]
							}
						}
					]
				},
				{
					"name": "Login",
					"request": {
						"method": "POST",
						"header": [
							{
								"key": "Content-Type",
								"value": "application/json"
							}
						],
						"body": {
							"mode": "raw",
							"raw": "{\n  \"email\": \"user@example.com\",\n  \"password\": \"securepassword123\"\n}"
						},
						"url": {
							"raw": "{{baseUrl}}/auth/login",
							"host": ["{{baseUrl}}"],
							"path": ["auth", "login"]
						}
					},
					"event": [
						{
							"listen": "test",
							"script": {
								"exec": [
									"if (pm.response.code === 200) {",
									"    const response = pm.response.json();",
									"    pm.collectionVariables.set('token', response.accessToken);",
									"}"
								]
							}
						}
					]
				},
				{
					"name": "Get Profile",
					"request": {
						"method": "GET",
						"header": [
							{
								"key": "Authorization",
								"value": "Bearer {{token}}"
							}
						],
						"url": {
							"raw": "{{baseUrl}}/auth/me",
							"host": ["{{baseUrl}}"],
							"path": ["auth", "me"]
						}
					}
				}
			]
		},
		{
			"name": "Posts",
			"item": [
				{
					"name": "Get Posts",
					"request": {
						"method": "GET",
						"url": {
							"raw": "{{baseUrl}}/posts/?page=1&limit=20",
							"host": ["{{baseUrl}}"],
							"path": ["posts", ""],
							"query": [
								{
									"key": "page",
									"value": "1"
								},
								{
									"key": "limit",
									"value": "20"
								}
							]
						}
					}
				},
				{
					"name": "Create Post",
					"request": {
						"method": "POST",
						"header": [
							{
								"key": "Content-Type",
								"value": "application/json"
							},
							{
								"key": "Authorization",
								"value": "Bearer {{token}}"
							}
						],
						"body": {
							"mode": "raw",
							"raw": "{\n  \"authorId\": \"user_123\",\n  \"content\": \"Мой пост через Postman!\",\n  \"tags\": [\"postman\", \"api\"]\n}"
						},
						"url": {
							"raw": "{{baseUrl}}/posts/",
							"host": ["{{baseUrl}}"],
							"path": ["posts", ""]
						}
					}
				}
			]
		},
		{
			"name": "System",
			"item": [
				{
					"name": "Health Check",
					"request": {
						"method": "GET",
						"url": {
							"raw": "{{baseUrl}}/healthz",
							"host": ["{{baseUrl}}"],
							"path": ["healthz"]
						}
					}
				}
			]
		}
	]
}
```

---

# 🔧 Дополнительные советы

## Обработка ошибок

```javascript
// JavaScript
try {
	const result = await api.createPost(data);
} catch (error) {
	if (error.message.includes('401')) {
		// Токен истек, нужна повторная авторизация
		await api.login(email, password);
		// Повторить запрос
	} else {
		console.error('API Error:', error.message);
	}
}
```

## Rate Limiting

```javascript
// Добавление задержки между запросами
class RateLimitedAPI extends SobranIeAPI {
  private lastRequest = 0;
  private minInterval = 100; // мс

  async request(endpoint, options) {
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequest;

    if (timeSinceLastRequest < this.minInterval) {
      await new Promise(resolve =>
        setTimeout(resolve, this.minInterval - timeSinceLastRequest)
      );
    }

    this.lastRequest = Date.now();
    return super.request(endpoint, options);
  }
}
```

## Кеширование

```javascript
// Простое кеширование для GET запросов
class CachedAPI extends SobranIeAPI {
  private cache = new Map();
  private cacheTimeout = 5 * 60 * 1000; // 5 минут

  async request(endpoint, options) {
    const cacheKey = `${options.method || 'GET'}:${endpoint}`;

    if ((!options.method || options.method === 'GET') && this.cache.has(cacheKey)) {
      const cached = this.cache.get(cacheKey);
      if (Date.now() - cached.timestamp < this.cacheTimeout) {
        return cached.data;
      }
    }

    const result = await super.request(endpoint, options);

    if (!options.method || options.method === 'GET') {
      this.cache.set(cacheKey, {
        data: result,
        timestamp: Date.now()
      });
    }

    return result;
  }
}
```

---

**📚 Все примеры готовы к использованию!** Выберите подходящий язык и начинайте интеграцию с Sobranie API.
