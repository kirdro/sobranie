'use client';

import { useState } from 'react';
import { LuMessageCircle } from 'react-icons/lu';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { MessagesList } from './MessagesList';
import { ChatView } from './ChatView';

type Conversation = {
	id: string;
	participantId: string;
	participantName: string;
	participantAvatar: string | null;
	lastMessage: string;
	lastMessageAt: string;
	unreadCount: number;
};

export function MessagesShell() {
	const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);

	const handleSelectConversation = (conversation: Conversation) => {
		setSelectedConversation(conversation);
	};

	const handleBackToList = () => {
		setSelectedConversation(null);
	};

	return (
		<DashboardLayout
			hero={{
				title: 'Сообщения',
				description: 'Приватные разговоры с участниками Собрания',
			}}
		>
			<div className='h-[calc(100vh-200px)] rounded-[28px] border border-white/10 bg-white/5 backdrop-blur-2xl overflow-hidden'>
				<div className='flex h-full'>
					{/* Messages List */}
					<div
						className={`w-full lg:w-80 border-r border-white/10 ${
							selectedConversation ? 'hidden lg:block' : 'block'
						}`}
					>
						<MessagesList
							onSelectConversation={handleSelectConversation}
							selectedConversationId={selectedConversation?.id}
						/>
					</div>

					{/* Chat View */}
					<div
						className={`flex-1 ${
							selectedConversation ? 'block' : 'hidden lg:flex lg:items-center lg:justify-center'
						}`}
					>
						{selectedConversation ? (
							<ChatView
								conversation={selectedConversation}
								onBack={handleBackToList}
							/>
						) : (
							<div className='text-center'>
								<LuMessageCircle className='mx-auto mb-4 h-16 w-16 text-dawn/30' />
								<h3 className='mb-2 text-lg font-medium text-white'>
									Выберите разговор
								</h3>
								<p className='text-dawn/60'>
									Выберите разговор из списка, чтобы начать общение
								</p>
							</div>
						)}
					</div>
				</div>
			</div>
		</DashboardLayout>
	);
}