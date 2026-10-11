/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Let Next transpile the shared TS package in node_modules.
  transpilePackages: ['@classsync/common'],
};

module.exports = nextConfig;