import { apiRequest } from "@/lib/api/client";
import type { NotificationsResponse } from "@/lib/api/types";

export async function fetchNotifications(token: string): Promise<NotificationsResponse> {
  return apiRequest<NotificationsResponse>("/notifications/", { token });
}

