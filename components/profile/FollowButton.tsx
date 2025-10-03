'use client';

import { useState } from 'react';
import { LuUserPlus, LuUserMinus } from 'react-icons/lu';
import toast from 'react-hot-toast';
import { fetchJson } from '@/lib/frontend/fetch-json';

type FollowButtonProps = {
	userId: string;
	isFollowing: boolean;
	onToggleFollow?: (isFollowing: boolean) => void;
	size?: 'sm' | 'md' | 'lg';
};

export function FollowButton({
	userId,
	isFollowing: initialIsFollowing,
	onToggleFollow,
	size = 'md'
}: FollowButtonProps) {
	const [isFollowing, setIsFollowing] = useState(initialIsFollowing);
	const [isLoading, setIsLoading] = useState(false);

	const handleToggleFollow = async () => {
		setIsLoading(true);
		try {
			if (isFollowing) {
				// Отписка
				await fetchJson(`/api/users/${userId}/follow`, {
					method: 'DELETE',
				});
				setIsFollowing(false);
				onToggleFollow?.(false);
				toast.success('Отписка выполнена');
			} else {
				// Подписка
				await fetchJson(`/api/users/${userId}/follow`, {
					method: 'POST',
				});
				setIsFollowing(true);
				onToggleFollow?.(true);
				toast.success('Подписка оформлена');
			}
		} catch (error) {
			toast.error('Не удалось изменить подписку');
			console.error('Ошибка подписки:', error);
		} finally {
			setIsLoading(false);
		}
	};

	const sizeClasses = {
		sm: 'px-3 py-1 text-xs',
		md: 'px-4 py-2 text-sm',
		lg: 'px-6 py-3 text-base',
	};

	const iconSize = {
		sm: 'h-3 w-3',
		md: 'h-4 w-4',
		lg: 'h-5 w-5',
	};

	if (isFollowing) {
		return (
			<button
				onClick={handleToggleFollow}
				disabled={isLoading}
				className={`flex items-center gap-2 rounded-full border border-red-500/50 bg-red-500/10 text-red-400 transition hover:bg-red-500/20 disabled:cursor-not-allowed disabled:opacity-50 ${sizeClasses[size]}`}
			>
				<LuUserMinus className={iconSize[size]} />
				{isLoading ? 'Отписываемся...' : 'Отписаться'}
			</button>
		);
	}

	return (
		<button
			onClick={handleToggleFollow}
			disabled={isLoading}
			className={`flex items-center gap-2 rounded-full border border-accent-teal/50 bg-accent-teal/10 text-accent-teal transition hover:bg-accent-teal/20 disabled:cursor-not-allowed disabled:opacity-50 ${sizeClasses[size]}`}
		>
			<LuUserPlus className={iconSize[size]} />
			{isLoading ? 'Подписываемся...' : 'Подписаться'}
		</button>
	);
}