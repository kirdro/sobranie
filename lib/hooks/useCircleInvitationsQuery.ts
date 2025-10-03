'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type {
	CircleInvitation,
	CircleJoinRequest,
	SendInvitationRequest,
	CreateJoinRequestRequest,
} from '../api/types';
import * as circlesApi from '../api/circles';

// ===== QUERY KEYS =====

export const invitationsKeys = {
	all: ['invitations'] as const,
	circle: (circleId: string) => [...invitationsKeys.all, circleId] as const,
};

export const joinRequestsKeys = {
	all: ['joinRequests'] as const,
	circle: (circleId: string) => [...joinRequestsKeys.all, circleId] as const,
};

// ===== INVITATIONS QUERIES =====

export function useCircleInvitationsQuery(circleId: string, enabled = true) {
	return useQuery({
		queryKey: invitationsKeys.circle(circleId),
		queryFn: () => circlesApi.getCircleInvitations(circleId),
		enabled: !!circleId && enabled,
		staleTime: 1 * 60 * 1000, // 1 минута
		gcTime: 3 * 60 * 1000, // 3 минуты
	});
}

// ===== JOIN REQUESTS QUERIES =====

export function useJoinRequestsQuery(circleId: string, enabled = true) {
	return useQuery({
		queryKey: joinRequestsKeys.circle(circleId),
		queryFn: () => circlesApi.getJoinRequests(circleId),
		enabled: !!circleId && enabled,
		staleTime: 1 * 60 * 1000, // 1 минута
		gcTime: 3 * 60 * 1000, // 3 минуты
	});
}

// ===== INVITATION MUTATIONS =====

export function useSendInvitationMutation() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: (data: SendInvitationRequest) => circlesApi.sendInvitation(data),
		onSuccess: (newInvitation) => {
			// Обновляем список приглашений
			queryClient.setQueryData<CircleInvitation[]>(
				invitationsKeys.circle(newInvitation.circleId),
				(old) => {
					if (!old) return [newInvitation];
					return [newInvitation, ...old];
				}
			);

			// Обновляем участников круга (возможно пригласили нового)
			queryClient.invalidateQueries({
				queryKey: ['circleMembers', newInvitation.circleId],
			});
		},
	});
}

export function useAcceptInvitationMutation() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: (invitationId: string) => circlesApi.acceptInvitation(invitationId),
		onMutate: async (invitationId) => {
			// Отменяем исходящие запросы
			await queryClient.cancelQueries({
				queryKey: invitationsKeys.all,
			});

			// Получаем предыдущие данные
			const previousInvitations = queryClient.getQueriesData({
				queryKey: invitationsKeys.all,
			});

			// Оптимистично обновляем статус приглашения
			queryClient.setQueriesData(
				{ queryKey: invitationsKeys.all },
				(old: CircleInvitation[] | undefined) => {
					if (!old) return old;
					return old.map((invitation) =>
						invitation.id === invitationId
							? { ...invitation, status: 'accepted' as const }
							: invitation
					);
				}
			);

			return { previousInvitations };
		},
		onError: (_error, _invitationId, context) => {
			// Откатываем изменения при ошибке
			if (context?.previousInvitations) {
				context.previousInvitations.forEach(([queryKey, data]) => {
					queryClient.setQueryData(queryKey, data);
				});
			}
		},
		onSettled: () => {
			// Обновляем все связанные кэши
			queryClient.invalidateQueries({ queryKey: invitationsKeys.all });
			queryClient.invalidateQueries({ queryKey: ['circleMembers'] });
			queryClient.invalidateQueries({ queryKey: ['circles'] });
		},
	});
}

export function useDeclineInvitationMutation() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: (invitationId: string) => circlesApi.declineInvitation(invitationId),
		onMutate: async (invitationId) => {
			// Отменяем исходящие запросы
			await queryClient.cancelQueries({
				queryKey: invitationsKeys.all,
			});

			// Получаем предыдущие данные
			const previousInvitations = queryClient.getQueriesData({
				queryKey: invitationsKeys.all,
			});

			// Оптимистично обновляем статус приглашения
			queryClient.setQueriesData(
				{ queryKey: invitationsKeys.all },
				(old: CircleInvitation[] | undefined) => {
					if (!old) return old;
					return old.map((invitation) =>
						invitation.id === invitationId
							? { ...invitation, status: 'declined' as const }
							: invitation
					);
				}
			);

			return { previousInvitations };
		},
		onError: (_error, _invitationId, context) => {
			// Откатываем изменения при ошибке
			if (context?.previousInvitations) {
				context.previousInvitations.forEach(([queryKey, data]) => {
					queryClient.setQueryData(queryKey, data);
				});
			}
		},
		onSettled: () => {
			// Обновляем все связанные кэши
			queryClient.invalidateQueries({ queryKey: invitationsKeys.all });
		},
	});
}

