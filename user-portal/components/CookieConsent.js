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
      // Relative path — Next.js's rewrites() proxies /api/* to tenant-api
      // server-side, same origin, regardless of what domain is actually
      // being visited (e.g. xarwiz.com) or
      // whether that domain has an explicit port.
      resolvedApi = '';
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
      <style jsx global>{`
        .cookie-banner-container {
          position: fixed;
          bottom: 20px;
          left: 20px;
          right: 20px;
          z-index: 9999;
          display: flex;
          justify-content: center;
          pointer-events: none;
        }
        .cookie-banner-card {
          pointer-events: auto;
          max-width: 960px;
          width: 100%;
          background-color: #ffffff;
          border: 1px solid #e2e8f0;
          border-radius: 16px;
          padding: 20px 24px;
          box-shadow: 0 12px 32px -4px rgba(15, 23, 42, 0.12), 0 4px 12px rgba(15, 23, 42, 0.05);
          display: flex;
          flex-direction: row;
          align-items: center;
          justify-content: space-between;
          gap: 24px;
          box-sizing: border-box;
        }
        .cookie-banner-content {
          display: flex;
          align-items: flex-start;
          gap: 16px;
          flex: 1;
        }
        .cookie-btn-group {
          display: flex;
          align-items: center;
          gap: 10px;
          flex-shrink: 0;
        }
        .cookie-btn-primary {
          background-color: #2563eb;
          color: #ffffff;
          border: none;
          border-radius: 10px;
          padding: 10px 18px;
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          min-height: 42px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 2px 8px rgba(37, 99, 235, 0.28);
          transition: all 0.2s ease;
        }
        .cookie-btn-primary:hover {
          background-color: #1d4ed8;
          box-shadow: 0 4px 12px rgba(37, 99, 235, 0.35);
        }
        .cookie-btn-secondary {
          background-color: #f8fafc;
          color: #1e293b;
          border: 1px solid #cbd5e1;
          border-radius: 10px;
          padding: 10px 16px;
          font-size: 13px;
          font-weight: 500;
          cursor: pointer;
          min-height: 42px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s ease;
        }
        .cookie-btn-secondary:hover {
          background-color: #f1f5f9;
          border-color: #94a3b8;
          color: #0f172a;
        }
        .cookie-modal-card {
          background-color: #ffffff;
          border: 1px solid #e2e8f0;
          border-radius: 20px;
          max-width: 560px;
          width: 100%;
          padding: 28px;
          box-shadow: 0 25px 50px -12px rgba(15, 23, 42, 0.22);
          box-sizing: border-box;
        }
        .cookie-modal-footer {
          display: flex;
          align-items: center;
          justify-content: flex-end;
          gap: 12px;
        }

        @media (max-width: 768px) {
          .cookie-banner-container {
            bottom: 12px;
            left: 12px;
            right: 12px;
            padding-bottom: env(safe-area-inset-bottom, 0px);
          }
          .cookie-banner-card {
            flex-direction: column;
            align-items: stretch;
            padding: 18px 16px;
            gap: 16px;
          }
          .cookie-banner-content {
            gap: 12px;
          }
          .cookie-btn-group {
            flex-direction: column;
            width: 100%;
            gap: 8px;
          }
          .cookie-btn-primary, .cookie-btn-secondary {
            width: 100%;
            min-height: 44px;
            box-sizing: border-box;
          }
          .cookie-modal-card {
            padding: 20px 16px;
            max-height: 90vh;
            overflow-y: auto;
          }
          .cookie-modal-footer {
            flex-direction: column;
            width: 100%;
            gap: 8px;
          }
          .cookie-modal-footer button {
            width: 100%;
            min-height: 44px;
            box-sizing: border-box;
          }
        }
      `}</style>

      {/* Floating Bottom Banner */}
      {showBanner && !showModal && (
        <div className="cookie-banner-container">
          <div className="cookie-banner-card">
            <div className="cookie-banner-content">
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

            <div className="cookie-btn-group">
              <button
                onClick={() => setShowModal(true)}
                className="cookie-btn-secondary"
              >
                Customize
              </button>
              <button
                onClick={handleRejectNonEssential}
                className="cookie-btn-secondary"
              >
                Reject Non-Essential
              </button>
              <button
                onClick={handleAcceptAll}
                className="cookie-btn-primary"
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
          <div className="cookie-modal-card">
            <div style={styles.modalHeader}>
              <h2 style={styles.modalTitle}>Cookie Preferences</h2>
              <button
                onClick={() => setShowModal(false)}
                style={styles.closeBtn}
                aria-label="Close"
              >
                ✕
              </button>
            </div>

            <p style={styles.modalDesc}>
              Customize your cookie preferences below. Essential cookies are required to operate the Xarwiz AI platform safely.
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

            <div className="cookie-modal-footer">
              <button onClick={handleRejectNonEssential} className="cookie-btn-secondary">
                Reject All Non-Essential
              </button>
              <button onClick={handleSaveCustom} className="cookie-btn-primary">
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
    backgroundColor: '#ffffff',
    border: '1px solid #e2e8f0',
    borderRadius: '16px',
    padding: '20px 24px',
    boxShadow: '0 12px 32px -4px rgba(15, 23, 42, 0.12), 0 4px 12px rgba(15, 23, 42, 0.05)',
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
    fontSize: '24px',
    lineHeight: '1',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '38px',
    height: '38px',
    backgroundColor: '#f1f5f9',
    borderRadius: '10px',
    flexShrink: 0,
  },
  textContainer: {
    flex: 1,
  },
  bannerTitle: {
    fontSize: '15px',
    fontWeight: '700',
    color: '#0f172a',
    margin: '0 0 4px 0',
    letterSpacing: '-0.01em',
  },
  bannerText: {
    fontSize: '13px',
    color: '#475569',
    margin: 0,
    lineHeight: '1.55',
  },
  link: {
    color: '#2563eb',
    fontWeight: '600',
    textDecoration: 'underline',
  },
  buttonGroup: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    flexShrink: 0,
  },
  btnPrimary: {
    backgroundColor: '#2563eb',
    color: '#ffffff',
    border: 'none',
    borderRadius: '10px',
    padding: '10px 18px',
    fontSize: '13px',
    fontWeight: '600',
    cursor: 'pointer',
    boxShadow: '0 2px 8px rgba(37, 99, 235, 0.28)',
  },
  btnSecondary: {
    backgroundColor: '#f8fafc',
    color: '#1e293b',
    border: '1px solid #cbd5e1',
    borderRadius: '10px',
    padding: '10px 16px',
    fontSize: '13px',
    fontWeight: '500',
    cursor: 'pointer',
  },
  modalOverlay: {
    position: 'fixed',
    inset: 0,
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
    backdropFilter: 'blur(6px)',
    zIndex: 10000,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '20px',
  },
  modalCard: {
    backgroundColor: '#ffffff',
    border: '1px solid #e2e8f0',
    borderRadius: '20px',
    maxWidth: '560px',
    width: '100%',
    padding: '28px',
    boxShadow: '0 25px 50px -12px rgba(15, 23, 42, 0.22)',
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
    color: '#0f172a',
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
    color: '#475569',
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
    backgroundColor: '#f8fafc',
    border: '1px solid #e2e8f0',
    padding: '14px 16px',
    borderRadius: '12px',
    gap: '16px',
  },
  categoryName: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#0f172a',
  },
  categoryDesc: {
    fontSize: '12px',
    color: '#64748b',
    marginTop: '2px',
  },
  checkbox: {
    width: '18px',
    height: '18px',
    accentColor: '#2563eb',
    cursor: 'pointer',
  },
  modalFooter: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: '12px',
  },
};
