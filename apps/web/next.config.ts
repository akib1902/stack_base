import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // The shared contracts package ships TypeScript sources.
  transpilePackages: ['@stackbase/contracts'],
  // Server-only API calls; never proxy provider credentials through the client.
  poweredByHeader: false,
};

export default nextConfig;
