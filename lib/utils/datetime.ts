const SECOND = 1000;
const MINUTE = 60 * SECOND;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

export function formatRelativeTime(value: string | number | Date): string {
	const target =
		typeof value === 'string' ? Date.parse(value)
		: value instanceof Date ? value.getTime()
		: value;
	const now = Date.now();
	const diff = now - target;

	if (Number.isNaN(diff)) {
		return 'только что';
	}

	if (diff < MINUTE) {
		return 'только что';
	}
	if (diff < HOUR) {
		const minutes = Math.floor(diff / MINUTE);
		return `${minutes} мин назад`;
	}
	if (diff < DAY) {
		const hours = Math.floor(diff / HOUR);
		return `${hours} ч назад`;
	}

	const days = Math.floor(diff / DAY);
	return `${days} дн назад`;
}
