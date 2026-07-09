/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    return [
      {
        source: '/api-proxy/:path*',
        destination: 'http://admin-api:4000/:path*',
      },
    ]
  },
}

module.exports = nextConfig;
