import type {
	AiPrompts,
	FeedPost,
	NavItem,
	SuggestedPerson,
	TrendTopic,
} from '@/lib/data/feed';

export const fallbackNavItems: NavItem[] = [
	{ id: 'home', label: 'Главная', href: '/', icon: 'home' },
	{ id: 'feed', label: 'Поток', href: '/feed', icon: 'feed' },
	{ id: 'ai', label: 'ИИ-проводник', href: '/llm', icon: 'spark' },
	{ id: 'circles', label: 'Сообщества', href: '/circles', icon: 'globe' },
	{
		id: 'alerts',
		label: 'Уведомления',
		href: '/notifications',
		icon: 'bell',
	},
];

export const fallbackFeedPosts: FeedPost[] = [
	{
		id: 'post-ai-map',
		author: {
			name: 'Александра Вольт',
			role: 'Куратор RAG-лаборатории',
			avatarInitials: 'AV',
		},
		createdAt: '2 часа назад',
		content:
			'Подготовили интерактивную карту сообществ для митапа "Сети смысла" — ИИ подсветил зоны роста и горячие точки вовлечённости.',
		tags: ['карты', 'rag'],
		stats: { comments: 18, boosts: 42, signals: 156 },
		accent: 'globe',
	},
	{
		id: 'post-llm-jam',
		author: {
			name: 'Антон К',
			role: 'Музыкальный инженер',
			avatarInitials: 'AK',
		},
		createdAt: '4 часа назад',
		content:
			'Собрали импровизационный джем: LLM синтезирует текст, мы отвечаем визуально. Готовы подключить ещё два коллектива — пишите, если хотите в эфир.',
		tags: ['llm', 'live'],
		stats: { comments: 12, boosts: 35, signals: 98 },
		accent: 'aurora',
	},
	{
		id: 'post-collective-digest',
		author: {
			name: 'Команда Сигналы',
			role: 'Редакция дайджестов',
			avatarInitials: 'CS',
		},
		createdAt: '7 часов назад',
		content:
			'Опубликовали коллективный дайджест по нейросетевой этике. Добавили 8 свежих кейсов и подборку материалов для глубинного чтения.',
		tags: ['этика', 'дайджест'],
		stats: { comments: 9, boosts: 21, signals: 73 },
		accent: 'neural',
	},
];

export const fallbackTrendTopics: TrendTopic[] = [
	{
		id: 'tr-llm',
		label: '#LLM-картирование',
		description: 'Новые методики визуализации связей датасетов',
		href: '/trends/llm-mapping',
	},
	{
		id: 'tr-realtime',
		label: '#RealtimeSocial',
		description: 'Мини-воркшопы по живым лентам сообщества',
		href: '/trends/realtime',
	},
	{
		id: 'tr-sensemaking',
		label: 'Sensemaking',
		description: 'Инструменты коллективной аналитики',
		href: '/trends/sensemaking',
	},
];

export const fallbackSuggestedPeople: SuggestedPerson[] = [
	{
		id: 'sg-1',
		name: 'Яна Лаэр',
		title: 'Продюсер коллективов',
		avatarInitials: 'YL',
		mutuals: 12,
	},
	{
		id: 'sg-2',
		name: 'Рена Тихая',
		title: 'Исследователька LLM',
		avatarInitials: 'RT',
		mutuals: 7,
	},
	{
		id: 'sg-3',
		name: 'Глеб Наор',
		title: 'UX для информационных неонов',
		avatarInitials: 'GN',
		mutuals: 5,
	},
];

export const fallbackAiPrompts: AiPrompts = {
	headline: 'ИИ-орбитальный канал',
	description:
		'Задайте вопрос — ассистент соберёт контекст и поделится свежими сигналами. Подсказки подстроены под текущие обсуждения.',
	ideas: [
		'Как сообщество использует RAG для живых сводок?',
		'Покажи тренды по этике нейросетей за неделю',
		'Собери гостей для эфира про realtime UX',
	],
};
