'use client';

import { useState, useEffect, useRef } from 'react';
import { LuSend, LuArrowLeft } from 'react-icons/lu';
import toast from 'react-hot-toast';
import { fetchJson } from '@/lib/frontend/fetch-json';
import { initialsFromName } from '@/lib/data/feed';

type Message = {
	id: string;
	senderId: string;
	senderName: string;
	senderAvatar: string | null;
	content: string;
	isRead: boolean;
	createdAt: string;
};

type Conversation = {
	id: string;
	participantId: string;
	participantName: string;
	participantAvatar: string | null;
	lastMessage: string;
	lastMessageAt: string;
	unreadCount: number;
};

type ChatViewProps = {
	conversation: Conversation;
	onBack: () => void;
};

export function ChatView({ conversation, onBack }: ChatViewProps) {
	const [messages, setMessages] = useState<Message[]>([]);
	const [newMessage, setNewMessage] = useState('');
	const [isLoading, setIsLoading] = useState(true);
	const [isSending, setIsSending] = useState(false);
	const messagesEndRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		loadMessages();
		markAsRead();
	}, [conversation.id]);

	useEffect(() => {
		scrollToBottom();
	}, [messages]);

	const loadMessages = async () => {
		setIsLoading(true);
		try {
			const response = await fetchJson(`/api/messages/${conversation.id}`);
			setMessages(response.messages || []);
		} catch (error) {
			console.error('Ошибка загрузки сообщений:', error);
			toast.error('Не удалось загрузить сообщения');
		} finally {
			setIsLoading(false);
		}
	};

	const markAsRead = async () => {
		try {
			await fetchJson(`/api/messages/${conversation.id}`, {
				method: 'PATCH',
			});
		} catch (error) {
			console.error('Ошибка отметки как прочитанное:', error);
		}
	};

	const scrollToBottom = () => {
		messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
	};

	const handleSendMessage = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!newMessage.trim() || isSending) return;

		const messageText = newMessage.trim();
		setNewMessage('');
		setIsSending(true);

		try {
			const response = await fetchJson('/api/messages', {
				method: 'POST',
				body: {
					receiverId: conversation.participantId,
					content: messageText,
				},
			});

			// Добавляем новое сообщение в список
			const sentMessage: Message = {
				id: response.data.id,
				senderId: 'current_user',
				senderName: 'Вы',
				senderAvatar: null,
				content: messageText,
				isRead: false,
				createdAt: response.data.createdAt,
			};

			setMessages((prev) => [...prev, sentMessage]);
			toast.success('Сообщение отправлено');
		} catch (error) {
			console.error('Ошибка отправки сообщения:', error);
			toast.error('Не удалось отправить сообщение');
			setNewMessage(messageText); // Восстанавливаем текст
		} finally {
			setIsSending(false);
		}
	};

	const formatTime = (dateString: string) => {
		const date = new Date(dateString);
		return date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
	};

	const formatDate = (dateString: string) => {
		const date = new Date(dateString);
		const today = new Date();
		const yesterday = new Date(today);
		yesterday.setDate(yesterday.getDate() - 1);

		if (date.toDateString() === today.toDateString()) {
			return 'Сегодня';
		} else if (date.toDateString() === yesterday.toDateString()) {
			return 'Вчера';
		} else {
			return date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' });
		}
	};

	const groupMessagesByDate = (messages: Message[]) => {
		const groups: { [key: string]: Message[] } = {};
		messages.forEach((message) => {
			const date = new Date(message.createdAt).toDateString();
			if (!groups[date]) {
				groups[date] = [];
			}
			groups[date].push(message);
		});
		return groups;
	};

	const messageGroups = groupMessagesByDate(messages);

	return (
		<div className='flex h-full flex-col'>
			{/* Header */}
			<div className='flex items-center gap-4 border-b border-white/10 p-4'>
				<button
					onClick={onBack}
					className='flex h-8 w-8 items-center justify-center rounded-full border border-white/10 text-dawn/60 transition hover:border-white/20 hover:text-white lg:hidden'
				>
					<LuArrowLeft className='h-4 w-4' />
				</button>

				<div className='flex items-center gap-3'>
					{conversation.participantAvatar ? (
						<div className='h-10 w-10 overflow-hidden rounded-full border border-white/10'>
							<img
								src={conversation.participantAvatar}
								alt={conversation.participantName}
								className='h-full w-full object-cover'
							/>
						</div>
					) : (
						<div className='flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-gradient-to-br from-accent-purple/30 to-accent-teal/30 text-sm font-semibold text-white'>
							{initialsFromName(conversation.participantName)}
						</div>
					)}
					<div>
						<h2 className='font-medium text-white'>{conversation.participantName}</h2>
						<p className='text-xs text-dawn/60'>онлайн</p>
					</div>
				</div>
			</div>

			{/* Messages */}
			<div className='flex-1 overflow-y-auto p-4'>
				{isLoading ? (
					<div className='flex items-center justify-center py-8'>
						<div className='h-6 w-6 animate-spin rounded-full border-2 border-accent-teal border-t-transparent'></div>
					</div>
				) : (
					<div className='space-y-6'>
						{Object.entries(messageGroups).map(([date, msgs]) => (
							<div key={date}>
								{/* Date separator */}
								<div className='flex items-center justify-center py-2'>
									<div className='rounded-full bg-white/10 px-3 py-1 text-xs text-dawn/60'>
										{formatDate(msgs[0].createdAt)}
									</div>
								</div>

								{/* Messages for this date */}
								<div className='space-y-4'>
									{msgs.map((message) => {
										const isOwn = message.senderId === 'current_user';
										return (
											<div
												key={message.id}
												className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}
											>
												<div className={`max-w-xs lg:max-w-md ${isOwn ? 'order-2' : ''}`}>
													<div
														className={`rounded-2xl px-4 py-2 ${
															isOwn
																? 'bg-accent-teal text-white'
																: 'border border-white/10 bg-white/5 text-dawn/90'
														}`}
													>
														<p className='text-sm'>{message.content}</p>
													</div>
													<div
														className={`mt-1 flex items-center gap-1 text-xs text-dawn/50 ${
															isOwn ? 'justify-end' : 'justify-start'
														}`}
													>
														<span>{formatTime(message.createdAt)}</span>
														{isOwn && (
															<span>{message.isRead ? '✓✓' : '✓'}</span>
														)}
													</div>
												</div>
											</div>
										);
									})}
								</div>
							</div>
						))}
						<div ref={messagesEndRef} />
					</div>
				)}
			</div>

			{/* Message Input */}
			<form onSubmit={handleSendMessage} className='border-t border-white/10 p-4'>
				<div className='flex gap-3'>
					<input
						type='text'
						value={newMessage}
						onChange={(e) => setNewMessage(e.target.value)}
						placeholder='Напишите сообщение...'
						disabled={isSending}
						className='flex-1 rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-white placeholder:text-dawn/50 focus:border-accent-teal focus:outline-none disabled:cursor-not-allowed disabled:opacity-50'
						maxLength={1000}
					/>
					<button
						type='submit'
						disabled={!newMessage.trim() || isSending}
						className='flex h-10 w-10 items-center justify-center rounded-full bg-accent-teal text-white transition hover:bg-accent-teal/80 disabled:cursor-not-allowed disabled:opacity-50'
					>
						<LuSend className='h-4 w-4' />
					</button>
				</div>
			</form>
		</div>
	);
}