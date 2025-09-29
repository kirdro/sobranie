import { createEffect } from 'effector';
import type {
  LoginCredentials,
  RegisterData,
  AuthResponse,
  User,
  ApiResponse
} from '../types';

// Base API URL from environment
const API_BASE_URL = 'https://api.sobranie.yaropolk.tech';

// Authentication effects
export const loginFx = createEffect<LoginCredentials, AuthResponse>(
  async (credentials) => {
    const response = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(credentials),
    });

    if (!response.ok) {
      throw new Error(`Login failed: ${response.statusText}`);
    }

    const result: ApiResponse<AuthResponse> = await response.json();

    if (!result.success) {
      throw new Error(result.message || 'Login failed');
    }

    return result.data;
  }
);

export const registerFx = createEffect<RegisterData, AuthResponse>(
  async (data) => {
    const response = await fetch(`${API_BASE_URL}/auth/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      throw new Error(`Registration failed: ${response.statusText}`);
    }

    const result: ApiResponse<AuthResponse> = await response.json();

    if (!result.success) {
      throw new Error(result.message || 'Registration failed');
    }

    return result.data;
  }
);

export const fetchCurrentUserFx = createEffect<string, User>(
  async (token) => {
    const response = await fetch(`${API_BASE_URL}/auth/me`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Fetch user failed: ${response.statusText}`);
    }

    const result: ApiResponse<User> = await response.json();

    if (!result.success) {
      throw new Error(result.message || 'Failed to fetch user');
    }

    return result.data;
  }
);

export const refreshTokenFx = createEffect<string, AuthResponse>(
  async (refreshToken) => {
    const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ refreshToken }),
    });

    if (!response.ok) {
      throw new Error(`Token refresh failed: ${response.statusText}`);
    }

    const result: ApiResponse<AuthResponse> = await response.json();

    if (!result.success) {
      throw new Error(result.message || 'Token refresh failed');
    }

    return result.data;
  }
);