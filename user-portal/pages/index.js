import { useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import {
  Zap,
  ArrowRight,
  ShieldCheck,
  Cpu,
  BrainCircuit,
  Database,
  Code2,
  Lock,
  Terminal,
  ExternalLink,
  ChevronRight,
  Layers,
  CheckCircle2,
  Building
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import Navbar from '../components/layout/Navbar';
import FeaturesSection from '../components/marketing/FeaturesSection';
import PricingSection from '../components/marketing/PricingSection';
import TestimonialsSection from '../components/marketing/TestimonialsSection';

export default function LandingPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading } = useAuth();

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      router.replace('/dashboard');
    }
  }, [isLoading, isAuthenticated, router]);

  return (
    <>
      <Head>
        <title>Neuravolt Cloud - Enterprise AI Operating System & Private LLM Infrastructure</title>
        <meta
          name="description"
          content="Deploy secure private AI workspaces, autonomous AI agents, enterprise RAG knowledge bases, and multi-model LLM infrastructure with DPDP Act 2023 compliance."
        />
        <meta name="keywords" content="Enterprise AI, Private LLM, AI Workspaces, AI Agents, DPDP Act 2023, Vector RAG, Harikson AI, Neuravolt Cloud" />
        <link rel="canonical" href="https://neuravolt.cloud/" />

        {/* OpenGraph / Social Meta Tags */}
        <meta property="og:type" content="website" />
        <meta property="og:title" content="Neuravolt Cloud - Enterprise AI Operating System" />
        <meta property="og:description" content="Deploy private AI workspaces, autonomous agents, and RAG infrastructure from one unified platform." />
        <meta property="og:url" content="https://neuravolt.cloud/" />
        <meta property="og:site_name" content="Neuravolt Cloud" />

        {/* Structured Data (schema.org) */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'SoftwareApplication',
              name: 'Neuravolt Cloud',
              operatingSystem: 'Cloud / Platform Independent',
              applicationCategory: 'DeveloperApplication',
              offers: {
                '@type': 'Offer',
                price: '0',
                priceCurrency: 'INR'
              },
              description: 'Enterprise AI Operating System for private LLM workspaces, autonomous agents, and RAG knowledge bases.'
            })
          }}
        />
      </Head>

      <div style={{ backgroundColor: '#030712', color: '#f9fafb', minHeight: '100vh', fontFamily: 'Inter, system-ui, sans-serif' }}>
        <Navbar />

        {/* Hero Section */}
        <section style={{
          padding: '100px 24px 80px',
          textAlign: 'center',
          background: 'radial-gradient(ellipse at 50% 0%, rgba(99, 102, 241, 0.18) 0%, rgba(3, 7, 18, 1) 70%)'
        }}>
          <div style={{ maxWidth: '900px', margin: '0 auto' }}>
            <span style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '6px 16px',
              borderRadius: '20px',
              backgroundColor: 'rgba(99, 102, 241, 0.1)',
              border: '1px solid rgba(99, 102, 241, 0.3)',
              color: '#818cf8',
              fontSize: '13px',
              fontWeight: 600,
              marginBottom: '24px'
            }}>
              <Zap size={14} color="#818cf8" />
              Enterprise AI Operating System
            </span>

            <h1 style={{
              fontSize: '54px',
              fontWeight: 800,
              lineHeight: 1.1,
              letterSpacing: '-0.03em',
              color: '#ffffff',
              marginBottom: '24px'
            }}>
              The Infrastructure Layer for <span style={{
                background: 'linear-gradient(135deg, #818cf8 0%, #c084fc 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent'
              }}>Enterprise AI</span>
            </h1>

            <p style={{
              fontSize: '18px',
              color: '#9ca3af',
              lineHeight: 1.6,
              maxWidth: '720px',
              margin: '0 auto 36px'
            }}>
              Deploy secure private AI workspaces, autonomous agents, workflows, RAG knowledge bases, and multi-model LLM infrastructure with DPDP Act 2023 compliance.
            </p>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '16px', flexWrap: 'wrap' }}>
              <Link
                href="/signup"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '14px 28px',
                  borderRadius: '10px',
                  background: 'linear-gradient(135deg, #6366f1 0%, #a855f7 100%)',
                  color: '#ffffff',
                  textDecoration: 'none',
                  fontSize: '16px',
                  fontWeight: 600,
                  boxShadow: '0 0 25px rgba(168, 85, 247, 0.4)'
                }}
              >
                Deploy Free AI Workspace
                <ArrowRight size={18} />
              </Link>
              <a
                href="#architecture"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '14px 24px',
                  borderRadius: '10px',
                  backgroundColor: 'rgba(255, 255, 255, 0.06)',
                  border: '1px solid rgba(255, 255, 255, 0.12)',
                  color: '#ffffff',
                  textDecoration: 'none',
                  fontSize: '16px',
                  fontWeight: 500
                }}
              >
                View Architecture
              </a>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <FeaturesSection />

        {/* Architecture & Code Section */}
        <section id="architecture" style={{ padding: '80px 24px', backgroundColor: '#030712' }}>
          <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
            <div style={{ textAlign: 'center', marginBottom: '48px' }}>
              <span style={{ fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', color: '#818cf8', letterSpacing: '0.1em' }}>
                OpenAI Compatible API
              </span>
              <h2 style={{ fontSize: '32px', fontWeight: 800, color: '#ffffff', marginTop: '12px' }}>
                Integrate in 3 Lines of Code
              </h2>
            </div>

            <div style={{
              backgroundColor: 'rgba(17, 24, 39, 0.8)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '16px',
              padding: '24px',
              fontFamily: 'monospace',
              fontSize: '14px',
              color: '#34d399',
              overflowX: 'auto'
            }}>
              <pre style={{ margin: 0 }}>{`import { HariksonAI } from 'harikson';

const ai = new HariksonAI({ apiKey: 'hk-live-key' });
const response = await ai.chat.completions.create({
  model: 'harikson-qwen3-32b',
  messages: [{ role: 'user', content: 'Extract entities from document' }]
});`}</pre>
            </div>
          </div>
        </section>

        {/* Testimonials */}
        <TestimonialsSection />

        {/* Pricing */}
        <PricingSection />

        {/* Footer */}
        <footer style={{
          padding: '48px 24px',
          borderTop: '1px solid rgba(255, 255, 255, 0.08)',
          backgroundColor: 'rgba(3, 7, 18, 0.95)',
          color: '#6b7280',
          fontSize: '14px'
        }}>
          <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
            <div>
              <span style={{ color: '#f3f4f6', fontWeight: 600 }}>Neuravolt Cloud</span> — Enterprise AI Operating System
            </div>
            <div style={{ display: 'flex', gap: '20px' }}>
              <Link href="/privacy" style={{ color: '#9ca3af', textDecoration: 'none' }}>Privacy Policy</Link>
              <Link href="/terms" style={{ color: '#9ca3af', textDecoration: 'none' }}>Terms of Service</Link>
              <Link href="/aup" style={{ color: '#9ca3af', textDecoration: 'none' }}>Acceptable Use</Link>
              <Link href="/cookies" style={{ color: '#9ca3af', textDecoration: 'none' }}>Cookies</Link>
              <Link href="/security" style={{ color: '#9ca3af', textDecoration: 'none' }}>Security</Link>
            </div>
          </div>
        </footer>
      </div>
    </>
  );
}
