'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type {
	Circle,
	CreateCircleRequest,
	UpdateCircleRequest,
	PaginatedResponse,
} from '../api/types';
import * as circlesApi from '../api/circles';

// ===== QUERY KEYS =====

export const circlesKeys = {
	all: ['circles'] as const,
	lists: () => [...circlesKeys.all, 'list'] as const,
	list: (filters: Record<string, unknown>) => [...circlesKeys.lists(), { filters }] as const,
	details: () => [...circlesKeys.all, 'detail'] as const,
	detail: (id: string) => [...circlesKeys.details(), id] as const,
	search: (query: string, filters?: Record<string, unknown>) =>
		[...circlesKeys.all, 'search', query, filters] as const,
};

// ===== BASIC QUERIES =====

export function useCirclesQuery(params?: {
	page?: number;
	limit?: number;
	search?: string;
	privacy?: 'public' | 'private' | 'all';
}) {
	return useQuery({
		queryKey: circlesKeys.list(params || {}),
		queryFn: () => circlesApi.getCircles(params),
		staleTime: 5 * 60 * 1000, // 5 минут
		gcTime: 10 * 60 * 1000, // 10 минут
	});
}

export function useCircleQuery(id: string, enabled = true) {
	return useQuery({
		queryKey: circlesKeys.detail(id),
		queryFn: () => circlesApi.getCircle(id),
		enabled: !!id && enabled,
		staleTime: 2 * 60 * 1000, // 2 минуты
		gcTime: 5 * 60 * 1000, // 5 минут
	});
}

export function useSearchCirclesQuery(
	query: string,
	filters?: {
		privacy?: 'public' | 'private';
		memberCount?: { min?: number; max?: number };
	},
	enabled = true
) {
	return useQuery({
		queryKey: circlesKeys.search(query, filters),
		queryFn: () => circlesApi.searchCircles(query, filters),
		enabled: !!query && enabled,
		staleTime: 1 * 60 * 1000, // 1 минута
		gcTime: 3 * 60 * 1000, // 3 минуты
	});
}

// ===== MUTATIONS =====

export function useCreateCircleMutation() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: (data: CreateCircleRequest) => circlesApi.createCircle(data),
		onSuccess: (newCircle) => {
			// Обновляем кэш списка кругов
			queryClient.invalidateQueries({ queryKey: circlesKeys.lists() });

			// Добавляем новый круг в детальный кэш
			queryClient.setQueryData(circlesKeys.detail(newCircle.id), newCircle);
		},
	});
}

export function useUpdateCircleMutation() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: ({ id, data }: { id: string; data: UpdateCircleRequest }) =>
			circlesApi.updateCircle(id, data),
		onSuccess: (updatedCircle) => {
			// Обновляем детальный кэш
			queryClient.setQueryData(circlesKeys.detail(updatedCircle.id), updatedCircle);

			// Обновляем списки
			queryClient.invalidateQueries({ queryKey: circlesKeys.lists() });
		},
	});
}

export function useDeleteCircleMutation() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: (id: string) => circlesApi.deleteCircle(id),
		onSuccess: (_result, deletedId) => {
			// Удаляем из детального кэша
			queryClient.removeQueries({ queryKey: circlesKeys.detail(deletedId) });

			// Обновляем списки
			queryClient.invalidateQueries({ queryKey: circlesKeys.lists() });
		},
	});
}

// ===== MEMBERSHIP MUTATIONS =====

export function useJoinCircleMutation() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: (circleId: string) => circlesApi.joinCircle(circleId),
		onSuccess: (_result, circleId) => {
			// Обновляем детальную информацию о круге
			queryClient.invalidateQueries({ queryKey: circlesKeys.detail(circleId) });

			// Обновляем списки кругов
			queryClient.invalidateQueries({ queryKey: circlesKeys.lists() });

			// Обновляем участников круга
			queryClient.invalidateQueries({
				queryKey: ['circles', circleId, 'members']
			});
		},
	});
}

