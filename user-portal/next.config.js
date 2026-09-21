/** @type {import('next').NextConfig} */
const nextConfig = {
  // Next.js kills any rewrites()-proxied request after this long and
  // returns a bare "Internal Server Error" — defaults to 30000ms, which
  // is the exact, consistent cutoff behind every chat hang traced this
  // session (confirmed via request-level timing logs: tenant-api was
  // still legitimately waiting on Ollama, never actually stuck, when
  // Next.js's own proxy gave up and disconnected). A 7B model generating
  // a full response on CPU can take well over 30s under load, so this
  // was never going to be enough regardless of how many Ollama-side
  // fixes landed.
  experimental: {
    proxyTimeout: 300000,
  },
  async rewrites() {
    const tenantApiUrl =
      process.env.TENANT_API_URL ||
      'http://tenant-api:3008';
    const adminPanelUrl =
      process.env.ADMIN_PANEL_URL ||
      'http://admin-panel:3001';
    return [
      {
        source: '/admin/api-proxy/:path*',
        destination: `${adminPanelUrl}/api-proxy/:path*`,
      },
      {
        source: '/admin/api/:path*',
        destination: `${adminPanelUrl}/api/:path*`,
      },
      {
        source: '/admin/:path*',
        destination: `${adminPanelUrl}/admin/:path*`,
      },
      {
        source: '/admin-assets/:path*',
        destination: `${adminPanelUrl}/admin-assets/:path*`,
      },
      {
        source: '/api-proxy/:path*',
        destination: `${adminPanelUrl}/api-proxy/:path*`,
      },
      {
        source: '/api/:path*',
        destination: `${tenantApiUrl}/api/:path*`,
      },
    ];
  },
};

module.exports = nextConfig;
