import React, { useState, useEffect, useRef } from 'react';
import { Filter, Plus, X, Terminal, LayoutList, Check, ChevronDown } from 'lucide-react';
import { FilterAST, FilterRule, AttributeMetadata, FilterOperator } from '../../adapters/types';
import { parseFilterExpression, astToExpression } from '../../utils/filterEvaluator';

interface TraceFilterBuilderProps {
  attributes: AttributeMetadata[];
  onChange: (ast: FilterAST | null) => void;
  initialAst?: FilterAST | null;
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

export const TraceFilterBuilder: React.FC<TraceFilterBuilderProps> = ({
  attributes,
  onChange,
  initialAst = null
}) => {
  const [mode, setMode] = useState<'visual' | 'code'>('visual');
  const [ast, setAst] = useState<FilterAST | null>(initialAst);
  const [expression, setExpression] = useState<string>('');
  const [openMultiSelect, setOpenMultiSelect] = useState<string | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);

  // Sync upwards whenever AST changes
  useEffect(() => {
    onChange(ast);
    if (mode === 'visual') {
      setExpression(astToExpression(ast || undefined));
    }
  }, [ast]);

  // Click outside handler for multi-select popover
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpenMultiSelect(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleExpressionChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setExpression(val);
    const parsed = parseFilterExpression(val);
    setAst(parsed);
  };

  const addRule = () => {
    setAst(prev => {
      const newRule: FilterRule = {
        id: crypto.randomUUID(),
        field: attributes[0]?.key || 'service.name',
        operator: '=',
        value: ''
      };
      if (!prev) {
        return { logicalOperator: 'AND', rules: [newRule] };
      }
      return { ...prev, rules: [...prev.rules, newRule] };
    });
  };

  const removeRule = (id: string) => {
    setAst(prev => {
      if (!prev) return null;
      const filtered = prev.rules.filter(r => r.id !== id);
      if (filtered.length === 0) return null;
      return { ...prev, rules: filtered };
    });
  };

  const updateRule = (id: string, updates: Partial<FilterRule>) => {
    setAst(prev => {
      if (!prev) return null;
      return {
        ...prev,
        rules: prev.rules.map(r => {
          if (r.id === id) {
            const updated = { ...r, ...updates };
            // Auto fix value type if operator switches from array to scalar or vice versa
            const isArrayOp = ['in', 'not_in', 'contains', 'not_contains'].includes(updated.operator);
            if (isArrayOp && !Array.isArray(updated.value)) {
              updated.value = updated.value ? [updated.value] : [];
            } else if (!isArrayOp && Array.isArray(updated.value)) {
              updated.value = updated.value[0] || '';
            }
            return updated;
          }
          return r;
        })
      };
    });
  };

  const toggleLogicalOperator = () => {
    setAst(prev => {
      if (!prev) return null;
      return { ...prev, logicalOperator: prev.logicalOperator === 'AND' ? 'OR' : 'AND' };
    });
  };

  const getOperatorsForType = (type?: 'string' | 'number' | 'boolean') => {
    if (type === 'number') return OPERATORS.filter(o => ['=', '!=', '>', '<', '>=', '<=', 'in', 'not_in'].includes(o.value));
    if (type === 'boolean') return OPERATORS.filter(o => ['=', '!='].includes(o.value));
    return OPERATORS.filter(o => ['=', '!=', 'contains', 'not_contains', 'in', 'not_in'].includes(o.value));
  };

