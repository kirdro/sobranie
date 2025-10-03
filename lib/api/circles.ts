import { apiRequest } from './client';
import type {
	Circle,
	CircleMember,
	CreateCircleRequest,
	UpdateCircleRequest,
	CircleInvitation,
	CircleJoinRequest,
	SendInvitationRequest,
	CreateJoinRequestRequest,
	CircleEvent,
	CreateEventRequest,
	UpdateEventRequest,
	EventAttendee,
	ContentReport,
	CreateReportRequest,
	ModerationAction,
	CircleFile,
	UploadFileRequest,
	PaginatedResponse,
	CircleRole,
} from './types';
import { cookies } from 'next/headers';

async function getAuthToken(): Promise<string | null> {
	const cookieStore = cookies();
	return cookieStore.get('sobranie_token')?.value ?? null;
}

// ===== БАЗОВЫЕ ОПЕРАЦИИ С КРУГАМИ =====

export async function getCircles(params?: {
	page?: number;
	limit?: number;
	search?: string;
	privacy?: 'public' | 'private' | 'all';
}): Promise<PaginatedResponse<Circle>> {
	const searchParams = new URLSearchParams();
	if (params?.page) searchParams.set('page', params.page.toString());
	if (params?.limit) searchParams.set('limit', params.limit.toString());
	if (params?.search) searchParams.set('search', params.search);
	if (params?.privacy && params.privacy !== 'all') searchParams.set('privacy', params.privacy);

	const token = await getAuthToken();
	return apiRequest(`/circles/?${searchParams.toString()}`, { token });
}

// Оставляем старую функцию для обратной совместимости
export async function fetchCircles(params?: {
	page?: number;
	limit?: number;
}): Promise<PaginatedResponse<Circle>> {
	return getCircles(params);
}

export async function getCircle(id: string): Promise<Circle> {
	const token = await getAuthToken();
	return apiRequest(`/circles/${id}`, { token });
}

export async function createCircle(data: CreateCircleRequest): Promise<Circle> {
	const token = await getAuthToken();
	return apiRequest('/circles/', {
		method: 'POST',
		body: data,
		token,
	});
}

export async function updateCircle(id: string, data: UpdateCircleRequest): Promise<Circle> {
	const token = await getAuthToken();
	return apiRequest(`/circles/${id}`, {
		method: 'PUT',
		body: data,
		token,
	});
}

export async function deleteCircle(id: string): Promise<void> {
	const token = await getAuthToken();
	return apiRequest(`/circles/${id}`, {
		method: 'DELETE',
		token,
	});
}

// ===== УЧАСТНИКИ КРУГОВ =====

export async function getCircleMembers(
	circleId: string,
	params?: { page?: number; limit?: number; role?: CircleRole }
): Promise<PaginatedResponse<CircleMember>> {
	const searchParams = new URLSearchParams();
	if (params?.page) searchParams.set('page', params.page.toString());
	if (params?.limit) searchParams.set('limit', params.limit.toString());
	if (params?.role) searchParams.set('role', params.role);

	const token = await getAuthToken();
	return apiRequest(`/circles/${circleId}/members?${searchParams.toString()}`, { token });
}

export async function joinCircle(circleId: string): Promise<void> {
	const token = await getAuthToken();
	return apiRequest(`/circles/${circleId}/join`, {
		method: 'POST',
		token,
	});
}

export async function leaveCircle(circleId: string): Promise<void> {
	const token = await getAuthToken();
	return apiRequest(`/circles/${circleId}/leave`, {
		method: 'DELETE',
		token,
	});
}

export async function updateMemberRole(
	circleId: string,
	userId: string,
	role: CircleRole
): Promise<void> {
	const token = await getAuthToken();
	return apiRequest(`/circles/${circleId}/members/${userId}/role`, {
		method: 'PUT',
		body: { role },
		token,
	});
}

export async function removeMember(circleId: string, userId: string): Promise<void> {
	const token = await getAuthToken();
	return apiRequest(`/circles/${circleId}/members/${userId}`, {
		method: 'DELETE',
		token,
	});
}

