import { createStore, createEvent, sample } from 'effector';
import type { User } from '../api/types';

export const authInitialized = createEvent<boolean>();
export const authStateChanged = createEvent<boolean>();
export const sessionCheckRequested = createEvent();
export const logoutTriggered = createEvent();
export const userUpdated = createEvent<User>();

export const $isAuthenticated = createStore<boolean>(false);
export const $user = createStore<User | null>(null);

sample({
	clock: authInitialized,
	target: $isAuthenticated,
});

sample({
	clock: authStateChanged,
	target: $isAuthenticated,
});

sample({
	clock: userUpdated,
	target: $user,
});

sample({
	clock: logoutTriggered,
	fn: () => false,
	target: $isAuthenticated,
});

sample({
	clock: logoutTriggered,
	fn: () => null,
	target: $user,
});