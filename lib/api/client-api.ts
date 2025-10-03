'use client';

const API_BASE_URL = 'https://api.sobranie.yaropolk.tech';

type ClientApiRequestOptions = {
	method?: string;
	headers?: HeadersInit;
	body?: unknown;
	token?: string | null;
};

export class ClientApiError extends Error {
	status: number;
	payload: unknown;

	constructor(message: string, status: number, payload: unknown) {
		super(message);
		this.name = 'ClientApiError';
		this.status = status;
		this.payload = payload;
	}
}

function buildHeaders(options: ClientApiRequestOptions): HeadersInit {
	const headers: HeadersInit = {
		Accept: 'application/json',
		'Content-Type': 'application/json',
		...options.headers,
	};

	if (options.token) {
		return { ...headers, Authorization: `Bearer ${options.token}` };
	}

	return headers;
}

export async function clientApiRequest<T>(
	path: string,
	options: ClientApiRequestOptions = {},
): Promise<T> {
	const url = `${API_BASE_URL}${path}`;
	const { body } = options;

	const response = await fetch(url, {
		method: options.method ?? 'GET',
		headers: buildHeaders(options),
		body: body === undefined ? undefined : JSON.stringify(body),
	});

	if (!response.ok) {
		const payload = await response.json().catch(() => null);
		const message =
			typeof payload === 'object' && payload && 'message' in payload ?
				((payload as { message?: string }).message ?? response.statusText)
			:	response.statusText;
		throw new ClientApiError(message, response.status, payload);
	}

	const data = await response.json();
	return data as T;
}

// Функция для получения токена из cookies (если есть)
function getAuthToken(): string | null {
	if (typeof window === 'undefined') return null;

	// Простая функция для получения cookie
	const cookies = document.cookie.split(';');
	const tokenCookie = cookies.find(cookie => cookie.trim().startsWith('sobranie_token='));
	if (tokenCookie) {
		return tokenCookie.split('=')[1];
	}
	return null;
}

// Обертка для запросов с авторизацией
export async function authenticatedRequest<T>(
	path: string,
	options: Omit<ClientApiRequestOptions, 'token'> = {},
): Promise<T> {
	const token = getAuthToken();
	return clientApiRequest<T>(path, { ...options, token });
}

export { API_BASE_URL };