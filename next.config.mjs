/** @type {import('next').NextConfig} */
const nextConfig = {
  // Runs only in the Node.js server runtime; keep it out of the bundler.
  serverExternalPackages: ['pdf-lib'],
  experimental: {
    serverActions: { bodySizeLimit: '25mb' },
  },
};

export default nextConfig;
