/* eslint-disable @typescript-eslint/no-unused-vars */
import { NextRequest, NextResponse } from 'next/server';

export async function POST(
	_request: NextRequest,
	{ params: _params }: { params: Promise<{ id: string }> }
) {
	try {
		// const resolvedParams = await _params;
		// const userId = resolvedParams.id; // Will be used when implementing real API

		// Симуляция задержки API
		await new Promise((resolve) => setTimeout(resolve, 500));

		// В реальном приложении здесь будет:
		// 1. Проверка авторизации
		// 2. Проверка, что пользователь не подписывается на себя
		// 3. Проверка, что подписка не существует
		// 4. Создание записи в таблице follows
		// 5. Обновление счетчиков

		return NextResponse.json({
			success: true,
			message: 'Подписка оформлена',
			isFollowing: true,
		});
	} catch (_error) {
		console.error('Ошибка подписки:', _error);
		return NextResponse.json(
			{ error: 'Не удалось оформить подписку' },
			{ status: 500 }
		);
	}
}

export async function DELETE(
	_request: NextRequest,
	{ params: _params }: { params: Promise<{ id: string }> }
) {
	try {
		// const resolvedParams = await _params;
		// const userId = resolvedParams.id; // Will be used when implementing real API

		// Симуляция задержки API
		await new Promise((resolve) => setTimeout(resolve, 500));

		// В реальном приложении здесь будет:
		// 1. Проверка авторизации
		// 2. Удаление записи из таблицы follows
		// 3. Обновление счетчиков

		return NextResponse.json({
			success: true,
			message: 'Отписка выполнена',
			isFollowing: false,
		});
	} catch (_error) {
		console.error('Ошибка отписки:', _error);
		return NextResponse.json(
			{ error: 'Не удалось отписаться' },
			{ status: 500 }
		);
	}
}