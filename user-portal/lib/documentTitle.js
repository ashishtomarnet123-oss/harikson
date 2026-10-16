/**
 * Centralized Document Title Utility for Xarwiz AI Platform
 * 
 * Enforces consistent branding, deduplication, and title precedence:
 * 1. Active conversation title (<Title> — Xarwiz)
 * 2. Explicit page title (e.g. Dashboard — Xarwiz, Sign In — Xarwiz)
 * 3. Default fallback (Xarwiz — AI Platform)
 */

export const BRAND_NAME = 'Xarwiz';
export const DEFAULT_PAGE_TITLE = 'Xarwiz — India\'s All-in-One AI Platform';

/**
 * Formats a given page or conversation title with the standard brand suffix.
 * Prevents duplicated brand suffixes (e.g. "Xarwiz — Xarwiz" or "Chat — Xarwiz — Xarwiz").
 */
export function formatPageTitle(title, brand = BRAND_NAME) {
  if (!title || typeof title !== 'string') {
    return DEFAULT_PAGE_TITLE;
  }

  const trimmed = title.trim();
  if (!trimmed) {
    return DEFAULT_PAGE_TITLE;
  }

  // Check if title already ends with any standard brand separator
  const brandRegex = new RegExp(`(?:\\s*[—–\\|-]\\s*${brand})+$`, 'i');
  if (brandRegex.test(trimmed)) {
    // Strip duplicate suffixes and append exactly one
    const base = trimmed.replace(brandRegex, '').trim();
    return base ? `${base} — ${brand}` : DEFAULT_PAGE_TITLE;
  }

  // If the title starts with the brand name (e.g. "Xarwiz AI Platform")
  if (trimmed.toLowerCase().startsWith(brand.toLowerCase()) && trimmed.length > brand.length + 3) {
    return trimmed;
  }

  return `${trimmed} — ${brand}`;
}

export default formatPageTitle;
