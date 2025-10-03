import { NextRequest, NextResponse } from 'next/server';

type Message = {
	id: string;
	senderId: string;
	receiverId: string;
	content: string;
	isRead: boolean;
	createdAt: string;
	updatedAt: string;
};

type Conversation = {
	id: string;
	participantId: string;
	participantName: string;
	participantAvatar: string | null;
	lastMessage: string;
	lastMessageAt: string;
	unreadCount: number;
};

export async function GET(request: NextRequest) {
	try {
		const { searchParams } = new URL(request.url);
		const page = parseInt(searchParams.get('page') || '1');
		const limit = parseInt(searchParams.get('limit') || '20');

		// Симуляция задержки API
		await new Promise((resolve) => setTimeout(resolve, 300));

		// Симуляция данных разговоров
		const mockConversations: Conversation[] = [
			{
				id: 'conv-1',
				participantId: 'user-2',
				participantName: 'Анна Иванова',
				participantAvatar: null,
				lastMessage: 'Привет! Как дела с новым проектом?',
				lastMessageAt: '2024-01-25T14:30:00Z',
				unreadCount: 2,
			},
			{
				id: 'conv-2',
				participantId: 'user-3',
				participantName: 'Максим Петров',
				participantAvatar: null,
				lastMessage: 'Отличная идея! Давайте обсудим детали.',
				lastMessageAt: '2024-01-24T09:15:00Z',
				unreadCount: 0,
			},
			{
				id: 'conv-3',
				participantId: 'user-4',
				participantName: 'Елена Сидорова',
				participantAvatar: null,
				lastMessage: 'Спасибо за помощь с кодом!',
				lastMessageAt: '2024-01-23T16:45:00Z',
				unreadCount: 1,
			},
		];

		// Пагинация
		const startIndex = (page - 1) * limit;
		const endIndex = startIndex + limit;
		const paginatedConversations = mockConversations.slice(startIndex, endIndex);

		return NextResponse.json({
			conversations: paginatedConversations,
			pagination: {
				page,
				limit,
				total: mockConversations.length,
				totalPages: Math.ceil(mockConversations.length / limit),
			},
		});
	} catch (error) {
		console.error('Ошибка получения сообщений:', error);
		return NextResponse.json(
			{ error: 'Не удалось загрузить сообщения' },
			{ status: 500 }
		);
	}
}

export async function POST(request: NextRequest) {
	try {
		const body = await request.json();

		// Валидация
		if (!body.receiverId || !body.content) {
			return NextResponse.json(
				{ error: 'Необходимо указать получателя и содержимое сообщения' },
				{ status: 400 }
			);
		}

		if (body.content.trim().length === 0) {
			return NextResponse.json(
				{ error: 'Сообщение не может быть пустым' },
				{ status: 400 }
			);
		}

		if (body.content.length > 1000) {
			return NextResponse.json(
				{ error: 'Сообщение не должно превышать 1000 символов' },
				{ status: 400 }
			);
		}

		// Симуляция задержки API
		await new Promise((resolve) => setTimeout(resolve, 500));

		// Создание нового сообщения
		const newMessage: Message = {
			id: `msg-${Date.now()}`,
			senderId: 'current_user',
			receiverId: body.receiverId,
			content: body.content.trim(),
			isRead: false,
			createdAt: new Date().toISOString(),
			updatedAt: new Date().toISOString(),
		};

		return NextResponse.json({
			success: true,
			message: 'Сообщение отправлено',
			data: newMessage,
		});
	} catch (error) {
		console.error('Ошибка отправки сообщения:', error);
		return NextResponse.json(
			{ error: 'Не удалось отправить сообщение' },
			{ status: 500 }
		);
	}
}