export const circlesCopy = {
	hero: {
		title: 'Сообщества и кабины',
		description:
			'Планируйте эфиры, распределяйте роли и подключайте ИИ-проводника к каждому сообществу. Здесь собирается ядро коллективных действий.',
	},
	spotlight: {
		label: 'активные созывы',
		communities: [
			{
				id: 'rag-lab',
				name: 'Лаборатория RAG',
				focus: 'оперативная аналитика',
				members: 240,
				status: 'онлайн',
				description:
					'Стратегии моментального поиска и визуализации знания. Вечером коллективный стрим с разбором запросов.',
				tone: 'purple',
			},
			{
				id: 'urban-ai',
				name: 'Urban AI',
				focus: 'медиадизайн',
				members: 158,
				status: 'сбор',
				description:
					'Создаём нейронные ленты для городских событий и настраиваем realtime-оповещения по районам.',
				tone: 'teal',
			},
		],
	},
	backlog: {
		label: 'инициативы недели',
		items: [
			{
				id: 'ethics',
				title: 'Кодекс этики для совместных ассистентов',
				owner: 'Кабина "Сигналы"',
				due: 'в пятницу',
				progress: 62,
			},
			{
				id: 'atlas',
				title: 'Атлас сообществ по темам LLM',
				owner: 'Коалиция исследователей',
				due: 'завтра',
				progress: 48,
			},
			{
				id: 'airdrop',
				title: 'Аирдроп пропусков на закрытый стрим',
				owner: 'Радио Собрание',
				due: 'сегодня',
				progress: 85,
			},
		],
	},
} as const;

export type CirclesCopy = typeof circlesCopy;
