import React from 'react';

export default function StatsCard({ title, value, icon, change, changeType }) {
  return (
    <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm transition-all hover:shadow-md">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
            {title}
          </p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
            {value}
          </p>
        </div>
        <div className="p-3 bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 rounded-lg">
          {icon}
        </div>
      </div>
      {change && (
        <div className="mt-3 flex items-center">
          <span
            className={`text-xs font-bold px-2 py-0.5 rounded mr-2 ${
              changeType === 'increase'
                ? 'bg-green-50 dark:bg-green-950/50 text-green-600 dark:text-green-400'
                : 'bg-red-50 dark:bg-red-950/50 text-red-600 dark:text-red-400'
            }`}
          >
            {changeType === 'increase' ? '+' : ''}
            {change}
          </span>
          <span className="text-xs text-gray-400 dark:text-gray-500">
            vs last month
          </span>
        </div>
      )}
    </div>
  );
}
