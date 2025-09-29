import { apiRequest } from "@/lib/api/client";
import type { NavigationLink } from "@/lib/api/types";

type NavigationResponse = {
  items: NavigationLink[];
};

export async function fetchNavigationLinks(): Promise<NavigationLink[]> {
  const response = await apiRequest<NavigationResponse>("/navigation/links");
  return response.items;
}
