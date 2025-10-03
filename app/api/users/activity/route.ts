import { NextRequest, NextResponse } from 'next/server';

type ActivityData = {
	date: string;
	posts: number;
	likes: number;
	comments: number;
};

type ActivityStats = {
	totalPosts: number;
	totalLikes: number;
	totalComments: number;
	avgPostsPerDay: number;
	mostActiveDay: string;
	weeklyActivity: ActivityData[];
	monthlyTrend: {
		current: number;
		previous: number;
		change: number;
	};
};

export async function GET(request: NextRequest) {
	try {
		const { searchParams } = new URL(request.url);
		const period = searchParams.get('period') || '7d'; // 7d, 30d, 90d

		// Симуляция задержки API
		await new Promise((resolve) => setTimeout(resolve, 300));

		// Генерация данных активности за последние дни
		const generateActivityData = (days: number): ActivityData[] => {
			const data: ActivityData[] = [];
			const now = new Date();

			for (let i = days - 1; i >= 0; i--) {
				const date = new Date(now);
				date.setDate(date.getDate() - i);

				data.push({
					date: date.toISOString().split('T')[0],
					posts: Math.floor(Math.random() * 5), // 0-4 постов в день
					likes: Math.floor(Math.random() * 20), // 0-19 лайков в день
					comments: Math.floor(Math.random() * 10), // 0-9 комментариев в день
				});
			}

			return data;
		};

		const days = period === '30d' ? 30 : period === '90d' ? 90 : 7;
		const weeklyActivity = generateActivityData(days);

		// Вычисляем статистики
		const totalPosts = weeklyActivity.reduce((sum, day) => sum + day.posts, 0);
		const totalLikes = weeklyActivity.reduce((sum, day) => sum + day.likes, 0);
		const totalComments = weeklyActivity.reduce((sum, day) => sum + day.comments, 0);

		const avgPostsPerDay = Math.round((totalPosts / days) * 10) / 10;

		// Находим самый активный день
		const mostActiveDay = weeklyActivity.reduce((maxDay, currentDay) => {
			const currentTotal = currentDay.posts + currentDay.likes + currentDay.comments;
			const maxTotal = maxDay.posts + maxDay.likes + maxDay.comments;
			return currentTotal > maxTotal ? currentDay : maxDay;
		});

		// Месячный тренд (симуляция)
		const currentMonthActivity = totalPosts + totalLikes + totalComments;
		const previousMonthActivity = Math.floor(currentMonthActivity * (0.8 + Math.random() * 0.4));
		const change = Math.round(((currentMonthActivity - previousMonthActivity) / previousMonthActivity) * 100);

		const activityStats: ActivityStats = {
			totalPosts,
			totalLikes,
			totalComments,
			avgPostsPerDay,
			mostActiveDay: new Date(mostActiveDay.date).toLocaleDateString('ru-RU', {
				weekday: 'long',
				day: 'numeric',
				month: 'long'
			}),
			weeklyActivity,
			monthlyTrend: {
				current: currentMonthActivity,
				previous: previousMonthActivity,
				change,
			},
		};

		return NextResponse.json(activityStats);
	} catch (error) {
		console.error('Ошибка получения статистики активности:', error);
		return NextResponse.json(
			{ error: 'Не удалось загрузить статистику активности' },
			{ status: 500 }
		);
	}
}