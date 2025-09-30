#!/bin/bash

# Быстрый деплой Sobranie на production сервер (Docker версия)

set -e

PROJECT_DIR="/var/www/sobranie"
CONTAINER_NAME="sobranie-frontend"

echo "🚀 Быстрый деплой Sobranie (Docker)"
echo "==================================="

# Проверка что мы на сервере
if [ ! -d "$PROJECT_DIR" ]; then
    echo "❌ Директория проекта не найдена: $PROJECT_DIR"
    echo "Убедитесь что вы находитесь на production сервере"
    exit 1
fi

cd $PROJECT_DIR

echo "📦 Обновление кода из Git..."
git fetch origin
git reset --hard origin/main

echo "🛑 Остановка контейнера..."
docker-compose down || true

echo "🧹 Очистка старых образов..."
docker image prune -f || true

echo "🏗️ Сборка и запуск нового контейнера..."
docker-compose up -d --build

echo "⏰ Ожидание запуска контейнера..."
sleep 15

echo "🔍 Проверка статуса контейнера..."
docker-compose ps

echo "📝 Последние логи:"
docker-compose logs --tail=10 $CONTAINER_NAME

echo "🌐 Проверка доступности..."
if curl -s -o /dev/null -w "%{http_code}" http://localhost:3011 | grep -q "200"; then
    echo "✅ Приложение доступно локально"
else
    echo "⚠️ Приложение может быть недоступно локально"
    echo "📝 Дополнительные логи:"
    docker logs --tail=20 $CONTAINER_NAME
fi

if curl -s -o /dev/null -w "%{http_code}" https://sobranie.yaropolk.tech | grep -q "200"; then
    echo "✅ Сайт доступен по HTTPS"
else
    echo "⚠️ Сайт может быть недоступен по HTTPS"
fi

# Проверка здоровья контейнера
echo ""
echo "🏥 Проверка здоровья контейнера..."
health=$(docker inspect --format='{{.State.Health.Status}}' $CONTAINER_NAME 2>/dev/null || echo "unknown")
case $health in
    "healthy")
        echo "✅ Контейнер здоров"
        ;;
    "unhealthy")
        echo "❌ Контейнер нездоров"
        ;;
    "starting")
        echo "🔄 Контейнер еще запускается"
        ;;
    *)
        echo "ℹ️ Статус здоровья: $health"
        ;;
esac

echo ""
echo "🎉 Деплой завершен!"
echo "🌐 Сайт: https://sobranie.yaropolk.tech"
echo "📊 Мониторинг: docker stats $CONTAINER_NAME"
echo "📝 Логи: docker logs -f $CONTAINER_NAME"
echo "🔧 Управление: docker-compose [up|down|restart]"