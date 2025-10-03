'use client';

import { useState, useEffect } from 'react';
import { LuActivity, LuHeart, LuMessageCircle, LuPen, LuTrendingUp, LuTrendingDown } from 'react-icons/lu';
import { fetchJson } from '@/lib/frontend/fetch-json';

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

export function ActivityStats() {
	const [stats, setStats] = useState<ActivityStats | null>(null);
	const [isLoading, setIsLoading] = useState(true);
	const [period, setPeriod] = useState('7d');

	useEffect(() => {
		loadStats();
	}, [period]);

	const loadStats = async () => {
		setIsLoading(true);
		try {
			const response = await fetchJson(`/api/users/activity?period=${period}`);
			setStats(response);
		} catch (error) {
			console.error('Ошибка загрузки статистики:', error);
		} finally {
			setIsLoading(false);
		}
	};

	const getMaxActivity = () => {
		if (!stats) return 1;
		return Math.max(...stats.weeklyActivity.map(day => day.posts + day.likes + day.comments));
	};

	const formatDate = (dateString: string) => {
		const date = new Date(dateString);
		return date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
	};

	if (isLoading) {
		return (
			<div className='rounded-[28px] border border-white/10 bg-white/5 p-6 backdrop-blur-2xl'>
				<div className='animate-pulse space-y-4'>
					<div className='h-6 w-48 rounded bg-white/10'></div>
					<div className='grid grid-cols-2 gap-4 sm:grid-cols-4'>
						{[...Array(4)].map((_, i) => (
							<div key={i} className='h-20 rounded-xl bg-white/10'></div>
						))}
					</div>
					<div className='h-32 rounded-xl bg-white/10'></div>
				</div>
			</div>
		);
	}

	if (!stats) return null;

	const maxActivity = getMaxActivity();

	return (
		<div className='rounded-[28px] border border-white/10 bg-white/5 p-6 backdrop-blur-2xl'>
			{/* Header */}
			<div className='flex items-center justify-between'>
				<div className='flex items-center gap-3'>
					<LuActivity className='h-6 w-6 text-accent-teal' />
					<h2 className='text-xl font-semibold text-white'>Статистика активности</h2>
				</div>

				{/* Period Selector */}
				<div className='flex rounded-full border border-white/10 bg-white/5 p-1'>
					{[
						{ value: '7d', label: '7д' },
						{ value: '30d', label: '30д' },
						{ value: '90d', label: '90д' },
					].map((option) => (
						<button
							key={option.value}
							onClick={() => setPeriod(option.value)}
							className={`rounded-full px-3 py-1 text-xs font-medium transition ${
								period === option.value
									? 'bg-accent-teal text-white'
									: 'text-dawn/60 hover:text-white'
							}`}
						>
							{option.label}
						</button>
					))}
				</div>
			</div>

			{/* Summary Stats */}
			<div className='mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4'>
				<div className='rounded-[20px] border border-white/10 bg-white/5 p-4 text-center'>
					<div className='flex items-center justify-center mb-2'>
						<LuPen className='h-5 w-5 text-accent-teal' />
					</div>
					<div className='text-2xl font-bold text-white'>{stats.totalPosts}</div>
					<div className='text-xs text-dawn/60'>постов</div>
				</div>

				<div className='rounded-[20px] border border-white/10 bg-white/5 p-4 text-center'>
					<div className='flex items-center justify-center mb-2'>
						<LuHeart className='h-5 w-5 text-accent-purple' />
					</div>
					<div className='text-2xl font-bold text-white'>{stats.totalLikes}</div>
					<div className='text-xs text-dawn/60'>лайков</div>
				</div>

				<div className='rounded-[20px] border border-white/10 bg-white/5 p-4 text-center'>
					<div className='flex items-center justify-center mb-2'>
						<LuMessageCircle className='h-5 w-5 text-accent-amber' />
					</div>
					<div className='text-2xl font-bold text-white'>{stats.totalComments}</div>
					<div className='text-xs text-dawn/60'>комментариев</div>
				</div>

				<div className='rounded-[20px] border border-white/10 bg-white/5 p-4 text-center'>
					<div className='flex items-center justify-center mb-2'>
						{stats.monthlyTrend.change >= 0 ? (
							<LuTrendingUp className='h-5 w-5 text-green-400' />
						) : (
							<LuTrendingDown className='h-5 w-5 text-red-400' />
						)}
					</div>
					<div className={`text-2xl font-bold ${
						stats.monthlyTrend.change >= 0 ? 'text-green-400' : 'text-red-400'
					}`}>
						{stats.monthlyTrend.change > 0 ? '+' : ''}{stats.monthlyTrend.change}%
					</div>
					<div className='text-xs text-dawn/60'>тренд</div>
				</div>
			</div>

			{/* Activity Chart */}
			<div className='mt-6'>
				<h3 className='mb-4 text-sm font-medium text-white'>
					Активность за {period === '7d' ? 'неделю' : period === '30d' ? 'месяц' : '3 месяца'}
				</h3>

				<div className='rounded-[20px] border border-white/10 bg-white/5 p-4'>
					<div className='flex items-end justify-between space-x-1' style={{ height: '120px' }}>
						{stats.weeklyActivity.map((day, index) => {
							const totalActivity = day.posts + day.likes + day.comments;
							const height = maxActivity > 0 ? (totalActivity / maxActivity) * 100 : 0;

							return (
								<div key={day.date} className='flex flex-1 flex-col items-center'>
									<div
										className='w-full rounded-t bg-gradient-to-t from-accent-teal/60 to-accent-teal transition-all hover:from-accent-teal/80 hover:to-accent-teal/60'
										style={{ height: `${height}%`, minHeight: totalActivity > 0 ? '4px' : '0' }}
										title={`${formatDate(day.date)}: ${totalActivity} активности`}
									/>
									<div className='mt-2 text-xs text-dawn/50'>
										{formatDate(day.date)}
									</div>
								</div>
							);
						})}
					</div>
				</div>
			</div>

			{/* Additional Info */}
			<div className='mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2'>
				<div className='rounded-[20px] border border-white/10 bg-white/5 p-4'>
					<div className='text-sm text-dawn/60'>Среднее постов в день</div>
					<div className='text-2xl font-bold text-white'>{stats.avgPostsPerDay}</div>
				</div>

				<div className='rounded-[20px] border border-white/10 bg-white/5 p-4'>
					<div className='text-sm text-dawn/60'>Самый активный день</div>
					<div className='text-lg font-medium text-white'>{stats.mostActiveDay}</div>
				</div>
			</div>
		</div>
	);
}