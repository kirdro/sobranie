import { apiRequest } from "@/lib/api/client";
import type { AssistantMode } from "@/lib/api/types";

type AssistantModesResponse = {
  items: AssistantMode[];
};

export async function fetchAssistantModes(): Promise<AssistantMode[]> {
  const response = await apiRequest<AssistantModesResponse>("/assistant/modes");
  return response.items;
}

