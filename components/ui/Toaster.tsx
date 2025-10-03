'use client';

import { Toaster as HotToaster } from 'react-hot-toast';

export function Toaster() {
	return (
		<HotToaster
			position='top-right'
			toastOptions={{
				duration: 4000,
				style: {
					background: 'rgba(0, 0, 0, 0.9)',
					color: '#e0e0e0',
					border: '1px solid rgba(255, 255, 255, 0.1)',
					borderRadius: '24px',
					backdropFilter: 'blur(16px)',
					fontSize: '14px',
				},
				success: {
					style: {
						background: 'rgba(34, 197, 94, 0.1)',
						border: '1px solid rgba(34, 197, 94, 0.3)',
						color: '#22c55e',
					},
					iconTheme: {
						primary: '#22c55e',
						secondary: 'rgba(34, 197, 94, 0.1)',
					},
				},
				error: {
					style: {
						background: 'rgba(239, 68, 68, 0.1)',
						border: '1px solid rgba(239, 68, 68, 0.3)',
						color: '#ef4444',
					},
					iconTheme: {
						primary: '#ef4444',
						secondary: 'rgba(239, 68, 68, 0.1)',
					},
				},
				loading: {
					style: {
						background: 'rgba(59, 130, 246, 0.1)',
						border: '1px solid rgba(59, 130, 246, 0.3)',
						color: '#3b82f6',
					},
					iconTheme: {
						primary: '#3b82f6',
						secondary: 'rgba(59, 130, 246, 0.1)',
					},
				},
			}}
		/>
	);
}