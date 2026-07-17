import React, { useState } from 'react';
import { Search, Check } from 'lucide-react';
import { AttributeMetadata } from '../../adapters/types';

interface AttributeSidebarProps {
  attributes: AttributeMetadata[];
  selectedAttributes: string[];
  onToggleAttribute: (key: string) => void;
}

export const AttributeSidebar: React.FC<AttributeSidebarProps> = ({
  attributes,
  selectedAttributes,
  onToggleAttribute
}) => {
  const [searchQuery, setSearchQuery] = useState('');

  const filtered = attributes.filter(a => a.key.toLowerCase().includes(searchQuery.toLowerCase()));

  return (
    <div className="flex flex-col h-full w-full bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800">
      <div className="p-3 border-b border-slate-200 dark:border-slate-800 shrink-0">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input 
            type="text" 
            placeholder="Search attributes..." 
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full bg-slate-100 dark:bg-slate-950 border border-transparent focus:border-indigo-500 focus:bg-white dark:focus:bg-slate-900 rounded-lg pl-9 pr-3 py-1.5 text-sm text-slate-800 dark:text-slate-200 transition-colors focus:outline-none placeholder-slate-400"
          />
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-2">
        {filtered.length === 0 ? (
          <div className="text-center text-sm text-slate-500 py-4">No attributes found</div>
        ) : (
          <div className="space-y-0.5">
            {filtered.map(attr => {
              const isSelected = selectedAttributes.includes(attr.key);
              return (
                <button
                  key={attr.key}
                  onClick={() => onToggleAttribute(attr.key)}
                  className={`w-full flex items-center justify-between px-2 py-1.5 rounded-md text-sm transition-colors text-left ${isSelected ? 'bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 font-medium' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'}`}
                >
                  <span className="truncate pr-2" title={attr.key}>{attr.key}</span>
                  {isSelected && <Check className="w-4 h-4 shrink-0" />}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
