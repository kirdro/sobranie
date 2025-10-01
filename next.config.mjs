/** @type {import('next').NextConfig} */
const nextConfig = {
	images: {
		remotePatterns: [
			{
				protocol: 'https',
				hostname: '**',
			},
		],
	},
	// Отключаем кеширование в продакшене для динамического контента
	headers: async () => {
		return [
			{
				source: '/:path*',
				headers: [
					{
						key: 'Cache-Control',
						value: 'no-store, must-revalidate',
					},
				],
			},
		];
	},
	experimental: {
		swcPlugins: [
			[
				'@effector/swc-plugin',
				{
					factories: [
						'@withease/factories',
						'patronum',
						'farfetched',
					],
					addNames: true,
					addLoc: true,
				},
			],
		],
	},
};

export default nextConfig;
