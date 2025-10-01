import { NextResponse } from 'next/server';

import { createPost, fetchPosts } from '@/lib/api/posts';
import { ApiError } from '@/lib/api/client';
import { getAuthToken } from '@/lib/auth/cookies';

// Simple cache for posts data
let postsCache: { data: any; params: string; timestamp: number } | null = null;
const POSTS_CACHE_TTL = 2 * 60 * 1000; // 2 minutes

export async function GET(request: Request) {
	const { searchParams } = new URL(request.url);
	const page = searchParams.get('page');
	const limit = searchParams.get('limit');

	const paramsString = searchParams.toString();

	// Check cache first
	if (
		postsCache &&
		postsCache.params === paramsString &&
		Date.now() - postsCache.timestamp < POSTS_CACHE_TTL
	) {
		return NextResponse.json(postsCache.data);
	}

	try {
		const posts = await fetchPosts({
			page: page ? Number(page) : undefined,
			limit: limit ? Number(limit) : undefined,
		});

		// Cache the result
		postsCache = {
			data: posts,
			params: paramsString,
			timestamp: Date.now(),
		};

		return NextResponse.json(posts);
	} catch (error) {
		if (error instanceof ApiError) {
			// For rate limiting, return cached data if available
			if (error.status === 429 && postsCache) {
				console.warn('Rate limited on posts fetch, using cached data');
				return NextResponse.json(postsCache.data);
			}

			return NextResponse.json(
				{
					error: error.name,
					message: error.message,
					details: error.payload,
				},
				{ status: error.status },
			);
		}

		return NextResponse.json(
			{
				error: 'UnexpectedError',
				message: 'Не удалось получить ленту',
			},
			{ status: 500 },
		);
	}
}

export async function POST(request: Request) {
	const token = await getAuthToken();

	if (!token) {
		return NextResponse.json(
			{ error: 'Unauthorized', message: 'Требуется авторизация' },
			{ status: 401 },
		);
	}

	const payload = (await request.json()) as {
		authorId: string;
		content: string;
		circleId?: string;
		attachments?: string[];
		tags?: string[];
	};

	try {
		const post = await createPost(token, payload);

		// Clear posts cache when new post is created
		postsCache = null;

		return NextResponse.json(post, { status: 201 });
	} catch (error) {
		if (error instanceof ApiError) {
			return NextResponse.json(
				{
					error: error.name,
					message: error.message,
					details: error.payload,
				},
				{ status: error.status },
			);
		}

		return NextResponse.json(
			{
				error: 'UnexpectedError',
				message: 'Не удалось создать пост',
			},
			{ status: 500 },
		);
	}
}
