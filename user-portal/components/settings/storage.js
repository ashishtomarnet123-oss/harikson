import React from 'react';
import { FileText, Image as ImageIcon, Database } from 'lucide-react';

export default function StorageSettings() {
  const totalStorage = 100;
  const usedStorage = 24.5;

  const categories = [
    {
      name: 'Documents (PDF, DOCX)',
      size: 12.3,
      color: '#3b82f6',
      icon: FileText,
    },
    { name: 'Images & Media', size: 8.1, color: '#10b981', icon: ImageIcon },
    {
      name: 'Vector Database Index',
      size: 4.1,
      color: '#8b5cf6',
      icon: Database,
    },
  ];

  return (
    <>
      <div className="settings-page-header">
        <h1>Storage Manager</h1>
        <p>Review and manage the data stored within your Harikson workspace.</p>
      </div>

      <div className="settings-section">
        <h2>Storage Overview</h2>

        <div className="settings-storage-header">
          <div className="settings-storage-used">
            {usedStorage} GB <span>used of {totalStorage} GB</span>
          </div>
          <div
            style={{
              fontSize: '13.5px',
              color: 'var(--text-secondary)',
              flexShrink: 0,
            }}
          >
            {Math.round((usedStorage / totalStorage) * 100)}% Used
          </div>
        </div>

        <div className="settings-storage-bar">
          {categories.map((cat, i) => (
            <div
              key={i}
              className="settings-storage-bar-segment"
              style={{
                width: `${(cat.size / totalStorage) * 100}%`,
                background: cat.color,
              }}
            />
          ))}
        </div>

        <div className="settings-flex-col" style={{ marginTop: '20px' }}>
          {categories.map((cat, i) => {
            const Icon = cat.icon;
            return (
              <div key={i} className="settings-card settings-flex-row">
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    minWidth: 0,
                  }}
                >
                  <div
                    style={{
                      width: '36px',
                      height: '36px',
                      flexShrink: 0,
                      borderRadius: '8px',
                      background: `${cat.color}20`,
                      color: cat.color,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Icon size={18} />
                  </div>
                  <div
                    style={{
                      fontWeight: '500',
                      fontSize: '13.5px',
                      minWidth: 0,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {cat.name}
                  </div>
                </div>
                <div
                  style={{ fontWeight: '600', fontSize: '14px', flexShrink: 0 }}
                >
                  {cat.size} GB
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="settings-section">
        <h2>Data Retention</h2>
        <div className="settings-form">
          <div className="form-group">
            <label>Automatically delete chat history older than</label>
            <select defaultValue="never">
              <option value="never">Never (Keep forever)</option>
              <option value="30">30 days</option>
              <option value="90">90 days</option>
              <option value="365">1 year</option>
            </select>
          </div>
          <div className="settings-actions" style={{ marginTop: '8px' }}>
            <button type="button" className="btn-primary">
              Update Policy
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
