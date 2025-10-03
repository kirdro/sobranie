'use client';

import { useState, useEffect } from 'react';
import { LuMessageCircle, LuSearch } from 'react-icons/lu';
import { fetchJson } from '@/lib/frontend/fetch-json';
import { initialsFromName } from '@/lib/data/feed';

type Conversation = {
	id: string;
	participantId: string;
	participantName: string;
	participantAvatar: string | null;
	lastMessage: string;
	lastMessageAt: string;
	unreadCount: number;
};

type MessagesListProps = {
	onSelectConversation: (conversation: Conversation) => void;
	selectedConversationId?: string;
};

export function MessagesList({ onSelectConversation, selectedConversationId }: MessagesListProps) {
	const [conversations, setConversations] = useState<Conversation[]>([]);
	const [isLoading, setIsLoading] = useState(true);
	const [searchQuery, setSearchQuery] = useState('');

	useEffect(() => {
		loadConversations();
	}, []);

	const loadConversations = async () => {
		setIsLoading(true);
		try {
			const response = await fetchJson('/api/messages');
			setConversations(response.conversations || []);
		} catch (error) {
			console.error('Ошибка загрузки разговоров:', error);
		} finally {
			setIsLoading(false);
		}
	};

	const filteredConversations = conversations.filter((conv) =>
		conv.participantName.toLowerCase().includes(searchQuery.toLowerCase())
	);

	const formatTime = (dateString: string) => {
		const date = new Date(dateString);
		const now = new Date();
		const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));

		if (diffDays === 0) {
			return date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
		} else if (diffDays === 1) {
			return 'вчера';
		} else if (diffDays < 7) {
			return `${diffDays} дн. назад`;
		} else {
			return date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
		}
	};

	return (
		<div className='flex h-full flex-col'>
			{/* Header */}
			<div className='border-b border-white/10 p-4'>
				<div className='flex items-center gap-3'>
					<LuMessageCircle className='h-6 w-6 text-accent-teal' />
					<h2 className='text-lg font-semibold text-white'>Сообщения</h2>
				</div>

				{/* Search */}
				<div className='mt-4 relative'>
					<LuSearch className='absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-dawn/50' />
					<input
						type='text'
						placeholder='Поиск разговоров...'
						value={searchQuery}
						onChange={(e) => setSearchQuery(e.target.value)}
						className='w-full rounded-2xl border border-white/10 bg-white/5 py-2 pl-10 pr-4 text-sm text-white placeholder:text-dawn/50 focus:border-accent-teal focus:outline-none'
					/>
				</div>
			</div>

			{/* Conversations List */}
			<div className='flex-1 overflow-y-auto'>
				{isLoading ? (
					<div className='flex items-center justify-center py-8'>
						<div className='h-6 w-6 animate-spin rounded-full border-2 border-accent-teal border-t-transparent'></div>
					</div>
				) : filteredConversations.length === 0 ? (
					<div className='flex flex-col items-center justify-center py-12 text-center'>
						<LuMessageCircle className='mb-4 h-12 w-12 text-dawn/30' />
						<p className='text-dawn/60'>
							{searchQuery ? 'Разговоры не найдены' : 'Пока нет сообщений'}
						</p>
					</div>
				) : (
					<div className='divide-y divide-white/5'>
						{filteredConversations.map((conversation) => (
							<button
								key={conversation.id}
								onClick={() => onSelectConversation(conversation)}
								className={`w-full p-4 text-left transition hover:bg-white/5 ${
									selectedConversationId === conversation.id
										? 'bg-white/10 border-r-2 border-accent-teal'
										: ''
								}`}
							>
								<div className='flex items-start gap-3'>
									{/* Avatar */}
									<div className='relative flex-shrink-0'>
										{conversation.participantAvatar ? (
											<div className='h-12 w-12 overflow-hidden rounded-full border border-white/10'>
												<img
													src={conversation.participantAvatar}
													alt={conversation.participantName}
													className='h-full w-full object-cover'
												/>
											</div>
										) : (
											<div className='flex h-12 w-12 items-center justify-center rounded-full border border-white/10 bg-gradient-to-br from-accent-purple/30 to-accent-teal/30 text-sm font-semibold text-white'>
												{initialsFromName(conversation.participantName)}
											</div>
										)}

										{/* Unread indicator */}
										{conversation.unreadCount > 0 && (
											<div className='absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-accent-teal text-xs font-bold text-white'>
												{conversation.unreadCount > 9 ? '9+' : conversation.unreadCount}
											</div>
										)}
									</div>

									{/* Content */}
									<div className='min-w-0 flex-1'>
										<div className='flex items-center justify-between'>
											<h3 className='truncate font-medium text-white'>
												{conversation.participantName}
											</h3>
											<span className='text-xs text-dawn/50'>
												{formatTime(conversation.lastMessageAt)}
											</span>
										</div>
										<p
											className={`mt-1 truncate text-sm ${
												conversation.unreadCount > 0 ? 'text-white' : 'text-dawn/70'
											}`}
										>
											{conversation.lastMessage}
										</p>
									</div>
								</div>
							</button>
						))}
					</div>
				)}
			</div>
		</div>
	);
}