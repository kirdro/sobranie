import { NextResponse } from 'next/server';

type Loop = {
	id: string;
	title: string;
	description: string;
	members: number;
	intensity: string;
	icon: 'spark' | 'users';
};

// Временные данные, пока нет реального API
const feedLoops: Loop[] = [
	{
		id: 'radio',
		title: 'Радио Собрание',
		description:
			'Аудио-эфир с экспертами, подключение через мобильное приложение.',
		members: 128,
		intensity: 'Высокая',
		icon: 'spark',
	},
	{
		id: 'design',
		title: 'Дизайн-кружок',
		description:
			'Кураторская разметка статей, синхронный фидбек и эфиры каждую пятницу.',
		members: 86,
		intensity: 'Средняя',
		icon: 'users',
	},
];

export async function GET() {
	try {
		// В будущем здесь будет запрос к реальному API
		return NextResponse.json({
			loops: feedLoops,
			total: feedLoops.length,
		});
	} catch {
		return NextResponse.json(
			{
				error: 'UnexpectedError',
				message: 'Не удалось получить данные о петлях взаимодействия',
			},
			{ status: 500 },
		);
	}
}