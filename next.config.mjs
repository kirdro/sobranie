/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**'
      }
    ]
  },
  experimental: {
    swcPlugins: [
      [
        '@effector/swc-plugin',
        {
          factories: [
            '@withease/factories',
            'patronum',
            'farfetched'
          ],
          addNames: true,
          addLoc: true,
        }
      ]
    ]
  }
};

export default nextConfig;
