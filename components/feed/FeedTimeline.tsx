'use client';

import { useMemo, useEffect } from 'react';
import { useUnit } from 'effector-react';

import type { FeedPost } from '@/lib/data/feed';
import { fallbackFeedPosts } from '@/lib/data/fallback-content';
import { initialsFromName } from '@/lib/data/feed';
import type { Post } from '@/lib/types';
import { formatRelativeTime } from '@/lib/utils/datetime';
import {
	$posts,
	$postsLoading,
	$postsError,
	postsInitRequested,
} from '@/lib/effector';

import { FeedCard } from './FeedCard';
import { LoadMoreButton } from './LoadMoreButton';
import { PostSkeleton } from '@/components/ui/skeletons/PostSkeleton';

function mapPostToFeedCard(post: Post): FeedPost {
	const authorInfo = post.author;
	const fullName = authorInfo?.name || `User ${authorInfo?.id?.slice(0, 6) || 'Unknown'}`;
	const createdAt = formatRelativeTime(post.created_at);
	const tags =
		Array.isArray(post.tags) ?
			post.tags.map((tag) => tag.replace(/^#/, ''))
		:	[];

	return {
		id: post.id,
		author: {
			name: fullName,
			role: 'Участник Собрания',
			avatarInitials: initialsFromName(fullName),
		},
		createdAt,
		content: post.content,
		tags,
		stats: {
			comments: post.comments_count ?? 0,
			boosts: post.likes_count ?? 0,
			signals: post.reposts_count ?? 0,
		},
	};
}

export function FeedTimeline() {
	// Use Effector stores and event handler
	const [posts, isLoading, error, loadPosts] = useUnit([
		$posts,
		$postsLoading,
		$postsError,
		postsInitRequested,
	]);

	// Load posts on mount only once
	useEffect(() => {
		// Only load if no posts yet and not loading
		if (Array.isArray(posts) && posts.length === 0 && !isLoading) {
			loadPosts();
		}
	}, []); // Empty dependency array - run only once on mount

	const items = useMemo<FeedPost[]>(() => {
		if (!Array.isArray(posts) || posts.length === 0) {
			return fallbackFeedPosts;
		}

		return posts.map(mapPostToFeedCard);
	}, [posts]);

	if (isLoading) {
		return (
			<div className='grid gap-6'>
				{Array.from({ length: 4 }, (_, i) => (
					<PostSkeleton key={i} />
				))}
			</div>
		);
	}

	if (error) {
		return (
			<div className='rounded-[28px] border border-red-500/40 bg-red-500/10 p-6 text-sm text-red-200'>
				{error}
			</div>
		);
	}

	return (
		<div className='grid gap-6'>
			{items.map((post) => (
				<FeedCard
					key={post.id}
					post={post}
				/>
			))}
			<LoadMoreButton />
		</div>
	);
}
