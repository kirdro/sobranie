import { fetchCurrentUser } from '@/lib/api/auth';
import { ApiError } from '@/lib/api/client';
import { clearAuthToken, getAuthToken } from '@/lib/auth/cookies';
import type { User } from '@/lib/api/types';

// Simple cache for user data
let userCache: { user: User | null; token: string; timestamp: number } | null =
	null;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

export async function getSessionUser(): Promise<User | null> {
	const token = await getAuthToken();
	if (!token) {
		userCache = null;
		return null;
	}

	// Check cache first
	if (
		userCache &&
		userCache.token === token &&
		Date.now() - userCache.timestamp < CACHE_TTL
	) {
		return userCache.user;
	}

	try {
		const user = await fetchCurrentUser(token);
		// Cache the result
		userCache = { user, token, timestamp: Date.now() };
		return user;
	} catch (error) {
		if (error instanceof ApiError) {
			if (error.status === 401) {
				await clearAuthToken();
				userCache = null;
				return null;
			}
			if (error.status === 429) {
				// Rate limited - return cached user if available, otherwise null
				console.warn('Rate limited on user fetch, using cached data');
				return userCache?.user || null;
			}
		}
		// For other errors, invalidate cache and throw
		userCache = null;
		throw error;
	}
}

export function clearSessionCache(): void {
	userCache = null;
}
