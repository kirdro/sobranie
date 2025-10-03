import { useQuery } from '@tanstack/react-query';
import { fetchJson } from '@/lib/frontend/fetch-json';
import type { BacklogItem } from '@/lib/api/types';

type BacklogResponse = {
	items: BacklogItem[];
	total: number;
};

export function useBacklogQuery() {
	return useQuery({
		queryKey: ['circles', 'backlog'],
		queryFn: () => fetchJson<BacklogResponse>('/api/circles/backlog'),
		staleTime: 30_000, // 30 секунд
		refetchInterval: 60_000, // обновление каждую минуту
	});
}