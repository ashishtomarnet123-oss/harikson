import { useState } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import { trackEvent } from '../lib/analytics';

const STEPS = [
  {
    title: 'Welcome to Xarwiz',
    description: 'Your AI-powered development workspace is ready. Let\'s get you set up in under a minute.',
    icon: '🚀',
  },
  {
    title: 'Connect Your IDE',
    description: 'Install the Xarwiz VS Code extension for inline completions and code review. You can generate an API key from Settings → Developer.',
    icon: '⚡',
    action: {
      label: 'Install VS Code Extension',
      href: 'https://marketplace.visualstudio.com/items?itemName=harikson.harikson-vscode-extension',
      external: true,
    },
  },
  {
    title: 'Start Your First Chat',
    description: 'Ask anything — generate code, debug errors, or explore your knowledge base with RAG-powered search.',
    icon: '💬',
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
                  background: i <= step ? 'var(--accent, #8b5cf6)' : 'rgba(255,255,255,0.15)',
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
            background: 'rgba(139, 92, 246, 0.12)',
            border: '1px solid rgba(139, 92, 246, 0.3)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '1.8rem',
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
                background: 'rgba(139, 92, 246, 0.12)',
                border: '1px solid rgba(139, 92, 246, 0.3)',
                borderRadius: '8px',
                color: 'var(--accent, #8b5cf6)',
                textDecoration: 'none',
                fontSize: '0.85rem',
                fontWeight: 500,
                marginBottom: '20px',
              }}
            >
              {current.action.label} ↗
            </a>
          )}

          <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
            <button
              onClick={handleSkip}
              style={{
                flex: 1,
                padding: '12px',
                background: 'transparent',
                border: '1px solid rgba(255,255,255,0.1)',
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
