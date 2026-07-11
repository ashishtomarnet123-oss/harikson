import React, { useState, useEffect } from 'react';
import { Smartphone, Monitor, LogOut } from 'lucide-react';

export default function DevicesSettings() {
  const [devices, setDevices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchDevices();
  }, []);

  const fetchDevices = async () => {
    try {
      const token = localStorage.getItem('hk_token');
      const apiBase = localStorage.getItem('hk_api_base') || 'http://localhost:3008';
      const res = await fetch(`${apiBase}/api/user/devices`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setDevices(data);
      } else {
        throw new Error('Failed to load connected devices');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleLogoutDevice = async (id) => {
    if (!confirm('Are you sure you want to log out of this device?')) return;

    try {
      const token = localStorage.getItem('hk_token');
      const apiBase = localStorage.getItem('hk_api_base') || 'http://localhost:3008';
      const res = await fetch(`${apiBase}/api/user/devices/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setDevices(data.devices);
      } else {
        alert('Failed to log out device');
      }
    } catch (err) {
      console.error(err);
      alert('Error logging out device');
    }
  };

  const isMobile = (os) => os.includes('iOS') || os.includes('Android');

  if (loading) return <div className="settings-loading">Loading active sessions...</div>;

  return (
    <>
      <div className="settings-page-header">
        <h1>Connected Devices</h1>
        <p>Review devices that are currently logged into your account.</p>
      </div>

      <div className="settings-section">
        <h2>Active Sessions</h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '13.5px', marginBottom: '16px', lineHeight: '1.5' }}>
          If you see a device you don't recognize, log it out and change your password immediately.
        </p>

        {error && <div className="settings-alert error">{error}</div>}

        <div className="settings-flex-col">
          {devices.map(d => (
            <div key={d.id} className="settings-device-card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div className="settings-device-info" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div className="settings-device-icon">
                  {isMobile(d.os) ? <Smartphone size={22} /> : <Monitor size={22} />}
                </div>
                <div style={{ minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '3px', flexWrap: 'wrap' }}>
                    <span style={{ fontWeight: '500', fontSize: '14px' }}>{d.name}</span>
                    {d.current && <span className="settings-badge current">Current</span>}
                  </div>
                  <div style={{ fontSize: '13px', color: 'var(--text-secondary)', wordBreak: 'break-word' }}>
                    {d.browser} on {d.os} &middot; {d.ip}
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '3px' }}>
                    Last active: {d.lastActive}
                  </div>
                </div>
              </div>
              {!d.current && (
                <button
                  onClick={() => handleLogoutDevice(d.id)}
                  style={{
                    background: 'none', border: '1px solid rgba(239,68,68,0.3)',
                    cursor: 'pointer', color: '#dc2626',
                    display: 'flex', alignItems: 'center', gap: '5px',
                    fontSize: '13px', padding: '6px 10px', borderRadius: '7px',
                    flexShrink: 0, transition: 'background 0.12s'
                  }}
                >
                  <LogOut size={14} /> Logout
                </button>
              )}
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
