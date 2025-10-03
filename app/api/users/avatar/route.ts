import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
	try {
		const body = await request.json();

		// Валидация данных
		if (!body.image || !body.filename) {
			return NextResponse.json(
				{ error: 'Необходимо указать изображение и имя файла' },
				{ status: 400 }
			);
		}

		// Проверяем формат base64
		if (!body.image.startsWith('data:image/')) {
			return NextResponse.json(
				{ error: 'Неверный формат изображения' },
				{ status: 400 }
			);
		}

		// Валидация типа файла
		const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif'];
		const mimeType = body.image.split(';')[0].split(':')[1];

		if (!allowedTypes.includes(mimeType)) {
			return NextResponse.json(
				{ error: 'Поддерживаются только JPEG, PNG и GIF файлы' },
				{ status: 400 }
			);
		}

		// Проверка размера файла (base64 примерно на 33% больше исходного размера)
		const base64Data = body.image.split(',')[1];
		const fileSizeBytes = (base64Data.length * 3) / 4;
		const maxSizeBytes = 5 * 1024 * 1024; // 5MB

		if (fileSizeBytes > maxSizeBytes) {
			return NextResponse.json(
				{ error: 'Размер файла не должен превышать 5MB' },
				{ status: 400 }
			);
		}

		// Симуляция задержки загрузки
		await new Promise((resolve) => setTimeout(resolve, 1000));

		// В реальном приложении здесь будет:
		// 1. Проверка авторизации
		// 2. Загрузка файла в облачное хранилище (S3, Cloudinary и т.д.)
		// 3. Сохранение URL аватара в базе данных
		// 4. Оптимизация и ресайз изображения

		// Генерируем фиктивный URL аватара
		const avatarUrl = `/uploads/avatars/user-${Date.now()}.${mimeType.split('/')[1]}`;

		return NextResponse.json({
			success: true,
			message: 'Аватар успешно загружен',
			avatarUrl: avatarUrl,
		});
	} catch (error) {
		console.error('Ошибка загрузки аватара:', error);
		return NextResponse.json(
			{ error: 'Не удалось загрузить аватар' },
			{ status: 500 }
		);
	}
}

export async function DELETE(request: NextRequest) {
	try {
		// Симуляция задержки
		await new Promise((resolve) => setTimeout(resolve, 500));

		// В реальном приложении здесь будет:
		// 1. Проверка авторизации
		// 2. Удаление файла из облачного хранилища
		// 3. Обновление базы данных (установка avatar_url в null)

		return NextResponse.json({
			success: true,
			message: 'Аватар успешно удален',
		});
	} catch (error) {
		console.error('Ошибка удаления аватара:', error);
		return NextResponse.json(
			{ error: 'Не удалось удалить аватар' },
			{ status: 500 }
		);
	}
}