'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type {
	CircleMember,
	CircleRole,
	PaginatedResponse,
} from '../api/types';
import * as circlesApi from '../api/circles';

// ===== QUERY KEYS =====

export const circleMembersKeys = {
	all: ['circleMembers'] as const,
	circle: (circleId: string) => [...circleMembersKeys.all, circleId] as const,
	list: (circleId: string, filters: Record<string, unknown>) =>
		[...circleMembersKeys.circle(circleId), 'list', { filters }] as const,
};

// ===== QUERIES =====

export function useCircleMembersQuery(
	circleId: string,
	params?: { page?: number; limit?: number; role?: CircleRole },
	enabled = true
) {
	return useQuery({
		queryKey: circleMembersKeys.list(circleId, params || {}),
		queryFn: () => circlesApi.getCircleMembers(circleId, params),
		enabled: !!circleId && enabled,
		staleTime: 2 * 60 * 1000, // 2 минуты
		gcTime: 5 * 60 * 1000, // 5 минут
	});
}

// ===== MUTATIONS =====

export function useUpdateMemberRoleMutation() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: ({
			circleId,
			userId,
			role,
		}: {
			circleId: string;
			userId: string;
			role: CircleRole;
		}) => circlesApi.updateMemberRole(circleId, userId, role),
		onSuccess: (_result, { circleId }) => {
			// Обновляем список участников
			queryClient.invalidateQueries({
				queryKey: circleMembersKeys.circle(circleId),
			});

			// Обновляем детальную информацию о круге
			queryClient.invalidateQueries({
				queryKey: ['circles', 'detail', circleId],
			});
		},
	});
}

export function useRemoveMemberMutation() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: ({ circleId, userId }: { circleId: string; userId: string }) =>
			circlesApi.removeMember(circleId, userId),
		onMutate: async ({ circleId, userId }) => {
			// Отменяем любые исходящие запросы для участников
			await queryClient.cancelQueries({
				queryKey: circleMembersKeys.circle(circleId),
			});

			// Получаем предыдущие данные
			const previousMembers = queryClient.getQueriesData({
				queryKey: circleMembersKeys.circle(circleId),
			});

			// Оптимистично удаляем участника
			queryClient.setQueriesData(
				{ queryKey: circleMembersKeys.circle(circleId) },
				(old: PaginatedResponse<CircleMember> | undefined) => {
					if (!old) return old;
					return {
						...old,
						items: old.items.filter((member) => member.userId !== userId),
						total: old.total - 1,
					};
				}
			);

			return { previousMembers };
		},
		onError: (_error, _variables, context) => {
			// Откатываем изменения при ошибке
			if (context?.previousMembers) {
				context.previousMembers.forEach(([queryKey, data]) => {
					queryClient.setQueryData(queryKey, data);
				});
			}
		},
		onSettled: (_result, _error, { circleId }) => {
			// Обновляем кэш после завершения
			queryClient.invalidateQueries({
				queryKey: circleMembersKeys.circle(circleId),
			});

			// Обновляем детальную информацию о круге
			queryClient.invalidateQueries({
				queryKey: ['circles', 'detail', circleId],
			});
		},
	});
}

// ===== CUSTOM HOOKS =====

export function useCircleAdmins(circleId: string) {
	return useCircleMembersQuery(circleId, { role: 'admin' });
}

export function useCircleModerators(circleId: string) {
	return useCircleMembersQuery(circleId, { role: 'moderator' });
}

export function useCircleOwners(circleId: string) {
	return useCircleMembersQuery(circleId, { role: 'owner' });
}

export function useCanModerate(circleId: string, userId?: string) {
	const { data: members } = useCircleMembersQuery(circleId);

	if (!userId || !members) return false;

	const userMember = members.items.find((member) => member.userId === userId);
	if (!userMember) return false;

	return ['owner', 'admin', 'moderator'].includes(userMember.role);
}

export function useCanManageMembers(circleId: string, userId?: string) {
	const { data: members } = useCircleMembersQuery(circleId);

	if (!userId || !members) return false;

	const userMember = members.items.find((member) => member.userId === userId);
	if (!userMember) return false;

	return ['owner', 'admin'].includes(userMember.role);
}

export function useUserRole(circleId: string, userId?: string): CircleRole | null {
	const { data: members } = useCircleMembersQuery(circleId);

	if (!userId || !members) return null;

	const userMember = members.items.find((member) => member.userId === userId);
	return userMember?.role || null;
}

// ===== PREFETCHING =====

export function usePrefetchCircleMembers() {
	const queryClient = useQueryClient();

	return (
		circleId: string,
		params?: { page?: number; limit?: number; role?: CircleRole }
	) => {
		queryClient.prefetchQuery({
			queryKey: circleMembersKeys.list(circleId, params || {}),
			queryFn: () => circlesApi.getCircleMembers(circleId, params),
			staleTime: 2 * 60 * 1000, // 2 минуты
		});
	};
}