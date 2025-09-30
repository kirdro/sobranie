import { createEvent } from 'effector';
import type { CreatePostData, Post, PostsFilter } from '../types';

// Posts events
export const postsRequested = createEvent<{ page?: number; limit?: number; filter?: PostsFilter }>();
export const postsInitRequested = createEvent(); // Event for initial posts loading
export const postCreated = createEvent<CreatePostData>();
export const postUpdated = createEvent<{ id: string; data: Partial<Post> }>();
export const postDeleted = createEvent<string>();

// Post interactions
export const postLiked = createEvent<string>();
export const postUnliked = createEvent<string>();
export const postReposted = createEvent<string>();
export const postUnreposted = createEvent<string>();

// Post selection
export const postSelected = createEvent<Post | null>();
export const postModalOpened = createEvent<Post>();
export const postModalClosed = createEvent();