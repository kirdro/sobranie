'use client';

import { useState, useEffect } from 'react';
import { LuX, LuUsers, LuUserPlus } from 'react-icons/lu';
import { fetchJson } from '@/lib/frontend/fetch-json';
import { initialsFromName } from '@/lib/data/feed';

type User = {
	id: string;
	name: string;
	email: string;
	avatar: string | null;
	followedAt: string;
};

type FollowersModalProps = {
	isOpen: boolean;
	onClose: () => void;
	userId: string;
	type: 'followers' | 'following';
};

export function FollowersModal({ isOpen, onClose, userId, type }: FollowersModalProps) {
	const [users, setUsers] = useState<User[]>([]);
	const [isLoading, setIsLoading] = useState(false);
	const [page, setPage] = useState(1);
	const [hasMore, setHasMore] = useState(true);

	useEffect(() => {
		if (isOpen) {
			loadUsers();
		}
	}, [isOpen, type, userId]);

	const loadUsers = async (pageNum = 1) => {
		setIsLoading(true);
		try {
			const endpoint = type === 'followers' ? 'followers' : 'following';
			const response = await fetchJson(`/api/users/${userId}/${endpoint}?page=${pageNum}&limit=20`);

			const newUsers = response[type] || [];

			if (pageNum === 1) {
				setUsers(newUsers);
			} else {
				setUsers((prev) => [...prev, ...newUsers]);
			}

			setHasMore(newUsers.length === 20);
			setPage(pageNum);
		} catch (error) {
			console.error(`Ошибка загрузки ${type}:`, error);
		} finally {
			setIsLoading(false);
		}
	};

	const loadMore = () => {
		if (!isLoading && hasMore) {
			loadUsers(page + 1);
		}
	};

	if (!isOpen) return null;

	const title = type === 'followers' ? 'Подписчики' : 'Подписки';
	const Icon = type === 'followers' ? LuUsers : LuUserPlus;

	return (
		<div className='fixed inset-0 z-50 flex items-center justify-center bg-midnight/80 backdrop-blur-sm'>
			<div className='mx-4 w-full max-w-md rounded-[28px] border border-white/10 bg-midnight/90 backdrop-blur-2xl'>
				{/* Header */}
				<div className='flex items-center justify-between border-b border-white/10 p-6'>
					<div className='flex items-center gap-3'>
						<Icon className='h-5 w-5 text-accent-teal' />
						<h2 className='text-lg font-semibold text-white'>{title}</h2>
					</div>
					<button
						onClick={onClose}
						className='flex h-8 w-8 items-center justify-center rounded-full border border-white/10 text-dawn/60 transition hover:border-white/20 hover:text-white'
					>
						<LuX className='h-4 w-4' />
					</button>
				</div>

				{/* Content */}
				<div className='max-h-96 overflow-y-auto p-6'>
					{isLoading && users.length === 0 ? (
						<div className='py-8 text-center'>
							<div className='mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-2 border-accent-teal border-t-transparent'></div>
							<p className='text-dawn/60'>Загрузка...</p>
						</div>
					) : users.length === 0 ? (
						<div className='py-8 text-center'>
							<Icon className='mx-auto mb-4 h-12 w-12 text-dawn/30' />
							<p className='text-dawn/60'>
								{type === 'followers' ? 'Пока нет подписчиков' : 'Пока нет подписок'}
							</p>
						</div>
					) : (
						<div className='space-y-4'>
							{users.map((user) => (
								<div
									key={user.id}
									className='flex items-center gap-4 rounded-2xl border border-white/5 bg-white/5 p-4 transition hover:border-white/10 hover:bg-white/10'
								>
									{/* Avatar */}
									<div className='relative'>
										{user.avatar ? (
											<div className='h-12 w-12 overflow-hidden rounded-full border border-white/10'>
												<img
													src={user.avatar}
													alt={user.name}
													className='h-full w-full object-cover'
												/>
											</div>
										) : (
											<div className='flex h-12 w-12 items-center justify-center rounded-full border border-white/10 bg-gradient-to-br from-accent-purple/30 to-accent-teal/30 text-sm font-semibold text-white'>
												{initialsFromName(user.name)}
											</div>
										)}
									</div>

									{/* User Info */}
									<div className='flex-1'>
										<p className='font-medium text-white'>{user.name}</p>
										<p className='text-xs text-dawn/60'>{user.email}</p>
									</div>

									{/* Follow Date */}
									<div className='text-xs text-dawn/50'>
										{new Date(user.followedAt).toLocaleDateString('ru-RU', {
											day: 'numeric',
											month: 'short',
										})}
									</div>
								</div>
							))}

							{/* Load More Button */}
							{hasMore && (
								<div className='pt-4 text-center'>
									<button
										onClick={loadMore}
										disabled={isLoading}
										className='rounded-full border border-accent-teal/50 bg-accent-teal/10 px-4 py-2 text-sm text-accent-teal transition hover:bg-accent-teal/20 disabled:opacity-50'
									>
										{isLoading ? 'Загрузка...' : 'Показать еще'}
									</button>
								</div>
							)}
						</div>
					)}
				</div>
			</div>
		</div>
	);
}