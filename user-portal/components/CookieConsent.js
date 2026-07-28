import React, { useState, useEffect } from 'react';
import Link from 'next/link';

const CURRENT_CONSENT_VERSION = '1.0';

export default function CookieConsent() {
  const [showBanner, setShowBanner] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [apiBase, setApiBase] = useState('http://localhost:3008');

  // Consent Toggles State
  const [consent, setConsent] = useState({
    necessary: true,
    analytics: false,
    marketing: false,
    preferences: false,
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Resolve API base
    const hostname = window.location.hostname;
    let resolvedApi = 'http://localhost:3008';
    if (hostname !== 'localhost' && hostname !== '127.0.0.1') {
      if (window.location.port) {
        resolvedApi = `http://${hostname}:3008`;
      } else {
        resolvedApi =
          process.env.NEXT_PUBLIC_API_URL ||
          `${window.location.protocol}//api.${hostname.split('.').slice(1).join('.')}`;
      }
    }
    setApiBase(resolvedApi);

    // Initialize Google Consent Mode Defaults
    if (window.gtag) {
      window.gtag('consent', 'default', {
        analytics_storage: 'denied',
        ad_storage: 'denied',
        functionality_storage: 'denied',
        security_storage: 'granted',
      });
    }

    // Check stored consent
    const storedConsentStr = localStorage.getItem('cookie_consent');
    if (!storedConsentStr) {
      setShowBanner(true);
      return;
    }

    try {
      const stored = JSON.parse(storedConsentStr);
      if (stored.version !== CURRENT_CONSENT_VERSION) {
        setShowBanner(true);
      } else {
        setConsent({
          necessary: true,
          analytics: !!stored.analytics,
          marketing: !!stored.marketing,
          preferences: !!stored.preferences,
        });
        applyConsent(stored);
      }
    } catch (e) {
      setShowBanner(true);
    }
  }, []);

  const saveConsent = (consentData) => {
    const fullPayload = {
      ...consentData,
      necessary: true,
      timestamp: new Date().toISOString(),
      version: CURRENT_CONSENT_VERSION,
    };

    // 1. Save in localStorage
    localStorage.setItem('cookie_consent', JSON.stringify(fullPayload));

    // 2. Set Cookie (1 year duration)
    document.cookie = `hk_cookie_consent=${encodeURIComponent(
      JSON.stringify(fullPayload)
    )}; path=/; max-age=${365 * 24 * 60 * 60}; SameSite=Lax`;

    // 3. Update state
    setConsent(fullPayload);
    setShowBanner(false);
    setShowModal(false);

    // 4. Apply scripts / Consent Mode
    applyConsent(fullPayload);

    // 5. Audit Log to backend
    let userId = null;
    try {
      const hkUser = localStorage.getItem('hk_user');
      if (hkUser) userId = JSON.parse(hkUser).id;
    } catch (e) {}

    fetch(`${apiBase}/api/privacy/cookie-consent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ consent: fullPayload, userId }),
    }).catch(() => {});
  };

  const applyConsent = (c) => {
    if (typeof window === 'undefined') return;

    if (window.gtag) {
      window.gtag('consent', 'update', {
        analytics_storage: c.analytics ? 'granted' : 'denied',
        ad_storage: c.marketing ? 'granted' : 'denied',
        functionality_storage: c.preferences ? 'granted' : 'denied',
        security_storage: 'granted',
      });
    }
  };

  const handleAcceptAll = () => {
    const allOn = {
      necessary: true,
      analytics: true,
      marketing: true,
      preferences: true,
    };
    saveConsent(allOn);
  };

  const handleRejectNonEssential = () => {
    const onlyNecessary = {
      necessary: true,
      analytics: false,
      marketing: false,
      preferences: false,
    };
    saveConsent(onlyNecessary);
  };

  const handleSaveCustom = () => {
    saveConsent(consent);
  };

  if (!showBanner && !showModal) return null;

  return (
    <>
      {/* Floating Bottom Banner */}
      {showBanner && !showModal && (
        <div style={styles.bannerContainer}>
          <div style={styles.bannerCard}>
            <div style={styles.bannerContent}>
              <div style={styles.iconBox}>🍪</div>
              <div style={styles.textContainer}>
                <h3 style={styles.bannerTitle}>We value your privacy</h3>
                <p style={styles.bannerText}>
                  We use cookies to enhance navigation, analyze site traffic, and deliver personalized experiences. 
                  Read our{' '}
                  <Link href="/cookies" style={styles.link}>
                    Cookie Policy
                  </Link>{' '}
                  and{' '}
                  <Link href="/privacy" style={styles.link}>
                    Privacy Policy
                  </Link>{' '}
                  for details.
                </p>
              </div>
            </div>

            <div style={styles.buttonGroup}>
              <button
                onClick={() => setShowModal(true)}
                style={styles.btnSecondary}
              >
                Customize
              </button>
              <button
                onClick={handleRejectNonEssential}
                style={styles.btnSecondary}
              >
                Reject Non-Essential
              </button>
              <button
                onClick={handleAcceptAll}
                style={styles.btnPrimary}
              >
                Accept All
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Preference Customization Modal */}
      {showModal && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalCard}>
            <div style={styles.modalHeader}>
              <h2 style={styles.modalTitle}>Cookie Preferences</h2>
              <button
                onClick={() => setShowModal(false)}
                style={styles.closeBtn}
              >
                ✕
              </button>
            </div>

            <p style={styles.modalDesc}>
              Customize your cookie preferences below. Essential cookies are required to operate the Neuravolt AI platform safely.
            </p>

            <div style={styles.categoryList}>
              {/* Necessary */}
              <div style={styles.categoryRow}>
                <div>
                  <div style={styles.categoryName}>Necessary Cookies (Always Active)</div>
                  <div style={styles.categoryDesc}>Required for authentication, session security, tenant isolation, and CSRF protection.</div>
                </div>
                <input type="checkbox" checked disabled style={styles.checkbox} />
              </div>

              {/* Preferences */}
              <div style={styles.categoryRow}>
                <div>
                  <div style={styles.categoryName}>Preferences & Settings</div>
                  <div style={styles.categoryDesc}>Remembers your theme preferences, sidebar states, and language configurations.</div>
                </div>
                <input
                  type="checkbox"
                  checked={consent.preferences}
                  onChange={(e) => setConsent({ ...consent, preferences: e.target.checked })}
                  style={styles.checkbox}
                />
              </div>

              {/* Analytics */}
              <div style={styles.categoryRow}>
                <div>
                  <div style={styles.categoryName}>Analytics & Metrics</div>
                  <div style={styles.categoryDesc}>Helps us measure site traffic, platform performance, and feature utilization.</div>
                </div>
                <input
                  type="checkbox"
                  checked={consent.analytics}
                  onChange={(e) => setConsent({ ...consent, analytics: e.target.checked })}
                  style={styles.checkbox}
                />
              </div>

              {/* Marketing */}
              <div style={styles.categoryRow}>
                <div>
                  <div style={styles.categoryName}>Marketing & Conversion Tracking</div>
                  <div style={styles.categoryDesc}>Used for promotional campaigns and retargeting relevant AI platform capabilities.</div>
                </div>
                <input
                  type="checkbox"
                  checked={consent.marketing}
                  onChange={(e) => setConsent({ ...consent, marketing: e.target.checked })}
                  style={styles.checkbox}
                />
              </div>
            </div>

            <div style={styles.modalFooter}>
              <button onClick={handleRejectNonEssential} style={styles.btnSecondary}>
                Reject All Non-Essential
              </button>
              <button onClick={handleSaveCustom} style={styles.btnPrimary}>
                Save Preferences
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

const styles = {
  bannerContainer: {
    position: 'fixed',
    bottom: '20px',
    left: '20px',
    right: '20px',
    zIndex: 9999,
    display: 'flex',
    justifyContent: 'center',
    pointerEvents: 'none',
  },
  bannerCard: {
    pointerEvents: 'auto',
    maxWidth: '960px',
    width: '100%',
    backgroundColor: '#0f172a',
    border: '1px solid #1e293b',
    borderRadius: '16px',
    padding: '20px 24px',
    boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5), 0 10px 10px -5px rgba(0, 0, 0, 0.4)',
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '24px',
  },
  bannerContent: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '16px',
    flex: 1,
  },
  iconBox: {
    fontSize: '28px',
    lineHeight: '1',
  },
  textContainer: {
    flex: 1,
  },
  bannerTitle: {
    fontSize: '15px',
    fontWeight: '700',
    color: '#f8fafc',
    margin: '0 0 4px 0',
  },
  bannerText: {
    fontSize: '13px',
    color: '#94a3b8',
    margin: 0,
    lineHeight: '1.5',
  },
  link: {
    color: '#38bdf8',
    textDecoration: 'underline',
  },
  buttonGroup: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    flexShrink: 0,
  },
  btnPrimary: {
    backgroundColor: '#0284c7',
    color: '#ffffff',
    border: 'none',
    borderRadius: '8px',
    padding: '10px 18px',
    fontSize: '13px',
    fontWeight: '600',
    cursor: 'pointer',
  },
  btnSecondary: {
    backgroundColor: '#1e293b',
    color: '#cbd5e1',
    border: '1px solid #334155',
    borderRadius: '8px',
    padding: '10px 16px',
    fontSize: '13px',
    fontWeight: '500',
    cursor: 'pointer',
  },
  modalOverlay: {
    position: 'fixed',
    inset: 0,
    backgroundColor: 'rgba(15, 23, 42, 0.8)',
    backdropFilter: 'blur(4px)',
    zIndex: 10000,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '20px',
  },
  modalCard: {
    backgroundColor: '#0f172a',
    border: '1px solid #1e293b',
    borderRadius: '20px',
    maxWidth: '560px',
    width: '100%',
    padding: '28px',
    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7)',
  },
  modalHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: '12px',
  },
  modalTitle: {
    fontSize: '18px',
    fontWeight: '700',
    color: '#f8fafc',
    margin: 0,
  },
  closeBtn: {
    background: 'none',
    border: 'none',
    color: '#64748b',
    fontSize: '18px',
    cursor: 'pointer',
  },
  modalDesc: {
    fontSize: '13px',
    color: '#94a3b8',
    margin: '0 0 20px 0',
    lineHeight: '1.5',
  },
  categoryList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
    marginBottom: '24px',
  },
  categoryRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#1e293b',
    padding: '14px 16px',
    borderRadius: '12px',
    gap: '16px',
  },
  categoryName: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#f1f5f9',
  },
  categoryDesc: {
    fontSize: '12px',
    color: '#94a3b8',
    marginTop: '2px',
  },
  checkbox: {
    width: '18px',
    height: '18px',
    accentColor: '#0284c7',
    cursor: 'pointer',
  },
  modalFooter: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: '12px',
  },
};
