import { createStore, sample } from 'effector';
import type { Notification, NotificationsFilter } from '../types';
import {
	notificationsRequested,
	notificationReceived,
	notificationRead,
	notificationsCleared,
	allNotificationsRead,
} from '../events';
import {
	fetchNotificationsFx,
	markNotificationReadFx,
	markAllNotificationsReadFx,
	clearNotificationsFx,
} from '../effects';

// Notifications stores
export const $notifications = createStore<Notification[]>([]);
export const $notificationsFilter = createStore<NotificationsFilter>({});

// Loading states
export const $notificationsLoading = fetchNotificationsFx.pending;

// Error handling
export const $notificationsError = createStore<string | null>(null);

// Derived stores
export const $unreadNotifications = $notifications.map((notifications) =>
	notifications.filter((notification) => !notification.read),
);

export const $unreadCount = $unreadNotifications.map(
	(unreadNotifications) => unreadNotifications.length,
);

export const $hasUnreadNotifications = $unreadCount.map((count) => count > 0);

// Group notifications by type
export const $notificationsByType = $notifications.map((notifications) => {
	const grouped: Record<string, Notification[]> = {};

	notifications.forEach((notification) => {
		if (!grouped[notification.type]) {
			grouped[notification.type] = [];
		}
		grouped[notification.type].push(notification);
	});

	return grouped;
});

// Recent notifications (last 24 hours)
export const $recentNotifications = $notifications.map((notifications) => {
	const twentyFourHoursAgo = Date.now() - 24 * 60 * 60 * 1000;
	return notifications.filter(
		(notification) =>
			new Date(notification.created_at).getTime() > twentyFourHoursAgo,
	);
});

// Handle notifications loading
sample({
	clock: notificationsRequested,
	target: fetchNotificationsFx,
});

// Update notifications on successful fetch
sample({
	clock: fetchNotificationsFx.doneData,
	target: $notifications,
});

// Handle new notification received (WebSocket/SSE)
sample({
	clock: notificationReceived,
	source: $notifications,
	fn: (notifications, newNotification) => [newNotification, ...notifications],
	target: $notifications,
});

// Handle notification read
sample({
	clock: notificationRead,
	target: markNotificationReadFx,
});

// Update notification as read
sample({
	clock: markNotificationReadFx.done,
	source: $notifications,
	fn: (notifications, { params: notificationId }) =>
		notifications.map((notification) =>
			notification.id === notificationId ?
				{ ...notification, read: true }
			:	notification,
		),
	target: $notifications,
});

// Handle all notifications read
sample({
	clock: allNotificationsRead,
	target: markAllNotificationsReadFx,
});

// Mark all notifications as read
sample({
	clock: markAllNotificationsReadFx.done,
	source: $notifications,
	fn: (notifications) =>
		notifications.map((notification) => ({ ...notification, read: true })),
	target: $notifications,
});

// Handle notifications clear
sample({
	clock: notificationsCleared,
	target: clearNotificationsFx,
});

// Clear all notifications
sample({
	clock: clearNotificationsFx.done,
	fn: () => [],
	target: $notifications,
});

// Error handling
sample({
	clock: [
		fetchNotificationsFx.failData,
		markNotificationReadFx.failData,
		markAllNotificationsReadFx.failData,
		clearNotificationsFx.failData,
	],
	fn: (error) => error.message,
	target: $notificationsError,
});

// Clear errors on new requests
sample({
	clock: [notificationsRequested, notificationRead, allNotificationsRead],
	fn: () => null,
	target: $notificationsError,
});
