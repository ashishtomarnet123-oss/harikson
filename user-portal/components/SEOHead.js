import Head from 'next/head';
import { formatPageTitle } from '../lib/documentTitle';

export const SITE_ORIGIN = 'https://xarwiz.com';
export const DEFAULT_OG_IMAGE = `${SITE_ORIGIN}/assets/xarwiz-og.png`;
export const DEFAULT_DESCRIPTION = "India's all-in-one AI platform to build AI agents, automate workflows, chat with leading AI models, create RAG knowledge bases, and accelerate enterprise development with DPDP compliance.";

/**
 * Standard Schema.org Organization structured data
 */
export const defaultOrganizationSchema = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: 'Xarwiz Technologies',
  legalName: 'Xarwiz Technologies LLP',
  url: SITE_ORIGIN,
  logo: `${SITE_ORIGIN}/assets/xarwiz-logo.png`,
  description: "India's enterprise AI business operating system and workflow automation platform.",
  address: {
    '@type': 'PostalAddress',
    addressLocality: 'Noida',
    addressRegion: 'Uttar Pradesh',
    postalCode: '201301',
    addressCountry: 'IN',
  },
  contactPoint: [
    {
      '@type': 'ContactPoint',
      email: 'privacy@xarwiz.com',
      contactType: 'privacy inquiries',
    },
    {
      '@type': 'ContactPoint',
      email: 'grievance@xarwiz.com',
      contactType: 'grievance redressal',
    },
  ],
};

/**
 * Standard Schema.org WebSite structured data
 */
export const defaultWebSiteSchema = {
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  name: 'Xarwiz AI Platform',
  url: SITE_ORIGIN,
  publisher: {
    '@type': 'Organization',
    name: 'Xarwiz Technologies LLP',
  },
};

/**
 * Standard Schema.org SoftwareApplication structured data
 */
export const defaultSoftwareApplicationSchema = {
  '@context': 'https://schema.org',
  '@type': 'SoftwareApplication',
  name: 'Xarwiz AI',
  operatingSystem: 'All (Cloud / Web)',
  applicationCategory: 'BusinessApplication',
  offers: {
    '@type': 'Offer',
    price: '0',
    priceCurrency: 'INR',
  },
  featureList: [
    'Autonomous Multi-Agent AI Workflows',
    'Document Intelligence & Vector RAG',
    'DPDP Act 2023 Statutory Compliance & Privacy Architecture',
    'Multi-Tenant Row-Level Security',
    'AI Image Studio & Creative Generation',
    'Voice AI & Realtime Synthesis',
  ],
};

/**
 * Production-Ready SEO Head Component for Xarwiz AI
 */
export default function SEOHead({
  title,
  description = DEFAULT_DESCRIPTION,
  canonicalPath = '',
  ogType = 'website',
  ogImage = DEFAULT_OG_IMAGE,
  noindex = false,
  jsonLd = null,
}) {
  const fullTitle = formatPageTitle(title);

  // Normalize canonical URL
  let cleanPath = canonicalPath || '';
  if (cleanPath && !cleanPath.startsWith('/')) {
    cleanPath = `/${cleanPath}`;
  }
  // Remove trailing slashes (except root) and query strings
  cleanPath = cleanPath.split('?')[0].replace(/\/+$/, '');
  const canonicalUrl = `${SITE_ORIGIN}${cleanPath || ''}`;

  // Prepare Schema.org JSON-LD scripts
  const schemas = [];
  if (jsonLd) {
    if (Array.isArray(jsonLd)) {
      schemas.push(...jsonLd);
    } else {
      schemas.push(jsonLd);
    }
  }

  return (
    <Head>
      {/* Primary Page Identity */}
      <title key="title">{fullTitle}</title>
      <meta key="meta-description" name="description" content={description} />
      
      {/* Robots Crawling Directives */}
      {noindex ? (
        <meta key="meta-robots" name="robots" content="noindex, nofollow" />
      ) : (
        <meta
          key="meta-robots"
          name="robots"
          content="index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1"
        />
      )}

      {/* Canonical URL */}
      <link key="canonical" rel="canonical" href={canonicalUrl} />

      {/* Open Graph / Facebook */}
      <meta key="og:site_name" property="og:site_name" content="Xarwiz AI Platform" />
      <meta key="og:type" property="og:type" content={ogType} />
      <meta key="og:title" property="og:title" content={fullTitle} />
      <meta key="og:description" property="og:description" content={description} />
      <meta key="og:url" property="og:url" content={canonicalUrl} />
      <meta key="og:image" property="og:image" content={ogImage} />
      <meta key="og:locale" property="og:locale" content="en_US" />

      {/* Twitter Card */}
      <meta key="twitter:card" name="twitter:card" content="summary_large_image" />
      <meta key="twitter:site" name="twitter:site" content="@XarwizAI" />
      <meta key="twitter:creator" name="twitter:creator" content="@XarwizAI" />
      <meta key="twitter:title" name="twitter:title" content={fullTitle} />
      <meta key="twitter:description" name="twitter:description" content={description} />
      <meta key="twitter:image" name="twitter:image" content={ogImage} />

      {/* Structured Data (Schema.org JSON-LD) */}
      {schemas.map((schema, index) => (
        <script
          key={`ldjson-${index}`}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
        />
      ))}
    </Head>
  );
}
