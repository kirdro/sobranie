import { apiRequest } from "@/lib/api/client";
import type { AuthSuccessResponse, User } from "@/lib/api/types";

type RegisterPayload = {
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
};

type LoginPayload = {
  email: string;
  password: string;
};

type ChangePasswordPayload = {
  currentPassword: string;
  newPassword: string;
};

export async function register(payload: RegisterPayload): Promise<AuthSuccessResponse> {
  return apiRequest<AuthSuccessResponse>("/auth/register", {
    method: "POST",
    body: payload
  });
}

export async function login(payload: LoginPayload): Promise<AuthSuccessResponse> {
  return apiRequest<AuthSuccessResponse>("/auth/login", {
    method: "POST",
    body: payload
  });
}

export async function fetchCurrentUser(token: string): Promise<User> {
  return apiRequest<User>("/auth/me", { token });
}

export async function changePassword(token: string, payload: ChangePasswordPayload) {
  return apiRequest<{ success: boolean; message: string }>("/auth/change-password", {
    method: "POST",
    body: payload,
    token
  });
}

