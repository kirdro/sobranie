import { createStore, sample, combine } from 'effector';
import type { Post, PostsFilter, PostsPagination } from '../types';
import {
  postsRequested,
  postCreated,
  postUpdated,
  postDeleted,
  postLiked,
  postUnliked,
  postReposted,
  postUnreposted,
  postSelected,
  postModalOpened,
  postModalClosed
} from '../events';
import {
  fetchPostsFx,
  createPostFx,
  likePostFx,
  unlikePostFx,
  repostFx,
  deletePostFx
} from '../effects';

// Posts stores
export const $posts = createStore<Post[]>([]);
export const $selectedPost = createStore<Post | null>(null);
export const $postsFilter = createStore<PostsFilter>({
  sort_by: 'created_at',
  sort_order: 'desc',
});
export const $postsPagination = createStore<PostsPagination>({
  page: 1,
  limit: 20,
  total: 0,
  has_next: false,
});

// Loading states
export const $postsLoading = fetchPostsFx.pending;
export const $createPostLoading = createPostFx.pending;

// Error handling
export const $postsError = createStore<string | null>(null);

// Modal state
export const $postModalOpen = createStore<boolean>(false);
export const $postModalData = createStore<Post | null>(null);

// Derived stores
export const $postsWithInteractions = combine(
  $posts,
  (posts) => posts
);

export const $unreadPostsCount = createStore<number>(0);
export const $hasMorePosts = $postsPagination.map(
  (pagination) => pagination.has_next
);

// Handle posts loading
sample({
  clock: postsRequested,
  target: fetchPostsFx,
});

// Update posts on successful fetch
sample({
  clock: fetchPostsFx.doneData,
  source: $posts,
  fn: (currentPosts, response) => {
    // If it's the first page, replace all posts
    if (response.pagination.page === 1) {
      return response.data;
    }
    // Otherwise, append new posts
    return [...currentPosts, ...response.data];
  },
  target: $posts,
});

// Update pagination
sample({
  clock: fetchPostsFx.doneData,
  fn: (response) => response.pagination,
  target: $postsPagination,
});

// Handle post creation
sample({
  clock: postCreated,
  target: createPostFx,
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
});

sample({
  clock: postUnliked,
  target: unlikePostFx,
});

sample({
  clock: postReposted,
  target: repostFx,
});

// Update post state after successful like
sample({
  clock: likePostFx.done,
  source: $posts,
  fn: (posts, { params: postId }) =>
    posts.map((post) =>
      post.id === postId
        ? {
            ...post,
            is_liked: true,
            likes_count: post.likes_count + 1,
          }
        : post
    ),
  target: $posts,
});

// Update post state after successful unlike
sample({
  clock: unlikePostFx.done,
  source: $posts,
  fn: (posts, { params: postId }) =>
    posts.map((post) =>
      post.id === postId
        ? {
            ...post,
            is_liked: false,
            likes_count: Math.max(0, post.likes_count - 1),
          }
        : post
    ),
  target: $posts,
});

// Update post state after successful repost
sample({
  clock: repostFx.done,
  source: $posts,
  fn: (posts, { params: postId }) =>
    posts.map((post) =>
      post.id === postId
        ? {
            ...post,
            is_reposted: true,
            reposts_count: post.reposts_count + 1,
          }
        : post
    ),
  target: $posts,
});

// Handle post deletion
sample({
  clock: postDeleted,
  target: deletePostFx,
});

sample({
  clock: deletePostFx.done,
  source: $posts,
  fn: (posts, { params: postId }) => posts.filter((post) => post.id !== postId),
  target: $posts,
});

// Handle post selection
sample({
  clock: postSelected,
  target: $selectedPost,
});

// Handle post modal
sample({
  clock: postModalOpened,
  fn: () => true,
  target: $postModalOpen,
});

sample({
  clock: postModalOpened,
  target: $postModalData,
});

sample({
  clock: postModalClosed,
  fn: () => false,
  target: $postModalOpen,
});

sample({
  clock: postModalClosed,
  fn: () => null,
  target: $postModalData,
});

// Error handling
sample({
  clock: [
    fetchPostsFx.failData,
    createPostFx.failData,
    likePostFx.failData,
    deletePostFx.failData,
  ],
  fn: (error) => error.message,
  target: $postsError,
});

// Clear errors on new requests
sample({
  clock: [postsRequested, postCreated, postLiked],
  fn: () => null,
  target: $postsError,
});