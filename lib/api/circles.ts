import { apiRequest } from '@/lib/api/client';

export type Circle = {
	id: string;
	name: string;
	description: string | null;
	isPrivate: boolean;
	memberCount: number;
	createdAt: string;
	createdBy: string;
};

export type CirclesResponse = {
	items: Circle[];
	total: number;
	page: number;
	limit: number;
};

export async function fetchCircles(params?: {
	page?: number;
	limit?: number;
}): Promise<CirclesResponse> {
	const searchParams = new URLSearchParams();
	if (params?.page) searchParams.append('page', String(params.page));
	if (params?.limit) searchParams.append('limit', String(params.limit));
	const query = searchParams.toString();
	const path = query ? `/circles/?${query}` : '/circles/';
	return apiRequest<CirclesResponse>(path);
}