// ===== ПРИГЛАШЕНИЯ =====

export async function getCircleInvitations(circleId: string): Promise<CircleInvitation[]> {
	const token = await getAuthToken();
	const response = await apiRequest<{ items: CircleInvitation[] }>(
		`/circles/${circleId}/invitations`,
		{ token }
	);
	return response.items;
}

export async function sendInvitation(data: SendInvitationRequest): Promise<CircleInvitation> {
	const token = await getAuthToken();
	return apiRequest('/invitations/', {
		method: 'POST',
		body: data,
		token,
	});
}

export async function acceptInvitation(invitationId: string): Promise<void> {
	const token = await getAuthToken();
	return apiRequest(`/invitations/${invitationId}/accept`, {
		method: 'POST',
		token,
	});
}

export async function declineInvitation(invitationId: string): Promise<void> {
	const token = await getAuthToken();
	return apiRequest(`/invitations/${invitationId}/decline`, {
		method: 'POST',
		token,
	});
}

// ===== ЗАЯВКИ НА ВСТУПЛЕНИЕ =====

export async function getJoinRequests(circleId: string): Promise<CircleJoinRequest[]> {
	const token = await getAuthToken();
	const response = await apiRequest<{ items: CircleJoinRequest[] }>(
		`/circles/${circleId}/requests`,
		{ token }
	);
	return response.items;
}

export async function createJoinRequest(data: CreateJoinRequestRequest): Promise<CircleJoinRequest> {
	const token = await getAuthToken();
	return apiRequest('/requests/', {
		method: 'POST',
		body: data,
		token,
	});
}

export async function approveJoinRequest(requestId: string): Promise<void> {
	const token = await getAuthToken();
	return apiRequest(`/requests/${requestId}/approve`, {
		method: 'POST',
		token,
	});
}

export async function rejectJoinRequest(requestId: string): Promise<void> {
	const token = await getAuthToken();
	return apiRequest(`/requests/${requestId}/reject`, {
		method: 'POST',
		token,
	});
}

// ===== СОБЫТИЯ В КРУГАХ =====

export async function getCircleEvents(
	circleId: string,
	params?: { page?: number; limit?: number; status?: 'upcoming' | 'past' | 'all' }
): Promise<PaginatedResponse<CircleEvent>> {
	const searchParams = new URLSearchParams();
	if (params?.page) searchParams.set('page', params.page.toString());
	if (params?.limit) searchParams.set('limit', params.limit.toString());
	if (params?.status && params.status !== 'all') searchParams.set('status', params.status);

	const token = await getAuthToken();
	return apiRequest(`/circles/${circleId}/events?${searchParams.toString()}`, { token });
}

export async function createEvent(data: CreateEventRequest): Promise<CircleEvent> {
	const token = await getAuthToken();
	return apiRequest('/events/', {
		method: 'POST',
		body: data,
		token,
	});
}

export async function updateEvent(eventId: string, data: UpdateEventRequest): Promise<CircleEvent> {
	const token = await getAuthToken();
	return apiRequest(`/events/${eventId}`, {
		method: 'PUT',
		body: data,
		token,
	});
}

export async function deleteEvent(eventId: string): Promise<void> {
	const token = await getAuthToken();
	return apiRequest(`/events/${eventId}`, {
		method: 'DELETE',
		token,
	});
}

export async function joinEvent(eventId: string): Promise<void> {
	const token = await getAuthToken();
	return apiRequest(`/events/${eventId}/join`, {
		method: 'POST',
		token,
	});
}

export async function leaveEvent(eventId: string): Promise<void> {
	const token = await getAuthToken();
	return apiRequest(`/events/${eventId}/leave`, {
		method: 'DELETE',
		token,
	});
}

export async function getEventAttendees(eventId: string): Promise<EventAttendee[]> {
	const token = await getAuthToken();
	const response = await apiRequest<{ items: EventAttendee[] }>(
		`/events/${eventId}/attendees`,
		{ token }
	);
	return response.items;
}

