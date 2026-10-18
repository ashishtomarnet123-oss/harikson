import dns from 'dns';
import { promisify } from 'util';

const dnsLookup = promisify(dns.lookup);

export class SSRFGuard {
  // Disallowed internal container hostnames
  private static BLOCKED_HOSTNAMES = new Set([
    'localhost',
    'postgres',
    'redis',
    'traefik',
    'ollama',
    'tenant-api',
    'admin-api',
    'admin-panel',
    'user-portal',
    'orchestrator',
    'prometheus',
    'grafana',
  ]);

  /**
   * Check if an IPv4 or IPv6 address falls into private, loopback, or metadata ranges
   */
  public static isPrivateIp(ip: string): boolean {
    if (!ip || typeof ip !== 'string') return true;

    const cleanIp = ip.trim().replace(/^\[|\]$/g, '');

    // IPv6 checks
    if (cleanIp.includes(':')) {
      const lower = cleanIp.toLowerCase();
      // Loopback (::1)
      if (lower === '::1' || lower === '0:0:0:0:0:0:0:1' || lower === '::') return true;
      // Link-local (fe80::/10)
      if (lower.startsWith('fe8') || lower.startsWith('fe9') || lower.startsWith('fea') || lower.startsWith('feb')) return true;
      // Unique local addresses (fc00::/7)
      if (lower.startsWith('fc') || lower.startsWith('fd')) return true;
      // IPv4-mapped IPv6 (::ffff:127.0.0.1)
      if (lower.startsWith('::ffff:')) {
        const v4 = lower.substring(7);
        return this.isPrivateIp(v4);
      }
      return false;
    }

    const parts = cleanIp.split('.').map((p) => parseInt(p, 10));
    if (parts.length !== 4 || parts.some(isNaN)) {
      return true; // Malformed IP, block by default
    }

    const [a, b] = parts;

    // 127.0.0.0/8 (Loopback)
    if (a === 127) return true;

    // 10.0.0.0/8 (Private)
    if (a === 10) return true;

    // 172.16.0.0/12 (Private)
    if (a === 172 && b >= 16 && b <= 31) return true;

    // 192.168.0.0/16 (Private)
    if (a === 192 && b === 168) return true;

    // 169.254.0.0/16 (Link-Local / AWS/GCP Metadata endpoint)
    if (a === 169 && b === 254) return true;

    // 0.0.0.0/8 (Current network)
    if (a === 0) return true;

    // 224.0.0.0/4 (Multicast)
    if (a >= 224) return true;

    return false;
  }

  /**
   * Validate that a target URL is safe to fetch and not attempting SSRF
   */
  public static async validateUrl(
    urlString: string
  ): Promise<{ safe: boolean; reason?: string; resolvedIp?: string }> {
    try {
      const parsed = new URL(urlString);

      if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
        return { safe: false, reason: `Unsupported protocol: ${parsed.protocol}` };
      }

      const rawHostname = parsed.hostname.toLowerCase();
      const hostname = rawHostname.replace(/^\[|\]$/g, '');

      // Check blocked local hostnames
      if (
        this.BLOCKED_HOSTNAMES.has(hostname) ||
        hostname.endsWith('.local') ||
        hostname.endsWith('.internal')
      ) {
        return {
          safe: false,
          reason: `Host '${hostname}' is a restricted internal platform service`,
        };
      }

      // Check direct IPv4 input
      if (/^(\d{1,3}\.){3}\d{1,3}$/.test(hostname)) {
        if (this.isPrivateIp(hostname)) {
          return {
            safe: false,
            reason: `Access to private network IP '${hostname}' is forbidden`,
          };
        }
        return { safe: true, resolvedIp: hostname };
      }

      // Check direct IPv6 input
      if (hostname.includes(':')) {
        if (this.isPrivateIp(hostname)) {
          return {
            safe: false,
            reason: `Access to private IPv6 address '${hostname}' is forbidden`,
          };
        }
        return { safe: true, resolvedIp: hostname };
      }

      // Resolve DNS to verify underlying IP
      try {
        const lookupResult = await dnsLookup(hostname, { all: true });
        for (const record of lookupResult) {
          if (this.isPrivateIp(record.address)) {
            return {
              safe: false,
              reason: `Host '${hostname}' resolves to restricted private IP '${record.address}'`,
              resolvedIp: record.address,
            };
          }
        }

        const primary = lookupResult[0]?.address || hostname;
        return { safe: true, resolvedIp: primary };
      } catch (dnsErr: any) {
        return {
          safe: false,
          reason: `DNS lookup failed for '${hostname}': ${dnsErr.message}`,
        };
      }
    } catch (urlErr: any) {
      return { safe: false, reason: `Invalid URL: ${urlErr.message}` };
    }
  }

  /**
   * Perform an HTTP fetch request that safely follows redirects by re-validating
   * the destination of every redirect hop against SSRFGuard.
   */
  public static async safeFetch(
    initialUrl: string,
    options: RequestInit,
    maxRedirects = 5
  ): Promise<Response> {
    let currentUrl = initialUrl;
    let redirectsCount = 0;

    while (redirectsCount <= maxRedirects) {
      const check = await this.validateUrl(currentUrl);
      if (!check.safe) {
        throw new Error(
          `Security Exception: SSRF blocked request to ${currentUrl}. Reason: ${check.reason}`
        );
      }

      const fetchOptions: RequestInit = {
        ...options,
        redirect: 'manual', // Enforce manual hop-by-hop checking
      };

      const response = await fetch(currentUrl, fetchOptions);

      // Check for redirect status codes (301, 302, 303, 307, 308)
      if (response.status >= 300 && response.status < 400) {
        const location = response.headers.get('location');
        if (!location) {
          return response; // No redirect header, return response
        }

        redirectsCount++;
        if (redirectsCount > maxRedirects) {
          throw new Error(`Security Exception: Maximum redirect limit (${maxRedirects}) exceeded.`);
        }

        // Resolve redirect URL relative to currentUrl
        currentUrl = new URL(location, currentUrl).toString();
        continue;
      }

      return response;
    }

    throw new Error('Security Exception: Redirect loop detected.');
  }
}
