import React, { useState, useEffect } from 'react';
import { Save } from 'lucide-react';

export default function LanguageSettings() {
  const [profile, setProfile] = useState({
    language: 'en',
    timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const token = (localStorage.getItem('hk_user') ? 'cookie_auth' : null);
        if (!token) return;
        const apiBase = localStorage.getItem('hk_api_base') || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3008';
      const tenantSlug = localStorage.getItem('hk_tenant') || 'neuravolt';
        const res = await fetch(`${apiBase}/api/user/profile`, {
          credentials: 'include',
          headers: {
                    'x-tenant-slug': tenantSlug
        }
        });
        if (res.ok) {
          const data = await res.json();
          setProfile(prev => ({
            ...prev,
            language: data.language || 'en',
            timeZone: data.timeZone || prev.timeZone
          }));
        }
      } catch (err) {
        console.error('Failed to fetch language settings', err);
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setProfile(prev => ({ ...prev, [name]: value }));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);
    try {
      const token = (localStorage.getItem('hk_user') ? 'cookie_auth' : null);
      const apiBase = localStorage.getItem('hk_api_base') || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3008';
      const tenantSlug = localStorage.getItem('hk_tenant') || 'neuravolt';
      const res = await fetch(`${apiBase}/api/user/profile`, {
          credentials: 'include',
        method: 'PUT',
        headers: {
                    'x-tenant-slug': tenantSlug,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(profile)
      });
      if (res.ok) {
        setMessage({ type: 'success', text: 'Language preferences updated successfully.' });
      } else {
        throw new Error('Failed to update language');
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
        <h1>Language &amp; Region</h1>
        <p>Customize your language, date formats, and regional settings.</p>
      </div>

      {message && <div className={`settings-alert ${message.type}`}>{message.text}</div>}

      <form className="settings-form" onSubmit={handleSave}>
        <div className="settings-section">
          <h2>Regional Preferences</h2>

          <div className="form-group">
            <label>Interface Language</label>
            <select name="language" value={profile.language} onChange={handleChange}>
              <option value="en">English (US)</option>
              <option value="en-gb">English (UK)</option>
              <option value="es">Spanish</option>
              <option value="fr">French</option>
              <option value="de">German</option>
              <option value="hi">Hindi</option>
            </select>
            <span className="help-text">This controls the language used across the Harikson AI interface.</span>
          </div>

          <div className="form-group">
            <label>Time Zone</label>
            <input
              type="text"
              name="timeZone"
              value={profile.timeZone || ''}
              onChange={handleChange}
              placeholder="e.g. America/New_York"
            />
            <span className="help-text">
              Determines how dates and times are displayed in the Activity Timeline and billing history.
            </span>
          </div>
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