// ===== МОДЕРАЦИЯ =====

export async function createReport(data: CreateReportRequest): Promise<ContentReport> {
	const token = await getAuthToken();
	return apiRequest('/reports/', {
		method: 'POST',
		body: data,
		token,
	});
}

export async function getCircleReports(circleId: string): Promise<ContentReport[]> {
	const token = await getAuthToken();
	const response = await apiRequest<{ items: ContentReport[] }>(
		`/circles/${circleId}/reports`,
		{ token }
	);
	return response.items;
}

export async function banUser(circleId: string, userId: string, reason: string): Promise<ModerationAction> {
	const token = await getAuthToken();
	return apiRequest(`/circles/${circleId}/members/${userId}/ban`, {
		method: 'POST',
		body: { reason },
		token,
	});
}

export async function unbanUser(circleId: string, userId: string): Promise<void> {
	const token = await getAuthToken();
	return apiRequest(`/circles/${circleId}/members/${userId}/ban`, {
		method: 'DELETE',
		token,
	});
}

export async function deletePost(circleId: string, postId: string): Promise<void> {
	const token = await getAuthToken();
	return apiRequest(`/circles/${circleId}/posts/${postId}`, {
		method: 'DELETE',
		token,
	});
}

// ===== ФАЙЛОВОЕ ХРАНИЛИЩЕ =====

export async function getCircleFiles(
	circleId: string,
	params?: { page?: number; limit?: number; type?: string }
): Promise<PaginatedResponse<CircleFile>> {
	const searchParams = new URLSearchParams();
	if (params?.page) searchParams.set('page', params.page.toString());
	if (params?.limit) searchParams.set('limit', params.limit.toString());
	if (params?.type) searchParams.set('type', params.type);

	const token = await getAuthToken();
	return apiRequest(`/circles/${circleId}/files?${searchParams.toString()}`, { token });
}

export async function uploadFile(data: UploadFileRequest): Promise<CircleFile> {
	const token = await getAuthToken();
	const formData = new FormData();
	formData.append('file', data.file);
	formData.append('circleId', data.circleId);
	if (data.description) formData.append('description', data.description);
	if (data.tags) formData.append('tags', JSON.stringify(data.tags));
	if (data.permissions) formData.append('permissions', JSON.stringify(data.permissions));

	// Для FormData не устанавливаем Content-Type
	return apiRequest(`/circles/${data.circleId}/files`, {
		method: 'POST',
		body: formData,
		headers: {
			// Убираем Content-Type чтобы браузер установил boundary для FormData
		},
		token,
	});
}

export async function deleteFile(circleId: string, fileId: string): Promise<void> {
	const token = await getAuthToken();
	return apiRequest(`/circles/${circleId}/files/${fileId}`, {
		method: 'DELETE',
		token,
	});
}

// ===== ПРАВА ДОСТУПА =====

export async function getCirclePermissions(circleId: string): Promise<{
	canPost: boolean;
	canCreateEvents: boolean;
	canUploadFiles: boolean;
	canModerate: boolean;
	canInvite: boolean;
	canManageMembers: boolean;
	role: CircleRole;
}> {
	const token = await getAuthToken();
	return apiRequest(`/circles/${circleId}/permissions`, { token });
}

// ===== ПОИСК И ФИЛЬТРАЦИЯ =====

export async function searchCircles(query: string, filters?: {
	privacy?: 'public' | 'private';
	memberCount?: { min?: number; max?: number };
}): Promise<Circle[]> {
	const searchParams = new URLSearchParams();
	searchParams.set('q', query);
	if (filters?.privacy) searchParams.set('privacy', filters.privacy);
	if (filters?.memberCount?.min) searchParams.set('minMembers', filters.memberCount.min.toString());
	if (filters?.memberCount?.max) searchParams.set('maxMembers', filters.memberCount.max.toString());

	const token = await getAuthToken();
	const response = await apiRequest<{ items: Circle[] }>(
		`/circles/search?${searchParams.toString()}`,
		{ token }
	);
	return response.items;
}
