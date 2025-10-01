import 'server-only';

// NextFetchRequestConfig not available in Next.js 15, using alternative approach
type NextFetchRequestConfig = {
	revalidate?: number | false;
	tags?: string[];
};

const API_BASE_URL =
	process.env.SOBRANIE_API_BASE_URL ?? 'https://api.sobranie.yaropolk.tech';

type ApiRequestOptions = {
	method?: string;
	headers?: HeadersInit;
	body?: unknown;
	token?: string | null;
	cache?: RequestCache;
	next?: NextFetchRequestConfig;
};

export class ApiError extends Error {
	status: number;
	payload: unknown;

	constructor(message: string, status: number, payload: unknown) {
		super(message);
		this.name = 'ApiError';
		this.status = status;
		this.payload = payload;
	}
}

async function parseJson<T>(response: Response): Promise<T | null> {
	const contentType = response.headers.get('content-type');
	if (contentType && contentType.includes('application/json')) {
		return (await response.json()) as T;
	}
	return null;
}

function buildHeaders(options: ApiRequestOptions): HeadersInit {
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

export async function apiRequest<T>(
	path: string,
	options: ApiRequestOptions = {},
): Promise<T> {
	const url = `${API_BASE_URL}${path}`;
	const { body, token } = options;

	const response = await fetch(url, {
		method: options.method ?? 'GET',
		headers: buildHeaders({ ...options, token }),
		body: body === undefined ? undefined : JSON.stringify(body),
		cache: options.cache,
		next: options.next,
	});

	if (!response.ok) {
		const payload = await parseJson(response);
		const message =
			typeof payload === 'object' && payload && 'message' in payload ?
				((payload as { message?: string }).message ??
				response.statusText)
			:	response.statusText;
		throw new ApiError(message, response.status, payload);
	}

	const data = await parseJson<T>(response);
	return data ?? ({} as T);
}

export { API_BASE_URL };
