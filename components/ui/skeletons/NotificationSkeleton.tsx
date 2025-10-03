export function NotificationSkeleton() {
	return (
		<div className='rounded-[24px] border border-white/10 bg-white/5 p-4'>
			<div className='animate-pulse'>
				<div className='flex items-start justify-between gap-4'>
					<div className='flex-1 space-y-2'>
						<div className='h-4 w-3/4 rounded bg-white/10' />
						<div className='h-3 w-32 rounded bg-white/5' />
					</div>
					<div className='h-6 w-20 rounded-full bg-white/5' />
				</div>
			</div>
		</div>
	);
}