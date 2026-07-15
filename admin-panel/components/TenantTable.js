import React, { useState } from 'react';

export default function TenantTable({ tenants, onView, onEdit, onSuspend }) {
  const [sortField, setSortField] = useState('created_at');
  const [sortOrder, setSortOrder] = useState('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const handleSort = (field) => {
    const order = sortField === field && sortOrder === 'asc' ? 'desc' : 'asc';
    setSortField(field);
    setSortOrder(order);
  };

  // Sort logic
  const sortedTenants = [...tenants].sort((a, b) => {
    let valA = a[sortField] === undefined ? '' : a[sortField];
    let valB = b[sortField] === undefined ? '' : b[sortField];

    if (typeof valA === 'string') {
      return sortOrder === 'asc'
        ? valA.localeCompare(valB)
        : valB.localeCompare(valA);
    }
    if (valA instanceof Date || sortField === 'created_at') {
      return sortOrder === 'asc'
        ? new Date(valA) - new Date(valB)
        : new Date(valB) - new Date(valA);
    }
    return sortOrder === 'asc' ? valA - valB : valB - valA;
  });

  // Pagination logic
  const totalPages = Math.ceil(sortedTenants.length / itemsPerPage);
  const paginatedTenants = sortedTenants.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-150 dark:border-gray-700 shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-50 dark:bg-gray-900/50 border-b border-gray-150 dark:border-gray-700 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              <th
                className="py-4 px-6 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-850 select-none"
                onClick={() => handleSort('name')}
              >
                Name {sortField === 'name' && (sortOrder === 'asc' ? '▲' : '▼')}
              </th>
              <th
                className="py-4 px-6 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-850 select-none"
                onClick={() => handleSort('slug')}
              >
                Slug {sortField === 'slug' && (sortOrder === 'asc' ? '▲' : '▼')}
              </th>
              <th
                className="py-4 px-6 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-850 select-none"
                onClick={() => handleSort('plan')}
              >
                Plan {sortField === 'plan' && (sortOrder === 'asc' ? '▲' : '▼')}
              </th>
              <th
                className="py-4 px-6 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-850 select-none"
                onClick={() => handleSort('user_count')}
              >
                Users{' '}
                {sortField === 'user_count' &&
                  (sortOrder === 'asc' ? '▲' : '▼')}
              </th>
              <th
                className="py-4 px-6 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-850 select-none"
                onClick={() => handleSort('status')}
              >
                Status{' '}
                {sortField === 'status' && (sortOrder === 'asc' ? '▲' : '▼')}
              </th>
              <th
                className="py-4 px-6 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-850 select-none"
                onClick={() => handleSort('created_at')}
              >
                Created{' '}
                {sortField === 'created_at' &&
                  (sortOrder === 'asc' ? '▲' : '▼')}
              </th>
              <th className="py-4 px-6 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-150 dark:divide-gray-750 text-sm">
            {paginatedTenants.length === 0 ? (
              <tr>
                <td
                  colSpan="7"
                  className="text-center py-10 text-gray-500 dark:text-gray-400"
                >
                  No tenants registered yet.
                </td>
              </tr>
            ) : (
              paginatedTenants.map((t) => (
                <tr
                  key={t.id}
                  className="hover:bg-gray-50/50 dark:hover:bg-gray-750/20 transition-all text-gray-700 dark:text-gray-300"
                >
                  <td className="py-4 px-6 font-semibold text-gray-900 dark:text-white">
                    {t.name}
                  </td>
                  <td className="py-4 px-6 font-mono text-xs text-gray-500 dark:text-gray-400">
                    {t.slug}
                  </td>
                  <td className="py-4 px-6">
                    <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-900/30">
                      {t.plan}
                    </span>
                  </td>
                  <td className="py-4 px-6 font-medium">{t.user_count || 0}</td>
                  <td className="py-4 px-6">
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${
                        t.status === 'active'
                          ? 'bg-green-50 dark:bg-green-950/30 text-green-700 dark:text-green-400 border-green-200 dark:border-green-900/30'
                          : 'bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-400 border-red-200 dark:border-red-900/30'
                      }`}
                    >
                      {t.status}
                    </span>
                  </td>
                  <td className="py-4 px-6 text-gray-400 text-xs">
                    {new Date(t.created_at).toLocaleDateString()}
                  </td>
                  <td className="py-4 px-6 text-right space-x-2">
                    <button
                      onClick={() => onView(t)}
                      className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-900 dark:hover:text-indigo-300 font-semibold text-xs"
                    >
                      View
                    </button>
                    <button
                      onClick={() => onEdit(t)}
                      className="text-amber-600 dark:text-amber-400 hover:text-amber-900 dark:hover:text-amber-300 font-semibold text-xs"
                    >
                      Edit
                    </button>
                    {t.status !== 'suspended' && (
                      <button
                        onClick={() => onSuspend(t)}
                        className="text-rose-600 dark:text-rose-400 hover:text-rose-900 dark:hover:text-rose-300 font-semibold text-xs"
                      >
                        Suspend
                      </button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination controls */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-6 py-4 bg-gray-50 dark:bg-gray-900 border-t border-gray-150 dark:border-gray-700">
          <button
            disabled={currentPage === 1}
            onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
            className="px-3 py-1 bg-white dark:bg-gray-800 border border-gray-250 dark:border-gray-700 rounded-md text-xs text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            Previous
          </button>
          <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">
            Page {currentPage} of {totalPages}
          </span>
          <button
            disabled={currentPage === totalPages}
            onClick={() =>
              setCurrentPage((prev) => Math.min(prev + 1, totalPages))
            }
            className="px-3 py-1 bg-white dark:bg-gray-800 border border-gray-250 dark:border-gray-700 rounded-md text-xs text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
