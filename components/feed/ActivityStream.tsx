'use client';

import { ReactNode, useMemo } from 'react';
import { useUnit } from 'effector-react';
import {
	HiOutlineLightningBolt,
	HiOutlineChat,
	HiOutlinePhotograph,
} from 'react-icons/hi';
import { LuClock3, LuShare2 } from 'react-icons/lu';

import type { Post } from '@/lib/api/types';
import { $posts, $postsLoading, $postsError } from '@/lib/effector';
import { initialsFromName } from '@/lib/data/feed';
import { formatRelativeTime } from '@/lib/utils/datetime';
import { PanelSpinner } from '@/components/ui/Spinner';

type Activity = {
	id: string;
	title: string;
	author: string;
	description: string;
	tags: string[];
	status: 'live' | 'soon' | 'replay';
	icon: React.ComponentType<{ className?: string }>;
};

const fallbackActivities: Activity[] = [
	{
		id: 'pulse-1',
		title: 'Экспедиция RAG',
		author: 'Агата Н.',
		description:
			'Собрали подборку материалов про цифровой гуманизм. ИИ выделил 3 свежих цитаты.',
		tags: ['RAG', 'анализ'],
		icon: HiOutlineLightningBolt,
		status: 'live',
	},
	{
		id: 'pulse-2',
		title: 'Подкаст-эфир',
		author: 'Модуль Миссия',
		description:
			'Запускаем аудио-чат, подключайтесь со своими вопросами и историями.',
		tags: ['эфир', 'сообщество'],
		icon: HiOutlineChat,
		status: 'soon',
	},
	{
		id: 'pulse-3',
		title: 'Визуальный отчёт',
		author: 'Ярослав Т.',
		description:
			'Опубликовал визуализацию роста подписчиков и откликов за последнюю неделю.',
		tags: ['growth', 'визуал'],
		icon: HiOutlinePhotograph,
		status: 'replay',
	},
];

const statusMeta: Record<
	Activity['status'],
	{ label: string; accent: string; icon: ReactNode }
> = {
	live: {
		label: 'В эфире',
		accent: 'bg-red-400/80',
		icon: <HiOutlineLightningBolt className='h-4 w-4' />,
	},
	soon: {
		label: 'Скоро',
		accent: 'bg-amber-400/80',
		icon: <LuClock3 className='h-4 w-4' />,
	},
	replay: {
		label: 'Запись',
		accent: 'bg-accent-teal/60',
		icon: <LuShare2 className='h-4 w-4' />,
	},
};

const activityIcons = [
	HiOutlineLightningBolt,
	HiOutlineChat,
	HiOutlinePhotograph,
];
const activityStatuses: Activity['status'][] = ['live', 'soon', 'replay'];

function mapPostToActivity(post: Post, index: number): Activity {
	const icon = activityIcons[index % activityIcons.length];
	const status = activityStatuses[index % activityStatuses.length];
	const authorInfo = (
		post as unknown as {
			author?: {
				displayName?: string;
				firstName?: string;
				lastName?: string;
			};
		}
	).author;
	const authorName =
		authorInfo?.displayName ??
		[authorInfo?.firstName, authorInfo?.lastName]
			.filter(Boolean)
			.join(' ')
			.trim() ??
		initialsFromName(post.authorId);

	return {
		id: post.id,
		title:
			post.content.slice(0, 80) + (post.content.length > 80 ? '…' : ''),
		author: authorName,
		description: `Обновлено ${formatRelativeTime(post.createdAt)}`,
		tags: (post.tags ?? []).map((tag) => tag.replace(/^#/, '')),
		icon,
		status,
	};
}

export function ActivityStream() {
	const [posts, isLoading, error] = useUnit([
		$posts,
		$postsLoading,
		$postsError,
	]);

	const pulses = useMemo<Activity[]>(() => {
		if (!Array.isArray(posts) || posts.length === 0) {
			return fallbackActivities;
		}
		// Take only first 5 posts for activity stream
		return posts
			.slice(0, 5)
			.map((post: any, index: number) => mapPostToActivity(post, index));
	}, [posts]);

	if (isLoading) {
		return <PanelSpinner text='Загружаем живой поток...' />;
	}

	if (error) {
		return (
			<div className='rounded-[24px] border border-red-500/40 bg-red-500/10 p-6 text-sm text-red-200'>
				Поток временно недоступен. Обновите страницу позже.
			</div>
		);
	}

	return (
		<div className='space-y-4'>
			{pulses.map((item) => {
				const meta = statusMeta[item.status];
				const Icon = item.icon;

				return (
					<article
						key={item.id}
						className='surface-panel group grid gap-5 rounded-[24px] border border-white/10 p-6 transition hover:border-white/20 hover:bg-white/10 sm:grid-cols-[auto,1fr] sm:items-center'
					>
						<div className='flex flex-col items-center gap-3 sm:items-start'>
							<div className='relative flex h-14 w-14 items-center justify-center rounded-2xl bg-white/10 text-white'>
								<Icon className='h-6 w-6' />
							</div>
							<span
								className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs text-midnight ${meta.accent}`}
							>
								{meta.icon}
								{meta.label}
							</span>
						</div>
						<div className='space-y-4'>
							<header className='flex flex-col gap-2'>
								<h3 className='text-xl font-semibold text-white'>
									{item.title}
								</h3>
								<p className='text-sm text-dawn/60'>
									{item.author}
								</p>
							</header>
							<p className='text-sm text-dawn/70'>
								{item.description}
							</p>
							<div className='flex flex-wrap gap-3'>
								{item.tags.map((tag) => (
									<span
										key={tag}
										className='rounded-full border border-white/20 bg-white/5 px-3 py-1 text-xs uppercase tracking-[0.2em] text-dawn/60'
									>
										{tag}
									</span>
								))}
							</div>
						</div>
					</article>
				);
			})}
		</div>
	);
}
