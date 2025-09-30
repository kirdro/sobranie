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

// Simple cache for preventing duplicate requests
let pendingPostsRequest: Promise<PaginatedResponse<Post>> | null = null;
let lastPostsParams: string | null = null;

// Effect for initial posts loading without parameters
export const initPostsFx = createEffect<void, PaginatedResponse<Post>>(
  async () => {
    const queryParams = new URLSearchParams({
      page: '1',
      limit: '20',
    });

    try {
      const response = await fetch(`/api/posts?${queryParams}`, {
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || result.error || 'Fetch posts failed');
      }

      return result as PaginatedResponse<Post>;
    } catch (error) {
      throw error;
    }
  }
);

export const fetchPostsFx = createEffect<
  { page?: number; limit?: number; filter?: PostsFilter },
  PaginatedResponse<Post>
>(
  async ({ page = 1, limit = 20, filter }) => {
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

    const paramsString = queryParams.toString();

    // Return pending request if same params
    if (pendingPostsRequest && lastPostsParams === paramsString) {
      return pendingPostsRequest;
    }

    // Create new request
    const request = async (): Promise<PaginatedResponse<Post>> => {
      try {
        // Use internal API route instead of external API directly
        const response = await fetch(`/api/posts?${queryParams}`, {
          headers: {
            'Content-Type': 'application/json',
          },
        });

        const result = await response.json();

        if (!response.ok) {
          throw new Error(result.message || result.error || 'Fetch posts failed');
        }

        return result as PaginatedResponse<Post>;
      } finally {
        // Clear pending request when done
        pendingPostsRequest = null;
        lastPostsParams = null;
      }
    };

    pendingPostsRequest = request();
    lastPostsParams = paramsString;

    return pendingPostsRequest;
  }
);

export const createPostFx = createEffect<CreatePostData, Post>(
  async (postData) => {
    // Use internal API route instead of external API directly
    const response = await fetch('/api/posts', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(postData),
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.message || result.error || 'Failed to create post');
    }

    return result as Post;
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