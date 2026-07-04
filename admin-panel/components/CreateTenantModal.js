import React, { useState } from 'react';

export default function CreateTenantModal({ isOpen, onClose, onSubmit }) {
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [plan, setPlan] = useState('STARTER');
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    // Validation
    if (!name.trim() || !slug.trim() || !adminEmail.trim() || !adminPassword.trim()) {
      setError('All fields are required');
      return;
    }

    const slugRegex = /^[a-z0-9-]+$/;
    if (!slugRegex.test(slug)) {
      setError('Slug must contain only lowercase letters, numbers, and hyphens');
      return;
    }

    if (adminPassword.length < 6) {
      setError('Password must be at least 6 characters long');
      return;
    }

    setLoading(true);
    try {
      await onSubmit({ name, slug, plan, adminEmail, adminPassword });
      // Reset fields
      setName('');
      setSlug('');
      setPlan('STARTER');
      setAdminEmail('');
      setAdminPassword('');
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to create tenant');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-800 rounded-xl w-full max-w-md p-6 shadow-xl border border-gray-150 dark:border-gray-700 animate-in fade-in zoom-in-95 duration-150">
        <div className="flex justify-between items-center border-b border-gray-150 dark:border-gray-750 pb-4 mb-4">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white">Create New Tenant Stack</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 text-xl font-bold">
            &times;
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 rounded-lg text-xs border border-red-100 dark:border-red-900/30">
            <strong>Error:</strong> {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">Company Name</label>
            <input 
              type="text" 
              value={name} 
              onChange={(e) => setName(e.target.value)} 
              placeholder="e.g. Acme Corporation"
              className="w-full px-3.5 py-2 rounded-lg border border-gray-300 dark:border-gray-650 bg-white dark:bg-gray-900 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">Subdomain Slug</label>
            <input 
              type="text" 
              value={slug} 
              onChange={(e) => setSlug(e.target.value.toLowerCase())} 
              placeholder="e.g. acme-corp"
              className="w-full px-3.5 py-2 rounded-lg border border-gray-300 dark:border-gray-650 bg-white dark:bg-gray-900 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">Subscription Plan</label>
            <select 
              value={plan} 
              onChange={(e) => setPlan(e.target.value)}
              className="w-full px-3.5 py-2 rounded-lg border border-gray-300 dark:border-gray-650 bg-white dark:bg-gray-900 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="STARTER">Starter Plan ($29/mo)</option>
              <option value="PRO">Pro Plan ($99/mo)</option>
              <option value="BUSINESS">Business Plan ($299/mo)</option>
              <option value="ENTERPRISE">Enterprise Plan ($999/mo)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">Admin Email</label>
            <input 
              type="email" 
              value={adminEmail} 
              onChange={(e) => setAdminEmail(e.target.value)} 
              placeholder="admin@acme.com"
              className="w-full px-3.5 py-2 rounded-lg border border-gray-300 dark:border-gray-650 bg-white dark:bg-gray-900 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">Admin Password</label>
            <input 
              type="password" 
              value={adminPassword} 
              onChange={(e) => setAdminPassword(e.target.value)} 
              placeholder="••••••••"
              className="w-full px-3.5 py-2 rounded-lg border border-gray-300 dark:border-gray-650 bg-white dark:bg-gray-900 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              required
            />
          </div>

          <div className="flex justify-end space-x-3 pt-4 border-t border-gray-150 dark:border-gray-750 mt-6">
            <button 
              type="button" 
              onClick={onClose} 
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              Cancel
            </button>
            <button 
              type="submit" 
              disabled={loading}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white rounded-lg text-sm font-semibold transition-all"
            >
              {loading ? 'Creating...' : 'Create Tenant'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
