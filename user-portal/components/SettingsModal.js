import React, { useState, useEffect } from 'react';
import {
  User, Briefcase, Activity, CreditCard, Clock,
  HardDrive, Smartphone, Shield, Code, Palette,
  Globe, HelpCircle, X, LogOut, FileText
} from 'lucide-react';
import { useRouter } from 'next/router';

import ProfileSettings from './settings/profile';
import WorkspaceSettings from './settings/workspace';
import UsageSettings from './settings/usage';
import BillingSettings from './settings/billing';
import ActivitySettings from './settings/activity';
import DevicesSettings from './settings/devices';
import SecuritySettings from './settings/security';
import DeveloperSettings from './settings/developer';
import AppearanceSettings from './settings/appearance';
import LanguageSettings from './settings/language';
import HelpSettings from './settings/help';

function PromptLibrarySettings() {
  const [presets, setPresets] = useState([]);
  const [name, setName] = useState('');
  const [systemPrompt, setSystemPrompt] = useState('');
  const [desc, setDesc] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const getApiBase = () => localStorage.getItem('hk_api_base') || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3008';
  const getToken = () => localStorage.getItem('hk_token');
  const getTenant = () => localStorage.getItem('hk_tenant') || 'neuravolt';

  useEffect(() => {
    const fetchPresets = async () => {
      const token = getToken();
      if (!token) return;
      try {
        const res = await fetch(`${getApiBase()}/api/user/presets`, {
          headers: { 'Authorization': `Bearer ${token}`, 'x-tenant-slug': getTenant() }
        });
        if (res.ok) setPresets(await res.json());
      } catch (e) { console.error('Failed to load presets', e); }
      finally { setLoading(false); }
    };
    fetchPresets();
  }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!name.trim() || !systemPrompt.trim()) return;
    setSaving(true);
    try {
      const res = await fetch(`${getApiBase()}/api/user/presets`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${getToken()}`, 'x-tenant-slug': getTenant(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, description: desc, systemPrompt })
      });
      if (res.ok) {
        setPresets(await res.json());
        setName(''); setSystemPrompt(''); setDesc('');
        // Sync to local storage for chat.js consumption
        window.dispatchEvent(new Event('storage'));
      }
    } catch (e) { console.error(e); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id) => {
    try {
      const res = await fetch(`${getApiBase()}/api/user/presets/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${getToken()}`, 'x-tenant-slug': getTenant() }
      });
      if (res.ok) setPresets(await res.json());
    } catch (e) { console.error(e); }
  };

  if (loading) return <div className="settings-loading">Loading prompt library...</div>;

  return (
    <>
      <div className="settings-page-header">
        <h1>Prompt Library</h1>
        <p>Build and configure custom AI agents and specialized system prompts.</p>
      </div>

      <div className="settings-section">
        <h2>Create Custom Agent</h2>
        <form onSubmit={handleCreate} className="settings-form">
          <div className="form-group">
            <label>Agent Name</label>
            <input 
              type="text" 
              placeholder="e.g. India Tax Consultant" 
              value={name} 
              onChange={e => setName(e.target.value)} 
              required 
            />
          </div>
          <div className="form-group">
            <label>Short Description</label>
            <input 
              type="text" 
              placeholder="e.g. Answers queries on local income tax policies" 
              value={desc} 
              onChange={e => setDesc(e.target.value)} 
            />
          </div>
          <div className="form-group">
            <label>System Instructions (Prompt)</label>
            <textarea 
              rows={4} 
              placeholder="You are an expert advisor..." 
              value={systemPrompt} 
              onChange={e => setSystemPrompt(e.target.value)} 
              required 
            />
          </div>
          <div className="settings-actions">
            <button type="submit" className="btn-primary" disabled={saving}>
              {saving ? 'Saving...' : 'Add Agent'}
            </button>
          </div>
        </form>
      </div>

      <div className="settings-section">
        <h2>Custom Agents</h2>
        {presets.length === 0 ? (
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>No custom agents created yet.</p>
        ) : (
          <div className="settings-flex-col">
            {presets.map(p => (
              <div key={p.id} className="settings-card" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                  <div style={{ fontWeight: '600', fontSize: '14px', color: 'var(--text-primary)' }}>{p.name}</div>
                  <button 
                    onClick={() => handleDelete(p.id)} 
                    style={{ background: 'transparent', border: 'none', color: '#EF4444', fontSize: '11px', cursor: 'pointer', fontWeight: 'bold' }}
                  >
                    Delete
                  </button>
                </div>
                {p.description && <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{p.description}</div>}
                <pre style={{ 
                  margin: '8px 0 0 0', 
                  padding: '8px', 
                  background: 'rgba(0,0,0,0.1)', 
                  borderRadius: '6px', 
                  fontSize: '11px', 
                  color: 'var(--text-secondary)',
                  whiteSpace: 'pre-wrap',
                  fontFamily: 'monospace'
                }}>{p.systemPrompt}</pre>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}

function RagDriveSettings() {
  const [files, setFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(true);

  const getApiBase = () => localStorage.getItem('hk_api_base') || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3008';
  const getToken = () => localStorage.getItem('hk_token');
  const getTenant = () => localStorage.getItem('hk_tenant') || 'neuravolt';

  useEffect(() => {
    const fetchFiles = async () => {
      const token = getToken();
      if (!token) return;
      try {
        const res = await fetch(`${getApiBase()}/api/user/rag-files`, {
          headers: { 'Authorization': `Bearer ${token}`, 'x-tenant-slug': getTenant() }
        });
        if (res.ok) setFiles(await res.json());
      } catch (e) { console.error('Failed to load RAG files', e); }
      finally { setLoading(false); }
    };
    fetchFiles();
  }, []);

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);

    try {
      let text = '';
      if (file.type === 'text/plain' || file.name.endsWith('.txt') || file.name.endsWith('.csv')) {
        text = await file.text();
      } else if (file.type === 'application/pdf') {
        if (window.pdfjsLib) {
          const loadingTask = window.pdfjsLib.getDocument({ data: new Uint8Array(await file.arrayBuffer()) });
          const pdf = await loadingTask.promise;
          let fullText = '';
          for (let i = 1; i <= pdf.numPages; i++) {
            const page = await pdf.getPage(i);
            const content = await page.getTextContent();
            fullText += content.items.map((item) => item.str).join(' ') + '\n';
          }
          text = fullText;
        } else {
          text = `[Attached PDF: ${file.name} - Text parsed client-side]`;
        }
      } else if (file.type.startsWith('image/')) {
        if (window.Tesseract) {
          const worker = await window.Tesseract.createWorker('eng');
          const ret = await worker.recognize(file);
          await worker.terminate();
          text = ret.data.text || '[No text found in image]';
        } else {
          text = `[Attached Image: ${file.name} - OCR parsed client-side]`;
        }
      } else {
        text = await file.text();
      }

      if (!text.trim()) text = `[Empty file content or unparseable format]`;

      // Save to server
      const res = await fetch(`${getApiBase()}/api/user/rag-files`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${getToken()}`, 'x-tenant-slug': getTenant(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: file.name, size: file.size, text, isActive: true })
      });
      if (res.ok) {
        setFiles(await res.json());
        window.dispatchEvent(new Event('storage'));
      } else {
        alert('Failed to save file to server');
      }
    } catch (err) {
      console.error(err);
      alert('Failed to parse file: ' + err.message);
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const toggleFile = async (id) => {
    try {
      const res = await fetch(`${getApiBase()}/api/user/rag-files/${id}`, {
        method: 'PATCH',
        headers: { 'Authorization': `Bearer ${getToken()}`, 'x-tenant-slug': getTenant() }
      });
      if (res.ok) setFiles(await res.json());
    } catch (e) { console.error(e); }
  };

  const handleDelete = async (id) => {
    try {
      const res = await fetch(`${getApiBase()}/api/user/rag-files/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${getToken()}`, 'x-tenant-slug': getTenant() }
      });
      if (res.ok) setFiles(await res.json());
    } catch (e) { console.error(e); }
  };

  if (loading) return <div className="settings-loading">Loading RAG Drive...</div>;

  return (
    <>
      <div className="settings-page-header">
        <h1>My RAG Drive</h1>
        <p>Upload files to index them and use them as persistent context in your chats. Files are saved to your account.</p>
      </div>

      <div className="settings-section">
        <h2>Upload Document</h2>
        <div className="settings-card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '24px', border: '2px dashed var(--border)', background: 'transparent' }}>
          {uploading ? (
            <div style={{ textAlign: 'center' }}>
              <div className="settings-spinner" style={{ margin: '0 auto 12px auto' }} />
              <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Parsing and saving document...</div>
            </div>
          ) : (
            <>
              <HardDrive size={32} style={{ color: 'var(--accent)', marginBottom: '12px' }} />
              <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '16px' }}>Attach PDF, TXT, CSV, or Image (PNG/JPG)</p>
              <input 
                type="file" 
                id="rag-upload" 
                style={{ display: 'none' }} 
                onChange={handleFileUpload} 
              />
              <label 
                htmlFor="rag-upload" 
                className="btn-primary" 
                style={{ cursor: 'pointer', padding: '8px 16px', borderRadius: '8px', fontSize: '13px', display: 'inline-block' }}
              >
                Upload File
              </label>
            </>
          )}
        </div>
      </div>

      <div className="settings-section">
        <h2>Document Library</h2>
        {files.length === 0 ? (
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>No documents indexed in your library.</p>
        ) : (
          <div className="settings-flex-col">
            {files.map(f => (
              <div key={f.id} className="settings-card settings-flex-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0 }}>
                  <div style={{
                    width: '36px', height: '36px', flexShrink: 0,
                    borderRadius: '8px', background: 'rgba(79, 140, 255, 0.1)',
                    color: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center'
                  }}>
                    <FileText size={18} />
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontWeight: '500', fontSize: '13.5px', color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {f.name}
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                      {(f.size / 1024).toFixed(1)} KB · INDEXED
                    </div>
                  </div>
                </div>
                
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexShrink: 0 }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', cursor: 'pointer', color: 'var(--text-secondary)' }}>
                    <input 
                      type="checkbox" 
                      checked={f.isActive} 
                      onChange={() => toggleFile(f.id)} 
                      style={{ cursor: 'pointer' }}
                    />
                    Active
                  </label>
                  <button 
                    onClick={() => handleDelete(f.id)} 
                    style={{ background: 'transparent', border: 'none', color: '#EF4444', fontSize: '11px', cursor: 'pointer', fontWeight: 'bold' }}
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}

const navSections = [
  {
    title: 'Personal',
    items: [
      { id: 'profile',   name: 'My Profile',            icon: User,       Component: ProfileSettings },
      { id: 'workspace', name: 'Workspace',              icon: Briefcase,  Component: WorkspaceSettings },
      { id: 'usage',     name: 'Usage & Analytics',      icon: Activity,   Component: UsageSettings },
      { id: 'billing',   name: 'Billing & Subscription', icon: CreditCard, Component: BillingSettings },
    ]
  },
  {
    title: 'Data & Activity',
    items: [
      { id: 'activity', name: 'Activity Timeline', icon: Clock,      Component: ActivitySettings },
      { id: 'storage',  name: 'My RAG Drive',      icon: HardDrive,  Component: RagDriveSettings },
      { id: 'devices',  name: 'Connected Devices', icon: Smartphone, Component: DevicesSettings },
    ]
  },
  {
    title: 'Configuration',
    items: [
      { id: 'security',        name: 'Security',            icon: Shield,   Component: SecuritySettings },
      { id: 'custom_presets',  name: 'Prompt Library',      icon: Code,     Component: PromptLibrarySettings },
      { id: 'developer',       name: 'Developer Settings',  icon: Code,     Component: DeveloperSettings },
      { id: 'appearance',      name: 'Appearance',          icon: Palette,  Component: AppearanceSettings },
      { id: 'language',        name: 'Language',            icon: Globe,    Component: LanguageSettings },
    ]
  },
  {
    title: 'Support',
    items: [
      { id: 'help', name: 'Help Center', icon: HelpCircle, Component: HelpSettings },
    ]
  }
];

// Flatten all items for easy lookup
const allItems = navSections.flatMap(s => s.items);

export default function SettingsModal({ isOpen, onClose, initialTab = 'profile' }) {
  const [activeTab, setActiveTab] = useState(initialTab);
  const router = useRouter();

  // Sync if initialTab prop changes
  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const activeItem = allItems.find(i => i.id === activeTab) || allItems[0];
  const ActiveComponent = activeItem.Component;

  return (
    <div className="settings-modal-overlay" onClick={onClose}>
      <div className="settings-modal-container" onClick={e => e.stopPropagation()}>

        <button className="settings-modal-close" onClick={onClose} aria-label="Close settings">
          <X size={18} />
        </button>

        <div className="settings-layout">
          {/* ── Sidebar ── */}
          <div className="settings-sidebar">
            <div className="settings-sidebar-header">
              <h2>Settings</h2>
            </div>

            <nav className="settings-nav" aria-label="Settings navigation">
              {navSections.map((section, idx) => (
                <div key={idx} className="settings-nav-section">
                  <p className="settings-nav-title">{section.title}</p>
                  {section.items.map(item => (
                    <button
                      key={item.id}
                      onClick={() => setActiveTab(item.id)}
                      className={`settings-nav-item${activeTab === item.id ? ' active' : ''}`}
                    >
                      <item.icon size={15} />
                      {item.name}
                    </button>
                  ))}
                </div>
              ))}
            </nav>

            <div className="settings-sidebar-footer">
              <button
                className="settings-logout-btn"
                onClick={() => {
                  localStorage.removeItem('hk_token');
                  router.push('/login');
                }}
              >
                <LogOut size={15} /> Log Out
              </button>
            </div>
          </div>

          {/* ── Content ── */}
          <div className="settings-content-wrapper">
            <div className="settings-content">
              <ActiveComponent />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
