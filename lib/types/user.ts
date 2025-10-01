export type User = {
	id: string;
	email: string;
	name: string;
	avatar?: string;
	role: 'user' | 'admin' | 'moderator';
	created_at: string;
	updated_at: string;
};

export type UserProfile = {
	id: string;
	user_id: string;
	bio?: string;
	location?: string;
	website?: string;
	github?: string;
	twitter?: string;
	linkedin?: string;
	skills: string[];
	interests: string[];
};

export type AuthState = {
	isAuthenticated: boolean;
	user: User | null;
	token: string | null;
	refreshToken: string | null;
	expiresAt: number | null;
};

export type LoginCredentials = {
	email: string;
	password: string;
};

export type RegisterData = {
	email: string;
	password: string;
	name: string;
};

export type AuthResponse = {
	user: User;
	accessToken: string;
	refreshToken: string;
	expiresIn: number;
};
