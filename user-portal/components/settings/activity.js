import React, { useState } from 'react';
import { Activity, LogIn, Key, Shield } from 'lucide-react';

export default function ActivitySettings() {
  const [logs] = useState([
    { id: '1', action: 'Logged in successfully', ip: '192.168.1.1', device: 'MacBook Pro 16" (Chrome)', date: 'Today at 10:45 AM', icon: LogIn, color: '#10b981' },
    { id: '2', action: 'API Key generated', ip: '192.168.1.1', device: 'MacBook Pro 16" (Chrome)', date: 'Yesterday at 3:12 PM', icon: Key, color: '#f59e0b' },
    { id: '3', action: 'Password changed', ip: '192.168.1.1', device: 'MacBook Pro 16" (Chrome)', date: 'Jul 4 at 11:30 AM', icon: Shield, color: '#ef4444' }
  ]);

  return (
    <>
      <div className="settings-page-header">
        <h1>Activity Timeline</h1>
        <p>A complete history of security and administrative actions taken on your account.</p>
      </div>

      <div className="settings-section">
        <div style={{position: 'relative', paddingLeft: '20px', borderLeft: '2px solid var(--border)', marginLeft: '12px'}}>
          {logs.map((log, index) => {
            const Icon = log.icon;
            return (
              <div key={log.id} style={{position: 'relative', marginBottom: index === logs.length - 1 ? 0 : '32px'}}>
                {/* Timeline dot */}
                <div style={{position: 'absolute', left: '-31px', top: '0', width: '20px', height: '20px', borderRadius: '50%', background: log.color, border: '4px solid var(--bg-surface)', display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
                  <div style={{width: '6px', height: '6px', background: '#fff', borderRadius: '50%'}}></div>
                </div>

                <div style={{background: 'var(--bg-primary)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: '16px'}}>
                  <div style={{display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between'}}>
                    <div style={{display: 'flex', alignItems: 'center', gap: '12px'}}>
                      <div style={{width: '32px', height: '32px', borderRadius: '50%', background: 'var(--bg-hover)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: log.color}}>
                        <Icon size={16} />
                      </div>
                      <div>
                        <h3 style={{margin: '0 0 4px 0', fontSize: '15px'}}>{log.action}</h3>
                        <p style={{margin: 0, fontSize: '13px', color: 'var(--text-secondary)'}}>
                          {log.device} · {log.ip}
                        </p>
                      </div>
                    </div>
                    <span style={{fontSize: '12px', color: 'var(--text-muted)'}}>{log.date}</span>
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
