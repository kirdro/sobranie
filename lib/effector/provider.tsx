'use client';

import { ReactNode, useLayoutEffect } from 'react';
import { Provider } from 'effector-react';
import { allSettled } from 'effector';
import { clientScope } from './scope';
import { appStarted, appMounted, sessionRestored } from '../events';

interface EffectorProviderProps {
  children: ReactNode;
}

export function EffectorProvider({ children }: EffectorProviderProps) {
  useLayoutEffect(() => {
    if (!clientScope) return;

    // Initialize app on client
    allSettled(appMounted, { scope: clientScope });
    allSettled(sessionRestored, { scope: clientScope });
    allSettled(appStarted, { scope: clientScope });

    return () => {
      // Cleanup on unmount (optional)
    };
  }, []);

  if (!clientScope) {
    // Server-side or no scope available
    return <>{children}</>;
  }

  return <Provider value={clientScope}>{children}</Provider>;
}