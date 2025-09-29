import { fork, Scope } from 'effector';

// Create application scope
export const clientScope: Scope | null =
  typeof window !== 'undefined' ? fork() : null;

// Export for server-side rendering
export { fork };