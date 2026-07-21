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

export default function App({ Component, pageProps }) {
  return (
    <AuthProvider>
      <Component {...pageProps} />
    </AuthProvider>
  );
}
