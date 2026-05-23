import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export default function Pagination({ page, totalPages, onPage }) {
  if (totalPages <= 1) return null;
  return (
    <div className="flex items-center justify-center gap-2 mt-4">
      <button onClick={() => onPage(page - 1)} disabled={page === 1} className="btn-ghost btn-sm p-2 disabled:opacity-30">
        <ChevronLeft size={14} />
      </button>
      {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
        const p = i + 1;
        return (
          <button key={p} onClick={() => onPage(p)}
            className={`w-8 h-8 rounded-lg text-xs font-medium transition-colors ${
              p === page ? 'bg-brand-600 text-white' : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
            }`}>
            {p}
          </button>
        );
      })}
      <button onClick={() => onPage(page + 1)} disabled={page === totalPages} className="btn-ghost btn-sm p-2 disabled:opacity-30">
        <ChevronRight size={14} />
      </button>
    </div>
  );
}
