import { createEffect } from 'effector';
import type {
	LoginCredentials,
	RegisterData,
	AuthResponse,
	User,
} from '../types';

// Base API URL from environment
const API_BASE_URL = 'https://api.sobranie.yaropolk.tech';

// Authentication effects
export const loginFx = createEffect<LoginCredentials, AuthResponse>(
	async (credentials) => {
		// Use internal API route instead of external API directly
		const response = await fetch('/api/auth/login', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
			},
			body: JSON.stringify(credentials),
		});

		const result = await response.json();

		if (!response.ok) {
			// API returns {error: string, message: string} on error
			throw new Error(result.message || result.error || 'Login failed');
		}

		// Internal API returns AuthResponse directly
		return result as AuthResponse;
	},
);

export const registerFx = createEffect<RegisterData, AuthResponse>(
	async (data) => {
		// Use internal API route instead of external API directly
		const response = await fetch('/api/auth/register', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
			},
			body: JSON.stringify(data),
		});

		const result = await response.json();

		if (!response.ok) {
			// API returns {error: string, message: string} on error
			throw new Error(
				result.message || result.error || 'Registration failed',
			);
		}

		// Internal API returns AuthResponse directly
		return result as AuthResponse;
	},
);

export const fetchCurrentUserFx = createEffect<string, User>(async (token) => {
	const response = await fetch(`${API_BASE_URL}/auth/me`, {
		headers: {
			Authorization: `Bearer ${token}`,
			'Content-Type': 'application/json',
		},
	});

	const result = await response.json();

	if (!response.ok) {
		// API returns {error: string, message: string} on error
		throw new Error(
			result.message || result.error || 'Failed to fetch user',
		);
	}

	// Check if the response has the expected structure
	// API might return data directly or wrapped in {success: true, data: ...}
	if (result.success !== undefined) {
		// Wrapped response
		if (!result.success) {
			throw new Error(result.message || 'Failed to fetch user');
		}
		return result.data as User;
	}

	// Direct response - assume it's the User
	return result as User;
});

export const refreshTokenFx = createEffect<string, AuthResponse>(
	async (refreshToken) => {
		const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
			},
			body: JSON.stringify({ refreshToken }),
		});

		const result = await response.json();

		if (!response.ok) {
			// API returns {error: string, message: string} on error
			throw new Error(
				result.message || result.error || 'Token refresh failed',
			);
		}

		// Check if the response has the expected structure
		// API might return data directly or wrapped in {success: true, data: ...}
		if (result.success !== undefined) {
			// Wrapped response
			if (!result.success) {
				throw new Error(result.message || 'Token refresh failed');
			}
			return result.data as AuthResponse;
		}

		// Direct response - assume it's the AuthResponse
		return result as AuthResponse;
	},
);

export const checkSessionFx = createEffect<void, User | null>(async () => {
	try {
		const response = await fetch('/api/auth/me');

		if (!response.ok) {
			if (response.status === 401) {
				return null; // Not authenticated
			}
			throw new Error('Failed to check session');
		}

		const user = await response.json();
		return user as User;
	} catch (error) {
		console.error('Session check failed:', error);
		return null;
	}
});
