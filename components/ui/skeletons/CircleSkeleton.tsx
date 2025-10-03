export function CircleSkeleton() {
	return (
		<div className='rounded-[24px] border border-white/10 bg-white/5 p-4'>
			<div className='animate-pulse space-y-3'>
				<div className='flex items-center justify-between'>
					<div>
						<div className='h-5 w-32 rounded bg-white/10' />
						<div className='mt-2 h-3 w-24 rounded bg-white/5' />
					</div>
					<div className='h-6 w-20 rounded-full bg-white/5' />
				</div>
				<div className='h-4 w-full rounded bg-white/10' />
				<div className='h-4 w-3/4 rounded bg-white/5' />
				<div className='mt-4 flex items-center justify-between'>
					<div className='h-3 w-24 rounded bg-white/5' />
					<div className='h-6 w-28 rounded-full bg-white/5' />
				</div>
			</div>
		</div>
	);
}