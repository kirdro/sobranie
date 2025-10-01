import { NextResponse } from 'next/server';

import { fetchCircles } from '@/lib/api/circles';
import { ApiError } from '@/lib/api/client';

export async function GET(request: Request) {
	const { searchParams } = new URL(request.url);
	const page = searchParams.get('page');
	const limit = searchParams.get('limit');

	try {
		const circles = await fetchCircles({
			page: page ? Number(page) : undefined,
			limit: limit ? Number(limit) : undefined,
		});
		return NextResponse.json(circles);
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
				message: 'Не удалось получить список кругов',
			},
			{ status: 500 },
		);
	}
}
