"use client";

import { useQuery } from "@tanstack/react-query";

import type { PaginatedResponse, Post } from "@/lib/api/types";
import { fetchJson } from "@/lib/frontend/fetch-json";

type PostsResponse = PaginatedResponse<Post>;

async function fetchPostsList(limit = 20): Promise<PostsResponse> {
  return fetchJson<PostsResponse>(`/api/posts?limit=${limit}`);
}

export function usePostsQuery(limit = 20, options?: { refetchInterval?: number; enabled?: boolean }) {
  return useQuery({
    queryKey: ["posts", "list", limit],
    queryFn: () => fetchPostsList(limit),
    staleTime: 30_000,
    refetchInterval: options?.refetchInterval ?? 15_000,
    enabled: options?.enabled ?? true
  });
}
