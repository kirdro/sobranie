'use client';

import { useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';

import { ActivityStream } from '@components/feed/ActivityStream';
import { AiSignalPanel } from '@components/feed/AiSignalPanel';
import { FeedComposer } from '@components/feed/FeedComposer';
import { FeedTimeline } from '@components/feed/FeedTimeline';
import { DashboardLayout } from '@components/dashboard/DashboardLayout';
import { dashboardCopy } from '@/lib/content/dashboard';
import { useDashboardData } from './useDashboardData';
import { useSession } from '@/components/auth/SessionProvider';

export function DashboardShell() {
	const { aiPrompts } = useDashboardData();
	const { user } = useSession();
	const queryClient = useQueryClient();

	const handleCreatePost = useCallback(
		async (content: string) => {
			if (!user) {
				throw new Error('Войдите, чтобы отправить пост');
			}

			const response = await fetch('/api/posts', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ authorId: user.id, content }),
			});

			if (!response.ok) {
				const payload = (await response.json().catch(() => null)) as {
					message?: string;
				} | null;
				throw new Error(
					payload?.message ?? 'Не удалось опубликовать пост',
				);
			}

			await queryClient.invalidateQueries({ queryKey: ['posts'] });
		},
		[queryClient, user],
	);

	return (
		<DashboardLayout
			hero={dashboardCopy.hero}
			mobileAside={null}
		>
			<FeedComposer
				placeholder={dashboardCopy.composer.placeholder}
				aiLabel={dashboardCopy.composer.aiLabel}
				submitLabel={dashboardCopy.composer.submit}
				suggestions={aiPrompts.ideas}
				onSubmit={handleCreatePost}
			/>
			<div className='xl:hidden'>
				<AiSignalPanel data={aiPrompts} />
			</div>
			<FeedTimeline />
			<section className='rounded-[28px] border border-white/10 bg-white/5 p-6 backdrop-blur-2xl'>
				<header className='flex items-center justify-between'>
					<h2 className='text-sm font-semibold uppercase tracking-[0.25em] text-dawn/60'>
						{dashboardCopy.livePulse.title}
					</h2>
					<span className='text-xs text-accent-teal'>
						{dashboardCopy.livePulse.subtitle}
					</span>
				</header>
				<div className='mt-6'>
					<ActivityStream />
				</div>
			</section>
		</DashboardLayout>
	);
}
