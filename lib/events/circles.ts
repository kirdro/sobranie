import { createEvent } from 'effector';
import type { Circle, CreateCircleData, CirclesFilter } from '../types';

// Circles events
export const circlesRequested = createEvent<{ filter?: CirclesFilter }>();
export const circleSelected = createEvent<Circle | null>();
export const circleCreated = createEvent<CreateCircleData>();
export const circleUpdated = createEvent<{ id: string; data: Partial<Circle> }>();
export const circleDeleted = createEvent<string>();

// Circle membership
export const circleJoined = createEvent<string>();
export const circleLeft = createEvent<string>();
export const circleMembersRequested = createEvent<string>();

// Circle management
export const circleInviteSent = createEvent<{ circle_id: string; user_id: string }>();
export const circleInviteAccepted = createEvent<string>();
export const circleInviteDeclined = createEvent<string>();