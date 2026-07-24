/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    const tenantApiUrl =
      process.env.TENANT_API_URL ||
      process.env.NEXT_PUBLIC_API_URL ||
      'http://tenant-api:3008';
    return [
      {
        source: '/api/:path*',
        destination: `${tenantApiUrl}/api/:path*`,
      },
    ];
  },
};

module.exports = nextConfig;
