import React from 'react';
import { PackageSearch } from 'lucide-react';

export default function EmptyState({ icon: Icon = PackageSearch, title = 'No data found', description = 'Try adjusting your search or filters.', action }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
      <div className="w-16 h-16 bg-slate-800 rounded-2xl flex items-center justify-center">
        <Icon size={28} className="text-slate-500" />
      </div>
      <p className="font-semibold text-slate-300">{title}</p>
      <p className="text-sm text-slate-500 max-w-xs">{description}</p>
      {action}
    </div>
  );
}
