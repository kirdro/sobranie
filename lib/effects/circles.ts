import { createEffect } from 'effector';
import type {
	Circle,
	CreateCircleData,
	CirclesFilter,
	ApiResponse,
} from '../types';

const API_BASE_URL = 'https://api.sobranie.yaropolk.tech';

const getAuthToken = (): string | null => {
	if (typeof window === 'undefined') return null;
	return localStorage.getItem('accessToken');
};

export const fetchCirclesFx = createEffect<
	{ filter?: CirclesFilter },
	Circle[]
>(async ({ filter }) => {
	const queryParams = new URLSearchParams();

	if (filter) {
		Object.entries(filter).forEach(([key, value]) => {
			if (value !== undefined) {
				queryParams.append(key, value.toString());
			}
		});
	}

	const response = await fetch(`${API_BASE_URL}/circles?${queryParams}`, {
		headers: {
			'Content-Type': 'application/json',
		},
	});

	if (!response.ok) {
		throw new Error(`Fetch circles failed: ${response.statusText}`);
	}

	const result: ApiResponse<Circle[]> = await response.json();

	if (!result.success) {
		throw new Error(result.message || 'Failed to fetch circles');
	}

	return result.data;
});

export const fetchCircleByIdFx = createEffect<string, Circle>(
	async (circleId) => {
		const response = await fetch(`${API_BASE_URL}/circles/${circleId}`, {
			headers: {
				'Content-Type': 'application/json',
			},
		});

		if (!response.ok) {
			throw new Error(`Fetch circle failed: ${response.statusText}`);
		}

		const result: ApiResponse<Circle> = await response.json();

		if (!result.success) {
			throw new Error(result.message || 'Failed to fetch circle');
		}

		return result.data;
	},
);

export const createCircleFx = createEffect<CreateCircleData, Circle>(
	async (circleData) => {
		const token = getAuthToken();

		if (!token) {
			throw new Error('Authentication required');
		}

		const response = await fetch(`${API_BASE_URL}/circles`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				Authorization: `Bearer ${token}`,
			},
			body: JSON.stringify(circleData),
		});

		if (!response.ok) {
			throw new Error(`Create circle failed: ${response.statusText}`);
		}

		const result: ApiResponse<Circle> = await response.json();

		if (!result.success) {
			throw new Error(result.message || 'Failed to create circle');
		}

		return result.data;
	},
);

export const joinCircleFx = createEffect<string, void>(async (circleId) => {
	const token = getAuthToken();

	if (!token) {
		throw new Error('Authentication required');
	}

	const response = await fetch(`${API_BASE_URL}/circles/${circleId}/join`, {
		method: 'POST',
		headers: {
			Authorization: `Bearer ${token}`,
		},
	});

	if (!response.ok) {
		throw new Error(`Join circle failed: ${response.statusText}`);
	}
});

export const leaveCircleFx = createEffect<string, void>(async (circleId) => {
	const token = getAuthToken();

	if (!token) {
		throw new Error('Authentication required');
	}

	const response = await fetch(`${API_BASE_URL}/circles/${circleId}/leave`, {
		method: 'POST',
		headers: {
			Authorization: `Bearer ${token}`,
		},
	});

	if (!response.ok) {
		throw new Error(`Leave circle failed: ${response.statusText}`);
	}
});
