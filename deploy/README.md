# Инструкция по деплою Sobranie (Docker)

## 🐳 Настройка автоматического деплоя через Docker

### 1. Генерация SSH ключей

Выполните на своём локальном компьютере:

```bash
# Создание SSH ключа для деплоя
ssh-keygen -t ed25519 -C "sobranie-deploy" -f ~/.ssh/sobranie_deploy

# Копирование публичного ключа на сервер
ssh-copy-id -i ~/.ssh/sobranie_deploy.pub root@176.98.176.195

# Проверка подключения
ssh -i ~/.ssh/sobranie_deploy root@176.98.176.195 "echo 'SSH подключение работает!'"
```

### 2. Настройка GitHub Secrets

В настройках репозитория GitHub перейдите в **Settings → Secrets and variables → Actions** и добавьте:

| Название          | Значение                                                   |
| ----------------- | ---------------------------------------------------------- |
| `HOST`            | `176.98.176.195`                                           |
| `USERNAME`        | `root`                                                     |
| `SSH_PRIVATE_KEY` | Содержимое файла `~/.ssh/sobranie_deploy` (приватный ключ) |

### 3. Первоначальная настройка сервера

На сервере уже установлен Docker. Настройка происходит автоматически через GitHub Actions.

## 🔧 Управление приложением

### Docker команды

```bash
# Переход в директорию проекта
cd /var/www/sobranie

# Статус контейнеров
docker-compose ps

# Логи приложения
docker-compose logs sobranie-frontend
docker-compose logs -f sobranie-frontend  # следить за логами

# Перезапуск контейнера
docker-compose restart sobranie-frontend

# Остановка
docker-compose down

# Запуск
docker-compose up -d

# Пересборка и запуск
docker-compose up -d --build

# Статистика ресурсов
docker stats sobranie-frontend
```

### Caddy команды

```bash
# Проверка конфигурации
caddy validate --config /etc/caddy/Caddyfile

# Перезагрузка конфигурации
systemctl reload caddy

# Статус Caddy
systemctl status caddy

# Логи Caddy
journalctl -u caddy -f
tail -f /var/log/caddy/sobranie-frontend.log
```

## 🔍 Мониторинг

### Скрипт мониторинга

```bash
# Запуск скрипта мониторинга
cd /var/www/sobranie
./deploy/monitor.sh
```

### Логи приложения

```bash
# Docker логи
docker logs -f sobranie-frontend
docker logs --tail=100 sobranie-frontend

# Caddy логи
tail -f /var/log/caddy/sobranie-frontend.log

# Системные логи
journalctl -u caddy -f
```

### Проверка здоровья контейнера

```bash
# Статус здоровья
docker inspect --format='{{.State.Health.Status}}' sobranie-frontend

# Детальная информация о здоровье
docker inspect sobranie-frontend | jq '.[0].State.Health'
```

### Проверка SSL сертификата

```bash
# Проверка сертификата
curl -I https://sobranie.yaropolk.tech

# Детальная информация о сертификате
openssl s_client -connect sobranie.yaropolk.tech:443 -servername sobranie.yaropolk.tech
```

## 🚨 Устранение неполадок

### Если деплой не работает

1. **Проверьте SSH подключение:**

    ```bash
    ssh -i ~/.ssh/sobranie_deploy root@176.98.176.195
    ```

2. **Проверьте статус контейнера:**

    ```bash
    cd /var/www/sobranie
    docker-compose ps
    docker logs sobranie-frontend
    ```

3. **Проверьте Caddy:**
    ```bash
    systemctl status caddy
    journalctl -u caddy -n 50
    ```

### Если контейнер не запускается

1. **Проверьте логи сборки:**

    ```bash
    docker-compose build --no-cache sobranie-frontend
    ```

2. **Проверьте переменные окружения:**

    ```bash
    cat /var/www/sobranie/.env.production
    ```

3. **Пересоберите контейнер:**
    ```bash
    docker-compose down
    docker image prune -f
    docker-compose up -d --build
    ```

### Если SSL не работает

1. **Проверьте DNS:**

    ```bash
    nslookup sobranie.yaropolk.tech
    ```

2. **Проверьте Caddy логи:**

    ```bash
    journalctl -u caddy | grep -i "sobranie\|error"
    ```

3. **Принудительное обновление сертификата:**
    ```bash
    systemctl stop caddy
    rm -rf /var/lib/caddy/.local/share/caddy/certificates/acme-v02.api.letsencrypt.org-directory/sobranie.yaropolk.tech/
    systemctl start caddy
    ```

## 📁 Структура проекта на сервере

```
/var/www/sobranie/
├── docker-compose.yml     # Docker Compose конфигурация
├── Dockerfile            # Docker образ
├── .env.production        # Переменные окружения
├── deploy/                # Скрипты деплоя
│   ├── monitor.sh         # Мониторинг
│   ├── quick-deploy.sh    # Быстрый деплой
│   └── README.md          # Документация
└── ...                    # Исходный код

/etc/caddy/
└── Caddyfile             # Конфигурация Caddy с sobranie.yaropolk.tech

/var/log/caddy/
└── sobranie-frontend.log  # Логи Caddy для домена
```

## ⚡ Автоматический деплой

После настройки деплой происходит автоматически при каждом push в ветку `main`.

Процесс деплоя:

1. GitHub Actions подключается к серверу по SSH
2. Клонирует/обновляет код из репозитория в `/var/www/sobranie`
3. Останавливает существующий контейнер
4. Собирает новый Docker образ
5. Запускает новый контейнер
6. Проверяет здоровье приложения

## 🚀 Быстрый деплой

Для ручного деплоя используйте скрипт:

```bash
cd /var/www/sobranie
./deploy/quick-deploy.sh
```

## 🐳 Docker особенности

- **Порт**: Приложение работает на порту 3011 (3010 занят API)
- **Сеть**: Изолированная Docker сеть `sobranie-network`
- **Логи**: Автоматическая ротация логов (10MB, 3 файла)
- **Здоровье**: Health check каждые 30 секунд
- **Перезапуск**: Автоматический перезапуск при сбоях
- **Ресурсы**: Мониторинг через `docker stats`
