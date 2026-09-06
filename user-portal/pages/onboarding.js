import { useState } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import { trackEvent } from '../lib/analytics';

const RocketIcon = () => (
  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z" />
    <path d="M12 15l-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z" />
    <path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0" />
    <path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5" />
  </svg>
);

const CodeIcon = () => (
  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="16 18 22 12 16 6" />
    <polyline points="8 6 2 12 8 18" />
    <line x1="14" y1="4" x2="10" y2="20" />
  </svg>
);

const ChatIcon = () => (
  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    <path d="M8 10h.01" />
    <path d="M12 10h.01" />
    <path d="M16 10h.01" />
  </svg>
);

const STEPS = [
  {
    title: 'Welcome to Xarwiz',
    description: 'Your AI-powered development workspace is ready. Let\'s get you set up in under a minute.',
    icon: <RocketIcon />,
  },
  {
    title: 'Connect Your IDE',
    description: 'Install the Xarwiz VS Code extension for inline completions and code review. You can generate an API key from Settings → Developer.',
    icon: <CodeIcon />,
    action: {
      label: 'Install VS Code Extension',
      href: 'https://marketplace.visualstudio.com/items?itemName=harikson.harikson-vscode-extension',
      external: true,
    },
  },
  {
    title: 'Start Your First Chat',
    description: 'Ask anything — generate code, debug errors, or explore your knowledge base with RAG-powered search.',
    icon: <ChatIcon />,
  },
];

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);

  const current = STEPS[step];
  const isLast = step === STEPS.length - 1;

  const handleNext = () => {
    if (isLast) {
      localStorage.setItem('hk_onboarded', 'true');
      trackEvent('onboarding_completed');
      router.push('/chat');
    } else {
      setStep(step + 1);
    }
  };

  const handleSkip = () => {
    localStorage.setItem('hk_onboarded', 'true');
    trackEvent('onboarding_skipped', { skippedAtStep: step });
    router.push('/chat');
  };

  return (
    <>
      <Head>
        <title>Get Started — Xarwiz Cloud</title>
      </Head>

      <div className="login-root">
        <div className="login-orb login-orb-1" />
        <div className="login-orb login-orb-2" />
        <div className="login-orb login-orb-3" />

        <div className="login-card" style={{ maxWidth: '500px', textAlign: 'center' }}>
          <div className="login-logo">
            <img src="/assets/xarwiz-logo.png" alt="Xarwiz" className="brand-logo-img" />
          </div>

          {/* Progress dots */}
          <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginBottom: '24px' }}>
            {STEPS.map((_, i) => (
              <div
                key={i}
                style={{
                  width: i === step ? '24px' : '8px',
                  height: '8px',
                  borderRadius: '4px',
                  background: i <= step ? 'var(--accent, #4f6ef7)' : 'rgba(0,0,0,0.08)',
                  transition: 'all 0.3s ease',
                }}
              />
            ))}
          </div>

          <div style={{
            width: '64px',
            height: '64px',
            margin: '0 auto 16px auto',
            borderRadius: '50%',
            background: 'rgba(79, 110, 247, 0.08)',
            border: '1px solid rgba(79, 110, 247, 0.2)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#4f6ef7',
          }}>
            {current.icon}
          </div>

          <h1 className="login-title" style={{ fontSize: '1.4rem', marginBottom: '12px' }}>
            {current.title}
          </h1>

          <p style={{
            fontSize: '0.9rem',
            lineHeight: '1.6',
            color: 'var(--text-secondary)',
            marginBottom: '24px',
            padding: '0 8px',
          }}>
            {current.description}
          </p>

          {current.action && (
            <a
              href={current.action.href}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '10px 20px',
                background: 'rgba(79, 110, 247, 0.08)',
                border: '1px solid rgba(79, 110, 247, 0.2)',
                borderRadius: '8px',
                color: '#4f6ef7',
                textDecoration: 'none',
                fontSize: '0.85rem',
                fontWeight: 500,
                marginBottom: '20px',
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                <polyline points="15 3 21 3 21 9" />
                <line x1="10" y1="14" x2="21" y2="3" />
              </svg>
              {current.action.label}
            </a>
          )}

          <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
            <button
              onClick={handleSkip}
              style={{
                flex: 1,
                padding: '12px',
                background: 'transparent',
                border: '1px solid rgba(0,0,0,0.08)',
                borderRadius: '8px',
                color: 'var(--text-secondary)',
                cursor: 'pointer',
                fontSize: '0.85rem',
              }}
            >
              Skip
            </button>
            <button
              onClick={handleNext}
              className="btn-primary"
              style={{ flex: 2 }}
            >
              {isLast ? 'Start Chatting' : 'Next'}
            </button>
          </div>

          <p style={{ marginTop: '16px', fontSize: '12px', color: 'var(--text-secondary)' }}>
            Step {step + 1} of {STEPS.length}
          </p>
        </div>
      </div>
    </>
  );
}
