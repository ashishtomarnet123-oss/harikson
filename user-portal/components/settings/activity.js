import React, { useState } from 'react';
import { LogIn, Key, Shield } from 'lucide-react';

export default function ActivitySettings() {
  const [logs] = useState([
    { id: '1', action: 'Logged in successfully', ip: '192.168.1.1', device: 'MacBook Pro 16" (Chrome)', date: 'Today at 10:45 AM', icon: LogIn, color: '#059669' },
    { id: '2', action: 'API Key generated', ip: '192.168.1.1', device: 'MacBook Pro 16" (Chrome)', date: 'Yesterday at 3:12 PM', icon: Key, color: '#d97706' },
    { id: '3', action: 'Password changed', ip: '192.168.1.1', device: 'MacBook Pro 16" (Chrome)', date: 'Jul 4 at 11:30 AM', icon: Shield, color: '#dc2626' }
  ]);

  return (
    <>
      <div className="settings-page-header">
        <h1>Activity Timeline</h1>
        <p>A complete history of security and administrative actions taken on your account.</p>
      </div>

      <div className="settings-section">
        <h2>Recent Activity</h2>
        <div className="settings-timeline">
          {logs.map((log, index) => {
            const Icon = log.icon;
            return (
              <div key={log.id} className="settings-timeline-item">
                {/* Dot on the timeline line */}
                <div
                  className="settings-timeline-dot"
                  style={{ background: log.color }}
                >
                  <div style={{ width: '6px', height: '6px', background: '#fff', borderRadius: '50%' }} />
                </div>

                <div className="settings-card">
                  <div className="settings-flex-row" style={{ alignItems: 'flex-start' }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', minWidth: 0 }}>
                      <div style={{
                        width: '30px', height: '30px', flexShrink: 0,
                        borderRadius: '50%', background: 'var(--bg-hover)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color: log.color
                      }}>
                        <Icon size={14} />
                      </div>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontWeight: '500', fontSize: '14px', marginBottom: '3px' }}>{log.action}</div>
                        <div style={{ fontSize: '12.5px', color: 'var(--text-secondary)', wordBreak: 'break-word' }}>
                          {log.device} &middot; {log.ip}
                        </div>
                      </div>
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)', whiteSpace: 'nowrap', flexShrink: 0 }}>
                      {log.date}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}
