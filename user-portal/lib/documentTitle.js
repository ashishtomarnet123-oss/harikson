/**
 * Centralized Document Title Utility for Xarwiz AI Platform
 * 
 * Enforces consistent branding, deduplication, and title precedence:
 * 1. Active conversation title (<Title> - Xarwiz)
 * 2. Explicit page title (e.g. Dashboard - Xarwiz, Sign In - Xarwiz)
 * 3. Default fallback (Xarwiz - AI Platform)
 */

export const BRAND_NAME = 'Xarwiz';
export const DEFAULT_PAGE_TITLE = "Xarwiz - India's All-in-One AI Platform";

/**
 * Formats a given page or conversation title with the standard brand suffix.
 * Prevents duplicated brand suffixes (e.g. "Xarwiz - Xarwiz" or "Chat - Xarwiz - Xarwiz").
 */
export function formatPageTitle(title, brand = BRAND_NAME) {
  if (!title || typeof title !== 'string') {
    return DEFAULT_PAGE_TITLE;
  }

  const cleaned = title.trim().replace(/[\u2014\u2013]/g, '-');
  if (!cleaned) {
    return DEFAULT_PAGE_TITLE;
  }

  // Exact brand names or standard platform titles return the default brand title
  if (
    cleaned.toLowerCase() === brand.toLowerCase() ||
    cleaned.toLowerCase() === `${brand} ai platform`.toLowerCase() ||
    cleaned.toLowerCase() === `${brand} - ai platform`.toLowerCase() ||
    cleaned.toLowerCase() === DEFAULT_PAGE_TITLE.toLowerCase()
  ) {
    return DEFAULT_PAGE_TITLE;
  }

  // Check if title already ends with any standard brand separator (e.g. "Title - Xarwiz")
  const brandRegex = new RegExp(`(?:\\s*[\\|\\-]\\s*${brand})+$`, 'i');
  if (brandRegex.test(cleaned)) {
    // Strip duplicate suffixes and append exactly one
    const base = cleaned.replace(brandRegex, '').trim();
    if (!base || base.toLowerCase() === brand.toLowerCase()) {
      return DEFAULT_PAGE_TITLE;
    }
    return `${base} - ${brand}`;
  }

  // If title is already an explicit brand marketing title with pipe or bullet (e.g. "About Xarwiz | India's AI Platform...")
  if (cleaned.toLowerCase().includes(brand.toLowerCase()) && (cleaned.includes('|') || cleaned.includes('·'))) {
    return cleaned;
  }

  return `${cleaned} - ${brand}`;
}

export default formatPageTitle;
