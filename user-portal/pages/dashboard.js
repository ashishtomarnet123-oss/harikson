import React from 'react';
import Head from 'next/head';
import Link from 'next/link';
import {
  MessageSquare,
  Workflow,
  Key,
  Database,
  Cpu,
  Zap,
  ArrowRight,
  Plus,
  ShieldCheck,
  Activity,
  Sparkles
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { withAuth } from '../components/withAuth';
import DashboardShell from '../components/layout/DashboardShell';

function DashboardPage() {
  const { user } = useAuth();

  const quickActions = [
    {
      title: 'New AI Chat Session',
      description: 'Start a private conversational workspace with Qwen3 or Harikson models.',
      icon: MessageSquare,
      href: '/chat',
      color: '#6366f1'
    },
    {
      title: 'Build Agent Workflow',
      description: 'Create multi-agent background workflows and automated task chains.',
      icon: Workflow,
      href: '/workflows',
      color: '#a855f7'
    },
    {
      title: 'Security & Compliance',
      description: 'View DPDP Act 2023 audit trails and tenant row-level security settings.',
      icon: ShieldCheck,
      href: '/security',
      color: '#34d399'
    }
  ];

  return (
    <>
      <Head>
        <title>Dashboard - Neuravolt Cloud</title>
        <meta name="robots" content="noindex, nofollow" />
      </Head>

      <DashboardShell title="Workspace Dashboard">
        {/* Welcome Hero Banner */}
        <div style={{
          backgroundColor: 'rgba(17, 24, 39, 0.6)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          borderRadius: '16px',
          padding: '28px',
          marginBottom: '28px',
          background: 'radial-gradient(ellipse at 100% 0%, rgba(99, 102, 241, 0.15) 0%, rgba(17, 24, 39, 0.6) 70%)'
        }}>
          <span style={{
            fontSize: '12px',
            fontWeight: 600,
            color: '#a855f7',
            backgroundColor: 'rgba(168, 85, 247, 0.15)',
            padding: '4px 12px',
            borderRadius: '20px',
            textTransform: 'uppercase'
          }}>
            Active Workspace: {user?.tenantSlug || 'neuravolt'}
          </span>
          <h2 style={{ fontSize: '26px', fontWeight: 800, color: '#ffffff', marginTop: '12px', marginBottom: '8px' }}>
            Welcome back, {user?.name || user?.email?.split('@')[0] || 'Developer'} 👋
          </h2>
          <p style={{ fontSize: '14px', color: '#9ca3af', margin: 0 }}>
            Deploy secure private AI workspaces, autonomous agents, and RAG knowledge bases from one unified platform.
          </p>
        </div>

        {/* Quick Action Cards */}
        <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#ffffff', marginBottom: '16px' }}>
          Quick Actions
        </h3>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
          gap: '20px',
          marginBottom: '36px'
        }}>
          {quickActions.map((action, idx) => {
            const Icon = action.icon;
            return (
              <Link
                key={idx}
                href={action.href}
                style={{
                  backgroundColor: 'rgba(31, 41, 55, 0.4)',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  borderRadius: '14px',
                  padding: '20px',
                  textDecoration: 'none',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  transition: 'transform 0.15s ease, border-color 0.15s ease'
                }}
              >
                <div>
                  <div style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '10px',
                    backgroundColor: `${action.color}20`,
                    border: `1px solid ${action.color}40`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: '16px'
                  }}>
                    <Icon size={20} color={action.color} />
                  </div>
                  <h4 style={{ fontSize: '16px', fontWeight: 700, color: '#ffffff', margin: '0 0 6px 0' }}>
                    {action.title}
                  </h4>
                  <p style={{ fontSize: '13px', color: '#9ca3af', margin: 0, lineHeight: 1.5 }}>
                    {action.description}
                  </p>
                </div>

                <div style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontSize: '13px',
                  fontWeight: 600,
                  color: action.color,
                  marginTop: '16px'
                }}>
                  Launch
                  <ArrowRight size={14} />
                </div>
              </Link>
            );
          })}
        </div>

        {/* System Stats Overview */}
        <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#ffffff', marginBottom: '16px' }}>
          Workspace Metrics & Health
        </h3>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '16px'
        }}>
          <div style={{
            backgroundColor: 'rgba(17, 24, 39, 0.5)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: '12px',
            padding: '20px'
          }}>
            <p style={{ fontSize: '12px', color: '#9ca3af', margin: '0 0 6px 0', textTransform: 'uppercase' }}>
              Token Quota
            </p>
            <p style={{ fontSize: '24px', fontWeight: 800, color: '#ffffff', margin: 0 }}>
              Unlimited
            </p>
          </div>

          <div style={{
            backgroundColor: 'rgba(17, 24, 39, 0.5)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: '12px',
            padding: '20px'
          }}>
            <p style={{ fontSize: '12px', color: '#9ca3af', margin: '0 0 6px 0', textTransform: 'uppercase' }}>
              Model Access
            </p>
            <p style={{ fontSize: '24px', fontWeight: 800, color: '#34d399', margin: 0 }}>
              Qwen3 / 32B
            </p>
          </div>

          <div style={{
            backgroundColor: 'rgba(17, 24, 39, 0.5)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: '12px',
            padding: '20px'
          }}>
            <p style={{ fontSize: '12px', color: '#9ca3af', margin: '0 0 6px 0', textTransform: 'uppercase' }}>
              Compliance Mode
            </p>
            <p style={{ fontSize: '24px', fontWeight: 800, color: '#818cf8', margin: 0 }}>
              DPDP Active
            </p>
          </div>
        </div>
      </DashboardShell>
    </>
  );
}

export default withAuth(DashboardPage);
