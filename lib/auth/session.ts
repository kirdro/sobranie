import { fetchCurrentUser } from "@/lib/api/auth";
import { ApiError } from "@/lib/api/client";
import { clearAuthToken, getAuthToken } from "@/lib/auth/cookies";
import type { User } from "@/lib/api/types";

export async function getSessionUser(): Promise<User | null> {
  const token = await getAuthToken();
  if (!token) {
    return null;
  }

  try {
    return await fetchCurrentUser(token);
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) {
      await clearAuthToken();
      return null;
    }
    throw error;
  }
}

