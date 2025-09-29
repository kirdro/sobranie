import { apiRequest } from "@/lib/api/client";
import type { PaginatedResponse, User } from "@/lib/api/types";

export async function fetchUsers(token: string, params?: { page?: number; limit?: number }): Promise<PaginatedResponse<User>> {
  const searchParams = new URLSearchParams();
  if (params?.page) searchParams.append("page", String(params.page));
  if (params?.limit) searchParams.append("limit", String(params.limit));
  const query = searchParams.toString();
  const path = query ? `/users/?${query}` : "/users/";
  return apiRequest<PaginatedResponse<User>>(path, { token });
}

