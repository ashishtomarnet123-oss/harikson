import React, { useState } from 'react';
import { Smartphone, Monitor, LogOut } from 'lucide-react';

export default function DevicesSettings() {
  const [devices] = useState([
    { id: '1', name: 'MacBook Pro 16"', os: 'macOS', browser: 'Chrome', ip: '192.168.1.1', lastActive: 'Active now', current: true },
    { id: '2', name: 'iPhone 14 Pro', os: 'iOS', browser: 'Safari', ip: '10.0.0.45', lastActive: '2 hours ago', current: false }
  ]);

  const isMobile = (os) => os.includes('iOS') || os.includes('Android');

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

        <div className="settings-flex-col">
          {devices.map(d => (
            <div key={d.id} className="settings-device-card">
              <div className="settings-device-info">
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
                <button style={{
                  background: 'none', border: '1px solid rgba(239,68,68,0.3)',
                  cursor: 'pointer', color: '#dc2626',
                  display: 'flex', alignItems: 'center', gap: '5px',
                  fontSize: '13px', padding: '6px 10px', borderRadius: '7px',
                  flexShrink: 0, transition: 'background 0.12s'
                }}>
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
