'use client';

import { HiOutlineCpuChip } from 'react-icons/hi2';
import { LuNetwork } from 'react-icons/lu';

import { AssistantPanel } from '@components/llm/AssistantPanel';
import { DashboardLayout } from '@components/dashboard/DashboardLayout';
import { llmCopy } from '@/lib/content/llm';

export function LlmShell() {
	return (
		<DashboardLayout hero={llmCopy.hero}>
			<section className='rounded-[28px] border border-white/10 bg-white/5 p-6 backdrop-blur-2xl'>
				<div className='flex items-center gap-3 text-white'>
					<HiOutlineCpuChip className='h-6 w-6' />
					<h2 className='text-xl font-semibold'>Режимы проводника</h2>
				</div>
				<p className='mt-4 text-sm text-dawn/70'>{llmCopy.modesLead}</p>
				<div className='mt-6 grid gap-4 md:grid-cols-3'>
					{llmCopy.modes.map((mode) => (
						<article
							key={mode.id}
							className='relative overflow-hidden rounded-[24px] border border-white/10 bg-white/5 p-4'
						>
							<div
								className={`absolute inset-0 bg-gradient-to-br ${mode.accent} opacity-40`}
							/>
							<div className='relative z-10 space-y-3 text-sm text-dawn/70'>
								<p className='text-base font-semibold text-white'>
									{mode.title}
								</p>
								<p>{mode.description}</p>
							</div>
						</article>
					))}
				</div>
			</section>

			<AssistantPanel />

			<section className='rounded-[28px] border border-white/10 bg-white/5 p-6 backdrop-blur-2xl'>
				<div className='flex items-center gap-2 text-sm uppercase tracking-[0.2em] text-dawn/60'>
					<LuNetwork className='h-5 w-5' />
					{llmCopy.context.label}
				</div>
				<h2 className='mt-4 text-xl font-semibold text-white'>
					{llmCopy.context.title}
				</h2>
				<ul className='mt-6 space-y-4 text-sm text-dawn/70'>
					{llmCopy.context.bullets.map((item) => (
						<li key={item.title}>
							<span className='font-medium text-white'>
								{item.title}.
							</span>{' '}
							{item.description}
						</li>
					))}
				</ul>
				<div className='mt-6 grid gap-4 rounded-[24px] border border-white/10 bg-white/5 p-6 text-sm text-dawn/70 md:grid-cols-2'>
					{llmCopy.context.narrative.map((paragraph, index) => (
						<p key={index}>{paragraph}</p>
					))}
				</div>
			</section>
		</DashboardLayout>
	);
}
