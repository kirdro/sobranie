'use client';

import Link from 'next/link';
import { useUnit } from 'effector-react';
import { MainNav } from './MainNav';
import { $isAuthenticated, $user, logoutTriggered } from '@/lib/effector';

export function Header() {
	const [isAuthenticated, user, onLogout] = useUnit([
		$isAuthenticated,
		$user,
		logoutTriggered,
	]);

	return (
		<header className='relative z-20 flex flex-col gap-6 px-6 pt-10 sm:px-10'>
			<div className='flex items-center justify-between'>
				<Link
					href='/'
					className='flex items-center gap-3'
				>
					<div className='relative flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10 shadow-neon'>
						<span className='text-xl font-bold text-white'>Сб</span>
						<div className='absolute inset-0 rounded-2xl border border-white/20' />
					</div>
					<div>
						<p className='font-display text-lg uppercase tracking-[0.3em] text-white'>
							Собрание
						</p>
						<p className='text-xs text-dawn/70'>
							социальная сеть нового созыва
						</p>
					</div>
				</Link>

				<div className='flex items-center gap-4'>
					<div className='hidden lg:block'>
						<MainNav />
					</div>

					{!isAuthenticated ?
						<div className='flex items-center gap-3'>
							<Link
								href='/login'
								className='rounded-2xl border border-white/20 bg-white/10 px-4 py-2 text-sm text-white transition hover:bg-white/20 hover:shadow-neon'
							>
								Войти
							</Link>
							<Link
								href='/register'
								className='rounded-2xl bg-gradient-to-r from-accent-purple via-accent-teal to-accent-amber px-4 py-2 text-sm font-semibold text-midnight transition hover:shadow-glow'
							>
								Регистрация
							</Link>
						</div>
					:	<div className='flex items-center gap-3'>
							<div className='rounded-2xl border border-white/20 bg-white/10 px-4 py-2 text-sm text-white'>
								{user?.name || 'Пользователь'}
							</div>
							<button
								onClick={() => onLogout()}
								className='rounded-2xl border border-white/20 bg-white/10 px-4 py-2 text-sm text-white transition hover:bg-white/20'
							>
								Выйти
							</button>
						</div>
					}
				</div>
			</div>

			<div className='lg:hidden'>
				<MainNav />
			</div>
		</header>
	);
}
