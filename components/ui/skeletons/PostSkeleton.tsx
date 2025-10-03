export function PostSkeleton() {
	return (
		<div className='rounded-[24px] border border-white/10 bg-white/5 p-6'>
			<div className='animate-pulse'>
				<div className='flex items-start gap-4'>
					<div className='h-12 w-12 rounded-full bg-white/10' />
					<div className='flex-1 space-y-3'>
						<div className='h-4 w-32 rounded bg-white/10' />
						<div className='h-3 w-24 rounded bg-white/5' />
					</div>
				</div>
				<div className='mt-4 space-y-2'>
					<div className='h-4 w-full rounded bg-white/10' />
					<div className='h-4 w-3/4 rounded bg-white/10' />
					<div className='h-4 w-5/6 rounded bg-white/5' />
				</div>
				<div className='mt-6 flex items-center gap-6'>
					<div className='h-8 w-16 rounded-full bg-white/5' />
					<div className='h-8 w-16 rounded-full bg-white/5' />
					<div className='h-8 w-16 rounded-full bg-white/5' />
				</div>
			</div>
		</div>
	);
}