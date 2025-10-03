'use client';

import { ReactNode } from 'react';

type EffectorProviderProps = {
	children: ReactNode;
};

export function EffectorProvider({ children }: EffectorProviderProps) {
	// В реальном приложении здесь была бы настройка Effector Provider
	// Пока просто возвращаем children без оборачивания
	return <>{children}</>;
}