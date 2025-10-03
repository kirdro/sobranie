import { NextRequest, NextResponse } from 'next/server';

type Following = {
	id: string;
	name: string;
	email: string;
	avatar: string | null;
	followedAt: string;
};

export async function GET(
	request: NextRequest,
	{ params }: { params: { id: string } }
) {
	try {
		const userId = params.id;
		const { searchParams } = new URL(request.url);
		const page = parseInt(searchParams.get('page') || '1');
		const limit = parseInt(searchParams.get('limit') || '20');

		// Симуляция задержки API
		await new Promise((resolve) => setTimeout(resolve, 300));

		// Симуляция данных подписок
		const mockFollowing: Following[] = [
			{
				id: 'following-1',
				name: 'Дмитрий Козлов',
				email: 'dmitry@example.com',
				avatar: null,
				followedAt: '2024-01-22T12:00:00Z',
			},
			{
				id: 'following-2',
				name: 'Светлана Новикова',
				email: 'svetlana@example.com',
				avatar: null,
				followedAt: '2024-01-19T14:20:00Z',
			},
		];

		// Пагинация
		const startIndex = (page - 1) * limit;
		const endIndex = startIndex + limit;
		const paginatedFollowing = mockFollowing.slice(startIndex, endIndex);

		return NextResponse.json({
			following: paginatedFollowing,
			pagination: {
				page,
				limit,
				total: mockFollowing.length,
				totalPages: Math.ceil(mockFollowing.length / limit),
			},
		});
	} catch (error) {
		console.error('Ошибка получения подписок:', error);
		return NextResponse.json(
			{ error: 'Не удалось загрузить подписки' },
			{ status: 500 }
		);
	}
}