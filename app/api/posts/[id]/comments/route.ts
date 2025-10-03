import { NextRequest, NextResponse } from 'next/server';
import type { CommentsResponse, Comment } from '@/lib/api/types';

const mockComments: Comment[] = [
	{
		id: '1',
		postId: '1',
		authorId: 'user2',
		content: 'Отличный пост! Очень интересная тема для обсуждения.',
		createdAt: new Date(Date.now() - 1800000).toISOString(),
		author: {
			id: 'user2',
			name: 'Анна Смирнова',
			email: 'anna@example.com',
		}
	},
	{
		id: '2',
		postId: '1',
		authorId: 'user3',
		content: 'Согласен с автором. Effector действительно мощный инструмент для управления состоянием.',
		createdAt: new Date(Date.now() - 900000).toISOString(),
		author: {
			id: 'user3',
			name: 'Дмитрий Козлов',
			email: 'dmitry@example.com',
		}
	},
];

export async function GET(
	request: NextRequest,
	{ params }: { params: { id: string } }
) {
	try {
		const postId = params.id;
		const { searchParams } = new URL(request.url);
		const page = parseInt(searchParams.get('page') || '1');
		const limit = parseInt(searchParams.get('limit') || '10');

		// Симуляция задержки API
		await new Promise((resolve) => setTimeout(resolve, 300));

		// Фильтрация комментариев для конкретного поста
		const postComments = mockComments.filter(comment => comment.postId === postId);

		const startIndex = (page - 1) * limit;
		const endIndex = startIndex + limit;
		const paginatedComments = postComments.slice(startIndex, endIndex);

		const response: CommentsResponse = {
			data: paginatedComments,
			pagination: {
				page,
				limit,
				total: postComments.length,
				has_next: endIndex < postComments.length,
				has_prev: page > 1,
			},
		};

		return NextResponse.json(response);
	} catch (error) {
		return NextResponse.json(
			{ error: 'Не удалось загрузить комментарии' },
			{ status: 500 }
		);
	}
}

export async function POST(
	request: NextRequest,
	{ params }: { params: { id: string } }
) {
	try {
		const postId = params.id;
		const body = await request.json();

		// Симуляция задержки API
		await new Promise((resolve) => setTimeout(resolve, 500));

		const newComment: Comment = {
			id: Date.now().toString(),
			postId,
			authorId: 'current_user',
			content: body.content,
			createdAt: new Date().toISOString(),
			author: {
				id: 'current_user',
				name: 'Текущий пользователь',
				email: 'current@example.com',
			}
		};

		return NextResponse.json(newComment);
	} catch (error) {
		return NextResponse.json(
			{ error: 'Не удалось создать комментарий' },
			{ status: 500 }
		);
	}
}