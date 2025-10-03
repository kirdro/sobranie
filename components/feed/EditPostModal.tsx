'use client';

import { useState, useEffect } from 'react';
import { useUnit } from 'effector-react';
import { HiOutlineXMark } from 'react-icons/hi2';
import toast from 'react-hot-toast';
import {
	postEditRequested,
	$createPostLoading,
	postModalClosed,
	$postModalOpen,
	$postModalData,
} from '@/lib/effector';

const MIN_POST_LENGTH = 10;
const MAX_POST_LENGTH = 1000;

export function EditPostModal() {
	const [isOpen, post, isLoading, closeModal, savePost] = useUnit([
		$postModalOpen,
		$postModalData,
		$createPostLoading,
		postModalClosed,
		postEditRequested,
	]);

	const [content, setContent] = useState('');
	const [tags, setTags] = useState('');

	useEffect(() => {
		if (post) {
			setContent(post.content);
			setTags(Array.isArray(post.tags) ? post.tags.join(', ') : '');
		}
	}, [post]);

	const handleSave = () => {
		if (!post) return;

		const trimmedContent = content.trim();
		if (trimmedContent.length < MIN_POST_LENGTH) {
			toast.error(`Минимальная длина поста ${MIN_POST_LENGTH} символов`);
			return;
		}

		const tagsArray = tags
			.split(',')
			.map(tag => tag.trim())
			.filter(tag => tag.length > 0);

		savePost({
			postId: post.id,
			content: trimmedContent,
			tags: tagsArray,
		});

		toast.success('Пост обновлен!');
		closeModal();
	};

	const handleClose = () => {
		closeModal();
		setContent('');
		setTags('');
	};

	if (!isOpen || !post) return null;

	const isValid = content.trim().length >= MIN_POST_LENGTH && content.trim().length <= MAX_POST_LENGTH;

	return (
		<div className='fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm'>
			<div className='mx-4 w-full max-w-2xl rounded-[28px] border border-white/10 bg-midnight/95 p-6 backdrop-blur-xl'>
				<header className='mb-6 flex items-center justify-between'>
					<h2 className='text-xl font-semibold text-white'>
						Редактировать пост
					</h2>
					<button
						onClick={handleClose}
						className='flex h-8 w-8 items-center justify-center rounded-full text-dawn/60 transition hover:bg-white/10 hover:text-white'
						aria-label='Закрыть'
					>
						<HiOutlineXMark className='h-5 w-5' />
					</button>
				</header>

				<div className='space-y-4'>
					<div>
						<label className='block text-sm font-medium text-dawn/70 mb-2'>
							Содержание поста
						</label>
						<textarea
							value={content}
							onChange={(e) => setContent(e.target.value)}
							placeholder='О чем хотите написать?'
							maxLength={MAX_POST_LENGTH}
							className='w-full min-h-[120px] resize-none rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-dawn/80 placeholder:text-dawn/40 focus:border-accent-teal/60 focus:outline-none focus:ring-2 focus:ring-accent-teal/40'
						/>
						<div className='mt-1 flex justify-end text-xs'>
							<span
								className={`${
									content.trim().length < MIN_POST_LENGTH
										? 'text-red-400'
										: content.trim().length > MAX_POST_LENGTH * 0.9
										? 'text-amber-400'
										: 'text-dawn/40'
								}`}
							>
								{content.trim().length}/{MAX_POST_LENGTH}
							</span>
						</div>
					</div>

					<div>
						<label className='block text-sm font-medium text-dawn/70 mb-2'>
							Теги (через запятую)
						</label>
						<input
							value={tags}
							onChange={(e) => setTags(e.target.value)}
							placeholder='react, typescript, разработка'
							className='w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-dawn/80 placeholder:text-dawn/40 focus:border-accent-teal/60 focus:outline-none focus:ring-2 focus:ring-accent-teal/40'
						/>
					</div>
				</div>

				<footer className='mt-6 flex gap-3 justify-end'>
					<button
						onClick={handleClose}
						className='rounded-full border border-white/20 bg-white/5 px-6 py-2 text-sm text-dawn/80 transition hover:border-white/40 hover:bg-white/10 hover:text-white'
					>
						Отмена
					</button>
					<button
						onClick={handleSave}
						disabled={!isValid || isLoading}
						className='rounded-full bg-gradient-to-r from-accent-purple to-accent-teal px-6 py-2 text-sm font-semibold text-white transition hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-50'
					>
						{isLoading ? 'Сохраняем...' : 'Сохранить'}
					</button>
				</footer>
			</div>
		</div>
	);
}