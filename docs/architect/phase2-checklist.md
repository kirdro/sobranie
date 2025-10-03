# 🚀 Фаза 2: Чеклист разработки - Сообщество и медиа

## 📋 Обзор Фазы 2

**Цель:** Реализация полноценных кругов (сообщества) и системы медиафайлов
**Продолжительность:** 2-3 недели
**Предварительные требования:** Завершенная Фаза 1

### 📌 Основные задачи Фазы 2:
1. **Вариант 3: Полноценные круги (сообщества) 🌐**
2. **Вариант 6: Медиа и файлы 📸**

---

## 🌐 Задача 3: Полноценные круги (сообщества)

### 3.1 Создание и управление кругами

**Архитектурные требования:**
- ✅ Следовать принципам из `docs/ARCHITECTURE_GUIDELINES.md`
- ✅ Использовать Server Components по умолчанию
- ✅ Компоненты должны быть < 300 строк
- ✅ Избегать derived state в useEffect

#### 3.1.1 API интеграция для кругов

**Endpoints для реализации:**
- `POST /circles/` - создание круга
- `PUT /circles/:id` - редактирование круга
- `DELETE /circles/:id` - удаление круга
- `GET /circles/:id/members` - участники круга
- `POST /circles/:id/join` - вступление в круг
- `DELETE /circles/:id/leave` - выход из круга

**Файлы для создания/изменения:**
- [ ] `lib/api/types.ts` - добавить типы для операций с кругами
- [ ] `lib/api/client.ts` - добавить методы API для кругов
- [ ] `lib/hooks/useCirclesQuery.ts` - React Query хуки для кругов
- [ ] `lib/hooks/useCircleMembersQuery.ts` - хук для участников
- [ ] `lib/hooks/useJoinCircleMutation.ts` - мутация для вступления

#### 3.1.2 Компоненты управления кругами

**Компоненты для создания:**
- [ ] `components/circles/CreateCircleModal.tsx` - модал создания круга
- [ ] `components/circles/EditCircleModal.tsx` - модал редактирования
- [ ] `components/circles/CircleSettings.tsx` - настройки круга
- [ ] `components/circles/CircleMembersList.tsx` - список участников
- [ ] `components/circles/JoinCircleButton.tsx` - кнопка вступления
- [ ] `components/circles/LeaveCircleButton.tsx` - кнопка выхода

**Архитектурные требования для компонентов:**
- ✅ Использовать композицию вместо пропс дриллинга
- ✅ Держать состояние максимально локальным
- ✅ Применять `useCallback` для стабильных зависимостей
- ✅ Возвращать функцию очистки в `useEffect`

#### 3.1.3 Effector стейт для кругов

**Stores для создания:**
- [ ] `lib/stores/circles.ts` - стейт кругов пользователя
- [ ] `lib/events/circles.ts` - события кругов
- [ ] `lib/effects/circles.ts` - эффекты для API кругов

**Требования к Effector (из `docs/llm-full.md`):**
- ✅ Создавать изолированные scope для SSR
- ✅ Использовать fork() для создания scope
- ✅ Применять allSettled() для запуска цепочек в scope
- ✅ Использовать Provider для React интеграции
- ✅ Создавать Gate для условного рендеринга

**Пример структуры stores:**
```typescript
// lib/stores/circles.ts
export const $userCircles = createStore<Circle[]>([]);
export const $currentCircle = createStore<Circle | null>(null);
export const $circleMembers = createStore<User[]>([]);

// lib/events/circles.ts
export const circleCreated = createEvent<Circle>();
export const circleJoined = createEvent<string>();
export const circleLeft = createEvent<string>();

// lib/effects/circles.ts
export const createCircleFx = createEffect<CreateCircleParams, Circle>();
export const joinCircleFx = createEffect<string, void>();
```

### 3.2 Система приглашений и заявок

#### 3.2.1 API для приглашений

**Endpoints:**
- `POST /circles/:id/invite` - отправить приглашение
- `GET /circles/:id/invitations` - список приглашений
- `POST /invitations/:id/accept` - принять приглашение
- `POST /invitations/:id/decline` - отклонить приглашение
- `GET /circles/:id/requests` - заявки на вступление
- `POST /circles/:id/request` - подать заявку
- `POST /requests/:id/approve` - одобрить заявку
- `POST /requests/:id/reject` - отклонить заявку

