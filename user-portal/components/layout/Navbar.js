import React from 'react';
import Link from 'next/link';
import { Zap, ArrowRight, ShieldCheck, Cpu } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export default function Navbar() {
  const { isAuthenticated, user } = useAuth();

  return (
    <nav className="marketing-navbar" style={{
      position: 'sticky',
      top: 0,
      zIndex: 100,
      backdropFilter: 'blur(12px)',
      backgroundColor: 'rgba(3, 7, 18, 0.85)',
      borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
      padding: '16px 24px'
    }}>
      <div style={{
        maxWidth: '1200px',
        margin: '0 auto',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        {/* Brand Logo */}
        <Link href="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            width: '36px',
            height: '36px',
            borderRadius: '10px',
            background: 'linear-gradient(135deg, #6366f1 0%, #a855f7 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 0 20px rgba(99, 102, 241, 0.4)'
          }}>
            <Zap size={20} color="#ffffff" />
          </div>
          <div>
            <span style={{ fontSize: '18px', fontWeight: 700, color: '#ffffff', letterSpacing: '-0.02em' }}>
              Neuravolt <span style={{ color: '#a855f7', fontWeight: 400 }}>Cloud</span>
            </span>
          </div>
        </Link>

        {/* Navigation Links */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '28px' }}>
          <a href="#features" style={{ color: '#9ca3af', textDecoration: 'none', fontSize: '14px', fontWeight: 500 }}>Features</a>
          <a href="#architecture" style={{ color: '#9ca3af', textDecoration: 'none', fontSize: '14px', fontWeight: 500 }}>Architecture</a>
          <a href="#pricing" style={{ color: '#9ca3af', textDecoration: 'none', fontSize: '14px', fontWeight: 500 }}>Pricing</a>
          <Link href="/security" style={{ color: '#9ca3af', textDecoration: 'none', fontSize: '14px', fontWeight: 500 }}>Security</Link>
          <Link href="/terms" style={{ color: '#9ca3af', textDecoration: 'none', fontSize: '14px', fontWeight: 500 }}>Legal</Link>
        </div>

        {/* Auth CTA Buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {isAuthenticated ? (
            <Link
              href="/dashboard"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '8px 18px',
                borderRadius: '8px',
                background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
                color: '#ffffff',
                textDecoration: 'none',
                fontSize: '14px',
                fontWeight: 600,
                boxShadow: '0 4px 14px rgba(99, 102, 241, 0.35)'
              }}
            >
              Go to Dashboard
              <ArrowRight size={16} />
            </Link>
          ) : (
            <>
              <Link
                href="/login"
                style={{
                  color: '#e5e7eb',
                  textDecoration: 'none',
                  fontSize: '14px',
                  fontWeight: 500,
                  padding: '8px 14px'
                }}
              >
                Sign In
              </Link>
              <Link
                href="/signup"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '8px 18px',
                  borderRadius: '8px',
                  background: 'linear-gradient(135deg, #6366f1 0%, #a855f7 100%)',
                  color: '#ffffff',
                  textDecoration: 'none',
                  fontSize: '14px',
                  fontWeight: 600,
                  boxShadow: '0 4px 14px rgba(168, 85, 247, 0.35)'
                }}
              >
                Deploy Free AI
                <ArrowRight size={16} />
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
