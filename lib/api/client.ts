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

export type ApiErrorCode =
	| 'NETWORK_ERROR'
	| 'AUTH_REQUIRED'
	| 'VALIDATION_ERROR'
	| 'SERVER_ERROR'
	| 'RATE_LIMITED'
	| 'NOT_FOUND'
	| 'FORBIDDEN';

export class ApiError extends Error {
	status: number;
	payload: unknown;
	errorCode: ApiErrorCode;

	constructor(message: string, status: number, payload: unknown, errorCode?: ApiErrorCode) {
		super(message);
		this.name = 'ApiError';
		this.status = status;
		this.payload = payload;
		this.errorCode = errorCode ?? this.getErrorCodeFromStatus(status);
	}

	private getErrorCodeFromStatus(status: number): ApiErrorCode {
		switch (status) {
			case 401:
				return 'AUTH_REQUIRED';
			case 403:
				return 'FORBIDDEN';
			case 404:
				return 'NOT_FOUND';
			case 422:
				return 'VALIDATION_ERROR';
			case 429:
				return 'RATE_LIMITED';
			case 500:
			case 502:
			case 503:
			case 504:
				return 'SERVER_ERROR';
			default:
				return 'NETWORK_ERROR';
		}
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

export function handleApiError(error: unknown): string {
	if (error instanceof ApiError) {
		switch (error.errorCode) {
			case 'NETWORK_ERROR':
				return 'Проблемы с подключением к интернету. Проверьте соединение и попробуйте снова.';
			case 'AUTH_REQUIRED':
				return 'Необходимо войти в систему для выполнения этого действия.';
			case 'FORBIDDEN':
				return 'У вас нет прав для выполнения этого действия.';
			case 'NOT_FOUND':
				return 'Запрашиваемый ресурс не найден.';
			case 'VALIDATION_ERROR':
				return error.message || 'Некорректные данные. Проверьте введённую информацию.';
			case 'RATE_LIMITED':
				return 'Слишком много запросов. Попробуйте через несколько минут.';
			case 'SERVER_ERROR':
				return 'Ошибка сервера. Попробуйте позже или обратитесь в поддержку.';
			default:
				return error.message || 'Произошла неожиданная ошибка.';
		}
	}

	if (error instanceof Error) {
		return error.message;
	}

	return 'Произошла неожиданная ошибка.';
}

export async function apiRequestWithRetry<T>(
	path: string,
	options: ApiRequestOptions = {},
	maxRetries = 2
): Promise<T> {
	let lastError: Error;

	for (let attempt = 0; attempt <= maxRetries; attempt++) {
		try {
			return await apiRequest<T>(path, options);
		} catch (error) {
			lastError = error as Error;

			// Не повторяем запрос для ошибок аутентификации и валидации
			if (error instanceof ApiError) {
				if (['AUTH_REQUIRED', 'FORBIDDEN', 'VALIDATION_ERROR'].includes(error.errorCode)) {
					throw error;
				}

				// Для rate limit и server errors делаем паузу перед повтором
				if (['RATE_LIMITED', 'SERVER_ERROR'].includes(error.errorCode) && attempt < maxRetries) {
					const delay = Math.min(1000 * Math.pow(2, attempt), 5000); // exponential backoff
					await new Promise(resolve => setTimeout(resolve, delay));
					continue;
				}
			}

			// Для последней попытки выбрасываем ошибку
			if (attempt === maxRetries) {
				throw lastError;
			}
		}
	}

	throw lastError!;
}

export { API_BASE_URL };