#### 3.2.2 Компоненты приглашений

**Компоненты для создания:**
- [ ] `components/circles/InviteUsersModal.tsx` - модал приглашения
- [ ] `components/circles/InvitationsList.tsx` - список приглашений
- [ ] `components/circles/JoinRequestsList.tsx` - список заявок
- [ ] `components/circles/InvitationCard.tsx` - карточка приглашения
- [ ] `components/circles/RequestCard.tsx` - карточка заявки

### 3.3 Приватные и публичные круги

#### 3.3.1 Система прав доступа

**Типы кругов:**
- `public` - открытые круги
- `private` - приватные круги (только по приглашениям)
- `restricted` - ограниченные (заявки + одобрение)

#### 3.3.2 Компоненты доступа

**Компоненты для создания:**
- [ ] `components/circles/CirclePrivacySettings.tsx` - настройки приватности
- [ ] `components/circles/AccessGuard.tsx` - проверка доступа к контенту
- [ ] `components/circles/PublicCirclesList.tsx` - список публичных кругов
- [ ] `components/circles/PrivateCircleCard.tsx` - карточка приватного круга

### 3.4 Роли внутри кругов

#### 3.4.1 Система ролей

**Роли участников:**
- `owner` - владелец круга
- `admin` - администратор
- `moderator` - модератор
- `member` - участник

#### 3.4.2 API для ролей

**Endpoints:**
- `PUT /circles/:id/members/:userId/role` - изменить роль участника
- `GET /circles/:id/permissions` - получить права текущего пользователя

#### 3.4.3 Компоненты ролей

**Компоненты для создания:**
- [ ] `components/circles/MemberRoleSelect.tsx` - выбор роли участника
- [ ] `components/circles/PermissionGuard.tsx` - проверка прав доступа
- [ ] `components/circles/AdminPanel.tsx` - панель администратора

### 3.5 События и мероприятия в кругах

#### 3.5.1 API для событий

**Endpoints:**
- `POST /circles/:id/events` - создать событие
- `GET /circles/:id/events` - события круга
- `POST /events/:id/join` - присоединиться к событию
- `DELETE /events/:id/leave` - покинуть событие

#### 3.5.2 Компоненты событий

**Компоненты для создания:**
- [ ] `components/circles/CreateEventModal.tsx` - создание события
- [ ] `components/circles/EventsList.tsx` - список событий
- [ ] `components/circles/EventCard.tsx` - карточка события
- [ ] `components/circles/EventAttendees.tsx` - участники события

### 3.6 Модерация контента

#### 3.6.1 API модерации

**Endpoints:**
- `POST /circles/:id/posts/:postId/report` - пожаловаться на пост
- `DELETE /circles/:id/posts/:postId` - удалить пост (модератор)
- `POST /circles/:id/members/:userId/ban` - заблокировать участника
- `DELETE /circles/:id/members/:userId/ban` - разблокировать

#### 3.6.2 Компоненты модерации

**Компоненты для создания:**
- [ ] `components/circles/ReportModal.tsx` - модал жалобы
- [ ] `components/circles/ModerationPanel.tsx` - панель модерации
- [ ] `components/circles/BannedUsersList.tsx` - список заблокированных
- [ ] `components/circles/ReportsList.tsx` - список жалоб

---

## 📸 Задача 6: Медиа и файлы

### 6.1 Загрузка изображений в посты

#### 6.1.1 API для загрузки файлов

**Endpoints:**
- `POST /upload/image` - загрузить изображение
- `DELETE /upload/:fileId` - удалить файл
- `GET /files/:fileId` - получить информацию о файле

**Типы для добавления в `lib/api/types.ts`:**
```typescript
export interface UploadResponse {
  fileId: string;
  url: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  thumbnail?: string;
}

export interface FileInfo {
  id: string;
  originalName: string;
  url: string;
  size: number;
  type: string;
  uploadedAt: string;
  uploadedBy: string;
}
```

#### 6.1.2 Компоненты загрузки

