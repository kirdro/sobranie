'use client';

import { ReactNode } from 'react';

import { AiSignalPanel } from '@components/feed/AiSignalPanel';
import { TrendsPanel } from '@components/feed/TrendsPanel';
import { WhoToFollow } from '@components/feed/WhoToFollow';
import { dashboardCopy } from '@/lib/content/dashboard';
import { useDashboardData } from './useDashboardData';
import { SidebarNav } from './SidebarNav';

type DashboardLayoutProps = {
	hero?: {
		title: string;
		description?: string;
	};
	children: ReactNode;
	rightAside?: ReactNode;
	mobileAside?: ReactNode | null;
};

export function DashboardLayout({
	hero,
	children,
	rightAside,
	mobileAside,
}: DashboardLayoutProps) {
	const { navItems, aiPrompts, trendTopics, suggestedPeople } =
		useDashboardData();

	const defaultAside = rightAside ?? (
		<>
			<AiSignalPanel data={aiPrompts} />
			<div className='relative overflow-hidden rounded-[28px] border border-white/10 bg-white/5 p-6 text-sm text-dawn/70 backdrop-blur-2xl'>
				<div className='pointer-events-none absolute -top-16 right-[-40px] h-40 w-40 bg-orb-iris opacity-60' />
				<p className='text-xs uppercase tracking-[0.25em] text-dawn/60'>
					{dashboardCopy.heatmap.label}
				</p>
				<p className='mt-3 text-white'>
					{dashboardCopy.heatmap.headline}
				</p>
				<p className='mt-2 text-dawn/60'>
					{dashboardCopy.heatmap.hint}
				</p>
			</div>
			<TrendsPanel topics={trendTopics} />
			<WhoToFollow people={suggestedPeople} />
		</>
	);

	const mobileSlot =
		mobileAside === undefined ?
			<div className='xl:hidden'>
				<AiSignalPanel data={aiPrompts} />
			</div>
		:	mobileAside;

	return (
		<div className='relative mx-auto flex w-full max-w-[1440px] flex-1 gap-6 pb-16 lg:gap-8'>
			<aside className='sticky top-8 hidden h-[calc(100vh-6rem)] w-[260px] flex-shrink-0 lg:block'>
				<SidebarNav items={navItems} />
			</aside>

			<section className='flex min-w-0 flex-1 flex-col gap-6'>
				{hero && (
					<header className='space-y-6'>
						<h1 className='font-display text-hero text-white'>
							{hero.title}
						</h1>
						{hero.description ?
							<p className='max-w-2xl text-sm text-dawn/70'>
								{hero.description}
							</p>
						:	null}
					</header>
				)}
				{mobileSlot}
				{children}
			</section>

			<aside className='hidden w-[300px] flex-shrink-0 flex-col gap-6 xl:flex'>
				{defaultAside}
			</aside>
		</div>
	);
}
