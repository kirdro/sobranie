'use client';

import { useState } from 'react';
import { useUnit } from 'effector-react';
import {
	HiOutlineHeart,
	HiHeart,
	HiOutlineArrowPath,
	HiOutlineChatBubbleLeft,
	HiOutlineEllipsisHorizontal,
	HiOutlinePencilSquare,
	HiOutlineTrash
} from 'react-icons/hi2';
import toast from 'react-hot-toast';
import { CommentsList } from './CommentsList';
import {
	postLiked,
	postUnliked,
	postReposted,
	postUnreposted,
	postDeleted,
	postModalOpened,
	$isAuthenticated
} from '@/lib/effector';

type PostActionsProps = {
	post: {
		id: string;
		content: string;
		tags?: string[];
		is_liked: boolean;
		is_reposted: boolean;
		likes_count: number;
		reposts_count: number;
		comments_count: number;
		authorId: string;
	};
	isOwnPost?: boolean;
};

export function PostActions({
	post,
	isOwnPost = false,
}: PostActionsProps) {
	const [showMenu, setShowMenu] = useState(false);
	const [showComments, setShowComments] = useState(false);
	const [isAuthenticated] = useUnit([$isAuthenticated]);

	const handleLike = () => {
		if (!isAuthenticated) {
			toast.error('Войдите в систему для взаимодействия с постами');
			return;
		}
		if (post.is_liked) {
			postUnliked(post.id);
		} else {
			postLiked(post.id);
		}
	};

	const handleRepost = () => {
		if (!isAuthenticated) {
			toast.error('Войдите в систему для взаимодействия с постами');
			return;
		}
		if (post.is_reposted) {
			postUnreposted(post.id);
		} else {
			postReposted(post.id);
		}
	};

	const handleComment = () => {
		if (!isAuthenticated) {
			toast.error('Войдите в систему для взаимодействия с постами');
			return;
		}
		setShowComments(true);
	};

	const handleEdit = () => {
		postModalOpened(post);
		setShowMenu(false);
	};

	const handleDelete = () => {
		if (confirm('Вы уверены, что хотите удалить этот пост?')) {
			postDeleted(post.id);
			toast.success('Пост удален');
		}
		setShowMenu(false);
	};

	return (
		<footer className='mt-6 flex items-center justify-between'>
			<div className='flex items-center gap-6 text-xs text-dawn/60'>
				{/* Лайки */}
				<button
					onClick={handleLike}
					disabled={!isAuthenticated}
					className={`flex items-center gap-2 transition hover:text-red-400 disabled:cursor-not-allowed disabled:opacity-50 ${
						post.is_liked ? 'text-red-400' : ''
					}`}
					aria-label={post.is_liked ? 'Убрать лайк' : 'Поставить лайк'}
				>
					{post.is_liked ?
						<HiHeart className='h-4 w-4' />
					:	<HiOutlineHeart className='h-4 w-4' />
					}
					{post.likes_count}
				</button>

				{/* Репосты */}
				<button
					onClick={handleRepost}
					disabled={!isAuthenticated}
					className={`flex items-center gap-2 transition hover:text-accent-teal disabled:cursor-not-allowed disabled:opacity-50 ${
						post.is_reposted ? 'text-accent-teal' : ''
					}`}
					aria-label={post.is_reposted ? 'Отменить репост' : 'Репостнуть'}
				>
					<HiOutlineArrowPath className='h-4 w-4' />
					{post.reposts_count}
				</button>

				{/* Комментарии */}
				<button
					onClick={handleComment}
					disabled={!isAuthenticated}
					className='flex items-center gap-2 transition hover:text-accent-purple disabled:cursor-not-allowed disabled:opacity-50'
					aria-label='Комментировать'
				>
					<HiOutlineChatBubbleLeft className='h-4 w-4' />
					{post.comments_count}
				</button>
			</div>

			{/* Меню действий (для собственных постов) */}
			{isOwnPost && isAuthenticated && (
				<div className='relative'>
					<button
						onClick={() => setShowMenu(!showMenu)}
						className='flex h-8 w-8 items-center justify-center rounded-full text-dawn/60 transition hover:bg-white/10 hover:text-white'
						aria-label='Меню действий'
					>
						<HiOutlineEllipsisHorizontal className='h-4 w-4' />
					</button>

					{showMenu && (
						<div className='absolute right-0 top-full z-10 mt-2 min-w-[120px] rounded-2xl border border-white/10 bg-midnight/90 p-2 backdrop-blur-xl'>
							<button
								onClick={handleEdit}
								className='flex w-full items-center gap-3 rounded-xl px-3 py-2 text-xs text-dawn/80 transition hover:bg-white/10 hover:text-white'
							>
								<HiOutlinePencilSquare className='h-4 w-4' />
								Редактировать
							</button>
							<button
								onClick={handleDelete}
								className='flex w-full items-center gap-3 rounded-xl px-3 py-2 text-xs text-red-400 transition hover:bg-red-500/20 hover:text-red-300'
							>
								<HiOutlineTrash className='h-4 w-4' />
								Удалить
							</button>
						</div>
					)}
				</div>
			)}

			<CommentsList
				postId={post.id}
				isOpen={showComments}
				onClose={() => setShowComments(false)}
			/>
		</footer>
	);
}