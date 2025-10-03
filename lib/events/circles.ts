import { createEvent } from 'effector';
import type {
	Circle,
	CreateCircleRequest,
	UpdateCircleRequest,
	CircleRole,
	SendInvitationRequest,
	CreateJoinRequestRequest,
	CreateEventRequest,
	UpdateEventRequest,
	CreateReportRequest,
	UploadFileRequest,
} from '../api/types';

// ===== BASIC CIRCLE EVENTS =====
export const circlesRequested = createEvent<{
	page?: number;
	limit?: number;
	search?: string;
	privacy?: 'public' | 'private' | 'all';
}>();
export const circleSelected = createEvent<Circle | null>();
export const circleCreated = createEvent<CreateCircleRequest>();
export const circleUpdated = createEvent<{
	id: string;
	data: UpdateCircleRequest;
}>();
export const circleDeleted = createEvent<string>();

// ===== MEMBERSHIP EVENTS =====
export const circleJoined = createEvent<string>();
export const circleLeft = createEvent<string>();
export const circleMembersRequested = createEvent<{
	circleId: string;
	page?: number;
	limit?: number;
	role?: CircleRole;
}>();
export const memberRoleUpdated = createEvent<{
	circleId: string;
	userId: string;
	role: CircleRole;
}>();
export const memberRemoved = createEvent<{
	circleId: string;
	userId: string;
}>();

// ===== INVITATION EVENTS =====
export const invitationsRequested = createEvent<string>(); // circleId
export const invitationSent = createEvent<SendInvitationRequest>();
export const invitationAccepted = createEvent<string>(); // invitationId
export const invitationDeclined = createEvent<string>(); // invitationId

// ===== JOIN REQUEST EVENTS =====
export const joinRequestsRequested = createEvent<string>(); // circleId
export const joinRequestCreated = createEvent<CreateJoinRequestRequest>();
export const joinRequestApproved = createEvent<string>(); // requestId
export const joinRequestRejected = createEvent<string>(); // requestId

// ===== CIRCLE EVENTS (MEETINGS/ACTIVITIES) =====
export const circleEventsRequested = createEvent<{
	circleId: string;
	page?: number;
	limit?: number;
	status?: 'upcoming' | 'past' | 'all';
}>();
export const circleEventCreated = createEvent<CreateEventRequest>();
export const circleEventUpdated = createEvent<{
	eventId: string;
	data: UpdateEventRequest;
}>();
export const circleEventDeleted = createEvent<string>(); // eventId
export const eventJoined = createEvent<string>(); // eventId
export const eventLeft = createEvent<string>(); // eventId
export const eventAttendeesRequested = createEvent<string>(); // eventId

// ===== MODERATION EVENTS =====
export const reportCreated = createEvent<CreateReportRequest>();
export const circleReportsRequested = createEvent<string>(); // circleId
export const userBanned = createEvent<{
	circleId: string;
	userId: string;
	reason: string;
}>();
export const userUnbanned = createEvent<{
	circleId: string;
	userId: string;
}>();
export const circlePostDeleted = createEvent<{
	circleId: string;
	postId: string;
}>();

// ===== FILE STORAGE EVENTS =====
export const circleFilesRequested = createEvent<{
	circleId: string;
	page?: number;
	limit?: number;
	type?: string;
}>();
export const fileUploaded = createEvent<UploadFileRequest>();
export const fileDeleted = createEvent<{
	circleId: string;
	fileId: string;
}>();

// ===== PERMISSION EVENTS =====
export const permissionsRequested = createEvent<string>(); // circleId

// ===== SEARCH EVENTS =====
export const circlesSearchRequested = createEvent<{
	query: string;
	filters?: {
		privacy?: 'public' | 'private';
		memberCount?: { min?: number; max?: number };
	};
}>();

// ===== ERROR AND LOADING EVENTS =====
export const circleErrorOccurred = createEvent<string>();
export const circleErrorCleared = createEvent<void>();
