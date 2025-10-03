'use client';

import { useState, useEffect } from 'react';
import { LuShield, LuSave, LuEye, LuMail, LuUsers, LuActivity } from 'react-icons/lu';
import toast from 'react-hot-toast';
import { fetchJson } from '@/lib/frontend/fetch-json';

type PrivacySettings = {
	profileVisibility: 'public' | 'followers' | 'private';
	showEmail: boolean;
	showLastSeen: boolean;
	allowMessages: 'everyone' | 'followers' | 'none';
	allowMentions: 'everyone' | 'followers' | 'none';
	showActivity: boolean;
	searchableByEmail: boolean;
	showInSuggestions: boolean;
};

export function PrivacySettings() {
	const [settings, setSettings] = useState<PrivacySettings | null>(null);
	const [isLoading, setIsLoading] = useState(true);
	const [isSaving, setIsSaving] = useState(false);

	useEffect(() => {
		loadSettings();
	}, []);

	const loadSettings = async () => {
		setIsLoading(true);
		try {
			const response = await fetchJson('/api/users/privacy');
			setSettings(response);
		} catch (error) {
			console.error('Ошибка загрузки настроек:', error);
			toast.error('Не удалось загрузить настройки приватности');
		} finally {
			setIsLoading(false);
		}
	};

	const handleSave = async () => {
		if (!settings) return;

		setIsSaving(true);
		try {
			const response = await fetchJson('/api/users/privacy', {
				method: 'PATCH',
				body: settings,
			});

			setSettings(response.settings);
			toast.success('Настройки приватности обновлены');
		} catch (error) {
			console.error('Ошибка сохранения настроек:', error);
			toast.error('Не удалось сохранить настройки');
		} finally {
			setIsSaving(false);
		}
	};

	const updateSetting = (key: keyof PrivacySettings, value: any) => {
		if (!settings) return;
		setSettings({ ...settings, [key]: value });
	};

	if (isLoading) {
		return (
			<div className='rounded-[28px] border border-white/10 bg-white/5 p-6 backdrop-blur-2xl'>
				<div className='animate-pulse space-y-4'>
					<div className='h-6 w-48 rounded bg-white/10'></div>
					<div className='space-y-6'>
						{[...Array(5)].map((_, i) => (
							<div key={i} className='space-y-2'>
								<div className='h-4 w-32 rounded bg-white/10'></div>
								<div className='h-10 w-full rounded bg-white/10'></div>
							</div>
						))}
					</div>
				</div>
			</div>
		);
	}

	if (!settings) return null;

	return (
		<div className='rounded-[28px] border border-white/10 bg-white/5 p-6 backdrop-blur-2xl'>
			{/* Header */}
			<div className='flex items-center justify-between'>
				<div className='flex items-center gap-3'>
					<LuShield className='h-6 w-6 text-accent-teal' />
					<h2 className='text-xl font-semibold text-white'>Настройки приватности</h2>
				</div>

				<button
					onClick={handleSave}
					disabled={isSaving}
					className='flex items-center gap-2 rounded-full border border-accent-teal/50 bg-accent-teal/10 px-4 py-2 text-sm text-accent-teal transition hover:bg-accent-teal/20 disabled:cursor-not-allowed disabled:opacity-50'
				>
					<LuSave className='h-4 w-4' />
					{isSaving ? 'Сохраняем...' : 'Сохранить'}
				</button>
			</div>

			<div className='mt-6 space-y-6'>
				{/* Profile Visibility */}
				<div className='space-y-3'>
					<div className='flex items-center gap-2'>
						<LuEye className='h-4 w-4 text-dawn/60' />
						<label className='text-sm font-medium text-white'>Видимость профиля</label>
					</div>
					<select
						value={settings.profileVisibility}
						onChange={(e) => updateSetting('profileVisibility', e.target.value)}
						className='w-full rounded-2xl border border-white/10 bg-white/10 px-4 py-2 text-white focus:border-accent-teal focus:outline-none'
					>
						<option value='public'>Публичный - виден всем</option>
						<option value='followers'>Подписчики - только подписчики</option>
						<option value='private'>Приватный - только я</option>
					</select>
				</div>

				{/* Show Email */}
				<div className='flex items-center justify-between'>
					<div className='flex items-center gap-2'>
						<LuMail className='h-4 w-4 text-dawn/60' />
						<span className='text-sm text-white'>Показывать email в профиле</span>
					</div>
					<button
						onClick={() => updateSetting('showEmail', !settings.showEmail)}
						className={`relative h-6 w-11 rounded-full transition ${
							settings.showEmail ? 'bg-accent-teal' : 'bg-white/20'
						}`}
					>
						<div
							className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-transform ${
								settings.showEmail ? 'translate-x-5' : 'translate-x-0.5'
							}`}
						/>
					</button>
				</div>

				{/* Show Last Seen */}
				<div className='flex items-center justify-between'>
					<div className='flex items-center gap-2'>
						<LuActivity className='h-4 w-4 text-dawn/60' />
						<span className='text-sm text-white'>Показывать время последней активности</span>
					</div>
					<button
						onClick={() => updateSetting('showLastSeen', !settings.showLastSeen)}
						className={`relative h-6 w-11 rounded-full transition ${
							settings.showLastSeen ? 'bg-accent-teal' : 'bg-white/20'
						}`}
					>
						<div
							className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-transform ${
								settings.showLastSeen ? 'translate-x-5' : 'translate-x-0.5'
							}`}
						/>
					</button>
				</div>

				{/* Allow Messages */}
				<div className='space-y-3'>
					<div className='flex items-center gap-2'>
						<LuMail className='h-4 w-4 text-dawn/60' />
						<label className='text-sm font-medium text-white'>Кто может писать сообщения</label>
					</div>
					<select
						value={settings.allowMessages}
						onChange={(e) => updateSetting('allowMessages', e.target.value)}
						className='w-full rounded-2xl border border-white/10 bg-white/10 px-4 py-2 text-white focus:border-accent-teal focus:outline-none'
					>
						<option value='everyone'>Все пользователи</option>
						<option value='followers'>Только подписчики</option>
						<option value='none'>Никто</option>
					</select>
				</div>

				{/* Allow Mentions */}
				<div className='space-y-3'>
					<div className='flex items-center gap-2'>
						<LuUsers className='h-4 w-4 text-dawn/60' />
						<label className='text-sm font-medium text-white'>Кто может упоминать меня</label>
					</div>
					<select
						value={settings.allowMentions}
						onChange={(e) => updateSetting('allowMentions', e.target.value)}
						className='w-full rounded-2xl border border-white/10 bg-white/10 px-4 py-2 text-white focus:border-accent-teal focus:outline-none'
					>
						<option value='everyone'>Все пользователи</option>
						<option value='followers'>Только подписчики</option>
						<option value='none'>Никто</option>
					</select>
				</div>

				{/* Show Activity */}
				<div className='flex items-center justify-between'>
					<div className='flex items-center gap-2'>
						<LuActivity className='h-4 w-4 text-dawn/60' />
						<span className='text-sm text-white'>Показывать статистику активности</span>
					</div>
					<button
						onClick={() => updateSetting('showActivity', !settings.showActivity)}
						className={`relative h-6 w-11 rounded-full transition ${
							settings.showActivity ? 'bg-accent-teal' : 'bg-white/20'
						}`}
					>
						<div
							className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-transform ${
								settings.showActivity ? 'translate-x-5' : 'translate-x-0.5'
							}`}
						/>
					</button>
				</div>

				{/* Searchable by Email */}
				<div className='flex items-center justify-between'>
					<div className='flex items-center gap-2'>
						<LuMail className='h-4 w-4 text-dawn/60' />
						<span className='text-sm text-white'>Можно найти по email</span>
					</div>
					<button
						onClick={() => updateSetting('searchableByEmail', !settings.searchableByEmail)}
						className={`relative h-6 w-11 rounded-full transition ${
							settings.searchableByEmail ? 'bg-accent-teal' : 'bg-white/20'
						}`}
					>
						<div
							className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-transform ${
								settings.searchableByEmail ? 'translate-x-5' : 'translate-x-0.5'
							}`}
						/>
					</button>
				</div>

				{/* Show in Suggestions */}
				<div className='flex items-center justify-between'>
					<div className='flex items-center gap-2'>
						<LuUsers className='h-4 w-4 text-dawn/60' />
						<span className='text-sm text-white'>Показывать в рекомендациях</span>
					</div>
					<button
						onClick={() => updateSetting('showInSuggestions', !settings.showInSuggestions)}
						className={`relative h-6 w-11 rounded-full transition ${
							settings.showInSuggestions ? 'bg-accent-teal' : 'bg-white/20'
						}`}
					>
						<div
							className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-transform ${
								settings.showInSuggestions ? 'translate-x-5' : 'translate-x-0.5'
							}`}
						/>
					</button>
				</div>
			</div>

			{/* Info */}
			<div className='mt-6 rounded-2xl border border-blue-500/20 bg-blue-500/10 p-4'>
				<p className='text-sm text-blue-300'>
					💡 Изменения настроек приватности влияют на то, как другие пользователи видят ваш профиль и взаимодействуют с вами.
				</p>
			</div>
		</div>
	);
}