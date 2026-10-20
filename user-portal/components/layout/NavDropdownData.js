/**
 * Central Navigation Configuration for Xarwiz Global Navigation
 * Supports Desktop Mega-Menus, Mobile Accordions, Badges, and Routing.
 * 
 * Strict Link Integrity Enforced: Every item resolves to a verified, public, active route.
 */

export const NAV_ITEMS = [
  {
    id: 'platform',
    label: 'Platform',
    hasDropdown: true,
    href: '/platform/ai-agents',
    columns: [
      {
        sectionTitle: 'Platform Capabilities',
        items: [
          {
            title: 'AI Agent Builder',
            desc: 'Autonomous multi-agent systems with sandboxed tool calling & memory',
            href: '/platform/ai-agents',
            icon: 'Bot',
            badge: 'Popular',
          },
          {
            title: 'Workflow Automation',
            desc: 'Deterministic DAG node graph orchestrator with automated retries',
            href: '/platform/workflows',
            icon: 'Workflow',
          },
          {
            title: 'Knowledge Base (RAG)',
            desc: 'Hybrid pgvector + BM25 search with AES-256 partition isolation',
            href: '/platform/knowledge-bases',
            icon: 'Database',
          },
        ],
      },
    ],
  },
  {
    id: 'solutions',
    label: 'Solutions',
    hasDropdown: true,
    href: '/solutions',
    columns: [
      {
        sectionTitle: 'Team & Industry Solutions',
        items: [
          {
            title: 'For High-Growth Startups',
            desc: 'Scale operations without linear hiring; 24/7 support triage & code audits',
            href: '/solutions/startups',
            icon: 'Rocket',
            badge: 'Popular',
          },
          {
            title: 'Business Operations',
            desc: 'Automate invoice reconciliation, human Slack approvals & back-office flows',
            href: '/solutions/operations',
            icon: 'Briefcase',
          },
          {
            title: 'Agencies & Consultancies',
            desc: 'Multi-tenant client workspaces with strict database schema isolation',
            href: '/solutions/agencies',
            icon: 'Layers',
          },
        ],
      },
    ],
  },
  {
    id: 'developers',
    label: 'Developers',
    hasDropdown: true,
    href: '/developers',
    columns: [
      {
        sectionTitle: 'Developer Hub',
        items: [
          {
            title: 'API Reference',
            desc: 'REST endpoints, SSE streams & OpenAPI specs for agent orchestration',
            href: '/developers',
            icon: 'Terminal',
          },
          {
            title: 'Webhooks & Events',
            desc: 'Real-time payload delivery with HMAC-SHA256 signature verification',
            href: '/developers',
            icon: 'Webhook',
          },
          {
            title: 'Integrations Directory',
            desc: 'Connect Google Drive, Slack, Notion, GitHub & Figma',
            href: '/developers',
            icon: 'Boxes',
          },
        ],
      },
    ],
  },
  {
    id: 'pricing',
    label: 'Pricing',
    hasDropdown: false,
    href: '/pricing',
  },
  {
    id: 'resources',
    label: 'Resources',
    hasDropdown: true,
    href: '/security',
    columns: [
      {
        sectionTitle: 'Knowledge & Trust',
        items: [
          {
            title: 'Security & Trust Center',
            desc: 'SOC2/ISO readiness, AES-256 encryption, row-level security & pen-tests',
            href: '/security',
            icon: 'Lock',
          },
          {
            title: 'DPDP Privacy Notice',
            desc: 'Purpose-specific processing, consent safeguards & Indian data localization',
            href: '/privacy',
            icon: 'FileText',
          },
          {
            title: 'Data Processing Agreement',
            desc: 'Sub-processors, cross-border transfer safeguards & security measures',
            href: '/data-processing',
            icon: 'ShieldCheck',
          },
          {
            title: 'Legal & Compliance Policies',
            desc: 'Privacy Policy, Terms of Service, Acceptable Use & Grievance Redressal',
            href: '/terms',
            icon: 'Scale',
          },
        ],
      },
    ],
  },
  {
    id: 'company',
    label: 'Company',
    hasDropdown: true,
    href: '/about',
    columns: [
      {
        sectionTitle: 'Company & Team',
        items: [
          {
            title: 'About Xarwiz',
            desc: 'Our mission to build India\'s sovereign AI business operating system',
            href: '/about',
            icon: 'Building',
          },
          {
            title: 'Contact Sales & Team',
            desc: 'Inquire about enterprise cloud deployments, custom models & live demos',
            href: '/contact',
            icon: 'Mail',
            badge: 'Fast Response',
          },
          {
            title: 'Careers',
            desc: 'Join our team shaping autonomous AI infrastructure in India',
            href: '/careers',
            icon: 'Sparkles',
            badge: 'We\'re Hiring',
          },
          {
            title: 'Grievance Redressal',
            desc: 'Statutory compliance channel under Indian DPDP Act 2023',
            href: '/grievance',
            icon: 'Scale',
          },
        ],
      },
    ],
  },
];
