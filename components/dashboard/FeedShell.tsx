'use client';

import { HiOutlineFire } from 'react-icons/hi2';
import { LuSparkles, LuUsers } from 'react-icons/lu';

import { ActivityStream } from '@components/feed/ActivityStream';
import { DashboardLayout } from '@components/dashboard/DashboardLayout';
import { feedCopy } from '@/lib/content/feed';

const loopIconMap = {
	spark: LuSparkles,
	users: LuUsers,
} as const;

const toneBadge: Record<'purple' | 'teal', string> = {
	purple: 'bg-accent-purple/20 text-accent-purple',
	teal: 'bg-accent-teal/20 text-accent-teal',
};

export function FeedShell() {
	return (
		<DashboardLayout hero={feedCopy.hero}>
			<section className='rounded-[28px] border border-white/10 bg-white/5 p-6 backdrop-blur-2xl'>
				<header className='flex items-center justify-between'>
					<div>
						<p className='text-xs uppercase tracking-[0.25em] text-dawn/60'>
							живой поток
						</p>
						<h2 className='mt-3 text-xl font-semibold text-white'>
							События онлайн
						</h2>
					</div>
					<span className='text-xs text-accent-teal'>
						обновление каждые 6 сек
					</span>
				</header>
				<div className='mt-6'>
					<ActivityStream />
				</div>
			</section>

			<section className='grid gap-6 xl:grid-cols-2'>
				<div className='rounded-[28px] border border-white/10 bg-white/5 p-6 backdrop-blur-2xl'>
					<header className='flex items-center justify-between'>
						<div>
							<p className='text-xs uppercase tracking-[0.25em] text-dawn/60'>
								динамика
							</p>
							<h2 className='mt-3 text-xl font-semibold text-white'>
								Петли взаимодействия
							</h2>
						</div>
						<HiOutlineFire className='h-6 w-6 text-accent-amber' />
					</header>
					<div className='mt-6 space-y-5'>
						{feedCopy.loops.map((loop) => {
							const Icon = loopIconMap[loop.icon];
							return (
								<article
									key={loop.id}
									className='rounded-[24px] border border-white/10 bg-white/5 p-4 transition hover:border-white/20'
								>
									<div className='flex items-center gap-3'>
										<div className='flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10 text-white'>
											<Icon className='h-6 w-6' />
										</div>
										<div>
											<h3 className='text-lg font-semibold text-white'>
												{loop.title}
											</h3>
											<p className='text-xs uppercase tracking-[0.2em] text-dawn/60'>
												интенсивность {loop.intensity}
											</p>
										</div>
									</div>
									<p className='mt-3 text-sm text-dawn/70'>
										{loop.description}
									</p>
									<footer className='mt-4 flex items-center justify-between text-xs text-dawn/60'>
										<span>Участников: {loop.members}</span>
										<button className='rounded-full border border-white/20 px-3 py-1 text-xs uppercase tracking-[0.2em] text-dawn/60 transition hover:border-accent-teal/50 hover:text-white'>
											присоединиться
										</button>
									</footer>
								</article>
							);
						})}
					</div>
				</div>

				<div className='rounded-[28px] border border-white/10 bg-white/5 p-6 backdrop-blur-2xl'>
					<header className='flex items-center gap-3 text-white'>
						<h2 className='text-xl font-semibold'>
							Служба сигналов
						</h2>
					</header>
					<div className='mt-6 space-y-4'>
						{feedCopy.alerts.map((alert) => (
							<article
								key={alert.id}
								className='rounded-[24px] border border-white/10 bg-white/5 p-4'
							>
								<p className='text-sm font-semibold text-white'>
									{alert.title}
								</p>
								<p className='mt-2 text-xs text-dawn/60'>
									{alert.details}
								</p>
								<span
									className={`mt-3 inline-flex rounded-full px-3 py-1 text-xs uppercase tracking-[0.2em] ${toneBadge[alert.tone]}`}
								>
									обновление
								</span>
							</article>
						))}
					</div>
				</div>
			</section>
		</DashboardLayout>
	);
}
