#!/bin/bash

# Скрипт мониторинга для Sobranie (Docker версия)

set -e

echo "🔍 Мониторинг Sobranie (Docker)"
echo "================================"

# Проверка статуса Docker контейнера
echo "📊 Статус Docker контейнера:"
if docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" | grep -q "sobranie-frontend"; then
    docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" | grep "sobranie-frontend"
    echo "✅ Контейнер запущен"
else
    echo "❌ Контейнер не найден или не запущен"
fi

# Проверка здоровья контейнера
echo ""
echo "🏥 Проверка здоровья контейнера:"
health=$(docker inspect --format='{{.State.Health.Status}}' sobranie-frontend 2>/dev/null || echo "no-healthcheck")
case $health in
    "healthy")
        echo "✅ Контейнер здоров"
        ;;
    "unhealthy")
        echo "❌ Контейнер нездоров"
        ;;
    "starting")
        echo "🔄 Контейнер запускается"
        ;;
    *)
        echo "ℹ️ Статус здоровья недоступен"
        ;;
esac

# Проверка порта
echo ""
echo "🌐 Проверка порта 3011:"
if netstat -tuln | grep -q ":3011 "; then
    echo "✅ Порт 3011 открыт"
else
    echo "❌ Порт 3011 не доступен"
fi

# Проверка Caddy
echo ""
echo "🔧 Статус Caddy:"
systemctl is-active caddy && echo "✅ Caddy активен" || echo "❌ Caddy не активен"

# Проверка SSL сертификата
echo ""
echo "🔒 Проверка SSL:"
if curl -s -I https://sobranie.yaropolk.tech | head -1 | grep -q "200"; then
    echo "✅ SSL работает"
else
    echo "❌ Проблемы с SSL или сайт недоступен"
fi

# Проверка ответа приложения
echo ""
echo "📱 Проверка ответа приложения:"
response=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3011 || echo "000")
if [ "$response" = "200" ]; then
    echo "✅ Приложение отвечает (HTTP $response)"
else
    echo "❌ Приложение не отвечает (HTTP $response)"
fi

# Показать последние логи Docker
echo ""
echo "📝 Последние логи Docker:"
if docker ps --format "{{.Names}}" | grep -q "sobranie-frontend"; then
    docker logs --tail=10 sobranie-frontend 2>/dev/null || echo "❌ Нет логов Docker"
else
    echo "❌ Контейнер не найден"
fi

# Показать использование ресурсов Docker
echo ""
echo "💾 Использование ресурсов Docker:"
if docker ps --format "{{.Names}}" | grep -q "sobranie-frontend"; then
    docker stats --no-stream --format "table {{.Container}}\t{{.CPUPerc}}\t{{.MemUsage}}\t{{.MemPerc}}" sobranie-frontend 2>/dev/null || echo "❌ Статистика недоступна"
else
    echo "❌ Контейнер не найден"
fi

# Проверка дискового пространства
echo ""
echo "💿 Дисковое пространство:"
df -h /var/www/sobranie | tail -1 | awk '{print "Использовано: " $5 " из " $2}'

# Информация о Docker образах
echo ""
echo "🖼️ Docker образы Sobranie:"
docker images | grep -E "(sobranie|REPOSITORY)" || echo "❌ Образы не найдены"

echo ""
echo "✅ Мониторинг завершен"