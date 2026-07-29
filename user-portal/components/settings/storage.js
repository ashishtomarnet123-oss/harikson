import { authenticatedFetch, getApiConfig } from './apiHelper';
import React, { useState, useEffect } from 'react';
import { Database, AlertCircle } from 'lucide-react';

function formatBytes(bytes) {
  if (!bytes) return '0 MB';
  const mb = bytes / (1024 * 1024);
  if (mb < 1024) return `${mb.toFixed(1)} MB`;
  return `${(mb / 1024).toFixed(2)} GB`;
}

export default function StorageSettings() {
  const [storage, setStorage] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchStorage();
  }, []);

  const fetchStorage = async () => {
    try {
      setLoading(true);
      setError(null);
      const { apiBase, tenantSlug } = getApiConfig();
      const res = await authenticatedFetch(`${apiBase}/api/v1/user/storage`, {
        credentials: 'include',
        headers: { 'x-tenant-slug': tenantSlug },
      });
      if (res && res.ok) {
        setStorage(await res.json());
      } else {
        setError('Unable to load storage usage right now.');
      }
    } catch (err) {
      setError('Unable to reach the storage service.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="settings-loading">Loading storage usage...</div>;
  }

  return (
    <>
      <div className="settings-page-header">
        <h1>Storage Manager</h1>
        <p>Review the data stored within your Harikson workspace.</p>
      </div>

      {error && (
        <div className="settings-alert error" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <AlertCircle size={16} />
          <span>{error}</span>
        </div>
      )}

      {storage && (
        <div className="settings-section">
          <h2>Storage Overview</h2>

          <div className="settings-storage-header">
            <div className="settings-storage-used">
              {formatBytes(storage.totalBytes)} <span>used across {storage.documentCount} document{storage.documentCount === 1 ? '' : 's'}</span>
            </div>
          </div>

          <div className="settings-flex-col" style={{ marginTop: '20px' }}>
            <div className="settings-card settings-flex-row">
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0 }}>
                <div
                  style={{
                    width: '36px',
                    height: '36px',
                    flexShrink: 0,
                    borderRadius: '8px',
                    background: '#3b82f620',
                    color: '#3b82f6',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Database size={18} />
                </div>
                <div style={{ fontWeight: '500', fontSize: '13.5px' }}>Knowledge Base Documents</div>
              </div>
              <div style={{ fontWeight: '600', fontSize: '14px', flexShrink: 0 }}>
                {formatBytes(storage.totalBytes)}
              </div>
            </div>
          </div>

          <p style={{ fontSize: '12.5px', color: 'var(--text-secondary)', marginTop: '14px' }}>
            Your current plan does not enforce a fixed storage cap — this figure reflects
            actual bytes stored, not a quota.
          </p>
        </div>
      )}
    </>
  );
}
