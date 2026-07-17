import React, { useState, useEffect, useRef } from 'react';
import { X, Filter } from 'lucide-react';
import { FilterAST, FilterRule, AttributeMetadata, FilterOperator } from '../../adapters/types';

interface ActiveFiltersBarProps {
  attributes: AttributeMetadata[];
  selectedAttributes: string[];
  onChange: (ast: FilterAST | null) => void;
  onRemoveAttribute: (key: string) => void;
}

const OPERATORS: { value: FilterOperator; label: string }[] = [
  { value: '=', label: 'is' },
  { value: '!=', label: 'is not' },
  { value: '>', label: '>' },
  { value: '<', label: '<' },
  { value: '>=', label: '>=' },
  { value: '<=', label: '<=' },
  { value: 'contains', label: 'contains' },
  { value: 'not_contains', label: 'does not contain' },
  { value: 'in', label: 'in list' },
  { value: 'not_in', label: 'not in list' },
];

export const ActiveFiltersBar: React.FC<ActiveFiltersBarProps> = ({
  attributes,
  selectedAttributes,
  onChange,
  onRemoveAttribute
}) => {
  const [rules, setRules] = useState<FilterRule[]>([]);
  const [openPopover, setOpenPopover] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Sync selected attributes with rules
  useEffect(() => {
    setRules(prev => {
      const next: FilterRule[] = [];
      for (const attr of selectedAttributes) {
        const existing = prev.find(r => r.field === attr);
        if (existing) {
          next.push(existing);
        } else {
          next.push({ id: crypto.randomUUID(), field: attr, operator: '=', value: '' });
        }
      }
      return next;
    });
  }, [selectedAttributes]);

  // Sync AST upwards
  useEffect(() => {
    const validRules = rules.filter(r => r.value !== '' && (!Array.isArray(r.value) || r.value.length > 0));
    if (validRules.length === 0) {
      onChange(null);
    } else {
      onChange({ logicalOperator: 'AND', rules: validRules });
    }
  }, [rules]);

  // Click outside handler
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpenPopover(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const updateRule = (id: string, updates: Partial<FilterRule>) => {
    setRules(prev => prev.map(r => {
      if (r.id === id) {
        const updated = { ...r, ...updates };
        const isArrayOp = ['in', 'not_in', 'contains', 'not_contains'].includes(updated.operator);
        if (isArrayOp && !Array.isArray(updated.value)) {
          updated.value = updated.value ? [updated.value] : [];
        } else if (!isArrayOp && Array.isArray(updated.value)) {
          updated.value = updated.value[0] || '';
        }
        return updated;
      }
      return r;
    }));
  };

  const getOperatorsForType = (type?: 'string' | 'number' | 'boolean') => {
    if (type === 'number') return OPERATORS.filter(o => ['=', '!=', '>', '<', '>=', '<=', 'in', 'not_in'].includes(o.value));
    if (type === 'boolean') return OPERATORS.filter(o => ['=', '!='].includes(o.value));
    return OPERATORS.filter(o => ['=', '!=', 'contains', 'not_contains', 'in', 'not_in'].includes(o.value));
  };

  if (selectedAttributes.length === 0) {
    return (
      <div className="w-full h-12 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex items-center px-4">
        <span className="text-sm text-slate-400">Select attributes from the sidebar to start filtering.</span>
      </div>
    );
  }

  return (
    <div className="w-full bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex items-center px-4 py-2 min-h-[48px] gap-2 flex-wrap z-20" ref={containerRef}>
      <Filter className="w-4 h-4 text-slate-400 mr-2 shrink-0" />
      {rules.map((rule) => {
        const attrMeta = attributes.find(a => a.key === rule.field);
        const attrType = attrMeta?.type || 'string';
        const allowedOperators = getOperatorsForType(attrType);
        const isArrayOp = ['in', 'not_in', 'contains', 'not_contains'].includes(rule.operator);

        const hasValue = rule.value !== '' && (!Array.isArray(rule.value) || rule.value.length > 0);
        
        let displayValue = 'All';
        if (hasValue) {
          if (Array.isArray(rule.value)) displayValue = rule.value.join(', ');
          else displayValue = String(rule.value);
        }

        return (
          <div key={rule.id} className="relative">
            <div 
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-sm cursor-pointer transition-colors ${hasValue ? 'bg-indigo-50 border-indigo-200 text-indigo-700 dark:bg-indigo-500/10 dark:border-indigo-500/30 dark:text-indigo-300' : 'bg-slate-50 border-slate-200 text-slate-700 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-600'}`}
              onClick={() => setOpenPopover(openPopover === rule.id ? null : rule.id)}
            >
              <span className="font-semibold">{rule.field}</span>
              <span className="text-slate-400">:</span>
              <span className="truncate max-w-[120px]" title={displayValue}>{displayValue}</span>
              <button 
                onClick={(e) => { e.stopPropagation(); onRemoveAttribute(rule.field); }}
                className="ml-1 text-slate-400 hover:text-red-500 p-0.5 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Popover */}
            {openPopover === rule.id && (
              <div className="absolute top-full left-0 mt-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl z-50 p-3 min-w-[280px]">
                <div className="flex flex-col gap-3">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold text-slate-500 uppercase">Operator</label>
                    <select
                      value={rule.operator}
                      onChange={(e) => updateRule(rule.id, { operator: e.target.value as FilterOperator })}
                      className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    >
                      {allowedOperators.map(op => <option key={op.value} value={op.value}>{op.label}</option>)}
                    </select>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold text-slate-500 uppercase">Value</label>
                    {isArrayOp ? (
                      <div className="max-h-48 overflow-y-auto border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-900">
                        {attrMeta?.values && attrMeta.values.length > 0 ? attrMeta.values.map((v, i) => {
                          const isChecked = Array.isArray(rule.value) && rule.value.includes(v);
                          return (
                            <label key={i} className="flex items-center gap-2 px-3 py-2 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer text-sm border-b border-slate-100 dark:border-slate-800 last:border-0">
                              <input 
                                type="checkbox" 
                                checked={isChecked}
                                onChange={(e) => {
                                  const arr = Array.isArray(rule.value) ? [...rule.value] : [];
                                  if (e.target.checked) arr.push(v);
                                  else {
                                    const idx = arr.indexOf(v);
                                    if (idx > -1) arr.splice(idx, 1);
                                  }
                                  updateRule(rule.id, { value: arr });
                                }}
                                className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                              />
                              <span className="truncate">{String(v)}</span>
                            </label>
                          );
                        }) : <div className="p-3 text-sm text-slate-500 text-center">No values found</div>}
                      </div>
                    ) : attrType === 'number' ? (
                      <input
                        type="number"
                        value={String(rule.value)}
                        onChange={(e) => updateRule(rule.id, { value: e.target.value === '' ? '' : Number(e.target.value) })}
                        placeholder="e.g. 100"
                        className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      />
                    ) : attrType === 'boolean' ? (
                      <select
                        value={String(rule.value)}
                        onChange={(e) => updateRule(rule.id, { value: e.target.value === 'true' })}
                        className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      >
                        <option value="">Select...</option>
                        <option value="true">True</option>
                        <option value="false">False</option>
                      </select>
                    ) : (
                      <>
                        <input
                          type="text"
                          list={`datalist-${rule.id}`}
                          value={String(rule.value)}
                          onChange={(e) => updateRule(rule.id, { value: e.target.value })}
                          placeholder="Type or select..."
                          className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                        />
                        {attrMeta?.values && attrMeta.values.length > 0 && (
                          <datalist id={`datalist-${rule.id}`}>
                            {attrMeta.values.map((v, i) => <option key={i} value={String(v)} />)}
                          </datalist>
                        )}
                      </>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        );
      })}
      
      {rules.some(r => r.value !== '' && (!Array.isArray(r.value) || r.value.length > 0)) && (
         <button
           onClick={() => setRules(prev => prev.map(r => ({ ...r, value: '' })))}
           className="ml-auto text-xs font-medium text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
         >
           Clear Values
         </button>
      )}
    </div>
  );
};
