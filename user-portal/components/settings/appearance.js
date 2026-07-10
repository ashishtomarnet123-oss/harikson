import React, { useState, useEffect } from 'react';
import { Save } from 'lucide-react';

export default function AppearanceSettings() {
  const [settings, setSettings] = useState({
    theme: 'system',
    density: 'comfortable',
    sidebarState: 'expanded',
    fontSize: 'medium',
    accentColor: 'default',
    animation: true
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const token = localStorage.getItem('hk_token');
        if (!token) return;
        const apiBase = process.env.NEXT_PUBLIC_API_URL || '';
        const res = await fetch(`${apiBase}/api/user/settings`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          setSettings(prev => ({ ...prev, ...data }));
        }
      } catch (err) {
        console.error('Failed to fetch settings', err);
      } finally {
        setLoading(false);
      }
    };
    fetchSettings();
  }, []);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setSettings(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);
    try {
      const token = localStorage.getItem('hk_token');
      const apiBase = process.env.NEXT_PUBLIC_API_URL || '';
      const res = await fetch(`${apiBase}/api/user/settings`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(settings)
      });
      if (res.ok) {
        setMessage({ type: 'success', text: 'Appearance updated successfully.' });
      } else {
        throw new Error('Failed to update settings');
      }
    } catch (err) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="settings-loading">Loading...</div>;

  return (
    <>
      <div className="settings-page-header">
        <h1>Appearance</h1>
        <p>Customize the look and feel of Harikson AI.</p>
      </div>

      {message && <div className={`settings-alert ${message.type}`}>{message.text}</div>}

      <form className="settings-form" onSubmit={handleSave}>
        <div className="settings-section">
          <h2>Interface Theme</h2>
          <div className="form-group">
            <label>Color Theme</label>
            <select name="theme" value={settings.theme} onChange={handleChange}>
              <option value="system">System (Matches your OS)</option>
              <option value="dark">Dark</option>
              <option value="light">Light</option>
            </select>
          </div>
        </div>

        <div className="settings-section">
          <h2>Layout Preferences</h2>

          <div className="form-row">
            <div className="form-group">
              <label>Interface Density</label>
              <select name="density" value={settings.density} onChange={handleChange}>
                <option value="comfortable">Comfortable</option>
                <option value="compact">Compact</option>
              </select>
            </div>
            <div className="form-group">
              <label>Default Sidebar State</label>
              <select name="sidebarState" value={settings.sidebarState} onChange={handleChange}>
                <option value="expanded">Expanded</option>
                <option value="collapsed">Collapsed</option>
              </select>
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Font Size</label>
              <select name="fontSize" value={settings.fontSize} onChange={handleChange}>
                <option value="small">Small</option>
                <option value="medium">Medium</option>
                <option value="large">Large</option>
              </select>
            </div>
            <div className="form-group">
              <label>Accent Color</label>
              <select name="accentColor" value={settings.accentColor} onChange={handleChange}>
                <option value="default">Harikson Blue</option>
                <option value="purple">Purple</option>
                <option value="green">Green</option>
              </select>
            </div>
          </div>
        </div>

        <div className="settings-section">
          <h2>Accessibility &amp; Motion</h2>
          <div className="settings-checkbox-row">
            <input
              type="checkbox"
              name="animation"
              id="animation-toggle"
              checked={settings.animation}
              onChange={handleChange}
            />
            <label htmlFor="animation-toggle">Enable Interface Animations</label>
          </div>
          <span className="help-text" style={{ paddingLeft: '26px' }}>
            Turn off to disable slide and fade transitions.
          </span>
        </div>

        <div className="settings-actions">
          <button type="submit" className="btn-primary" disabled={saving}>
            {saving ? 'Saving...' : <><Save size={15} /> Save Changes</>}
          </button>
        </div>
      </form>
    </>
  );
}
