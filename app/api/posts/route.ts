import { NextRequest, NextResponse } from 'next/server';
import type { PostsResponse, Post } from '@/lib/api/types';

const mockPosts: Post[] = [
	{
		id: '1',
		authorId: 'user1',
		author: {
			id: 'user1',
			name: 'Анна Разработчик',
			email: 'anna@example.com',
		},
		content: 'Это тестовый пост из Effector состояния',
		likes_count: 5,
		reposts_count: 2,
		comments_count: 3,
		is_liked: false,
		is_reposted: false,
		visibility: 'public',
		tags: ['тест', 'effector'],
		created_at: new Date().toISOString(),
		createdAt: new Date().toISOString(),
	},
	{
		id: '2',
		authorId: 'user2',
		author: {
			id: 'user2',
			name: 'Максим Frontend',
			email: 'max@example.com',
		},
		content: 'Второй пост с более длинным содержимым для тестирования интерфейса',
		likes_count: 12,
		reposts_count: 7,
		comments_count: 15,
		is_liked: true,
		is_reposted: false,
		visibility: 'public',
		tags: ['интерфейс', 'ui'],
		created_at: new Date(Date.now() - 3600000).toISOString(),
		createdAt: new Date(Date.now() - 3600000).toISOString(),
	},
	{
		id: '3',
		authorId: 'user3',
		author: {
			id: 'user3',
			name: 'Елена AI',
			email: 'elena@example.com',
		},
		content: 'Обсуждаем новые возможности ИИ и их влияние на разработку',
		likes_count: 8,
		reposts_count: 3,
		comments_count: 12,
		is_liked: false,
		is_reposted: true,
		visibility: 'public',
		tags: ['ии', 'разработка'],
		created_at: new Date(Date.now() - 7200000).toISOString(),
		createdAt: new Date(Date.now() - 7200000).toISOString(),
	},
	{
		id: '4',
		authorId: 'user4',
		author: {
			id: 'user4',
			name: 'Дмитрий Next.js',
			email: 'dmitry@example.com',
		},
		content: 'Делюсь опытом работы с Next.js 15 и новыми возможностями App Router',
		likes_count: 15,
		reposts_count: 5,
		comments_count: 8,
		is_liked: true,
		is_reposted: false,
		visibility: 'public',
		tags: ['nextjs', 'разработка', 'react'],
		created_at: new Date(Date.now() - 10800000).toISOString(),
		createdAt: new Date(Date.now() - 10800000).toISOString(),
	},
	{
		id: '5',
		authorId: 'user5',
		author: {
			id: 'user5',
			name: 'София TypeScript',
			email: 'sofia@example.com',
		},
		content: 'Интересные паттерны работы с TypeScript в больших проектах',
		likes_count: 22,
		reposts_count: 9,
		comments_count: 18,
		is_liked: false,
		is_reposted: false,
		visibility: 'public',
		tags: ['typescript', 'паттерны'],
		created_at: new Date(Date.now() - 14400000).toISOString(),
		createdAt: new Date(Date.now() - 14400000).toISOString(),
	},
];

export async function GET(request: NextRequest) {
	const { searchParams } = new URL(request.url);
	const page = parseInt(searchParams.get('page') || '1');
	const limit = parseInt(searchParams.get('limit') || '10');

	await new Promise((resolve) => setTimeout(resolve, 800));

	// Симуляция пагинации
	const startIndex = (page - 1) * limit;
	const endIndex = startIndex + limit;
	const paginatedPosts = mockPosts.slice(startIndex, endIndex);

	const response: PostsResponse = {
		data: paginatedPosts,
		pagination: {
			page,
			limit,
			total: mockPosts.length,
			has_next: endIndex < mockPosts.length,
			has_prev: page > 1,
		},
	};

	return NextResponse.json(response);
}

export async function POST(request: NextRequest) {
	try {
		const body = await request.json();

		await new Promise((resolve) => setTimeout(resolve, 1000));

		const newPost: Post = {
			id: Date.now().toString(),
			authorId: 'current_user',
			content: body.content,
			likes_count: 0,
			reposts_count: 0,
			comments_count: 0,
			is_liked: false,
			is_reposted: false,
			visibility: body.visibility || 'public',
			tags: body.tags || [],
			createdAt: new Date().toISOString(),
		};

		return NextResponse.json(newPost);
	} catch (error) {
		return NextResponse.json(
			{ error: 'Не удалось создать пост' },
			{ status: 500 }
		);
	}
}