  return (
    <div className="w-full bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex flex-col transition-colors z-20" ref={containerRef}>
      <div className="flex items-center px-4 py-2 min-h-[48px] gap-3 flex-wrap">
        
        {/* Header / Mode Toggle */}
        <div className="flex items-center gap-2 shrink-0 border-r border-slate-200 dark:border-slate-800 pr-3 mr-1">
          <Filter className="w-4 h-4 text-slate-500 dark:text-slate-400" />
          <div className="flex bg-slate-100 dark:bg-slate-950 p-0.5 rounded-lg border border-slate-200 dark:border-slate-800/50 shadow-inner">
          <button
            onClick={() => {
              setMode('visual');
              setAst(parseFilterExpression(expression));
            }}
            className={`p-1 rounded-md flex items-center justify-center transition-all ${mode === 'visual' ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
            title="Visual Builder"
          >
            <LayoutList className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => {
              setMode('code');
              setExpression(astToExpression(ast || undefined));
            }}
            className={`p-1 rounded-md flex items-center justify-center transition-all ${mode === 'code' ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
            title="Code Editor"
          >
            <Terminal className="w-3.5 h-3.5" />
          </button>
          </div>
        </div>

        {/* Builder Area */}
        <div className="flex-1 flex items-center gap-2 flex-wrap min-w-[200px]">
          {mode === 'code' ? (
            <div className="flex-1 relative group">
              <input
                type="text"
                value={expression}
                onChange={handleExpressionChange}
                placeholder='e.g. http.method in ["GET", "POST"] AND duration > 100'
                className="w-full bg-slate-50 dark:bg-slate-950/50 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-1.5 text-sm font-mono text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all placeholder-slate-400"
              />
              {ast !== null && expression.trim() !== '' && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center text-emerald-500 gap-1 text-xs font-medium bg-emerald-50 dark:bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-200 dark:border-emerald-500/20">
                  <Check className="w-3 h-3" /> Valid
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-2 flex-wrap flex-1">
              {ast && ast.rules.length > 0 ? (
                <>
                  {ast.rules.map((rule, idx) => {
                    const selectedAttr = attributes.find(a => a.key === rule.field);
                    const attrType = selectedAttr?.type || 'string';
                    const allowedOperators = getOperatorsForType(attrType);
                    const isArrayOperator = ['in', 'not_in', 'contains', 'not_contains'].includes(rule.operator);

                    return (
                      <div key={rule.id} className="flex items-center gap-1.5">
                        {idx > 0 && (
                          <button
                            onClick={toggleLogicalOperator}
                            className="px-2 py-1 text-xs font-bold text-slate-500 hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-400 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-md transition-colors"
                          >
                            {ast.logicalOperator}
                          </button>
                        )}
                        <div className="flex items-center bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg shadow-sm group hover:border-indigo-400 transition-colors focus-within:border-indigo-500 focus-within:ring-1 focus-within:ring-indigo-500 overflow-visible">
                          
                          <div className="relative">
                            <select
                              value={rule.field}
                              onChange={(e) => {
                                const newField = e.target.value;
                                const newAttr = attributes.find(a => a.key === newField);
                                const newType = newAttr?.type || 'string';
                                const ops = getOperatorsForType(newType);
                                let newOp = rule.operator;
                                if (!ops.find(o => o.value === newOp)) newOp = ops[0].value;
                                updateRule(rule.id, { field: newField, operator: newOp });
                              }}
                              className="appearance-none bg-transparent py-1.5 pl-3 pr-7 text-sm font-medium text-indigo-600 dark:text-indigo-400 focus:outline-none cursor-pointer max-w-[150px] truncate"
                            >
                              {attributes.map(attr => (
                                <option key={attr.key} value={attr.key}>{attr.key}</option>
                              ))}
                            </select>
                            <ChevronDown className="w-3 h-3 absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                          </div>

                          <div className="h-4 w-px bg-slate-300 dark:bg-slate-700" />

                          <div className="relative">
                            <select
                              value={rule.operator}
                              onChange={(e) => updateRule(rule.id, { operator: e.target.value as FilterOperator })}
                              className="appearance-none bg-transparent py-1.5 pl-2 pr-6 text-sm text-slate-600 dark:text-slate-300 focus:outline-none cursor-pointer font-medium"
                            >
                              {allowedOperators.map(op => (
                                <option key={op.value} value={op.value}>{op.label}</option>
                              ))}
                            </select>
                            <ChevronDown className="w-3 h-3 absolute right-1.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                          </div>

                          <div className="h-4 w-px bg-slate-300 dark:bg-slate-700" />

                          {isArrayOperator ? (
                            <div className="relative">
                              <div 
                                onClick={() => setOpenMultiSelect(openMultiSelect === rule.id ? null : rule.id)}
                                className="min-w-[100px] max-w-[250px] bg-transparent py-1 px-2 text-sm text-slate-800 dark:text-slate-200 cursor-pointer flex flex-wrap gap-1 items-center min-h-[32px]"
                              >
                                {Array.isArray(rule.value) && rule.value.length > 0 ? (
                                   rule.value.map((v, i) => <span key={i} className="bg-indigo-100 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 px-1.5 py-0.5 rounded text-xs truncate max-w-[100px]">{String(v)}</span>)
                                ) : (
                                   <span className="text-slate-400 dark:text-slate-500 px-1">Select values...</span>
                                )}
                              </div>
                              {openMultiSelect === rule.id && (
                                <div className="absolute top-full left-0 mt-1 min-w-[200px] max-w-[300px] bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-xl z-50 max-h-48 overflow-y-auto">
                                  {selectedAttr?.values && selectedAttr.values.length > 0 ? selectedAttr.values.map((v, i) => {
                                    const isChecked = Array.isArray(rule.value) && rule.value.includes(v);
                                    return (
                                      <label key={i} className="flex items-center gap-2 px-3 py-2 hover:bg-slate-50 dark:hover:bg-slate-700/50 cursor-pointer text-sm text-slate-700 dark:text-slate-200 border-b border-slate-100 dark:border-slate-700/50 last:border-0">
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
                                          className="rounded border-slate-300 dark:border-slate-600 text-indigo-600 focus:ring-indigo-500 bg-transparent"
                                        />
                                        <span className="truncate">{String(v)}</span>
                                      </label>
                                    );
                                  }) : (
                                    <div className="p-3 text-sm text-slate-500">No values found.</div>
                                  )}
                                </div>
                              )}
                            </div>
                          ) : attrType === 'number' ? (
                            <input
                              type="number"
                              value={String(rule.value)}
                              onChange={(e) => updateRule(rule.id, { value: e.target.value === '' ? '' : Number(e.target.value) })}
                              placeholder="0"
                              className="w-24 bg-transparent py-1.5 px-3 text-sm text-slate-800 dark:text-slate-200 focus:outline-none placeholder-slate-400 font-mono"
                            />
                          ) : attrType === 'boolean' ? (
                            <select
                              value={String(rule.value)}
                              onChange={(e) => updateRule(rule.id, { value: e.target.value === 'true' })}
                              className="w-24 appearance-none bg-transparent py-1.5 px-3 text-sm text-slate-800 dark:text-slate-200 focus:outline-none cursor-pointer"
                            >
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
                                placeholder="Value..."
                                className="w-28 bg-transparent py-1.5 px-3 text-sm text-slate-800 dark:text-slate-200 focus:outline-none placeholder-slate-400 font-mono"
                              />
                              {selectedAttr?.values && selectedAttr.values.length > 0 && (
                                <datalist id={`datalist-${rule.id}`}>
                                  {selectedAttr.values.map((v, i) => (
                                    <option key={i} value={String(v)} />
                                  ))}
                                </datalist>
                              )}
                            </>
                          )}

                          <button
                            onClick={() => removeRule(rule.id)}
                            className="px-2 py-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                  
                  <button
                    onClick={addRule}
                    className="p-1.5 rounded-lg border border-dashed border-slate-300 dark:border-slate-700 text-slate-500 hover:text-indigo-600 hover:border-indigo-300 dark:hover:border-indigo-700 dark:hover:text-indigo-400 transition-colors ml-1"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </>
              ) : (
                <button
                  onClick={addRule}
                  className="px-3 py-1.5 text-sm font-medium text-slate-600 dark:text-slate-300 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-lg flex items-center gap-2 transition-colors border border-dashed border-slate-300 dark:border-slate-700 hover:border-indigo-400"
                >
                  <Filter className="w-3.5 h-3.5" />
                  Add Filter
                </button>
              )}
            </div>
          )}
        </div>

        {/* Clear Button */}
        {ast && ast.rules.length > 0 && (
          <button
            onClick={() => {
              setAst(null);
              setExpression('');
            }}
            className="text-xs font-semibold text-slate-500 hover:text-red-500 transition-colors px-2 ml-auto"
          >
            Clear All
          </button>
        )}

      </div>
    </div>
  );
};
