import { cookies } from 'next/headers';

const AUTH_COOKIE = 'sobranie_access_token';
const DAY_IN_SECONDS = 60 * 60 * 24;

export async function getAuthToken(): Promise<string | null> {
	const store = await cookies();
	const token = store.get(AUTH_COOKIE);
	return token?.value ?? null;
}

export async function setAuthToken(
	token: string,
	maxAgeSeconds = DAY_IN_SECONDS,
): Promise<void> {
	const store = await cookies();
	store.set({
		name: AUTH_COOKIE,
		value: token,
		httpOnly: true,
		sameSite: 'lax',
		path: '/',
		secure: process.env.NODE_ENV === 'production',
		maxAge: maxAgeSeconds,
	});
}

export async function clearAuthToken(): Promise<void> {
	const store = await cookies();
	store.delete(AUTH_COOKIE);
}

export { AUTH_COOKIE };
