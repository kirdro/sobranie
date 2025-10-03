export type UserRole = 'user' | 'admin' | 'moderator' | string;

export type User = {
	id: string;
	email: string;
	firstName: string | null;
	lastName: string | null;
	role: UserRole;
	isActive?: boolean;
	createdAt?: string;
	updatedAt?: string;
	teamId?: string | null;
	avatarId?: string | null;
};

export type AuthSuccessResponse = {
	accessToken: string;
	tokenType: 'Bearer' | string;
	expiresIn: number;
	user: User;
};

export type AuthErrorResponse = {
	error: string;
	message: string;
};

export type PaginatedResponse<T> = {
	items: T[];
	total: number;
	page: number;
	limit: number;
};

export type NavigationLink = {
	id: string;
	title: string;
	url: string;
	icon: string | null;
	order: number;
	isExternal: boolean;
};

export type Post = {
	id: string;
	authorId: string;
	author?: {
		id: string;
		name: string;
		email: string;
		avatar?: string;
	};
	content: string;
	circleId?: string | null;
	attachments?: string[] | null;
	tags?: string[] | null;
	likes_count: number;
	reposts_count: number;
	comments_count: number;
	is_liked: boolean;
	is_reposted: boolean;
	visibility: 'public' | 'private' | 'friends';
	created_at: string;
	createdAt: string;
	updatedAt?: string;
};

export type PostsFilter = {
	sort_by: 'created_at' | 'updated_at' | 'likes_count';
	sort_order: 'asc' | 'desc';
	circle_id?: string;
	author_id?: string;
	tag?: string;
};

export type PostsPagination = {
	page: number;
	limit: number;
	total: number;
	has_next: boolean;
	has_prev?: boolean;
};

export type PostsResponse = {
	data: Post[];
	pagination?: PostsPagination;
};

export type Comment = {
	id: string;
	postId: string;
	authorId: string;
	content: string;
	createdAt: string;
	author?: User;
};

export type CommentsResponse = {
	data: Comment[];
	pagination?: PostsPagination;
};

export type Notification = {
	id: string;
	type: string;
	title: string;
	message: string;
	isRead: boolean;
	createdAt: string;
	relatedId?: string | null;
};

export type NotificationsResponse = {
	items: Notification[];
	total: number;
	unreadCount: number;
};

export type AssistantMode = {
	id: string;
	name: string;
	description: string;
	capabilities?: string[];
};

export type FeedLoop = {
	id: string;
	title: string;
	description: string;
	members: number;
	intensity: string;
	icon: 'spark' | 'users';
};

export type FeedAlert = {
	id: string;
	title: string;
	details: string;
	tone: 'purple' | 'teal';
};

export type BacklogItem = {
	id: string;
	title: string;
	owner: string;
	due: string;
	progress: number;
};

// ===== КРУГИ (CIRCLES) =====

export type CircleRole = 'owner' | 'admin' | 'moderator' | 'member';

export type CirclePrivacy = 'public' | 'private' | 'restricted';

export type Circle = {
	id: string;
	name: string;
	description: string;
	isPrivate: boolean;
	privacy: CirclePrivacy;
	memberCount: number;
	createdAt: string;
	updatedAt?: string;
	createdBy: string;
	avatarUrl?: string;
	coverUrl?: string;
	settings?: {
		allowPosts: boolean;
		allowEvents: boolean;
		allowFiles: boolean;
		moderateContent: boolean;
	};
};

export type CircleMember = {
	id: string;
	userId: string;
	circleId: string;
	role: CircleRole;
	joinedAt: string;
	user?: User;
};

export type CreateCircleRequest = {
	name: string;
	description: string;
	privacy: CirclePrivacy;
	settings?: {
		allowPosts?: boolean;
		allowEvents?: boolean;
		allowFiles?: boolean;
		moderateContent?: boolean;
	};
};

export type UpdateCircleRequest = Partial<CreateCircleRequest>;

// ===== ПРИГЛАШЕНИЯ И ЗАЯВКИ =====

export type CircleInvitation = {
	id: string;
	circleId: string;
	inviterId: string;
	inviteeId: string;
	inviteeEmail?: string;
	status: 'pending' | 'accepted' | 'declined' | 'expired';
	createdAt: string;
	expiresAt?: string;
	circle?: Circle;
	inviter?: User;
	invitee?: User;
};

export type CircleJoinRequest = {
	id: string;
	circleId: string;
	userId: string;
	status: 'pending' | 'approved' | 'rejected';
	message?: string;
	createdAt: string;
	circle?: Circle;
	user?: User;
};

