'use client';

import type { FeedPost } from '@/lib/data/feed';
import { PostActions } from './PostActions';

type FeedCardProps = {
	post: FeedPost;
};

const accentClass: Record<NonNullable<FeedPost['accent']>, string> = {
	globe: 'from-accent-teal/30 via-transparent to-accent-purple/20',
	neural: 'from-accent-purple/35 via-accent-teal/10 to-accent-amber/20',
	aurora: 'from-accent-amber/25 via-accent-purple/20 to-accent-teal/15',
};

export function FeedCard({ post }: FeedCardProps) {
	const gradient =
		post.accent ?
			accentClass[post.accent]
		:	'from-accent-purple/20 via-transparent to-accent-teal/20';

	return (
		<article className='relative overflow-hidden rounded-[28px] border border-white/10 bg-white/5 p-6 backdrop-blur-2xl transition hover:border-white/20 hover:bg-white/10'>
			<div
				className={`absolute inset-0 -z-10 bg-gradient-to-br ${gradient} opacity-40`}
			/>
			<header className='flex items-start justify-between gap-4'>
				<div className='flex items-start gap-4'>
					<div className='flex h-12 w-12 items-center justify-center rounded-full border border-white/10 bg-white/10 text-sm font-semibold text-white'>
						{post.author.avatarInitials}
					</div>
					<div>
						<p className='text-sm font-semibold text-white'>
							{post.author.name}
						</p>
						<p className='text-xs text-dawn/60'>
							{post.author.role}
						</p>
					</div>
				</div>
				<span className='text-xs text-dawn/50'>{post.createdAt}</span>
			</header>
			<p className='mt-6 text-sm leading-relaxed text-dawn/80'>
				{post.content}
			</p>
			<div className='mt-6 flex flex-wrap gap-3 text-xs uppercase tracking-[0.25em] text-dawn/60'>
				{post.tags.map((tag) => (
					<span
						key={tag}
						className='rounded-full border border-white/10 bg-midnight/60 px-3 py-2'
					>
						#{tag}
					</span>
				))}
			</div>
			<PostActions
				post={{
					id: post.id,
					content: post.content,
					tags: post.tags,
					is_liked: false, // TODO: Получать из состояния поста
					is_reposted: false, // TODO: Получать из состояния поста
					likes_count: post.stats.boosts,
					reposts_count: post.stats.signals,
					comments_count: post.stats.comments,
					authorId: 'current_user' // TODO: Получать реального автора
				}}
				isOwnPost={false} // TODO: Проверять по текущему пользователю
			/>
		</article>
	);
}
