'use client';

import { useQuery } from '@tanstack/react-query';

import type { FeedLoop } from '@/lib/api/types';
// import { clientApiRequest } from '@/lib/api/client-api';

async function fetchFeedLoops(): Promise<FeedLoop[]> {
	const response = await fetch('/api/feed/loops');
	if (!response.ok) {
		throw new Error(`Failed to fetch feed loops: ${response.status}`);
	}
	const data = await response.json();
	return data.loops || data;
}

export function useFeedLoopsQuery(options?: { refetchInterval?: number; enabled?: boolean }) {
	return useQuery({
		queryKey: ['feed', 'loops'],
		queryFn: fetchFeedLoops,
		staleTime: 30_000,
		refetchInterval: options?.refetchInterval ?? 15_000,
		enabled: options?.enabled ?? true,
	});
}