export * from './user';
export * from './post';
export * from './circle';
export * from './notification';

// Common API response types
export type ApiResponse<T> = {
	data: T;
	message?: string;
	success: boolean;
};

export type PaginatedResponse<T> = {
	data: T[];
	pagination: {
		page: number;
		limit: number;
		total: number;
		has_next: boolean;
		has_prev: boolean;
	};
};

export type ApiError = {
	message: string;
	code: string;
	details?: Record<string, any>;
};
