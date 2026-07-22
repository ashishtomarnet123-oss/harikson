import '../styles/globals.css';
import '../styles/settings-addon.css';
import { AuthProvider } from '../context/AuthContext';

if (typeof window !== 'undefined' && !window.__fetchIntercepted) {
  window.__fetchIntercepted = true;
  const originalFetch = window.fetch;
  window.fetch = function (input, init) {
    init = init || {};
    init.headers = init.headers || {};
    
    let hasRequestId = false;
    if (init.headers instanceof Headers) {
      hasRequestId = init.headers.has('x-request-id') || init.headers.has('X-Request-ID');
    } else if (Array.isArray(init.headers)) {
      hasRequestId = init.headers.some(([k]) => k.toLowerCase() === 'x-request-id');
    } else {
      hasRequestId = !!(init.headers['x-request-id'] || init.headers['X-Request-ID']);
    }
    
    if (!hasRequestId) {
      const reqId = window.crypto?.randomUUID ? window.crypto.randomUUID() : Math.random().toString(36).substring(2, 15);
      if (init.headers instanceof Headers) {
        init.headers.set('X-Request-ID', reqId);
      } else if (Array.isArray(init.headers)) {
        init.headers.push(['X-Request-ID', reqId]);
      } else {
        init.headers['X-Request-ID'] = reqId;
      }
    }
    return originalFetch.call(this, input, init);
  };
}

import Head from 'next/head';
import CookieConsent from '../components/CookieConsent';

export default function App({ Component, pageProps }) {
  return (
    <AuthProvider>
      <Head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Outfit:wght@500;600;700&display=swap"
          rel="stylesheet"
        />
      </Head>
      <Component {...pageProps} />
      <CookieConsent />
    </AuthProvider>
  );
}
