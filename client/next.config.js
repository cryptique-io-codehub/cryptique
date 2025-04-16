/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  env: {
    NEXT_PUBLIC_GEMINI_API: process.env.NEXT_PUBLIC_GEMINI_API,
  },
  // Add build-time environment variable
  webpack: (config, { buildId, dev, isServer, defaultLoaders, webpack }) => {
    config.plugins.push(
      new webpack.DefinePlugin({
        'process.env.NEXT_PUBLIC_BUILD_TIME': JSON.stringify(new Date().toISOString()),
      })
    );
    return config;
  },
  // Handle custom domain
  async rewrites() {
    return {
      beforeFiles: [
        {
          source: '/:path*',
          has: [
            {
              type: 'host',
              value: 'app.cryptique.io',
            },
          ],
          destination: '/:path*',
        },
      ],
    };
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'Cross-Origin-Opener-Policy',
            value: 'same-origin'
          },
          {
            key: 'Cross-Origin-Embedder-Policy',
            value: 'require-corp'
          }
        ],
      },
    ]
  },
}

module.exports = nextConfig 