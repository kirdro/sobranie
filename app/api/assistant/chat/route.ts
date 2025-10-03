import { NextResponse } from 'next/server';
import { getAuthToken } from '@/lib/auth/cookies';
import { apiRequest } from '@/lib/api/client';

export async function POST(request: Request) {
	const token = await getAuthToken();

	if (!token) {
		return NextResponse.json(
			{ error: 'Unauthorized', message: 'Требуется авторизация' },
			{ status: 401 },
		);
	}

	try {
		const { prompt } = (await request.json()) as { prompt: string };

		if (!prompt || prompt.trim().length === 0) {
			return NextResponse.json(
				{ error: 'BadRequest', message: 'Prompt не может быть пустым' },
				{ status: 400 },
			);
		}

		// Создаем сессию с ассистентом через внешний API
		const sessionResponse = await apiRequest<{ sessionId: string }>(
			'/assistant/sessions',
			{
				method: 'POST',
				token,
				body: { mode: 'general' },
			}
		);

		// Отправляем сообщение ассистенту (этот endpoint нужно будет уточнить в API)
		// Пока возвращаем статус создания сессии
		return NextResponse.json({
			reply: `Сессия с ассистентом создана (ID: ${sessionResponse.sessionId}). Интеграция с реальным API в процессе разработки.`,
			sources: [],
			sessionId: sessionResponse.sessionId,
		});
	} catch (error) {
		console.error('Assistant API error:', error);
		return NextResponse.json(
			{
				error: 'UnexpectedError',
				message: 'Не удалось подключиться к внешнему API ассистента',
			},
			{ status: 500 },
		);
	}
}