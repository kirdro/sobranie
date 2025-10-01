# 📋 Sobranie API - Таблица endpoints

| Метод                 | Endpoint                 | Описание                      | Авторизация | Параметры                                                   |
| --------------------- | ------------------------ | ----------------------------- | ----------- | ----------------------------------------------------------- |
| **🔐 Аутентификация** |
| POST                  | `/auth/register`         | Регистрация пользователя      | ❌          | `email`, `password`, `firstName?`, `lastName?`              |
| POST                  | `/auth/login`            | Авторизация                   | ❌          | `email`, `password`                                         |
| GET                   | `/auth/me`               | Профиль текущего пользователя | ✅          | -                                                           |
| POST                  | `/auth/change-password`  | Смена пароля                  | ✅          | `currentPassword`, `newPassword`                            |
| **👤 Пользователи**   |
| GET                   | `/users/`                | Список пользователей          | ✅          | `page?`, `limit?`                                           |
| GET                   | `/users/:id`             | Пользователь по ID            | ✅          | `id` (path)                                                 |
| **⭕ Круги/Группы**   |
| GET                   | `/circles/`              | Список кругов                 | ❌          | `page?`, `limit?`                                           |
| GET                   | `/circles/:id`           | Круг по ID                    | ❌          | `id` (path)                                                 |
| **📝 Посты**          |
| GET                   | `/posts/`                | Список постов                 | ❌          | `page?`, `limit?`                                           |
| POST                  | `/posts/`                | Создать пост                  | ✅          | `authorId`, `content`, `circleId?`, `attachments?`, `tags?` |
| **🔔 Уведомления**    |
| GET                   | `/notifications/`        | Уведомления пользователя      | ✅          | -                                                           |
| **🤖 ИИ-Ассистент**   |
| GET                   | `/assistant/modes`       | Режимы ассистента             | ❌          | -                                                           |
| POST                  | `/assistant/sessions`    | Создать сессию                | ✅          | `mode?`                                                     |
| **⚡ Реалтайм**       |
| GET                   | `/realtime/health`       | Статус реалтайм сервисов      | ❌          | -                                                           |
| GET                   | `/realtime/ws`           | WebSocket документация        | ❌          | -                                                           |
| WebSocket             | `/realtime/ws`           | WebSocket соединение          | ✅          | -                                                           |
| GET                   | `/realtime/sse/:channel` | Server-Sent Events            | ✅          | `channel` (path), `token` (query)                           |
| POST                  | `/realtime/broadcast`    | Отправить broadcast           | ✅          | `type`, `channel`, `data`                                   |
| **🧭 Навигация**      |
| GET                   | `/navigation/links`      | Навигационные ссылки          | ❌          | -                                                           |
| **💊 Системные**      |
| GET                   | `/healthz`               | Проверка здоровья API         | ❌          | -                                                           |
| GET                   | `/swagger`               | OpenAPI документация          | ❌          | -                                                           |

## 🔑 Легенда

- ✅ - Требуется авторизация (Bearer token)
- ❌ - Авторизация не требуется
- `?` - Опциональный параметр

## 📱 Быстрые ссылки

- **Базовый URL**: `https://api.sobranie.yaropolk.tech`
- **Swagger UI**: `https://api.sobranie.yaropolk.tech/swagger`
- **Health Check**: `https://api.sobranie.yaropolk.tech/healthz`

## 🔒 Авторизация

```
Authorization: Bearer <your_jwt_token>
```

## 📊 Стандартные коды ответов

- `200` - Успех
- `201` - Создано
- `400` - Неверный запрос
- `401` - Не авторизован
- `403` - Доступ запрещен
- `404` - Не найдено
- `409` - Конфликт
- `500` - Ошибка сервера
