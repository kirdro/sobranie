'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { ButtonSpinner } from '@/components/ui/Spinner';

type FormState = {
	email: string;
	password: string;
};

const initialState: FormState = {
	email: '',
	password: '',
};

export function LoginForm() {
	const router = useRouter();
	const [form, setForm] = useState(initialState);
	const [isLoading, setIsLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
		const { name, value } = event.target;
		setForm((prev) => ({ ...prev, [name]: value }));
	};

	const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		setIsLoading(true);
		setError(null);

		try {
			// Mock login for now - will be replaced with real authentication
			await new Promise((resolve) => setTimeout(resolve, 1000));
			toast.success('Вход выполнен успешно!');
			router.push('/dashboard');
		} catch {
			setError('Неверный email или пароль');
			toast.error('Ошибка входа');
		} finally {
			setIsLoading(false);
		}
	};

	return (
		<form
			onSubmit={handleSubmit}
			className='space-y-6'
		>
			<div className='space-y-2 text-center'>
				<h1 className='text-2xl font-semibold text-white'>
					Вход в Собрание
				</h1>
				<p className='text-sm text-dawn/70'>
					Используйте email и пароль для доступа к живой сети.
				</p>
			</div>

			<div className='space-y-4'>
				<label className='block text-left text-sm text-dawn/70'>
					Email
					<input
						className='mt-1 w-full rounded-2xl border border-white/10 bg-white/10 px-4 py-3 text-white outline-none transition focus:border-accent-teal'
						type='email'
						name='email'
						value={form.email}
						onChange={handleChange}
						required
						autoComplete='email'
					/>
				</label>
				<label className='block text-left text-sm text-dawn/70'>
					Пароль
					<input
						className='mt-1 w-full rounded-2xl border border-white/10 bg-white/10 px-4 py-3 text-white outline-none transition focus:border-accent-teal'
						type='password'
						name='password'
						value={form.password}
						onChange={handleChange}
						required
						autoComplete='current-password'
					/>
				</label>
			</div>

			{error && (
				<p className='rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-2 text-sm text-red-200'>
					{error}
				</p>
			)}

			<button
				type='submit'
				disabled={isLoading}
				className='flex w-full items-center justify-center rounded-2xl bg-gradient-to-r from-accent-purple via-accent-teal to-accent-amber px-4 py-3 text-sm font-semibold text-midnight transition disabled:opacity-50'
			>
				{isLoading && <ButtonSpinner />}
				{isLoading ? 'Входим...' : 'Войти'}
			</button>
		</form>
	);
}
