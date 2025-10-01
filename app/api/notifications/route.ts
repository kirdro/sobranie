import { NextResponse } from 'next/server';

import { fetchNotifications } from '@/lib/api/notifications';
import { ApiError } from '@/lib/api/client';
import { getAuthToken } from '@/lib/auth/cookies';

export async function GET() {
	const token = await getAuthToken();

	if (!token) {
		return NextResponse.json(
			{ error: 'Unauthorized', message: 'Требуется авторизация' },
			{ status: 401 },
		);
	}

	try {
		const notifications = await fetchNotifications(token);
		return NextResponse.json(notifications);
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
				message: 'Не удалось получить уведомления',
			},
			{ status: 500 },
		);
	}
}
