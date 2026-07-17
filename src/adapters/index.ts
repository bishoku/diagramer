import { DiagramAdapter } from './types';
import { tempoAdapter } from './tempoAdapter';
import { mermaidAdapter } from './mermaidAdapter';

export const availableAdapters: DiagramAdapter[] = [
  tempoAdapter,
  mermaidAdapter
];
