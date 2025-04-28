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
    minimumCacheTTL: 31536000, // Cache for 1 year (a full year in seconds)
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    formats: ['image/webp', 'image/avif'],
    dangerouslyAllowSVG: true,
    contentDispositionType: 'attachment',
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
      "axios": require.resolve("axios"),
      "http": false,
      "https": false,
      "url": false,
      "stream": false,
      "crypto": false,
      "zlib": false,
      "path": false,
      "fs": false,
      "net": false,
      "tls": false,
      "dns": false,
      "child_process": false,
      "os": false,
      "querystring": false,
      "dgram": false,
      "cluster": false,
      "worker_threads": false,
      "readline": false,
      "repl": false,
      "vm": false,
      "perf_hooks": false,
      "inspector": false,
      "module": false,
      "assert": false,
      "buffer": false,
      "util": false,
      "events": false,
      "string_decoder": false,
      "punycode": false,
      "process": false
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
  // Enable standalone output for deployments
  output: 'standalone',
  // Disable trailing slashes for API routes
  trailingSlash: false,
  // Configure base path if needed
  basePath: '',
  // Configure asset prefix if needed
  assetPrefix: '',
  // Reduce logging
  logging: {
    fetches: {
      fullUrl: false
    }
  },
  // Add rewrites for socket server
  async rewrites() {
    return [
      {
        source: '/socket.io/:path*',
        destination: 'http://localhost:5002/socket.io/:path*',
      },
    ];
  },
  // Add headers for socket server
  async headers() {
    return [
      {
        source: '/socket.io/:path*',
        headers: [
          { key: 'Access-Control-Allow-Origin', value: '*' },
          { key: 'Access-Control-Allow-Methods', value: 'GET,POST,PUT,DELETE,OPTIONS' },
          { key: 'Access-Control-Allow-Headers', value: 'X-Requested-With,Content-Type,Accept' },
        ],
      },
    ];
  },
};

module.exports = nextConfig;