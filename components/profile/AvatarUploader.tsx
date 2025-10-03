'use client';

import { useState, useRef } from 'react';
import { HiOutlineCamera, HiOutlineTrash } from 'react-icons/hi2';
import toast from 'react-hot-toast';
import { fetchJson } from '@/lib/frontend/fetch-json';

type AvatarUploaderProps = {
	currentAvatar?: string | null;
	onAvatarChange: (avatarUrl: string | null) => void;
};

export function AvatarUploader({ currentAvatar, onAvatarChange }: AvatarUploaderProps) {
	const [isUploading, setIsUploading] = useState(false);
	const [previewUrl, setPreviewUrl] = useState<string | null>(currentAvatar || null);
	const fileInputRef = useRef<HTMLInputElement>(null);

	const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
		const file = event.target.files?.[0];
		if (!file) return;

		// Валидация файла
		if (!file.type.startsWith('image/')) {
			toast.error('Пожалуйста, выберите изображение');
			return;
		}

		if (file.size > 5 * 1024 * 1024) { // 5MB
			toast.error('Размер файла не должен превышать 5MB');
			return;
		}

		// Создаем preview
		const reader = new FileReader();
		reader.onload = (e) => {
			setPreviewUrl(e.target?.result as string);
		};
		reader.readAsDataURL(file);

		// Загружаем файл
		await uploadAvatar(file);
	};

	const uploadAvatar = async (file: File) => {
		setIsUploading(true);
		try {
			// Конвертируем в base64 для отправки
			const reader = new FileReader();
			reader.onload = async () => {
				try {
					const base64 = reader.result as string;
					const response = await fetchJson('/api/users/avatar', {
						method: 'POST',
						body: {
							image: base64,
							filename: file.name,
						},
					});

					onAvatarChange(response.avatarUrl);
					toast.success('Аватар обновлен!');
				} catch {
					toast.error('Не удалось загрузить аватар');
					setPreviewUrl(currentAvatar || null);
				} finally {
					setIsUploading(false);
				}
			};
			reader.readAsDataURL(file);
		} catch {
			toast.error('Ошибка при загрузке');
			setIsUploading(false);
		}
	};

	const handleRemoveAvatar = async () => {
		try {
			await fetchJson('/api/users/avatar', {
				method: 'DELETE',
			});

			setPreviewUrl(null);
			onAvatarChange(null);
			toast.success('Аватар удален');
		} catch {
			toast.error('Не удалось удалить аватар');
		}
	};

	const handleClick = () => {
		fileInputRef.current?.click();
	};

	return (
		<div className='flex flex-col items-center gap-4'>
			<div className='relative'>
				<div
					className='h-24 w-24 overflow-hidden rounded-full border-2 border-white/20 bg-gradient-to-br from-accent-purple/60 to-accent-teal/60'
				>
					{previewUrl ? (
						<img
							src={previewUrl}
							alt='Аватар'
							className='h-full w-full object-cover'
						/>
					) : (
						<div className='flex h-full w-full items-center justify-center text-2xl font-semibold text-white'>
							А
						</div>
					)}
				</div>

				{/* Кнопка загрузки */}
				<button
					onClick={handleClick}
					disabled={isUploading}
					className='absolute bottom-0 right-0 flex h-8 w-8 items-center justify-center rounded-full border-2 border-white bg-accent-teal text-white transition hover:bg-accent-teal/80 disabled:cursor-not-allowed disabled:opacity-50'
					aria-label='Изменить аватар'
				>
					{isUploading ? (
						<div className='h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent'></div>
					) : (
						<HiOutlineCamera className='h-4 w-4' />
					)}
				</button>
			</div>

			<div className='flex gap-2'>
				<button
					onClick={handleClick}
					disabled={isUploading}
					className='rounded-full border border-accent-teal/50 bg-accent-teal/10 px-4 py-2 text-xs text-accent-teal transition hover:bg-accent-teal/20 disabled:cursor-not-allowed disabled:opacity-50'
				>
					{isUploading ? 'Загружаем...' : previewUrl ? 'Изменить' : 'Загрузить'}
				</button>

				{previewUrl && (
					<button
						onClick={handleRemoveAvatar}
						className='rounded-full border border-red-500/50 bg-red-500/10 px-4 py-2 text-xs text-red-400 transition hover:bg-red-500/20'
					>
						<HiOutlineTrash className='h-3 w-3' />
					</button>
				)}
			</div>

			<input
				ref={fileInputRef}
				type='file'
				accept='image/*'
				onChange={handleFileSelect}
				className='hidden'
			/>

			<p className='text-xs text-dawn/60 text-center'>
				JPG, PNG или GIF. Максимум 5MB.
			</p>
		</div>
	);
}