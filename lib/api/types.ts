export type UserRole = "user" | "admin" | "moderator" | string;

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
  tokenType: "Bearer" | string;
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
  content: string;
  circleId?: string | null;
  attachments?: string[] | null;
  tags?: string[] | null;
  likesCount?: number;
  commentsCount?: number;
  createdAt: string;
  updatedAt?: string;
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

