import { createEvent } from 'effector';
import type { Post } from '../api/types';

export const postsRequested = createEvent<{ page?: number; limit?: number } | void>();

export const postsInitRequested = createEvent();

export const loadMorePostsRequested = createEvent();

export const postCreated = createEvent<{
	content: string;
	visibility: 'public' | 'private' | 'friends';
	tags: string[];
}>();

export const postDeleted = createEvent<string>();

export const postLiked = createEvent<string>();

export const postUnliked = createEvent<string>();

export const postReposted = createEvent<string>();

export const postUnreposted = createEvent<string>();

export const postSelected = createEvent<Post | null>();

export const postModalOpened = createEvent<Post>();

export const postModalClosed = createEvent();

export const postEditRequested = createEvent<{ postId: string; content: string; tags: string[] }>();