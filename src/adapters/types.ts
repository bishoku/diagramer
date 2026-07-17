import { LogicalDiagram, VisualDiagram } from '../types';

export type FilterOperator = '=' | '!=' | '>' | '<' | '>=' | '<=' | 'contains' | 'not_contains' | 'in' | 'not_in';

export interface FilterRule {
  id: string;
  field: string;
  operator: FilterOperator;
  value: string | number | boolean | (string | number | boolean)[];
}

export interface FilterAST {
  logicalOperator: 'AND' | 'OR';
  rules: FilterRule[];
}

export interface NodeTypeMappingRule {
  id: string;
  attribute: string;
  operator: FilterOperator;
  value: string | number | boolean;
  nodeType: string;
}

export interface ImportFilter {
  types?: string[]; // Legacy basic filter
  ast?: FilterAST;  // Advanced AST filter
  nodeTypeMappings?: NodeTypeMappingRule[];
}

export interface AttributeMetadata {
  key: string;
  type: 'string' | 'number' | 'boolean';
  values?: (string | number | boolean)[];
}

export interface TraceMetadata {
  attributes: AttributeMetadata[];
}

export interface DiagramAdapter {
  id: string;
  name: string;
  description: string;
  supportedFormats: string[]; // e.g., ['.json']
  importMethod?: 'file-picker' | 'text-modal';
  parse: (rawInput: string, filters?: ImportFilter) => Promise<{ logicalData: LogicalDiagram; visualData: VisualDiagram }>;
  extractMetadata?: (rawInput: string) => Promise<TraceMetadata>;
}
