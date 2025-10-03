'use client';

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { LuCalendarClock, LuTrendingUp } from 'react-icons/lu';

import { DashboardLayout } from '@components/dashboard/DashboardLayout';
import { circlesCopy } from '@/lib/content/circles';
import type { PaginatedResponse, Circle } from '@/lib/api/types';
import { fetchJson } from '@/lib/frontend/fetch-json';
import { CircleSkeleton } from '@/components/ui/skeletons/CircleSkeleton';
import { PanelSpinner } from '@/components/ui/Spinner';

const toneMap: Record<'purple' | 'teal', string> = {
	purple: 'from-accent-purple/40 via-transparent to-accent-teal/20',
	teal: 'from-accent-teal/40 via-transparent to-accent-amber/20',
};

type SpotlightCommunity = {
	id: string;
	name: string;
	focus: string;
	members: number;
	status: string;
	description: string;
	tone: 'purple' | 'teal';
};

function mapCirclesToSpotlight(
	response: PaginatedResponse<Circle> | undefined,
): SpotlightCommunity[] {
	const items = response?.items ?? [];
	if (!items.length) {
		return [...circlesCopy.spotlight.communities];
	}

	return items.slice(0, 4).map((circle, index) => ({
		id: circle.id,
		name: circle.name,
		focus: circle.description?.slice(0, 32) || 'открытая сцена',
		members: circle.memberCount,
		status: circle.isPrivate ? 'по приглашению' : 'открыт',
		description:
			circle.description ?? 'Создавайте события и подключайте ассистента',
		tone: index % 2 === 0 ? 'purple' : 'teal',
	}));
}

type BacklogItem = {
	id: string;
	title: string;
	due: string;
	owner: string;
	progress: number;
};

type BacklogResponse = {
	items: BacklogItem[];
};

export function CirclesShell() {
	const circlesQuery = useQuery({
		queryKey: ['circles', 'list'],
		queryFn: () => fetchJson<PaginatedResponse<Circle>>('/api/circles?limit=6'),
		staleTime: 60_000,
	});

	const backlogQuery = useQuery({
		queryKey: ['backlog', 'weekly'],
		queryFn: () => fetchJson<BacklogResponse>('/api/backlog/weekly'),
		staleTime: 60_000,
	});

	const spotlight = useMemo(
		() => mapCirclesToSpotlight(circlesQuery.data),
		[circlesQuery.data],
	);

	return (
		<DashboardLayout hero={circlesCopy.hero}>
			<section className='rounded-[20px] border border-white/10 bg-white/5 p-4 backdrop-blur-2xl sm:rounded-[28px] sm:p-6'>
				<header className='flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-0'>
					<div className='flex items-center gap-3 sm:flex-col sm:items-start sm:gap-0'>
						<LuTrendingUp className='h-5 w-5 text-accent-teal sm:hidden' />
						<div>
							<p className='text-xs uppercase tracking-[0.25em] text-dawn/60'>
								{circlesCopy.spotlight.label}
							</p>
							<h2 className='mt-1 text-lg font-semibold text-white sm:mt-3 sm:text-xl'>
								Сейчас в фокусе
							</h2>
						</div>
					</div>
					<LuTrendingUp className='hidden h-6 w-6 text-accent-teal sm:block' />
				</header>
				{circlesQuery.isLoading ?
					<div className='mt-4 grid gap-3 sm:mt-6 sm:gap-4 md:grid-cols-2'>
						{Array.from({ length: 4 }, (_, i) => (
							<CircleSkeleton key={i} />
						))}
					</div>
				:	<div className='mt-4 grid gap-3 sm:mt-6 sm:gap-4 md:grid-cols-2'>
						{spotlight.map((community) => (
							<article
								key={community.id}
								className='relative overflow-hidden rounded-[20px] border border-white/10 bg-white/5 p-3 sm:rounded-[24px] sm:p-4'
							>
								<div
									className={`absolute inset-0 bg-gradient-to-br ${toneMap[community.tone]} opacity-50`}
								/>
								<div className='relative z-10 space-y-2 text-sm text-dawn/70 sm:space-y-3'>
									<div className='flex items-center justify-between'>
										<div>
											<p className='text-base font-semibold text-white'>
												{community.name}
											</p>
											<p className='text-xs uppercase tracking-[0.2em] text-dawn/60'>
												фокус: {community.focus}
											</p>
										</div>
										<span className='rounded-full border border-white/20 px-3 py-1 text-xs uppercase tracking-[0.2em] text-white/80'>
											{community.status}
										</span>
									</div>
									<p>{community.description}</p>
									<footer className='flex items-center justify-between text-xs text-dawn/60'>
										<span>
											Участников: {community.members}
										</span>
										<button className='rounded-full border border-white/20 px-3 py-1 text-xs uppercase tracking-[0.2em] text-dawn/60 transition hover:border-accent-teal/50 hover:text-white'>
											открыть панель
										</button>
									</footer>
								</div>
							</article>
						))}
					</div>
				}
			</section>

			<section className='rounded-[28px] border border-white/10 bg-white/5 p-6 backdrop-blur-2xl'>
				<header className='flex items-center gap-3 text-white'>
					<LuCalendarClock className='h-6 w-6' />
					<div>
						<p className='text-xs uppercase tracking-[0.25em] text-dawn/60'>
							{circlesCopy.backlog.label}
						</p>
						<h2 className='text-xl font-semibold'>
							План на неделю
						</h2>
					</div>
				</header>
				<div className='mt-6 space-y-4'>
					{backlogQuery.isLoading ?
						<PanelSpinner text='Загружаем план на неделю...' />
					: backlogQuery.error ?
						<div className='rounded-[24px] border border-red-500/20 bg-red-500/5 p-4 text-center'>
							<p className='text-sm text-red-400'>Ошибка загрузки плана</p>
						</div>
					: backlogQuery.data?.items.map((item) => (
						<article
							key={item.id}
							className='rounded-[24px] border border-white/10 bg-white/5 p-4'
						>
							<header className='flex items-center justify-between text-sm text-white'>
								<p className='font-semibold'>{item.title}</p>
								<span className='text-xs uppercase tracking-[0.2em] text-dawn/60'>
									{item.due}
								</span>
							</header>
							<p className='mt-2 text-xs text-dawn/60'>
								{item.owner}
							</p>
							<div className='mt-4 h-2 w-full rounded-full bg-white/10'>
								<div
									className='h-full rounded-full bg-gradient-to-r from-accent-purple/70 to-accent-teal/70'
									style={{ width: `${item.progress}%` }}
								/>
							</div>
						</article>
					))
					}
				</div>
			</section>
		</DashboardLayout>
	);
}
