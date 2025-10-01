'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactNode, useMemo, useState } from 'react';

import type { User } from '@/lib/types/user';
import { SessionProvider } from '@/components/auth/SessionProvider';
import { EffectorProvider } from '@/lib/effector';

type ProvidersProps = {
	children: ReactNode;
	initialUser: User | null;
};

export function Providers({ children, initialUser }: ProvidersProps) {
	const [client] = useState(() => new QueryClient());

	const queryClient = useMemo(() => client, [client]);

	return (
		<EffectorProvider>
			<QueryClientProvider client={queryClient}>
				<SessionProvider initialUser={initialUser}>
					{children}
				</SessionProvider>
			</QueryClientProvider>
		</EffectorProvider>
	);
}
