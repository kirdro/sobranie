'use client';

import { useState, useEffect } from 'react';
import { HiOutlineChatBubbleLeft } from 'react-icons/hi2';
import type { Comment } from '@/lib/api/types';
import { fetchJson } from '@/lib/frontend/fetch-json';
import { formatRelativeTime } from '@/lib/utils/datetime';
import { initialsFromName } from '@/lib/data/feed';

type CommentsListProps = {
	postId: string;
	isOpen: boolean;
	onClose: () => void;
};

export function CommentsList({ postId, isOpen, onClose }: CommentsListProps) {
	const [comments, setComments] = useState<Comment[]>([]);
	const [isLoading, setIsLoading] = useState(false);
	const [newComment, setNewComment] = useState('');
	const [isSubmitting, setIsSubmitting] = useState(false);

	useEffect(() => {
		if (isOpen && postId) {
			loadComments();
		}
	}, [isOpen, postId]);

	const loadComments = async () => {
		setIsLoading(true);
		try {
			const response = await fetchJson(`/api/posts/${postId}/comments`);
			setComments(response.data || []);
		} catch (error) {
			console.error('Ошибка загрузки комментариев:', error);
		} finally {
			setIsLoading(false);
		}
	};

	const handleSubmitComment = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!newComment.trim()) return;

		setIsSubmitting(true);
		try {
			const comment = await fetchJson(`/api/posts/${postId}/comments`, {
				method: 'POST',
				body: { content: newComment.trim() },
			});

			setComments(prev => [...prev, comment]);
			setNewComment('');
		} catch (error) {
			console.error('Ошибка создания комментария:', error);
		} finally {
			setIsSubmitting(false);
		}
	};

	if (!isOpen) return null;

	return (
		<div className='fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm'>
			<div className='mx-4 w-full max-w-2xl max-h-[80vh] rounded-[28px] border border-white/10 bg-midnight/95 backdrop-blur-xl overflow-hidden flex flex-col'>
				<header className='flex items-center justify-between p-6 border-b border-white/10'>
					<div className='flex items-center gap-3'>
						<HiOutlineChatBubbleLeft className='h-5 w-5 text-accent-purple' />
						<h2 className='text-lg font-semibold text-white'>
							Комментарии
						</h2>
					</div>
					<button
						onClick={onClose}
						className='flex h-8 w-8 items-center justify-center rounded-full text-dawn/60 transition hover:bg-white/10 hover:text-white'
						aria-label='Закрыть'
					>
						<span className='text-lg'>×</span>
					</button>
				</header>

				<div className='flex-1 overflow-y-auto p-6'>
					{isLoading ? (
						<div className='flex items-center justify-center py-8'>
							<div className='animate-spin rounded-full h-8 w-8 border-b-2 border-accent-teal'></div>
						</div>
					) : comments.length === 0 ? (
						<div className='text-center py-8 text-dawn/60'>
							<HiOutlineChatBubbleLeft className='h-12 w-12 mx-auto mb-3 opacity-50' />
							<p>Пока нет комментариев</p>
							<p className='text-xs mt-1'>Станьте первым, кто оставит комментарий!</p>
						</div>
					) : (
						<div className='space-y-4'>
							{comments.map((comment) => (
								<div key={comment.id} className='flex gap-3'>
									<div className='flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-accent-purple/60 to-accent-teal/60 text-xs font-semibold text-white'>
										{comment.author ?
											initialsFromName(comment.author.name)
										:	'У'
										}
									</div>
									<div className='flex-1'>
										<div className='flex items-baseline gap-2 mb-1'>
											<p className='text-sm font-medium text-white'>
												{comment.author?.name || 'Пользователь'}
											</p>
											<span className='text-xs text-dawn/50'>
												{formatRelativeTime(comment.createdAt)}
											</span>
										</div>
										<p className='text-sm text-dawn/80 leading-relaxed'>
											{comment.content}
										</p>
									</div>
								</div>
							))}
						</div>
					)}
				</div>

				<footer className='p-6 border-t border-white/10'>
					<form onSubmit={handleSubmitComment} className='space-y-3'>
						<textarea
							value={newComment}
							onChange={(e) => setNewComment(e.target.value)}
							placeholder='Написать комментарий...'
							className='w-full resize-none rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-dawn/80 placeholder:text-dawn/40 focus:border-accent-teal/60 focus:outline-none focus:ring-2 focus:ring-accent-teal/40'
							rows={3}
							maxLength={500}
						/>
						<div className='flex justify-between items-center'>
							<span className='text-xs text-dawn/40'>
								{newComment.length}/500
							</span>
							<button
								type='submit'
								disabled={!newComment.trim() || isSubmitting}
								className='rounded-full bg-gradient-to-r from-accent-purple to-accent-teal px-6 py-2 text-sm font-semibold text-white transition hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-50'
							>
								{isSubmitting ? 'Отправляем...' : 'Отправить'}
							</button>
						</div>
					</form>
				</footer>
			</div>
		</div>
	);
}