// ===== JOIN REQUEST MUTATIONS =====

export function useCreateJoinRequestMutation() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: (data: CreateJoinRequestRequest) => circlesApi.createJoinRequest(data),
		onSuccess: (newRequest) => {
			// Добавляем новый запрос в кэш
			queryClient.setQueryData<CircleJoinRequest[]>(
				joinRequestsKeys.circle(newRequest.circleId),
				(old) => {
					if (!old) return [newRequest];
					return [newRequest, ...old];
				}
			);
		},
	});
}

export function useApproveJoinRequestMutation() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: (requestId: string) => circlesApi.approveJoinRequest(requestId),
		onMutate: async (requestId) => {
			// Отменяем исходящие запросы
			await queryClient.cancelQueries({
				queryKey: joinRequestsKeys.all,
			});

			// Получаем предыдущие данные
			const previousRequests = queryClient.getQueriesData({
				queryKey: joinRequestsKeys.all,
			});

			// Оптимистично обновляем статус заявки
			queryClient.setQueriesData(
				{ queryKey: joinRequestsKeys.all },
				(old: CircleJoinRequest[] | undefined) => {
					if (!old) return old;
					return old.map((request) =>
						request.id === requestId
							? { ...request, status: 'approved' as const }
							: request
					);
				}
			);

			return { previousRequests };
		},
		onError: (_error, _requestId, context) => {
			// Откатываем изменения при ошибке
			if (context?.previousRequests) {
				context.previousRequests.forEach(([queryKey, data]) => {
					queryClient.setQueryData(queryKey, data);
				});
			}
		},
		onSettled: () => {
			// Обновляем все связанные кэши
			queryClient.invalidateQueries({ queryKey: joinRequestsKeys.all });
			queryClient.invalidateQueries({ queryKey: ['circleMembers'] });
			queryClient.invalidateQueries({ queryKey: ['circles'] });
		},
	});
}

export function useRejectJoinRequestMutation() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: (requestId: string) => circlesApi.rejectJoinRequest(requestId),
		onMutate: async (requestId) => {
			// Отменяем исходящие запросы
			await queryClient.cancelQueries({
				queryKey: joinRequestsKeys.all,
			});

			// Получаем предыдущие данные
			const previousRequests = queryClient.getQueriesData({
				queryKey: joinRequestsKeys.all,
			});

			// Оптимистично обновляем статус заявки
			queryClient.setQueriesData(
				{ queryKey: joinRequestsKeys.all },
				(old: CircleJoinRequest[] | undefined) => {
					if (!old) return old;
					return old.map((request) =>
						request.id === requestId
							? { ...request, status: 'rejected' as const }
							: request
					);
				}
			);

			return { previousRequests };
		},
		onError: (_error, _requestId, context) => {
			// Откатываем изменения при ошибке
			if (context?.previousRequests) {
				context.previousRequests.forEach(([queryKey, data]) => {
					queryClient.setQueryData(queryKey, data);
				});
			}
		},
		onSettled: () => {
			// Обновляем все связанные кэши
			queryClient.invalidateQueries({ queryKey: joinRequestsKeys.all });
		},
	});
}

// ===== CUSTOM HOOKS =====

export function usePendingInvitations(circleId: string) {
	const { data: invitations, ...rest } = useCircleInvitationsQuery(circleId);

	const pendingInvitations = invitations?.filter(
		(invitation) => invitation.status === 'pending'
	) || [];

	return {
		data: pendingInvitations,
		count: pendingInvitations.length,
		...rest,
	};
}

export function usePendingJoinRequests(circleId: string) {
	const { data: requests, ...rest } = useJoinRequestsQuery(circleId);

	const pendingRequests = requests?.filter(
		(request) => request.status === 'pending'
	) || [];

	return {
		data: pendingRequests,
		count: pendingRequests.length,
		...rest,
	};
}

export function useHasPendingInvitation(circleId: string, userId?: string) {
	const { data: invitations } = useCircleInvitationsQuery(circleId);

	if (!userId || !invitations) return false;

	return invitations.some(
		(invitation) =>
			invitation.inviteeId === userId &&
			invitation.status === 'pending'
	);
}

export function useHasPendingJoinRequest(circleId: string, userId?: string) {
	const { data: requests } = useJoinRequestsQuery(circleId);

	if (!userId || !requests) return false;

	return requests.some(
		(request) =>
			request.userId === userId &&
			request.status === 'pending'
	);
}