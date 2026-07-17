/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    const adminApiUrl = process.env.ADMIN_API_URL || 'http://admin-api:4000';
    return [
      {
        source: '/api-proxy/:path*',
        destination: `${adminApiUrl}/:path*`,
      },
    ];
  },
};

module.exports = nextConfig;
