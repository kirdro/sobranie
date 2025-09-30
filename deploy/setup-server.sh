#!/bin/bash

# Скрипт для первоначальной настройки сервера для Sobranie

set -e

echo "🚀 Настройка сервера для Sobranie..."

# Обновление системы
echo "📦 Обновление системы..."
apt update && apt upgrade -y

# Установка необходимых пакетов
echo "📦 Установка необходимых пакетов..."
apt install -y curl git unzip software-properties-common

# Установка Bun (если не установлен)
echo "📦 Установка Bun..."
if ! command -v bun &> /dev/null; then
    curl -fsSL https://bun.sh/install | bash
    export PATH="$PATH:/root/.bun/bin"
    echo 'export PATH="$PATH:/root/.bun/bin"' >> ~/.bashrc
fi

# Установка PM2 (если не установлен)
echo "📦 Установка PM2..."
if ! command -v pm2 &> /dev/null; then
    curl -fsSL https://get.pnpm.io/install.sh | sh -
    source ~/.bashrc
    pnpm add -g pm2
fi

# Создание директории для проекта
echo "📁 Создание директории проекта..."
mkdir -p /var/www/sobranie
mkdir -p /var/log/pm2

# Настройка прав доступа
echo "🔒 Настройка прав доступа..."
chown -R root:root /var/www/sobranie
chmod -R 755 /var/www/sobranie

# Создание файла конфигурации Caddy
echo "⚙️ Создание конфигурации Caddy..."
cat > /etc/caddy/sites-available/sobranie.conf << 'EOF'
sobranie.yaropolk.tech {
    # Автоматическое получение SSL сертификата от Let's Encrypt
    tls {
        email admin@yaropolk.tech
    }

    # Обработка статических файлов
    handle_path /_next/static/* {
        root * /var/www/sobranie/.next/static
        file_server
        header Cache-Control "public, max-age=31536000, immutable"
    }

    # Обработка статических ресурсов
    handle_path /static/* {
        root * /var/www/sobranie/public
        file_server
        header Cache-Control "public, max-age=86400"
    }

    # Проксирование к Next.js приложению
    reverse_proxy localhost:3010 {
        header_up Host {host}
        header_up X-Real-IP {remote}
        header_up X-Forwarded-For {remote}
        header_up X-Forwarded-Proto {scheme}
    }

    # Логирование
    log {
        output file /var/log/caddy/sobranie.log
        format json
    }

    # Настройка безопасности
    header {
        # Безопасность
        Strict-Transport-Security "max-age=31536000; includeSubDomains; preload"
        X-Content-Type-Options "nosniff"
        X-Frame-Options "DENY"
        X-XSS-Protection "1; mode=block"
        Referrer-Policy "strict-origin-when-cross-origin"

        # CSP заголовки (настроить под нужды приложения)
        Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' https://api.sobranie.yaropolk.tech;"

        # Удаление заголовков сервера
        -Server
    }
}
EOF

# Включение конфигурации в основной Caddyfile
echo "🔗 Подключение конфигурации к Caddy..."
if ! grep -q "import sites-available/sobranie.conf" /etc/caddy/Caddyfile; then
    echo "import sites-available/sobranie.conf" >> /etc/caddy/Caddyfile
fi

# Создание директории для логов Caddy
mkdir -p /var/log/caddy
chown -R caddy:caddy /var/log/caddy

# Проверка и перезагрузка Caddy
echo "🔄 Проверка конфигурации Caddy..."
caddy validate --config /etc/caddy/Caddyfile

echo "♻️ Перезагрузка Caddy..."
systemctl reload caddy

echo "✅ Настройка сервера завершена!"
echo ""
echo "📋 Следующие шаги:"
echo "1. Клонируйте репозиторий в /var/www/sobranie"
echo "2. Настройте GitHub Secrets для деплоя"
echo "3. Запустите первый деплой"
echo ""
echo "🔑 GitHub Secrets которые нужно добавить:"
echo "- HOST: 176.98.176.195"
echo "- USERNAME: root"
echo "- SSH_PRIVATE_KEY: (приватный SSH ключ)"