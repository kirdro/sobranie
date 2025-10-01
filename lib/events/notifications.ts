import { createEvent } from 'effector';
import type { Notification, NotificationsFilter } from '../types';

// Notifications events
export const notificationsRequested = createEvent<{
	filter?: NotificationsFilter;
}>();
export const notificationReceived = createEvent<Notification>();
export const notificationRead = createEvent<string>();
export const notificationsCleared = createEvent();
export const allNotificationsRead = createEvent();

// Notification settings
export const notificationSettingsUpdated = createEvent<{
	email_notifications: boolean;
	push_notifications: boolean;
	types: string[];
}>();
