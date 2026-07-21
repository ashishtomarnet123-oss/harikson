import React from 'react';
import { Cpu, ShieldCheck, Database, BrainCircuit, Code2, Layers } from 'lucide-react';

export default function FeaturesSection() {
  const features = [
    {
      icon: Cpu,
      title: 'Private AI Workspaces',
      description: 'Isolated, zero-data-retention AI sandboxes for enterprise teams with Row-Level Security and strict tenant boundaries.'
    },
    {
      icon: BrainCircuit,
      title: 'Autonomous AI Agents',
      description: 'Deploy self-orchestrating multi-agent systems with tool execution, memory recall, and scheduled background workers.'
    },
    {
      icon: Database,
      title: 'Enterprise RAG Engine',
      description: 'High-speed vector database integration supporting code indexing, document search, and context memory synthesis.'
    },
    {
      icon: ShieldCheck,
      title: 'DPDP Act 2023 Compliance',
      description: 'Native Indian data protection compliance, local data residency, audit trails, and automated retention lifecycle policies.'
    },
    {
      icon: Code2,
      title: 'Developer SDK & API',
      description: 'OpenAI-compatible REST API endpoints, Python/Node.js SDKs, and custom fine-tuned model access.'
    },
    {
      icon: Layers,
      title: 'Multi-Model Fabric',
      description: 'Switch seamlessly between Harikson-3B, Qwen3-8B, Qwen3-32B, and custom fine-tuned LLMs with 100% data sovereignty.'
    }
  ];

  return (
    <section id="features" style={{ padding: '80px 24px', backgroundColor: 'rgba(17, 24, 39, 0.4)' }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: '56px' }}>
          <span style={{
            fontSize: '12px',
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.1em',
            color: '#a855f7',
            backgroundColor: 'rgba(168, 85, 247, 0.1)',
            padding: '6px 14px',
            borderRadius: '20px',
            border: '1px solid rgba(168, 85, 247, 0.3)'
          }}>
            Infrastructure Layer
          </span>
          <h2 style={{ fontSize: '36px', fontWeight: 800, color: '#ffffff', marginTop: '16px', letterSpacing: '-0.02em' }}>
            Built for Enterprise AI Excellence
          </h2>
          <p style={{ fontSize: '16px', color: '#9ca3af', maxWidth: '640px', margin: '12px auto 0' }}>
            Deploy private LLM workspaces, autonomous agents, and RAG knowledge bases from one unified platform.
          </p>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))',
          gap: '24px'
        }}>
          {features.map((feature, idx) => {
            const Icon = feature.icon;
            return (
              <div key={idx} style={{
                backgroundColor: 'rgba(31, 41, 55, 0.4)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: '16px',
                padding: '28px',
                transition: 'transform 0.2s ease, border-color 0.2s ease'
              }}>
                <div style={{
                  width: '44px',
                  height: '44px',
                  borderRadius: '12px',
                  backgroundColor: 'rgba(99, 102, 241, 0.15)',
                  border: '1px solid rgba(99, 102, 241, 0.3)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: '20px'
                }}>
                  <Icon size={22} color="#818cf8" />
                </div>
                <h3 style={{ fontSize: '20px', fontWeight: 700, color: '#ffffff', marginBottom: '10px' }}>
                  {feature.title}
                </h3>
                <p style={{ fontSize: '14px', color: '#9ca3af', lineHeight: 1.6, margin: 0 }}>
                  {feature.description}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
