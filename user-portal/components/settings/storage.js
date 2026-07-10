import React from 'react';
import { HardDrive, FileText, Image as ImageIcon, Database } from 'lucide-react';

export default function StorageSettings() {
  const totalStorage = 100; // GB
  const usedStorage = 24.5; // GB

  const categories = [
    { name: 'Documents (PDF, DOCX)', size: 12.3, color: '#3b82f6', icon: FileText },
    { name: 'Images & Media', size: 8.1, color: '#10b981', icon: ImageIcon },
    { name: 'Vector Database Index', size: 4.1, color: '#8b5cf6', icon: Database }
  ];

  return (
    <>
      <div className="settings-page-header">
        <h1>Storage Manager</h1>
        <p>Review and manage the data stored within your Harikson workspace.</p>
      </div>

      <div className="settings-section">
        <h2>Storage Overview</h2>
        
        <div style={{display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: '16px'}}>
          <div>
            <span style={{fontSize: '36px', fontWeight: 'bold'}}>{usedStorage} GB</span>
            <span style={{fontSize: '16px', color: 'var(--text-muted)', marginLeft: '8px'}}>used of {totalStorage} GB</span>
          </div>
          <div style={{fontSize: '14px', color: 'var(--text-secondary)'}}>
            {Math.round((usedStorage/totalStorage)*100)}% Used
          </div>
        </div>

        {/* Progress Bar */}
        <div style={{width: '100%', height: '12px', background: 'var(--bg-hover)', borderRadius: '6px', overflow: 'hidden', display: 'flex'}}>
          {categories.map((cat, i) => (
            <div key={i} style={{height: '100%', width: `${(cat.size / totalStorage) * 100}%`, background: cat.color}}></div>
          ))}
        </div>

        <div style={{marginTop: '32px', display: 'flex', flexDirection: 'column', gap: '16px'}}>
          {categories.map((cat, i) => {
            const Icon = cat.icon;
            return (
              <div key={i} style={{display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', background: 'var(--bg-primary)'}}>
                <div style={{display: 'flex', alignItems: 'center', gap: '12px'}}>
                  <div style={{width: '40px', height: '40px', borderRadius: '8px', background: `${cat.color}20`, color: cat.color, display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
                    <Icon size={20} />
                  </div>
                  <div style={{fontWeight: '500', fontSize: '15px'}}>{cat.name}</div>
                </div>
                <div style={{fontWeight: '600', fontSize: '15px'}}>{cat.size} GB</div>
              </div>
            );
          })}
        </div>
      </div>
      
      <div className="settings-section">
        <h2>Data Retention</h2>
        <div className="form-group">
          <label>Automatically delete chat history older than</label>
          <select defaultValue="never">
            <option value="never">Never (Keep forever)</option>
            <option value="30">30 days</option>
            <option value="90">90 days</option>
            <option value="365">1 year</option>
          </select>
        </div>
        <button className="btn-primary">Update Policy</button>
      </div>
    </>
  );
}
