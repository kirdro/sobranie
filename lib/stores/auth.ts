import { createStore, sample, createEvent } from 'effector';
import { persist } from 'effector-storage/local';
import type { AuthState, User } from '../types';

type LoginSuccessPayload = {
  user: User;
  redirect?: string;
};
import {
  loginSubmitted,
  registerSubmitted,
  logoutTriggered,
  tokenRefreshTriggered,
  sessionRestored,
  sessionExpired,
  userUpdated
} from '../events';
import {
  loginFx,
  registerFx,
  fetchCurrentUserFx,
  refreshTokenFx
} from '../effects';

// Initial auth state
const initialAuthState: AuthState = {
  isAuthenticated: false,
  user: null,
  token: null,
  refreshToken: null,
  expiresAt: null,
};

// Auth stores
export const $auth = createStore<AuthState>(initialAuthState);
export const $user = createStore<User | null>(null);
export const $isAuthenticated = createStore<boolean>(false);
export const $accessToken = createStore<string | null>(null);

// Derived stores
export const $isLoading = loginFx.pending.map((pending) => pending);
export const $authError = createStore<string | null>(null);

// Update auth state on successful login/register
sample({
  clock: [loginFx.doneData, registerFx.doneData],
  fn: (authResponse) => ({
    isAuthenticated: true,
    user: authResponse.user,
    token: authResponse.accessToken,
    refreshToken: authResponse.refreshToken,
    expiresAt: Date.now() + authResponse.expiresIn * 1000,
  }),
  target: $auth,
});

// Update individual stores
sample({
  clock: [loginFx.doneData, registerFx.doneData],
  fn: (authResponse) => authResponse.user,
  target: $user,
});

sample({
  clock: [loginFx.doneData, registerFx.doneData],
  fn: () => true,
  target: $isAuthenticated,
});

sample({
  clock: [loginFx.doneData, registerFx.doneData],
  fn: (authResponse) => authResponse.accessToken,
  target: $accessToken,
});

// Handle logout
sample({
  clock: logoutTriggered,
  fn: () => initialAuthState,
  target: $auth,
});

sample({
  clock: logoutTriggered,
  fn: () => null,
  target: [$user, $accessToken],
});

sample({
  clock: logoutTriggered,
  fn: () => false,
  target: $isAuthenticated,
});

// Handle session expiry
sample({
  clock: sessionExpired,
  fn: () => initialAuthState,
  target: $auth,
});

// Handle user updates
sample({
  clock: userUpdated,
  target: $user,
});

// Handle auth errors
sample({
  clock: [loginFx.failData, registerFx.failData, fetchCurrentUserFx.failData],
  fn: (error) => error.message,
  target: $authError,
});

// Clear errors on new attempts
sample({
  clock: [loginSubmitted, registerSubmitted],
  fn: () => null,
  target: $authError,
});

// Connect events to effects
sample({
  clock: loginSubmitted,
  target: loginFx,
});

sample({
  clock: registerSubmitted,
  target: registerFx,
});

sample({
  clock: tokenRefreshTriggered,
  source: $auth,
  filter: (auth) => Boolean(auth.refreshToken),
  fn: (auth) => auth.refreshToken!,
  target: refreshTokenFx,
});

// Handle token refresh
sample({
  clock: refreshTokenFx.doneData,
  source: $auth,
  fn: (currentAuth, authResponse) => ({
    ...currentAuth,
    token: authResponse.accessToken,
    refreshToken: authResponse.refreshToken,
    expiresAt: Date.now() + authResponse.expiresIn * 1000,
  }),
  target: $auth,
});

// Persist auth state
persist({
  store: $auth,
  key: 'sobranie-auth',
});

// Auto-fetch user on session restore
sample({
  clock: sessionRestored,
  source: $auth,
  filter: (auth) => auth.isAuthenticated && Boolean(auth.token),
  fn: (auth) => auth.token!,
  target: fetchCurrentUserFx,
});

// Update user on successful fetch
sample({
  clock: fetchCurrentUserFx.doneData,
  target: $user,
});

// Navigation event for successful login (will be handled by components)
export const loginSuccessful = createEvent<LoginSuccessPayload>();

// Trigger navigation after successful login
sample({
  clock: [loginFx.doneData, registerFx.doneData],
  fn: (authResponse) => ({
    user: authResponse.user,
    redirect: '/'
  }),
  target: loginSuccessful,
});