import { NextRequest, NextResponse } from 'next/server';

type Follower = {
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

		// Симуляция данных подписчиков
		const mockFollowers: Follower[] = [
			{
				id: 'follower-1',
				name: 'Анна Иванова',
				email: 'anna@example.com',
				avatar: null,
				followedAt: '2024-01-20T10:00:00Z',
			},
			{
				id: 'follower-2',
				name: 'Максим Петров',
				email: 'maxim@example.com',
				avatar: null,
				followedAt: '2024-01-18T15:30:00Z',
			},
			{
				id: 'follower-3',
				name: 'Елена Сидорова',
				email: 'elena@example.com',
				avatar: null,
				followedAt: '2024-01-15T09:45:00Z',
			},
		];

		// Пагинация
		const startIndex = (page - 1) * limit;
		const endIndex = startIndex + limit;
		const paginatedFollowers = mockFollowers.slice(startIndex, endIndex);

		return NextResponse.json({
			followers: paginatedFollowers,
			pagination: {
				page,
				limit,
				total: mockFollowers.length,
				totalPages: Math.ceil(mockFollowers.length / limit),
			},
		});
	} catch (error) {
		console.error('Ошибка получения подписчиков:', error);
		return NextResponse.json(
			{ error: 'Не удалось загрузить подписчиков' },
			{ status: 500 }
		);
	}
}