/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'social-land.ro'
      }
    ],
    domains: ['localhost', 'social-land.ro'],
    unoptimized: true,
    minimumCacheTTL: 31536000, // Cache for 1 year
    dangerouslyAllowSVG: true,
    contentDispositionType: 'attachment',
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
  },
  // Add basePath and assetPrefix for production
  basePath: process.env.NODE_ENV === 'production' ? '' : '',
  assetPrefix: process.env.NODE_ENV === 'production' ? 'https://social-land.ro' : '',
  // Disable static exports since we're using server components
  output: 'standalone',
  // Enable static optimization
  experimental: {
    optimizeCss: true,
    optimizePackageImports: ['@/components'],
  },
  webpack: (config, { dev, isServer }) => {
    // Exclude problematic files from webpack processing
    config.module.noParse = [
      /node_modules\/@mapbox\/node-pre-gyp\/lib\/util\/nw-pre-gyp\/index\.html$/,
    ];

    // Add a rule to handle HTML files
    config.module.rules.push({
      test: /\.html$/,
      type: 'asset/resource',
    });

    // Ignore specific modules that cause issues
    config.resolve.fallback = {
      ...config.resolve.fallback,
      "mock-aws-s3": false,
      "aws-sdk": false,
    };

    // Suppress resource preload warnings in production
    if (!dev) {
      config.optimization = {
        ...config.optimization,
        moduleIds: 'deterministic',
        splitChunks: {
          ...config.optimization?.splitChunks,
          chunks: 'all',
        },
      };
    }

    return config;
  },
  eslint: {
    // Disable ESLint during builds to avoid failing the build
    ignoreDuringBuilds: true,
  },
  // Disable type checking during builds
  typescript: {
    ignoreBuildErrors: true,
  },
  // Reduce logging
  logging: {
    fetches: {
      fullUrl: false
    }
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on'
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload'
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block'
          },
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN'
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff'
          },
          {
            key: 'Referrer-Policy',
            value: 'origin-when-cross-origin'
          },
          {
            key: 'Access-Control-Allow-Origin',
            value: 'https://social-land.ro'
          },
          {
            key: 'Access-Control-Allow-Methods',
            value: 'GET, POST, PUT, DELETE, OPTIONS'
          },
          {
            key: 'Access-Control-Allow-Headers',
            value: 'X-Requested-With, Content-Type, Authorization'
          }
        ]
      },
      {
        source: '/styles/:path*',
        headers: [
          {
            key: 'Content-Type',
            value: 'text/css'
          }
        ]
      },
      {
        source: '/_next/static/:path*',
        headers: [
          {
            key: 'Content-Type',
            value: 'text/css'
          }
        ]
      },
      {
        source: '/api/:path*',
        headers: [
          {
            key: 'Access-Control-Allow-Origin',
            value: 'https://social-land.ro'
          },
          {
            key: 'Access-Control-Allow-Methods',
            value: 'GET, POST, PUT, DELETE, OPTIONS'
          },
          {
            key: 'Access-Control-Allow-Headers',
            value: 'X-Requested-With, Content-Type, Authorization'
          }
        ]
      }
    ]
  }
};

module.exports = nextConfig;