export const notificationsCopy = {
	hero: {
		title: 'Уведомления и сигналы',
		description:
			'Оставайтесь в курсе важных приглашений, апдейтов ИИ-проводника и действий вашей сети. Приоритизируйте шаги и реагируйте в нужной последовательности.',
	},
	streams: [
		{
			id: 'invitations',
			title: 'Приглашения',
			description: 'Запросы на вступление и совместные эфиры',
			entries: [
				{
					id: 'invite-1',
					actor: 'Лаборатория RAG',
					message: 'зовет вас со-модерировать вечерний эфир',
					time: '15 минут назад',
					cta: 'Принять',
				},
				{
					id: 'invite-2',
					actor: 'Коллектив Зеленый коридор',
					message: 'приглашает поделиться подборкой по этике',
					time: '1 час назад',
					cta: 'Ответить',
				},
			],
		},
		{
			id: 'assistant',
			title: 'Подсказки проводника',
			description: 'Рекомендации на базе последних обсуждений',
			entries: [
				{
					id: 'ai-1',
					actor: 'ИИ-проводник',
					message: 'нашёл 3 аналитические заметки по realtime UX',
					time: '32 минуты назад',
					cta: 'Открыть',
				},
				{
					id: 'ai-2',
					actor: 'ИИ-проводник',
					message: 'предлагает добавить гостя в эфир "Сети смысла"',
					time: '2 часа назад',
					cta: 'Посмотреть',
				},
			],
		},
	],
	summary: {
		label: 'итоги суток',
		highlights: [
			{
				id: 'summary-live',
				title: '8 прямых эфиров',
				note: '4 из них продолжаются сейчас',
			},
			{
				id: 'summary-joins',
				title: '27 новых участников',
				note: 'в основном из коллективов AI & Media',
			},
			{
				id: 'summary-threads',
				title: '12 активных тредов',
				note: 'среднее время ответа — 6 минут',
			},
		],
	},
} as const;

export type NotificationsCopy = typeof notificationsCopy;
