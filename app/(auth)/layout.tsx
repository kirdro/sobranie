import Image from 'next/image';
import Link from 'next/link';

export default function AuthLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	return (
		<div className='flex flex-1 items-center justify-center py-12'>
			<div className='w-full max-w-md space-y-8'>
				<Link
					href='/'
					className='flex justify-center'
				>
					<Image
						src='/logo.svg'
						alt='Sobranie'
						width={250}
						height={80}
						className='h-16 w-auto transition-opacity hover:opacity-90'
						priority
					/>
				</Link>
				<div className='rounded-3xl border border-white/10 bg-white/10 p-8 shadow-2xl backdrop-blur-xl'>
					{children}
				</div>
			</div>
		</div>
	);
}
