import { NextRequest, NextResponse } from 'next/server';

type Message = {
	id: string;
	senderId: string;
	senderName: string;
	senderAvatar: string | null;
	content: string;
	isRead: boolean;
	createdAt: string;
};

export async function GET(
	request: NextRequest,
	{ params }: { params: { conversationId: string } }
) {
	try {
		const conversationId = params.conversationId;
		const { searchParams } = new URL(request.url);
		const page = parseInt(searchParams.get('page') || '1');
		const limit = parseInt(searchParams.get('limit') || '50');

		// Симуляция задержки API
		await new Promise((resolve) => setTimeout(resolve, 300));

		// Симуляция сообщений в разговоре
		const mockMessages: Message[] = [
			{
				id: 'msg-1',
				senderId: 'user-2',
				senderName: 'Анна Иванова',
				senderAvatar: null,
				content: 'Привет! Как дела с новым проектом?',
				isRead: true,
				createdAt: '2024-01-25T14:30:00Z',
			},
			{
				id: 'msg-2',
				senderId: 'current_user',
				senderName: 'Пользователь Собрания',
				senderAvatar: null,
				content: 'Привет! Всё отлично, уже почти закончил первую версию.',
				isRead: true,
				createdAt: '2024-01-25T14:32:00Z',
			},
			{
				id: 'msg-3',
				senderId: 'user-2',
				senderName: 'Анна Иванова',
				senderAvatar: null,
				content: 'Супер! Можешь показать демо когда будет готово?',
				isRead: false,
				createdAt: '2024-01-25T14:35:00Z',
			},
			{
				id: 'msg-4',
				senderId: 'user-2',
				senderName: 'Анна Иванова',
				senderAvatar: null,
				content: 'Очень интересно посмотреть на результат 🚀',
				isRead: false,
				createdAt: '2024-01-25T14:36:00Z',
			},
		];

		// Пагинация (новые сообщения в конце)
		const startIndex = Math.max(0, mockMessages.length - page * limit);
		const endIndex = mockMessages.length - (page - 1) * limit;
		const paginatedMessages = mockMessages.slice(startIndex, endIndex);

		return NextResponse.json({
			messages: paginatedMessages,
			pagination: {
				page,
				limit,
				total: mockMessages.length,
				totalPages: Math.ceil(mockMessages.length / limit),
				hasMore: startIndex > 0,
			},
		});
	} catch (error) {
		console.error('Ошибка получения сообщений разговора:', error);
		return NextResponse.json(
			{ error: 'Не удалось загрузить сообщения' },
			{ status: 500 }
		);
	}
}

export async function PATCH(
	request: NextRequest,
	{ params }: { params: { conversationId: string } }
) {
	try {
		const conversationId = params.conversationId;

		// Симуляция задержки API
		await new Promise((resolve) => setTimeout(resolve, 200));

		// В реальном приложении здесь будет:
		// 1. Проверка авторизации
		// 2. Пометка всех непрочитанных сообщений как прочитанные
		// 3. Обновление счетчика непрочитанных сообщений

		return NextResponse.json({
			success: true,
			message: 'Сообщения отмечены как прочитанные',
		});
	} catch (error) {
		console.error('Ошибка обновления статуса сообщений:', error);
		return NextResponse.json(
			{ error: 'Не удалось обновить статус сообщений' },
			{ status: 500 }
		);
	}
}