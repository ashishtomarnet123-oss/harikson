import React, { useState } from 'react';
import { Smartphone, Monitor, LogOut } from 'lucide-react';

export default function DevicesSettings() {
  const [devices] = useState([
    { id: '1', name: 'MacBook Pro 16"', os: 'macOS', browser: 'Chrome', ip: '192.168.1.1', lastActive: 'Active now', current: true },
    { id: '2', name: 'iPhone 14 Pro', os: 'iOS', browser: 'Safari', ip: '10.0.0.45', lastActive: '2 hours ago', current: false }
  ]);

  return (
    <>
      <div className="settings-page-header">
        <h1>Connected Devices</h1>
        <p>Review devices that are currently logged into your account.</p>
      </div>

      <div className="settings-section">
        <h2>Active Sessions</h2>
        <p style={{color: 'var(--text-secondary)', fontSize: '14px', marginBottom: '20px'}}>
          If you see a device you don't recognize, log it out and change your password immediately.
        </p>

        <div className="settings-flex-col">
          {devices.map(d => (
            <div key={d.id} className="settings-card settings-flex-row">
              <div style={{display: 'flex', alignItems: 'center', gap: '16px'}}>
                <div style={{color: 'var(--text-muted)'}}>
                  {d.os.includes('iOS') || d.os.includes('Android') ? <Smartphone size={24} /> : <Monitor size={24} />}
                </div>
                <div>
                  <div style={{display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px'}}>
                    <span style={{fontWeight: '500', fontSize: '15px'}}>{d.name}</span>
                    {d.current && <span style={{fontSize: '11px', background: 'rgba(16, 185, 129, 0.1)', color: '#10b981', padding: '2px 6px', borderRadius: '4px', fontWeight: '600'}}>Current</span>}
                  </div>
                  <div style={{fontSize: '13px', color: 'var(--text-secondary)'}}>
                    {d.browser} on {d.os} · {d.ip}
                  </div>
                  <div style={{fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px'}}>
                    Last active: {d.lastActive}
                  </div>
                </div>
              </div>
              {!d.current && (
                <button style={{background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px'}}>
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
