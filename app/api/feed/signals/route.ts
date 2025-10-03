import { NextResponse } from 'next/server';

type Signal = {
	id: string;
	title: string;
	details: string;
	tone: 'purple' | 'teal';
};

// Временные данные, пока нет реального API
const feedSignals: Signal[] = [
	{
		id: 'rag-index',
		title: 'RAG индекс обновлён',
		details:
			'Найдено 12 новых источников, 4 из них верифицированы модераторами',
		tone: 'purple',
	},
	{
		id: 'join-requests',
		title: 'Новые заявки',
		details:
			'5 участников хотят присоединиться к пространству "Исследовательский штаб"',
		tone: 'teal',
	},
];

export async function GET() {
	try {
		// В будущем здесь будет запрос к реальному API
		return NextResponse.json({
			alerts: feedSignals,
			total: feedSignals.length,
		});
	} catch (error) {
		return NextResponse.json(
			{
				error: 'UnexpectedError',
				message: 'Не удалось получить службу сигналов',
			},
			{ status: 500 },
		);
	}
}