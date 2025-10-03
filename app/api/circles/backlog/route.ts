import { NextResponse } from 'next/server';

export type BacklogItem = {
	id: string;
	title: string;
	owner: string;
	due: string;
	progress: number;
};

// Временные данные, пока нет реального API
const backlogItems: BacklogItem[] = [
	{
		id: 'task-1',
		title: 'Синхронизация индекса RAG',
		owner: 'Исследовательский штаб',
		due: 'Пн, 15:00',
		progress: 65,
	},
	{
		id: 'task-2',
		title: 'Воркшоп по живым лентам',
		owner: 'Дизайн-кружок',
		due: 'Ср, 19:00',
		progress: 30,
	},
	{
		id: 'task-3',
		title: 'Коллективный дайджест',
		owner: 'Редакция Сигналы',
		due: 'Пт, 12:00',
		progress: 85,
	},
];

export async function GET() {
	try {
		// В будущем здесь будет запрос к реальному API
		return NextResponse.json({
			items: backlogItems,
			total: backlogItems.length,
		});
	} catch (error) {
		return NextResponse.json(
			{
				error: 'UnexpectedError',
				message: 'Не удалось получить план на неделю',
			},
			{ status: 500 },
		);
	}
}