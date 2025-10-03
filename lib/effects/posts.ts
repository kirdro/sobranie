import { createEffect } from 'effector';
import { postsApi } from '../api/client-effector';
import type { Post, PostsResponse } from '../api/types';

export const fetchPostsFx = createEffect<
	{ page?: number; limit?: number } | void,
	PostsResponse
>(async (params) => {
	return postsApi.fetchPosts(params || {});
});

export const initPostsFx = createEffect<void, PostsResponse>(async () => {
	return postsApi.fetchPosts();
});

export const createPostFx = createEffect<
	{
		content: string;
		visibility: 'public' | 'private' | 'friends';
		tags: string[];
	},
	Post
>(async (params) => {
	return postsApi.createPost(params);
});

export const deletePostFx = createEffect<string, void>(async (postId) => {
	return postsApi.deletePost(postId);
});

export const likePostFx = createEffect<string, void>(async (postId) => {
	return postsApi.likePost(postId);
});

export const unlikePostFx = createEffect<string, void>(async (postId) => {
	return postsApi.unlikePost(postId);
});

export const repostFx = createEffect<string, void>(async (postId) => {
	return postsApi.repost(postId);
});

export const unrepostFx = createEffect<string, void>(async (postId) => {
	return postsApi.unrepost(postId);
});

export const editPostFx = createEffect<
	{ postId: string; content: string; tags: string[] },
	Post
>(async ({ postId, content, tags }) => {
	return postsApi.editPost(postId, { content, tags });
});