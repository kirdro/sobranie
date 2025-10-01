import { createEvent } from 'effector';
import type { LoginCredentials, RegisterData, User } from '../types';

// Authentication events
export const loginSubmitted = createEvent<LoginCredentials>();
export const registerSubmitted = createEvent<RegisterData>();
export const logoutTriggered = createEvent();
export const tokenRefreshTriggered = createEvent();

// User events
export const userUpdated = createEvent<User>();
export const userProfileRequested = createEvent<string>();

// Session events
export const sessionRestored = createEvent();
export const sessionExpired = createEvent();
export const sessionCheckRequested = createEvent();
