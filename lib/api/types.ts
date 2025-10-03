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