**Компоненты для создания:**
- [ ] `components/media/ImageUploader.tsx` - загрузчик изображений
- [ ] `components/media/FilePreview.tsx` - превью файла
- [ ] `components/media/ImageGallery.tsx` - галерея изображений
- [ ] `components/media/UploadProgress.tsx` - прогресс загрузки
- [ ] `components/media/MediaPicker.tsx` - выбор медиафайлов

**Архитектурные требования:**
- ✅ Использовать `next/image` для оптимизации изображений
- ✅ Обрабатывать ошибки загрузки и сетевых запросов
- ✅ Применять защиту от ошибок для входящих данных
- ✅ Группировать импорты: системные → внешние → локальные

#### 6.1.3 Интеграция с постами

**Файлы для изменения:**
- [ ] `components/feed/FeedComposer.tsx` - добавить загрузку медиа
- [ ] `components/feed/FeedCard.tsx` - отображение медиафайлов
- [ ] `lib/api/types.ts` - обновить типы постов

### 6.2 Галерея изображений

#### 6.2.1 Компоненты галереи

**Компоненты для создания:**
- [ ] `components/media/MediaGalleryModal.tsx` - полноэкранная галерея
- [ ] `components/media/ImageViewer.tsx` - просмотрщик изображений
- [ ] `components/media/ThumbnailGrid.tsx` - сетка миниатюр
- [ ] `components/media/ImageCarousel.tsx` - карусель изображений

### 6.3 Видео контент

#### 6.3.1 API для видео

**Endpoints:**
- `POST /upload/video` - загрузить видео
- `GET /videos/:id/thumbnail` - миниатюра видео
- `POST /videos/:id/process` - обработать видео

#### 6.3.2 Компоненты видео

**Компоненты для создания:**
- [ ] `components/media/VideoUploader.tsx` - загрузчик видео
- [ ] `components/media/VideoPlayer.tsx` - плеер видео
- [ ] `components/media/VideoThumbnail.tsx` - миниатюра видео
- [ ] `components/media/VideoProcessingStatus.tsx` - статус обработки

### 6.4 Файловое хранилище для кругов

#### 6.4.1 API файлового хранилища

**Endpoints:**
- `POST /circles/:id/files` - загрузить файл в круг
- `GET /circles/:id/files` - файлы круга
- `DELETE /circles/:id/files/:fileId` - удалить файл

#### 6.4.2 Компоненты файлов

**Компоненты для создания:**
- [ ] `components/circles/FileManager.tsx` - менеджер файлов
- [ ] `components/circles/FileList.tsx` - список файлов
- [ ] `components/circles/FileUploadZone.tsx` - зона загрузки
- [ ] `components/circles/FilePermissions.tsx` - права доступа к файлам

### 6.5 Превью и оптимизация

#### 6.5.1 Система превью

**Функции для создания:**
- [ ] `lib/utils/imageOptimization.ts` - оптимизация изображений
- [ ] `lib/utils/thumbnailGenerator.ts` - генерация миниатюр
- [ ] `lib/utils/fileValidator.ts` - валидация файлов

#### 6.5.2 Компоненты превью

**Компоненты для создания:**
- [ ] `components/media/OptimizedImage.tsx` - оптимизированное изображение
- [ ] `components/media/ThumbnailGenerator.tsx` - генератор миниатюр
- [ ] `components/media/FileTypeIcon.tsx` - иконки типов файлов

---

## 🔧 Общие требования разработки

### Архитектурные принципы (из `docs/ARCHITECTURE_GUIDELINES.md`)

#### React и Hooks
- ✅ **Server Components по умолчанию** - использовать `"use client"` только для интерактивности
- ✅ **Локальное состояние** - минимизировать `useState`, использовать React Query для кэширования
- ✅ **Чистые эффекты** - возвращать функции очистки в `useEffect`
- ✅ **Стабильные зависимости** - оборачивать функции в `useCallback`

#### Структура компонентов
- ✅ **Композиция** - простые компоненты в `components/common`, доменные в подпапках
- ✅ **Интерфейсы пропсов** - прописывать в начале файла, экспортировать в PascalCase
- ✅ **Разделение ответственности** - разметка, состояние и эффекты отдельно

