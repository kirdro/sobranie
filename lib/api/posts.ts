import { apiRequest } from "@/lib/api/client";
import type { PaginatedResponse, Post } from "@/lib/api/types";

export async function fetchPosts(params?: { page?: number; limit?: number }): Promise<PaginatedResponse<Post>> {
  const searchParams = new URLSearchParams();
  if (params?.page) searchParams.append("page", String(params.page));
  if (params?.limit) searchParams.append("limit", String(params.limit));
  const query = searchParams.toString();
  const path = query ? `/posts/?${query}` : "/posts/";
  return apiRequest<PaginatedResponse<Post>>(path);
}

export async function createPost(token: string, payload: { authorId: string; content: string; circleId?: string; attachments?: string[]; tags?: string[] }) {
  return apiRequest<Post>("/posts/", {
    method: "POST",
    body: payload,
    token
  });
}

