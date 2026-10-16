import React, { useEffect } from 'react';
import NeuravoltLandingPage from './neuravolt';
import SEOHead from '../components/SEOHead';

/**
 * Dedicated Public Pricing Page for Xarwiz AI Platform
 * Canonical URL: https://xarwiz.com/pricing
 */
export default function PricingPage() {
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const el = document.getElementById('pricing');
      if (el) {
        el.scrollIntoView({ behavior: 'smooth' });
      }
    }
  }, []);

  return (
    <>
      <SEOHead
        title="Pricing Plans"
        description="Transparent pricing plans for Xarwiz AI Platform. Built for Indian enterprises and growing teams with DPDP statutory compliance, GST invoices, and 24/7 support."
        canonicalPath="/pricing"
        jsonLd={{
          '@context': 'https://schema.org',
          '@type': 'Product',
          name: 'Xarwiz AI Platform Subscription',
          description: "India's all-in-one AI operating system for agents, workflow automations, and document intelligence.",
          offers: {
            '@type': 'AggregateOffer',
            priceCurrency: 'INR',
            lowPrice: '999',
            highPrice: '4999',
            offerCount: '3',
          },
        }}
      />
      <NeuravoltLandingPage disableSeo={true} />
    </>
  );
}
