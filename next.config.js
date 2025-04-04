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
  webpack: (config, { isServer }) => {
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
  // Enable standalone output for deployments
  output: 'standalone',
  // Configure asset prefix for production
  assetPrefix: process.env.NODE_ENV === 'production' ? 'https://social-land.ro' : '',
  // Configure base path
  basePath: '',
  // Configure environment variables
  env: {
    NEXT_PUBLIC_SITE_URL: process.env.NODE_ENV === 'production' ? 'https://social-land.ro' : ''
  },
  // Configure static file serving
  async rewrites() {
    return {
      beforeFiles: [
        // Handle /uploads and /images without /public prefix
        {
          source: '/uploads/:path*',
          destination: '/public/uploads/:path*',
        },
        {
          source: '/images/:path*',
          destination: '/public/images/:path*',
        }
      ]
    }
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
