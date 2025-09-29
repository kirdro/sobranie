import { createEvent } from 'effector';

// Application lifecycle events
export const appStarted = createEvent();
export const appMounted = createEvent();
export const appUnmounted = createEvent();