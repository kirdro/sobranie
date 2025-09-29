import { createEffect } from 'effector';
import type {
  Post,
  CreatePostData,
  PostsFilter,
  PaginatedResponse,
  ApiResponse
} from '../types';

const API_BASE_URL = 'https://api.sobranie.yaropolk.tech';

// Get authorization token from localStorage (will be replaced with store later)
const getAuthToken = (): string | null => {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('accessToken');
};

export const fetchPostsFx = createEffect<
  { page?: number; limit?: number; filter?: PostsFilter },
  PaginatedResponse<Post>
>(
  async ({ page = 1, limit = 20, filter }) => {
    const token = getAuthToken();
    const queryParams = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
    });

    if (filter) {
      Object.entries(filter).forEach(([key, value]) => {
        if (value !== undefined) {
          queryParams.append(key, value.toString());
        }
      });
    }

    const response = await fetch(`${API_BASE_URL}/posts?${queryParams}`, {
      headers: {
        'Content-Type': 'application/json',
        ...(token && { 'Authorization': `Bearer ${token}` }),
      },
    });

    if (!response.ok) {
      throw new Error(`Fetch posts failed: ${response.statusText}`);
    }

    const result: PaginatedResponse<Post> = await response.json();
    return result;
  }
);

export const createPostFx = createEffect<CreatePostData, Post>(
  async (postData) => {
    const token = getAuthToken();

    if (!token) {
      throw new Error('Authentication required');
    }

    const response = await fetch(`${API_BASE_URL}/posts`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(postData),
    });

    if (!response.ok) {
      throw new Error(`Create post failed: ${response.statusText}`);
    }

    const result: ApiResponse<Post> = await response.json();

    if (!result.success) {
      throw new Error(result.message || 'Failed to create post');
    }

    return result.data;
  }
);

export const likePostFx = createEffect<string, void>(
  async (postId) => {
    const token = getAuthToken();

    if (!token) {
      throw new Error('Authentication required');
    }

    const response = await fetch(`${API_BASE_URL}/posts/${postId}/like`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Like post failed: ${response.statusText}`);
    }
  }
);

export const unlikePostFx = createEffect<string, void>(
  async (postId) => {
    const token = getAuthToken();

    if (!token) {
      throw new Error('Authentication required');
    }

    const response = await fetch(`${API_BASE_URL}/posts/${postId}/like`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Unlike post failed: ${response.statusText}`);
    }
  }
);

export const repostFx = createEffect<string, void>(
  async (postId) => {
    const token = getAuthToken();

    if (!token) {
      throw new Error('Authentication required');
    }

    const response = await fetch(`${API_BASE_URL}/posts/${postId}/repost`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Repost failed: ${response.statusText}`);
    }
  }
);

export const deletePostFx = createEffect<string, void>(
  async (postId) => {
    const token = getAuthToken();

    if (!token) {
      throw new Error('Authentication required');
    }

    const response = await fetch(`${API_BASE_URL}/posts/${postId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Delete post failed: ${response.statusText}`);
    }
  }
);