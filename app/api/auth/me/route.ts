import { NextResponse } from 'next/server';

import { fetchCurrentUser } from '@/lib/api/auth';
import { ApiError } from '@/lib/api/client';
import { getAuthToken } from '@/lib/auth/cookies';

export async function GET() {
	const token = await getAuthToken();

	if (!token) {
		return NextResponse.json(
			{ error: 'Unauthorized', message: 'Токен отсутствует' },
			{ status: 401 },
		);
	}

	try {
		const user = await fetchCurrentUser(token);
		return NextResponse.json(user);
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
				message: 'Не удалось получить данные пользователя',
			},
			{ status: 500 },
		);
	}
}
