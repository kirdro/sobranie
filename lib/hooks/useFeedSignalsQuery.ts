'use client';

import { useQuery } from '@tanstack/react-query';

import type { FeedAlert } from '@/lib/api/types';
// import { clientApiRequest } from '@/lib/api/client-api';

async function fetchFeedSignals(): Promise<FeedAlert[]> {
	const response = await fetch('/api/feed/signals');
	if (!response.ok) {
		throw new Error(`Failed to fetch feed signals: ${response.status}`);
	}
	const data = await response.json();
	return data.alerts || data;
}

export function useFeedSignalsQuery(options?: { refetchInterval?: number; enabled?: boolean }) {
	return useQuery({
		queryKey: ['feed', 'signals'],
		queryFn: fetchFeedSignals,
		staleTime: 30_000,
		refetchInterval: options?.refetchInterval ?? 15_000,
		enabled: options?.enabled ?? true,
	});
}