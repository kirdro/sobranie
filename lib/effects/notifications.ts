import { createEffect } from 'effector';
import type {
  Notification,
  NotificationsFilter,
  ApiResponse
} from '../types';

const API_BASE_URL = 'https://api.sobranie.yaropolk.tech';

const getAuthToken = (): string | null => {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('accessToken');
};

export const fetchNotificationsFx = createEffect<
  { filter?: NotificationsFilter },
  Notification[]
>(
  async ({ filter }) => {
    const token = getAuthToken();

    if (!token) {
      throw new Error('Authentication required');
    }

    const queryParams = new URLSearchParams();

    if (filter) {
      Object.entries(filter).forEach(([key, value]) => {
        if (value !== undefined) {
          queryParams.append(key, value.toString());
        }
      });
    }

    const response = await fetch(`${API_BASE_URL}/notifications?${queryParams}`, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Fetch notifications failed: ${response.statusText}`);
    }

    const result: ApiResponse<Notification[]> = await response.json();

    if (!result.success) {
      throw new Error(result.message || 'Failed to fetch notifications');
    }

    return result.data;
  }
);

export const markNotificationReadFx = createEffect<string, void>(
  async (notificationId) => {
    const token = getAuthToken();

    if (!token) {
      throw new Error('Authentication required');
    }

    const response = await fetch(`${API_BASE_URL}/notifications/${notificationId}/read`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Mark notification read failed: ${response.statusText}`);
    }
  }
);

export const markAllNotificationsReadFx = createEffect<void, void>(
  async () => {
    const token = getAuthToken();

    if (!token) {
      throw new Error('Authentication required');
    }

    const response = await fetch(`${API_BASE_URL}/notifications/read-all`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Mark all notifications read failed: ${response.statusText}`);
    }
  }
);

export const clearNotificationsFx = createEffect<void, void>(
  async () => {
    const token = getAuthToken();

    if (!token) {
      throw new Error('Authentication required');
    }

    const response = await fetch(`${API_BASE_URL}/notifications`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Clear notifications failed: ${response.statusText}`);
    }
  }
);