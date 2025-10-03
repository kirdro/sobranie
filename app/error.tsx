'use client';

import { useEffect } from 'react';
import { HiOutlineExclamationTriangle } from 'react-icons/hi2';

export default function Error({
	error,
	reset,
}: {
	error: Error & { digest?: string };
	reset: () => void;
}) {
	useEffect(() => {
		// Логируем ошибку в консоль в dev режиме
		if (process.env.NODE_ENV === 'development') {
			console.error('Global error boundary caught:', error);
		}
	}, [error]);

	return (
		<div className='min-h-screen bg-midnight flex items-center justify-center p-4'>
			<div className='max-w-md w-full'>
				<div className='rounded-[28px] border border-red-500/30 bg-red-500/10 p-8 text-center backdrop-blur-2xl'>
					<div className='mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-red-500/20'>
						<HiOutlineExclamationTriangle className='h-8 w-8 text-red-400' />
					</div>

					<h1 className='mb-4 text-2xl font-bold text-white'>
						Что-то пошло не так
					</h1>

					<p className='mb-6 text-sm text-red-200'>
						Произошла неожиданная ошибка. Мы уже работаем над её исправлением.
					</p>

					{process.env.NODE_ENV === 'development' && (
						<details className='mb-6 text-left'>
							<summary className='cursor-pointer text-sm text-red-300'>
								Подробности ошибки
							</summary>
							<pre className='mt-2 rounded-lg bg-red-950/50 p-3 text-xs text-red-200 overflow-auto'>
								{error.message}
								{error.stack && '\n\n' + error.stack}
							</pre>
						</details>
					)}

					<button
						onClick={reset}
						className='inline-flex items-center gap-2 rounded-full bg-red-500 px-6 py-3 text-sm font-semibold text-white transition hover:bg-red-600 hover:-translate-y-0.5'
					>
						Попробовать снова
					</button>
				</div>
			</div>
		</div>
	);
}