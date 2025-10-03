import { NextRequest, NextResponse } from 'next/server';

type PrivacySettings = {
	profileVisibility: 'public' | 'followers' | 'private';
	showEmail: boolean;
	showLastSeen: boolean;
	allowMessages: 'everyone' | 'followers' | 'none';
	allowMentions: 'everyone' | 'followers' | 'none';
	showActivity: boolean;
	searchableByEmail: boolean;
	showInSuggestions: boolean;
};

export async function GET(request: NextRequest) {
	try {
		// Симуляция задержки API
		await new Promise((resolve) => setTimeout(resolve, 300));

		// Возвращаем текущие настройки приватности
		const currentSettings: PrivacySettings = {
			profileVisibility: 'public',
			showEmail: false,
			showLastSeen: true,
			allowMessages: 'everyone',
			allowMentions: 'everyone',
			showActivity: true,
			searchableByEmail: false,
			showInSuggestions: true,
		};

		return NextResponse.json(currentSettings);
	} catch (error) {
		console.error('Ошибка получения настроек приватности:', error);
		return NextResponse.json(
			{ error: 'Не удалось загрузить настройки приватности' },
			{ status: 500 }
		);
	}
}

export async function PATCH(request: NextRequest) {
	try {
		const body = await request.json();

		// Симуляция задержки API
		await new Promise((resolve) => setTimeout(resolve, 800));

		// Валидация настроек
		const validVisibilityOptions = ['public', 'followers', 'private'];
		const validMessageOptions = ['everyone', 'followers', 'none'];
		const validMentionOptions = ['everyone', 'followers', 'none'];

		if (body.profileVisibility && !validVisibilityOptions.includes(body.profileVisibility)) {
			return NextResponse.json(
				{ error: 'Некорректная настройка видимости профиля' },
				{ status: 400 }
			);
		}

		if (body.allowMessages && !validMessageOptions.includes(body.allowMessages)) {
			return NextResponse.json(
				{ error: 'Некорректная настройка сообщений' },
				{ status: 400 }
			);
		}

		if (body.allowMentions && !validMentionOptions.includes(body.allowMentions)) {
			return NextResponse.json(
				{ error: 'Некорректная настройка упоминаний' },
				{ status: 400 }
			);
		}

		// В реальном приложении здесь будет:
		// 1. Проверка авторизации
		// 2. Обновление настроек в базе данных
		// 3. Валидация прав доступа

		const updatedSettings: PrivacySettings = {
			profileVisibility: body.profileVisibility || 'public',
			showEmail: body.showEmail ?? false,
			showLastSeen: body.showLastSeen ?? true,
			allowMessages: body.allowMessages || 'everyone',
			allowMentions: body.allowMentions || 'everyone',
			showActivity: body.showActivity ?? true,
			searchableByEmail: body.searchableByEmail ?? false,
			showInSuggestions: body.showInSuggestions ?? true,
		};

		return NextResponse.json({
			success: true,
			message: 'Настройки приватности обновлены',
			settings: updatedSettings,
		});
	} catch (error) {
		console.error('Ошибка обновления настроек приватности:', error);
		return NextResponse.json(
			{ error: 'Не удалось обновить настройки приватности' },
			{ status: 500 }
		);
	}
}