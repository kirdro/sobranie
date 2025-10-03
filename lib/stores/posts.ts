import { createStore, sample, combine } from 'effector';
import type { Post, PostsFilter, PostsPagination } from '../api/types';
import {
	postsRequested,
	postsInitRequested,
	loadMorePostsRequested,
	postCreated,
	postDeleted,
	postLiked,
	postUnliked,
	postReposted,
	postUnreposted,
	postSelected,
	postModalOpened,
	postModalClosed,
	postEditRequested,
} from '../events';
import {
	fetchPostsFx,
	initPostsFx,
	createPostFx,
	likePostFx,
	unlikePostFx,
	repostFx,
	unrepostFx,
	deletePostFx,
	editPostFx,
} from '../effects';

// Posts stores
export const $posts = createStore<Post[]>([], { skipVoid: false });
export const $selectedPost = createStore<Post | null>(null, {
	skipVoid: false,
});
export const $postsFilter = createStore<PostsFilter>(
	{
		sort_by: 'created_at',
		sort_order: 'desc',
	},
	{ skipVoid: false },
);
export const $postsPagination = createStore<PostsPagination>(
	{
		page: 1,
		limit: 20,
		total: 0,
		has_next: false,
	},
	{ skipVoid: false },
);

// Loading states
export const $postsLoading = combine(
	fetchPostsFx.pending,
	initPostsFx.pending,
	(fetchLoading, initLoading) => fetchLoading || initLoading,
);
export const $createPostLoading = createPostFx.pending;

// Error handling
export const $postsError = createStore<string | null>(null, {
	skipVoid: false,
});

// Modal state
export const $postModalOpen = createStore<boolean>(false, { skipVoid: false });
export const $postModalData = createStore<Post | null>(null, {
	skipVoid: false,
});

// Derived stores
export const $postsWithInteractions = combine($posts, (posts) => posts, {
	skipVoid: false,
});

export const $unreadPostsCount = createStore<number>(0, { skipVoid: false });
export const $hasMorePosts = $postsPagination.map(
	(pagination) => pagination.has_next,
	{
		skipVoid: false,
	},
);

// Handle posts loading - prevent duplicates
sample({
	clock: postsRequested,
	source: $postsLoading,
	filter: (loading) => !loading,
	target: fetchPostsFx,
	skipVoid: false,
});

// Handle initial posts loading - prevent duplicates
sample({
	clock: postsInitRequested,
	source: { posts: $posts, loading: $postsLoading },
	filter: ({ posts, loading }) => !loading && posts.length === 0,
	target: initPostsFx,
});

// Handle load more posts
sample({
	clock: loadMorePostsRequested,
	source: $postsPagination,
	fn: (pagination) => ({
		page: pagination.page + 1,
		limit: pagination.limit,
	}),
	target: fetchPostsFx,
});

// Update posts on successful fetch
sample({
	clock: [fetchPostsFx.doneData, initPostsFx.doneData],
	source: $posts,
	fn: (currentPosts, response) => {
		// If it's the first page or no pagination info, replace all posts
		if (!response.pagination || response.pagination.page === 1) {
			return response.data;
		}
		// Otherwise, append new posts
		return [...currentPosts, ...response.data];
	},
	target: $posts,
});

// Update pagination
sample({
	clock: [fetchPostsFx.doneData, initPostsFx.doneData],
	fn: (response) =>
		response.pagination || {
			page: 1,
			limit: 20,
			total: response.data?.length || 0,
			has_next: false,
			has_prev: false,
		},
	target: $postsPagination,
});

// Handle post creation
sample({
	clock: postCreated,
	target: createPostFx,
	skipVoid: false,
});

// Add new post to the top of the list
sample({
	clock: createPostFx.doneData,
	source: $posts,
	fn: (posts, newPost) => [newPost, ...posts],
	target: $posts,
});

// Handle post interactions
sample({
	clock: postLiked,
	target: likePostFx,
	skipVoid: false,
});

sample({
	clock: postUnliked,
	target: unlikePostFx,
	skipVoid: false,
});

sample({
	clock: postReposted,
	target: repostFx,
	skipVoid: false,
});

sample({
	clock: postUnreposted,
	target: unrepostFx,
	skipVoid: false,
});

// Update post state after successful like
sample({
	clock: likePostFx.done,
	source: $posts,
	fn: (posts, { params: postId }) =>
		posts.map((post) =>
			post.id === postId ?
				{
					...post,
					is_liked: true,
					likes_count: post.likes_count + 1,
				}
			:	post,
		),
	target: $posts,
});

// Update post state after successful unlike
sample({
	clock: unlikePostFx.done,
	source: $posts,
	fn: (posts, { params: postId }) =>
		posts.map((post) =>
			post.id === postId ?
				{
					...post,
					is_liked: false,
					likes_count: Math.max(0, post.likes_count - 1),
				}
			:	post,
		),
	target: $posts,
});

// Update post state after successful repost
sample({
	clock: repostFx.done,
	source: $posts,
	fn: (posts, { params: postId }) =>
		posts.map((post) =>
			post.id === postId ?
				{
					...post,
					is_reposted: true,
					reposts_count: post.reposts_count + 1,
				}
			:	post,
		),
	target: $posts,
});

// Update post state after successful unrepost
sample({
	clock: unrepostFx.done,
	source: $posts,
	fn: (posts, { params: postId }) =>
		posts.map((post) =>
			post.id === postId ?
				{
					...post,
					is_reposted: false,
					reposts_count: Math.max(0, post.reposts_count - 1),
				}
			:	post,
		),
	target: $posts,
});

// Handle post deletion
sample({
	clock: postDeleted,
	target: deletePostFx,
	skipVoid: false,
});

sample({
	clock: deletePostFx.done,
	source: $posts,
	fn: (posts, { params: postId }) =>
		posts.filter((post) => post.id !== postId),
	target: $posts,
});

// Handle post selection
sample({
	clock: postSelected,
	target: $selectedPost,
	skipVoid: false,
});

// Handle post modal
sample({
	clock: postModalOpened,
	fn: () => true,
	target: $postModalOpen,
	skipVoid: false,
});

sample({
	clock: postModalOpened,
	target: $postModalData,
	skipVoid: false,
});

sample({
	clock: postModalClosed,
	fn: () => false,
	target: $postModalOpen,
	skipVoid: false,
});

sample({
	clock: postModalClosed,
	fn: () => null,
	target: $postModalData,
	skipVoid: false,
});

// Handle post editing
sample({
	clock: postEditRequested,
	target: editPostFx,
	skipVoid: false,
});

sample({
	clock: editPostFx.done,
	source: $posts,
	fn: (posts, { result: updatedPost }) =>
		posts.map((post) =>
			post.id === updatedPost.id ? updatedPost : post
		),
	target: $posts,
});

// Error handling
sample({
	clock: [
		fetchPostsFx.failData,
		initPostsFx.failData,
		createPostFx.failData,
		likePostFx.failData,
		unlikePostFx.failData,
		repostFx.failData,
		unrepostFx.failData,
		deletePostFx.failData,
		editPostFx.failData,
	],
	fn: (error) => error.message,
	target: $postsError,
});

// Clear errors on new requests
sample({
	clock: [postsRequested, postsInitRequested, postCreated, postLiked, postUnliked, postReposted, postUnreposted, postEditRequested],
	fn: () => null,
	target: $postsError,
	skipVoid: false,
});
