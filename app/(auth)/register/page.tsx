import Link from 'next/link';

import { RegisterForm } from '@/components/auth/RegisterForm';

export default function RegisterPage() {
	return (
		<div className='space-y-6'>
			<RegisterForm />
			<p className='text-center text-sm text-dawn/60'>
				Уже с нами?{' '}
				<Link
					href='/login'
					className='text-accent-teal transition hover:text-white'
				>
					Войдите
				</Link>
			</p>
		</div>
	);
}