#### TypeScript
- ✅ **Строгие типы** - использовать `type` для композиции, `interface` для публичных контрактов
- ✅ **Типизация API** - описывать модели в `lib/api/types.ts`
- ✅ **Literal unions** - предпочитать `type Status = "draft" | "published"` вместо enum

#### Next.js соглашения
- ✅ **App Router** - файлы `page.tsx`, `layout.tsx`, `loading.tsx`, `error.tsx`
- ✅ **Серверные действия** - для запросов на сервере
- ✅ **Метаданные** - через экспорт `metadata`
- ✅ **Оптимизация изображений** - через `next/image`

### Команды проверки

**Перед каждым коммитом:**
- [ ] `bun run lint` - проверка ESLint
- [ ] `bun run build` - сборка проекта
- [ ] `bun run typecheck` - проверка типов (если доступно)

### API интеграция

**Базовые принципы:**
- ✅ Все API вызовы через `/lib/api/client.ts`
- ✅ Bearer token аутентификация из cookies
- ✅ Типизированные ответы с обработкой ошибок
- ✅ Интеграция с `https://api.sobranie.yaropolk.tech`

**React Query хуки:**
- ✅ Размещать в `/lib/hooks/`
- ✅ Следовать паттерну `use[Entity][Action]Query.ts`
- ✅ Обрабатывать состояния loading, error, success

### Effector интеграция

**Обязательные принципы (из `docs/llm-full.md`):**
- ✅ **Isolated scopes** - использовать `fork()` для создания изолированных экземпляров
- ✅ **SSR support** - применять `allSettled()` для запуска в scope
- ✅ **Provider pattern** - оборачивать React приложение в `<Provider value={scope}>`
- ✅ **Gate system** - использовать `createGate()` для условного рендеринга
- ✅ **Scope preservation** - в effects вызывать только другие effects, не обычные async функции

**Структура файлов:**
```
lib/
  stores/     - Store определения
  events/     - Event определения
  effects/    - Effect определения
  effector/   - Основные конфигурации
```

---

## 📋 Чеклист готовности к реализации

### Пререквизиты
- [ ] Фаза 1 полностью завершена
- [ ] Все тесты Фазы 1 проходят
- [ ] `bun run lint` и `bun run build` выполняются без ошибок

### Планирование
- [ ] Изучена API документация в `docs/api/`
- [ ] Прочитаны архитектурные требования `docs/ARCHITECTURE_GUIDELINES.md`
- [ ] Изучена Effector документация `docs/llm-full.md`
- [ ] Определена последовательность реализации задач

### Готовность команды
- [ ] Разработчик знаком с Effector принципами
- [ ] Настроена среда разработки (Bun 1.1.9, Node.js)
- [ ] Доступ к API `https://api.sobranie.yaropolk.tech`
- [ ] Настроено файловое хранилище (S3 или аналог)

---

## 🎯 Критерии приемки Фазы 2

### Функциональность кругов
- [ ] Пользователи могут создавать публичные и приватные круги
- [ ] Работает система приглашений и заявок
- [ ] Реализованы роли участников (owner, admin, moderator, member)
- [ ] Функционирует система событий в кругах
- [ ] Работает модерация контента

### Функциональность медиа
- [ ] Пользователи могут загружать изображения в посты
- [ ] Работает галерея изображений
- [ ] Поддерживается видео контент
- [ ] Реализовано файловое хранилище для кругов
- [ ] Работают превью и оптимизация медиа

### Техническое качество
- [ ] Все компоненты < 300 строк
- [ ] Effector stores правильно интегрированы
- [ ] SSR работает с изолированными scopes
- [ ] Проходят проверки `bun run lint` и `bun run build`
- [ ] Реализована обработка ошибок
- [ ] Компоненты покрыты базовыми тестами

### UX и производительность
- [ ] Быстрая загрузка медиафайлов
- [ ] Плавная навигация по кругам
- [ ] Корректное отображение на мобильных устройствах
- [ ] Оптимизированы изображения
- [ ] Работают состояния загрузки и ошибок

---

**📝 Создано:** 3 октября 2025
**📚 Основано на:** development-roadmap.md, ARCHITECTURE_GUIDELINES.md, API документации, Effector документации
**🎯 Готово к реализации:** ИИ агент может использовать этот чеклист для пошаговой реализации Фазы 2