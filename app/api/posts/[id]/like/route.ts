import { NextRequest, NextResponse } from 'next/server';

export async function POST(
	request: NextRequest,
	{ params }: { params: { id: string } }
) {
	try {
		const postId = params.id;

		// Симуляция задержки API
		await new Promise((resolve) => setTimeout(resolve, 300));

		// В реальном приложении здесь будет:
		// 1. Проверка авторизации
		// 2. Проверка, что пост существует
		// 3. Добавление лайка в базу данных
		// 4. Обновление счетчика лайков

		return NextResponse.json({
			success: true,
			message: 'Лайк добавлен',
			postId,
			liked: true
		});
	} catch (error) {
		return NextResponse.json(
			{ error: 'Не удалось поставить лайк' },
			{ status: 500 }
		);
	}
}

export async function DELETE(
	request: NextRequest,
	{ params }: { params: { id: string } }
) {
	try {
		const postId = params.id;

		// Симуляция задержки API
		await new Promise((resolve) => setTimeout(resolve, 300));

		// В реальном приложении здесь будет:
		// 1. Проверка авторизации
		// 2. Проверка, что лайк существует
		// 3. Удаление лайка из базы данных
		// 4. Обновление счетчика лайков

		return NextResponse.json({
			success: true,
			message: 'Лайк удален',
			postId,
			liked: false
		});
	} catch (error) {
		return NextResponse.json(
			{ error: 'Не удалось убрать лайк' },
			{ status: 500 }
		);
	}
}