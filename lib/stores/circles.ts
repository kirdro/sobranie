import { createStore, sample } from 'effector';
import type { Circle, CirclesFilter, CircleMember } from '../types';
import {
  circlesRequested,
  circleSelected,
  circleCreated,
  circleJoined,
  circleLeft
} from '../events';
import {
  fetchCirclesFx,
  fetchCircleByIdFx,
  createCircleFx,
  joinCircleFx,
  leaveCircleFx
} from '../effects';

// Circles stores
export const $circles = createStore<Circle[]>([]);
export const $selectedCircle = createStore<Circle | null>(null);
export const $circlesFilter = createStore<CirclesFilter>({
  sort_by: 'created_at',
  sort_order: 'desc',
});
export const $circleMembers = createStore<CircleMember[]>([]);

// User circles (circles the user is member of)
export const $userCircles = createStore<Circle[]>([]);

// Loading states
export const $circlesLoading = fetchCirclesFx.pending;
export const $circleLoading = fetchCircleByIdFx.pending;
export const $createCircleLoading = createCircleFx.pending;

// Error handling
export const $circlesError = createStore<string | null>(null);

// Derived stores
export const $joinedCircles = $circles.map((circles) =>
  circles.filter((circle) => circle.is_member)
);

export const $adminCircles = $circles.map((circles) =>
  circles.filter((circle) => circle.is_admin)
);

// Handle circles loading
sample({
  clock: circlesRequested,
  target: fetchCirclesFx,
});

// Update circles on successful fetch
sample({
  clock: fetchCirclesFx.doneData,
  target: $circles,
});

// Handle circle selection
sample({
  clock: circleSelected,
  target: $selectedCircle,
});

// Load selected circle details
sample({
  clock: circleSelected,
  filter: Boolean,
  fn: (circle) => circle!.id,
  target: fetchCircleByIdFx,
});

// Update selected circle with details
sample({
  clock: fetchCircleByIdFx.doneData,
  target: $selectedCircle,
});

// Handle circle creation
sample({
  clock: circleCreated,
  target: createCircleFx,
});

// Add new circle to the list
sample({
  clock: createCircleFx.doneData,
  source: $circles,
  fn: (circles, newCircle) => [newCircle, ...circles],
  target: $circles,
});

// Handle circle join/leave
sample({
  clock: circleJoined,
  target: joinCircleFx,
});

sample({
  clock: circleLeft,
  target: leaveCircleFx,
});

// Update circle membership status after join
sample({
  clock: joinCircleFx.done,
  source: $circles,
  fn: (circles, { params: circleId }) =>
    circles.map((circle) =>
      circle.id === circleId
        ? {
            ...circle,
            is_member: true,
            members_count: circle.members_count + 1,
          }
        : circle
    ),
  target: $circles,
});

// Update selected circle after join
sample({
  clock: joinCircleFx.done,
  source: $selectedCircle,
  filter: Boolean,
  fn: (selectedCircle, { params: circleId }) =>
    selectedCircle!.id === circleId
      ? {
          ...selectedCircle!,
          is_member: true,
          members_count: selectedCircle!.members_count + 1,
        }
      : selectedCircle,
  target: $selectedCircle,
});

// Update circle membership status after leave
sample({
  clock: leaveCircleFx.done,
  source: $circles,
  fn: (circles, { params: circleId }) =>
    circles.map((circle) =>
      circle.id === circleId
        ? {
            ...circle,
            is_member: false,
            members_count: Math.max(0, circle.members_count - 1),
          }
        : circle
    ),
  target: $circles,
});

// Update user circles when circles change
sample({
  clock: $circles,
  fn: (circles) => circles.filter((circle) => circle.is_member),
  target: $userCircles,
});

// Error handling
sample({
  clock: [
    fetchCirclesFx.failData,
    fetchCircleByIdFx.failData,
    createCircleFx.failData,
    joinCircleFx.failData,
    leaveCircleFx.failData,
  ],
  fn: (error) => error.message,
  target: $circlesError,
});

// Clear errors on new requests
sample({
  clock: [circlesRequested, circleCreated, circleJoined],
  fn: () => null,
  target: $circlesError,
});