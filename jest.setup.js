import '@testing-library/jest-dom';

// Mock Next.js router
jest.mock('next/navigation', () => ({
	useRouter() {
		return {
			push: jest.fn(),
			replace: jest.fn(),
			prefetch: jest.fn(),
			back: jest.fn(),
			forward: jest.fn(),
			refresh: jest.fn(),
		};
	},
	useSearchParams() {
		return new URLSearchParams();
	},
	usePathname() {
		return '';
	},
}));

// Mock environment variables
process.env.SOBRANIE_API_BASE_URL = 'https://api.sobranie.yaropolk.tech';
