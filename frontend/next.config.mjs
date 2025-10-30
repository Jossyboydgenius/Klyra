/** @type {import('next').NextConfig} */
const nextConfig = {
  // Silence warnings
  // https://github.com/WalletConnect/walletconnect-monorepo/issues/1908
  webpack: (config) => {
    config.externals.push("pino-pretty", "lokijs", "encoding");
    return config;
  },
  // Configure turbopack for faster builds
  turbopack: {
    // Set root directory to avoid warnings about multiple lockfiles
    root: process.cwd(),
    // Configure rules (formerly loaders)
    rules: {
      // Add any specific rule configurations if needed in the future
    },
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
  },
};

export default nextConfig;
