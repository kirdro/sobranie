'use client';

import { FormEvent, useEffect, useState } from 'react';
import { useUnit } from 'effector-react';
import { HiOutlineSparkles } from 'react-icons/hi';
import toast from 'react-hot-toast';
import {
	postCreated,
	$createPostLoading,
	$isAuthenticated,
	createPostFx,
} from '@/lib/effector';
import { ButtonSpinner } from '@/components/ui/Spinner';

type FeedComposerProps = {
	placeholder: string;
	aiLabel: string;
	submitLabel: string;
	suggestions: string[];
	onSubmit?: (value: string) => Promise<void> | void;
};

const MIN_POST_LENGTH = 10;
const MAX_POST_LENGTH = 1000;

export function FeedComposer({
	placeholder,
	aiLabel,
	submitLabel,
	suggestions,
	onSubmit,
}: FeedComposerProps) {
	const [value, setValue] = useState('');
	const [localSuggestions, setLocalSuggestions] =
		useState<string[]>(suggestions);
	const [error, setError] = useState<string | null>(null);

	// Use Effector stores
	const [isAuthenticated, isCreatingPost, onCreatePost] = useUnit([
		$isAuthenticated,
		$createPostLoading,
		postCreated,
	]);

	useEffect(() => {
		setLocalSuggestions(suggestions);
	}, [suggestions]);

	// Toast notifications for post creation
	useEffect(() => {
		const unsubscribeDone = createPostFx.doneData.watch(() => {
			toast.success('Пост успешно создан!');
		});

		const unsubscribeFail = createPostFx.failData.watch((error) => {
			toast.error('Не удалось создать пост');
		});

		return () => {
			unsubscribeDone();
			unsubscribeFail();
		};
	}, []);

	const rotateSuggestions = () => {
		setLocalSuggestions((prev) => {
			if (!prev.length) {
				return prev;
			}
			return prev.slice(1).concat(prev[0]);
		});
	};

	const validatePost = (text: string): string | null => {
		const trimmed = text.trim();
		if (trimmed.length < MIN_POST_LENGTH) {
			return `Минимальная длина поста ${MIN_POST_LENGTH} символов`;
		}
		if (trimmed.length > MAX_POST_LENGTH) {
			return `Максимальная длина поста ${MAX_POST_LENGTH} символов`;
		}
		return null;
	};

	const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		const trimmed = value.trim();
		if (!trimmed) return;

		if (!isAuthenticated) {
			setError('Войдите в систему, чтобы создать пост');
			return;
		}

		const validationError = validatePost(trimmed);
		if (validationError) {
			setError(validationError);
			return;
		}

		setError(null);
		try {
			// Use Effector event for post creation
			onCreatePost({
				content: trimmed,
				visibility: 'public',
				tags: [],
			});

			// Also call legacy onSubmit if provided
			await onSubmit?.(trimmed);
			setValue('');
		} catch (submitError) {
			setError(
				submitError instanceof Error ?
					submitError.message
				:	'Не удалось отправить пост',
			);
		}
	};

	const handleSuggestion = (next: string) => {
		setValue(next);
	};

	return (
		<section className='surface-panel rounded-[20px] border border-white/10 bg-white/5 p-4 backdrop-blur-2xl sm:rounded-[28px] sm:p-6'>
			<form
				className='space-y-4 sm:space-y-6'
				onSubmit={handleSubmit}
			>
				<div className='flex items-start gap-3 sm:items-center sm:gap-4'>
					<div className='flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-accent-purple/60 to-accent-teal/60 text-sm font-semibold text-white sm:h-12 sm:w-12 sm:text-lg'>
						Сб
					</div>
					<div className='flex-1'>
						<textarea
							value={value}
							onChange={(event) => setValue(event.target.value)}
							placeholder={placeholder}
							maxLength={MAX_POST_LENGTH}
							className='min-h-[70px] w-full resize-none rounded-2xl border border-white/10 bg-midnight/60 px-3 py-3 text-sm text-dawn/70 placeholder:text-dawn/40 focus:border-accent-teal/60 focus:outline-none focus:ring-2 focus:ring-accent-teal/40 sm:min-h-[84px] sm:px-5 sm:py-4'
							aria-label={placeholder}
						/>
						<div className='mt-1 flex justify-end text-xs text-dawn/40'>
							<span
								className={`${
									value.trim().length < MIN_POST_LENGTH
										? 'text-red-400'
										: value.trim().length > MAX_POST_LENGTH * 0.9
										? 'text-amber-400'
										: 'text-dawn/40'
								}`}
							>
								{value.trim().length}/{MAX_POST_LENGTH}
							</span>
						</div>
					</div>
					<button
						type='button'
						onClick={() => rotateSuggestions()}
						className='hidden rounded-full border border-white/20 bg-white/5 px-3 py-2 text-xs uppercase tracking-[0.2em] text-dawn/60 transition hover:border-accent-teal/40 hover:text-white sm:px-4 lg:block'
					>
						{aiLabel}
					</button>
				</div>
				<div className='flex flex-wrap items-center gap-2 text-xs uppercase tracking-[0.25em] text-dawn/50 sm:gap-3'>
					{localSuggestions.slice(0, 3).map((suggestion) => (
						<button
							key={suggestion}
							type='button'
							onClick={() => handleSuggestion(suggestion)}
							className='min-h-[44px] rounded-full border border-white/10 bg-white/5 px-3 py-2 text-dawn/70 transition hover:border-accent-teal/40 hover:bg-accent-teal/20 hover:text-white sm:px-4'
						>
							{suggestion}
						</button>
					))}
					{localSuggestions.length > 3 && (
						<button
							type='button'
							onClick={() => rotateSuggestions()}
							className='min-h-[44px] rounded-full border border-white/20 bg-white/5 px-3 py-2 text-xs uppercase tracking-[0.2em] text-dawn/60 transition hover:border-accent-teal/40 hover:text-white lg:hidden'
						>
							{aiLabel}
						</button>
					)}
				</div>
				{error ?
					<p className='rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-2 text-xs text-red-200'>
						{error}
					</p>
				:	null}
				<div className='flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4'>
					<span className='flex items-center gap-2 rounded-full border border-white/5 bg-white/5 px-3 py-2 text-xs uppercase tracking-[0.25em] text-dawn/70 sm:order-first'>
						<HiOutlineSparkles className='h-4 w-4 text-accent-teal' />
						{aiLabel}
					</span>
					<button
						type='submit'
						disabled={
							isCreatingPost ||
							value.trim().length === 0 ||
							!isAuthenticated
						}
						className='inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-full bg-white px-5 py-3 text-xs font-semibold uppercase tracking-[0.25em] text-midnight transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:bg-white/40 disabled:text-midnight/60 sm:w-auto sm:py-2'
						aria-busy={isCreatingPost}
					>
						{isCreatingPost && <ButtonSpinner size='sm' />}
						{isCreatingPost ? 'Отправка...' : submitLabel}
					</button>
				</div>
			</form>
		</section>
	);
}