export function useLeaveCircleMutation() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: (circleId: string) => circlesApi.leaveCircle(circleId),
		onSuccess: (_result, circleId) => {
			// Обновляем детальную информацию о круге
			queryClient.invalidateQueries({ queryKey: circlesKeys.detail(circleId) });

			// Обновляем списки кругов
			queryClient.invalidateQueries({ queryKey: circlesKeys.lists() });

			// Обновляем участников круга
			queryClient.invalidateQueries({
				queryKey: ['circles', circleId, 'members']
			});
		},
	});
}

// ===== OPTIMISTIC UPDATES =====

export function useOptimisticCircleUpdate() {
	const queryClient = useQueryClient();

	const updateCircleOptimistically = (
		circleId: string,
		updates: Partial<Circle>
	) => {
		// Сохраняем предыдущее состояние для отката
		const previousCircle = queryClient.getQueryData<Circle>(
			circlesKeys.detail(circleId)
		);

		if (previousCircle) {
			// Применяем оптимистичное обновление
			queryClient.setQueryData(
				circlesKeys.detail(circleId),
				{ ...previousCircle, ...updates }
			);
		}

		return { previousCircle };
	};

	const rollbackCircleUpdate = (
		circleId: string,
		previousCircle: Circle | undefined
	) => {
		if (previousCircle) {
			queryClient.setQueryData(circlesKeys.detail(circleId), previousCircle);
		}
	};

	return {
		updateCircleOptimistically,
		rollbackCircleUpdate,
	};
}

// ===== PREFETCHING =====

export function usePrefetchCircle() {
	const queryClient = useQueryClient();

	return (circleId: string) => {
		queryClient.prefetchQuery({
			queryKey: circlesKeys.detail(circleId),
			queryFn: () => circlesApi.getCircle(circleId),
			staleTime: 2 * 60 * 1000, // 2 минуты
		});
	};
}

export function usePrefetchCircles() {
	const queryClient = useQueryClient();

	return (params?: {
		page?: number;
		limit?: number;
		search?: string;
		privacy?: 'public' | 'private' | 'all';
	}) => {
		queryClient.prefetchQuery({
			queryKey: circlesKeys.list(params || {}),
			queryFn: () => circlesApi.getCircles(params),
			staleTime: 5 * 60 * 1000, // 5 минут
		});
	};
}

// ===== INFINITE QUERIES =====

export function useInfiniteCirclesQuery(params?: {
	limit?: number;
	search?: string;
	privacy?: 'public' | 'private' | 'all';
}) {
	return useQuery({
		queryKey: [...circlesKeys.lists(), 'infinite', params],
		queryFn: async ({ pageParam = 1 }) => {
			return circlesApi.getCircles({
				...params,
				page: pageParam as number
			});
		},
		getNextPageParam: (lastPage: PaginatedResponse<Circle>) => {
			const currentPage = lastPage.page;
			const totalPages = Math.ceil(lastPage.total / lastPage.limit);
			return currentPage < totalPages ? currentPage + 1 : undefined;
		},
		staleTime: 5 * 60 * 1000, // 5 минут
		gcTime: 10 * 60 * 1000, // 10 минут
	});
}

// ===== CUSTOM HOOKS FOR COMMON PATTERNS =====

export function useMyCircles() {
	return useCirclesQuery({ privacy: 'all' });
}

export function usePublicCircles() {
	return useCirclesQuery({ privacy: 'public' });
}

export function useCircleWithMembers(circleId: string) {
	const circleQuery = useCircleQuery(circleId);
	const membersQuery = useQuery({
		queryKey: ['circles', circleId, 'members'],
		queryFn: () => circlesApi.getCircleMembers(circleId),
		enabled: !!circleId,
	});

	return {
		circle: circleQuery.data,
		members: membersQuery.data,
		isLoading: circleQuery.isLoading || membersQuery.isLoading,
		error: circleQuery.error || membersQuery.error,
	};
}