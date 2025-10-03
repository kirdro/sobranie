'use client';

import { useUnit } from 'effector-react';
import { HiOutlineArrowPath } from 'react-icons/hi2';
import {
	loadMorePostsRequested,
	$hasMorePosts,
	$postsLoading,
} from '@/lib/effector';

export function LoadMoreButton() {
	const [hasMore, isLoading, loadMore] = useUnit([
		$hasMorePosts,
		$postsLoading,
		loadMorePostsRequested,
	]);

	if (!hasMore) {
		return (
			<div className='text-center py-8'>
				<p className='text-sm text-dawn/60'>
					Это все посты на данный момент
				</p>
			</div>
		);
	}

	return (
		<div className='text-center py-8'>
			<button
				onClick={() => loadMore()}
				disabled={isLoading}
				className='inline-flex items-center gap-3 rounded-full border border-white/20 bg-white/5 px-6 py-3 text-sm text-dawn/80 transition hover:border-accent-teal/40 hover:bg-accent-teal/10 hover:text-white disabled:cursor-not-allowed disabled:opacity-50'
				aria-busy={isLoading}
			>
				{isLoading && (
					<HiOutlineArrowPath className='h-4 w-4 animate-spin' />
				)}
				{isLoading ? 'Загружаем...' : 'Загрузить ещё'}
			</button>
		</div>
	);
}