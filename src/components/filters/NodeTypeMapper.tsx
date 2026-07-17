import React, { useState } from 'react';
import { Plus, X, Server } from 'lucide-react';
import { AttributeMetadata, NodeTypeMappingRule, FilterOperator } from '../../adapters/types';
import { NodeRegistry } from '../../registry/NodeRegistry';
import { useAppStore } from '../../store/useAppStore';

interface NodeTypeMapperProps {
  attributes: AttributeMetadata[];
  mappings: NodeTypeMappingRule[];
  onChange: (mappings: NodeTypeMappingRule[]) => void;
}

const OPERATORS: { value: FilterOperator; label: string }[] = [
  { value: '=', label: 'is' },
  { value: '!=', label: 'is not' },
  { value: 'contains', label: 'contains' },
  { value: 'not_contains', label: 'does not contain' },
];

export const NodeTypeMapper: React.FC<NodeTypeMapperProps> = ({
  attributes,
  mappings,
  onChange
}) => {
  const language = useAppStore((s) => s.language);
  const libraryComponents = useAppStore((s: any) => s.libraryComponents || []);
  const [isAdding, setIsAdding] = useState(false);
  const [newRule, setNewRule] = useState<Partial<NodeTypeMappingRule>>({
    attribute: attributes[0]?.key || '',
    operator: '=',
    value: '',
    nodeType: 'service'
  });

  // Collect all available node types
  const standardTypes = Object.values(NodeRegistry).filter(def => def.category !== 'custom');
  const customTypes = libraryComponents;

  const handleAdd = () => {
    if (!newRule.attribute || !newRule.value || !newRule.nodeType) return;
    onChange([
      ...mappings,
      {
        id: crypto.randomUUID(),
        attribute: newRule.attribute,
        operator: newRule.operator as FilterOperator,
        value: newRule.value,
        nodeType: newRule.nodeType
      }
    ]);
    setIsAdding(false);
    setNewRule({
      ...newRule,
      value: ''
    });
  };

  const handleRemove = (id: string) => {
    onChange(mappings.filter(m => m.id !== id));
  };

  return (
    <div className="flex flex-col h-full w-full bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800">
      <div className="p-3 border-b border-slate-200 dark:border-slate-800 shrink-0 bg-slate-50 dark:bg-slate-950/50">
        <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-2">
          <Server className="w-4 h-4 text-indigo-500" />
          Node Mapping
        </h3>
        <p className="text-xs text-slate-500 mt-1">Map specific attribute values to diagram node types.</p>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {mappings.length === 0 && !isAdding && (
          <div className="text-center text-sm text-slate-500 py-4">No mapping rules configured.</div>
        )}

        {mappings.map(rule => (
          <div key={rule.id} className="bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg p-3 relative group">
            <button 
              onClick={() => handleRemove(rule.id)}
              className="absolute top-2 right-2 text-slate-400 hover:text-red-500 p-1 rounded-md hover:bg-slate-200 dark:hover:bg-slate-700 opacity-0 group-hover:opacity-100 transition-all"
            >
              <X className="w-3.5 h-3.5" />
            </button>
            <div className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300 flex-wrap mr-6">
              <span className="font-semibold text-indigo-600 dark:text-indigo-400">{rule.attribute}</span>
              <span className="text-xs font-bold text-slate-400 uppercase">{OPERATORS.find(o => o.value === rule.operator)?.label}</span>
              <span className="bg-white dark:bg-slate-900 px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-700 font-mono text-xs">{String(rule.value)}</span>
              <span className="text-slate-500 mx-1">→</span>
              <span className="font-semibold capitalize text-emerald-600 dark:text-emerald-400">{rule.nodeType.replace('custom_', '')}</span>
            </div>
          </div>
        ))}

        {isAdding && (
          <div className="bg-indigo-50/50 dark:bg-indigo-900/10 border border-indigo-200 dark:border-indigo-800 rounded-lg p-3 space-y-3">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-500 uppercase">Attribute</label>
              <select
                value={newRule.attribute}
                onChange={e => setNewRule({ ...newRule, attribute: e.target.value })}
                className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-md px-2 py-1.5 text-sm"
              >
                {attributes.map(a => <option key={a.key} value={a.key}>{a.key}</option>)}
              </select>
            </div>

            <div className="flex gap-2">
              <div className="space-y-1 w-1/3">
                <label className="text-xs font-semibold text-slate-500 uppercase">Condition</label>
                <select
                  value={newRule.operator}
                  onChange={e => setNewRule({ ...newRule, operator: e.target.value as FilterOperator })}
                  className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-md px-2 py-1.5 text-sm"
                >
                  {OPERATORS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
              <div className="space-y-1 flex-1">
                <label className="text-xs font-semibold text-slate-500 uppercase">Value</label>
                <input
                  type="text"
                  value={String(newRule.value)}
                  onChange={e => setNewRule({ ...newRule, value: e.target.value })}
                  placeholder="e.g. redis"
                  className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-md px-2 py-1.5 text-sm placeholder-slate-400"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-500 uppercase">Set Node Type To</label>
              <select
                value={newRule.nodeType}
                onChange={e => setNewRule({ ...newRule, nodeType: e.target.value })}
                className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-md px-2 py-1.5 text-sm font-medium text-emerald-600 dark:text-emerald-400"
              >
                <optgroup label="Standard Components">
                  {standardTypes.map(def => (
                    <option key={def.type} value={def.type}>{language === 'tr' ? def.name.tr : def.name.en}</option>
                  ))}
                </optgroup>
                {customTypes.length > 0 && (
                  <optgroup label="Custom Components">
                    {customTypes.map((comp: any) => (
                      <option key={`custom_${comp.componentId}`} value={`custom_${comp.componentId}`}>{comp.name}</option>
                    ))}
                  </optgroup>
                )}
              </select>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button 
                onClick={() => setIsAdding(false)}
                className="px-3 py-1.5 text-xs font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-md"
              >
                Cancel
              </button>
              <button 
                onClick={handleAdd}
                disabled={!newRule.value}
                className="px-3 py-1.5 text-xs font-medium bg-indigo-600 text-white rounded-md hover:bg-indigo-500 disabled:bg-slate-300 disabled:text-slate-500 transition-colors"
              >
                Add Rule
              </button>
            </div>
          </div>
        )}

        {!isAdding && (
          <button 
            onClick={() => setIsAdding(true)}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 border border-dashed border-slate-300 dark:border-slate-700 rounded-lg text-sm font-medium text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Mapping Rule
          </button>
        )}
      </div>
    </div>
  );
};
