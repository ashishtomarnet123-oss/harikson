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
   * Check if an IPv4 address falls into private, loopback, or metadata ranges
   */
  public static isPrivateIp(ip: string): boolean {
    const parts = ip.split('.').map((p) => parseInt(p, 10));
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
  public static async validateUrl(urlString: string): Promise<{ safe: boolean; reason?: string; resolvedIp?: string }> {
    try {
      const parsed = new URL(urlString);

      if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
        return { safe: false, reason: `Unsupported protocol: ${parsed.protocol}` };
      }

      const hostname = parsed.hostname.toLowerCase();

      // Check blocked local hostnames
      if (this.BLOCKED_HOSTNAMES.has(hostname) || hostname.endsWith('.local') || hostname.endsWith('.internal')) {
        return { safe: false, reason: `Host '${hostname}' is a restricted internal platform service` };
      }

      // Check direct IP input
      if (/^(\d{1,3}\.){3}\d{1,3}$/.test(hostname)) {
        if (this.isPrivateIp(hostname)) {
          return { safe: false, reason: `Access to private network IP '${hostname}' is forbidden` };
        }
        return { safe: true, resolvedIp: hostname };
      }

      // Resolve DNS to verify underlying IP
      try {
        const lookupResult = await dnsLookup(hostname, { family: 4 });
        if (this.isPrivateIp(lookupResult.address)) {
          return {
            safe: false,
            reason: `Host '${hostname}' resolves to restricted private IP '${lookupResult.address}'`,
            resolvedIp: lookupResult.address,
          };
        }
        return { safe: true, resolvedIp: lookupResult.address };
      } catch (dnsErr: any) {
        return { safe: false, reason: `DNS lookup failed for '${hostname}': ${dnsErr.message}` };
      }
    } catch (urlErr: any) {
      return { safe: false, reason: `Invalid URL: ${urlErr.message}` };
    }
  }
}
