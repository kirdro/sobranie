export async function fetchJson<T>(
	input: RequestInfo,
	init?: RequestInit,
): Promise<T> {
	const response = await fetch(input, init);

	if (!response.ok) {
		const payload = (await response.json().catch(() => null)) as {
			message?: string;
		} | null;
		throw new Error(
			payload?.message ??
				`Запрос завершился с ошибкой ${response.status}`,
		);
	}

	return (await response.json()) as T;
}
