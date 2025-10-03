import { authenticatedRequest } from './client-api';
import type { Post, PostsResponse } from './types';

export const clientApiEffector = {
	async get<T>(url: string): Promise<T> {
		return authenticatedRequest<T>(url);
	},

	async post<T>(url: string, data?: any): Promise<T> {
		return authenticatedRequest<T>(url, {
			method: 'POST',
			body: data,
		});
	},

	async delete<T>(url: string): Promise<T> {
		return authenticatedRequest<T>(url, {
			method: 'DELETE',
		});
	},

	async put<T>(url: string, data?: any): Promise<T> {
		return authenticatedRequest<T>(url, {
			method: 'PUT',
			body: data,
		});
	},
};

export const postsApi = {
	async fetchPosts(params?: { page?: number; limit?: number }): Promise<PostsResponse> {
		const query = new URLSearchParams();
		if (params?.page) query.set('page', params.page.toString());
		if (params?.limit) query.set('limit', params.limit.toString());

		const queryString = query.toString();
		const url = queryString ? `/posts/${queryString ? '?' + queryString : ''}` : '/posts/';

		try {
			// Внешний API возвращает {items: [...], total: number, page: number, limit: number}
			const response = await clientApiEffector.get<{
				items: Post[];
				total: number;
				page: number;
				limit: number;
			}>(url);

			// Адаптируем под наш PostsResponse формат
			return {
				data: response.items,
				pagination: {
					page: response.page,
					limit: response.limit,
					total: response.total,
					has_next: response.items.length === response.limit,
					has_prev: response.page > 1,
				},
			};
		} catch (error) {
			console.error('External API error, using fallback:', error);
			// Возвращаем пустой результат если внешний API недоступен
			return {
				data: [],
				pagination: {
					page: params?.page || 1,
					limit: params?.limit || 10,
					total: 0,
					has_next: false,
					has_prev: false,
				},
			};
		}
	},

	async createPost(params: {
		content: string;
		visibility?: 'public' | 'private' | 'friends';
		tags?: string[];
	}): Promise<Post> {
		try {
			// Получаем ID пользователя через auth/me
			const authResponse = await clientApiEffector.get<{id: string}>('/auth/me');

			const payload = {
				authorId: authResponse.id,
				content: params.content,
				tags: params.tags || [],
			};
			return clientApiEffector.post<Post>('/posts/', payload);
		} catch (error) {
			console.error('External API create post error:', error);
			// Fallback - создаем мок пост
			return {
				id: Date.now().toString(),
				authorId: 'current_user',
				content: params.content,
				created_at: new Date().toISOString(),
				createdAt: new Date().toISOString(),
				likes_count: 0,
				reposts_count: 0,
				comments_count: 0,
				is_liked: false,
				is_reposted: false,
				visibility: params.visibility || 'public',
				tags: params.tags || [],
			};
		}
	},

	async deletePost(postId: string): Promise<void> {
		return clientApiEffector.delete(`/posts/${postId}`);
	},

	async likePost(postId: string): Promise<void> {
		return clientApiEffector.post(`/posts/${postId}/like`);
	},

	async unlikePost(postId: string): Promise<void> {
		return clientApiEffector.delete(`/posts/${postId}/like`);
	},

	async repost(postId: string): Promise<void> {
		return clientApiEffector.post(`/posts/${postId}/repost`);
	},

	async unrepost(postId: string): Promise<void> {
		return clientApiEffector.delete(`/posts/${postId}/repost`);
	},

	async editPost(postId: string, params: { content: string; tags: string[] }): Promise<Post> {
		return clientApiEffector.put<Post>(`/posts/${postId}`, params);
	},
};