export type SendInvitationRequest = {
	circleId: string;
	inviteeId?: string;
	inviteeEmail?: string;
	message?: string;
};

export type CreateJoinRequestRequest = {
	circleId: string;
	message?: string;
};

// ===== СОБЫТИЯ В КРУГАХ =====

export type CircleEvent = {
	id: string;
	circleId: string;
	creatorId: string;
	title: string;
	description: string;
	startDate: string;
	endDate?: string;
	location?: string;
	isOnline: boolean;
	maxAttendees?: number;
	currentAttendees: number;
	status: 'draft' | 'published' | 'cancelled' | 'completed';
	createdAt: string;
	updatedAt?: string;
	circle?: Circle;
	creator?: User;
};

export type EventAttendee = {
	id: string;
	eventId: string;
	userId: string;
	status: 'going' | 'maybe' | 'not_going';
	joinedAt: string;
	user?: User;
};

export type CreateEventRequest = {
	circleId: string;
	title: string;
	description: string;
	startDate: string;
	endDate?: string;
	location?: string;
	isOnline: boolean;
	maxAttendees?: number;
};

export type UpdateEventRequest = Partial<Omit<CreateEventRequest, 'circleId'>>;

// ===== МОДЕРАЦИЯ =====

export type ContentReport = {
	id: string;
	reporterId: string;
	contentType: 'post' | 'comment' | 'user' | 'event';
	contentId: string;
	reason: 'spam' | 'abuse' | 'inappropriate' | 'misinformation' | 'other';
	description?: string;
	status: 'pending' | 'reviewed' | 'resolved' | 'dismissed';
	createdAt: string;
	reviewedAt?: string;
	reviewedBy?: string;
	reporter?: User;
	reviewer?: User;
};

export type ModerationAction = {
	id: string;
	moderatorId: string;
	targetType: 'user' | 'post' | 'comment' | 'event';
	targetId: string;
	action: 'warn' | 'ban' | 'delete' | 'hide' | 'restrict';
	reason: string;
	duration?: number; // в часах
	createdAt: string;
	expiresAt?: string;
	moderator?: User;
};

export type CreateReportRequest = {
	contentType: 'post' | 'comment' | 'user' | 'event';
	contentId: string;
	reason: 'spam' | 'abuse' | 'inappropriate' | 'misinformation' | 'other';
	description?: string;
};

// ===== МЕДИАФАЙЛЫ =====

export type UploadResponse = {
	fileId: string;
	url: string;
	fileName: string;
	fileSize: number;
	mimeType: string;
	thumbnail?: string;
	dimensions?: {
		width: number;
		height: number;
	};
};

export type FileInfo = {
	id: string;
	originalName: string;
	url: string;
	thumbnailUrl?: string;
	size: number;
	type: string;
	mimeType: string;
	uploadedAt: string;
	uploadedBy: string;
	circleId?: string;
	postId?: string;
	dimensions?: {
		width: number;
		height: number;
	};
	metadata?: Record<string, unknown>;
};

export type MediaGalleryItem = {
	id: string;
	type: 'image' | 'video' | 'document';
	url: string;
	thumbnailUrl?: string;
	title?: string;
	description?: string;
	fileSize: number;
	uploadedAt: string;
	uploadedBy: string;
	circleId?: string;
	uploader?: User;
};

// ===== ФАЙЛОВОЕ ХРАНИЛИЩЕ =====

export type CircleFile = {
	id: string;
	circleId: string;
	uploadedBy: string;
	name: string;
	originalName: string;
	url: string;
	size: number;
	mimeType: string;
	type: 'document' | 'image' | 'video' | 'audio' | 'archive' | 'other';
	uploadedAt: string;
	lastAccessedAt?: string;
	downloadCount: number;
	description?: string;
	tags?: string[];
	permissions: {
		read: CircleRole[];
		write: CircleRole[];
		delete: CircleRole[];
	};
	uploader?: User;
};

export type UploadFileRequest = {
	circleId: string;
	file: File;
	description?: string;
	tags?: string[];
	permissions?: {
		read?: CircleRole[];
		write?: CircleRole[];
		delete?: CircleRole[];
	};
};

// ===== ОБНОВЛЕННЫЕ ТИПЫ ПОСТОВ С МЕДИА =====

export type PostAttachment = {
	id: string;
	type: 'image' | 'video' | 'document';
	url: string;
	thumbnailUrl?: string;
	fileName?: string;
	fileSize?: number;
	dimensions?: {
		width: number;
		height: number;
	};
};

// Обновляем существующий тип Post для поддержки новых attachments
export type PostWithMedia = Omit<Post, 'attachments'> & {
	attachments?: PostAttachment[];
};
