import { createStore, sample } from 'effector';
import { appStarted, appMounted, appUnmounted } from '../events';

// App state
export const $appMounted = createStore<boolean>(false);
export const $appInitialized = createStore<boolean>(false);

// Environment info
export const $isClient = createStore<boolean>(typeof window !== 'undefined', {
	serialize: 'ignore',
});

export const $isServer = $isClient.map((isClient) => !isClient);

// App lifecycle handlers
sample({
	clock: appMounted,
	fn: () => true,
	target: $appMounted,
});

sample({
	clock: appUnmounted,
	fn: () => false,
	target: $appMounted,
});

sample({
	clock: appStarted,
	fn: () => true,
	target: $appInitialized,
});
