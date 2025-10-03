/* eslint-disable @typescript-eslint/no-unused-vars */
import { NextRequest, NextResponse } from 'next/server';

export async function PATCH(request: NextRequest) {
	try {
		const body = await request.json();

		// Симуляция задержки API
		await new Promise((resolve) => setTimeout(resolve, 800));

		// Валидация полей
		const errors: string[] = [];

		if (body.name && body.name.trim().length < 2) {
			errors.push('Имя должно содержать минимум 2 символа');
		}

		if (body.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.email)) {
			errors.push('Некорректный email адрес');
		}

		if (body.bio && body.bio.length > 500) {
			errors.push('Описание не должно превышать 500 символов');
		}

		if (errors.length > 0) {
			return NextResponse.json(
				{ error: 'Ошибки валидации', details: errors },
				{ status: 400 }
			);
		}

		// В реальном приложении здесь будет:
		// 1. Проверка авторизации
		// 2. Обновление в базе данных
		// 3. Валидация уникальности email

		const updatedUser = {
			id: 'current_user',
			name: body.name || 'Пользователь',
			email: body.email || 'user@example.com',
			bio: body.bio || '',
			location: body.location || '',
			website: body.website || '',
			updatedAt: new Date().toISOString(),
		};

		return NextResponse.json({
			success: true,
			message: 'Профиль успешно обновлен',
			user: updatedUser
		});
	} catch {
		return NextResponse.json(
			{ error: 'Не удалось обновить профиль' },
			{ status: 500 }
		);
	}
}

export async function GET(_request: NextRequest) {
	try {
		// Симуляция задержки API
		await new Promise((resolve) => setTimeout(resolve, 300));

		// Возвращаем текущий профиль пользователя
		const currentUser = {
			id: 'current_user',
			name: 'Пользователь Собрания',
			email: 'user@sobranie.example.com',
			bio: 'Разработчик и энтузиаст новых технологий',
			location: 'Москва, Россия',
			website: 'https://github.com/username',
			avatar: null,
			stats: {
				posts: 12,
				followers: 48,
				following: 23,
			},
			role: 'user',
		created_at: '2024-01-15T10:00:00Z',
		};

		return NextResponse.json(currentUser);
	} catch {
		return NextResponse.json(
			{ error: 'Не удалось загрузить профиль' },
			{ status: 500 }
		);
	}
}