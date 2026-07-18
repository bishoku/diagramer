import React from 'react';
import { Laptop, Network, Server, Database, Zap, Cpu, SquareDashedBottom, Route, Rows, Shield, StickyNote } from 'lucide-react';

export type ComponentCategory = 'standard' | 'section' | 'custom' | 'annotation';

export interface NodeDefinition {
  type: string;
  name: { en: string; tr: string };
  defaultName: string;
  icon: React.ReactNode;
  colorClass: string;
  category: ComponentCategory;
}

export const NodeRegistry: Record<string, NodeDefinition> = {
  client: {
    type: 'client',
    name: { en: 'Client', tr: 'Kullanıcı (Client)' },
    defaultName: 'Client',
    icon: <Laptop className="w-4 h-4" />,
    colorClass: 'text-indigo-500',
    category: 'standard'
  },
  load_balancer: {
    type: 'load_balancer',
    name: { en: 'Load Balancer', tr: 'Yük Dengeleyici (LB)' },
    defaultName: 'LB',
    icon: <Network className="w-4 h-4" />,
    colorClass: 'text-emerald-500',
    category: 'standard'
  },
  gateway: {
    type: 'gateway',
    name: { en: 'API Gateway', tr: 'API Ağ Geçidi' },
    defaultName: 'Gateway',
    icon: <Route className="w-4 h-4" />,
    colorClass: 'text-emerald-500',
    category: 'standard'
  },
  server: {
    type: 'server',
    name: { en: 'Server', tr: 'Sunucu (Server)' },
    defaultName: 'Server',
    icon: <Server className="w-4 h-4" />,
    colorClass: 'text-amber-500', // Note: Sidebar used amber, BaseNode used violet. We'll standardise.
    category: 'standard'
  },
  database: {
    type: 'database',
    name: { en: 'Database', tr: 'Veritabanı (DB)' },
    defaultName: 'Database',
    icon: <Database className="w-4 h-4" />,
    colorClass: 'text-rose-500',
    category: 'standard'
  },
  cache: {
    type: 'cache',
    name: { en: 'Cache', tr: 'Önbellek (Cache)' },
    defaultName: 'Cache',
    icon: <Zap className="w-4 h-4" />,
    colorClass: 'text-cyan-500',
    category: 'standard'
  },

  queue: {
    type: 'queue',
    name: { en: 'Message Queue', tr: 'Mesaj Kuyruğu' },
    defaultName: 'Queue',
    icon: <Rows className="w-4 h-4" />,
    colorClass: 'text-purple-500',
    category: 'standard'
  },
  firewall: {
    type: 'firewall',
    name: { en: 'Firewall / WAF', tr: 'Güvenlik Duvarı' },
    defaultName: 'Firewall',
    icon: <Shield className="w-4 h-4" />,
    colorClass: 'text-rose-600',
    category: 'standard'
  },
  section: {
    type: 'section',
    name: { en: 'Section', tr: 'Grup (Section)' },
    defaultName: 'Section',
    icon: <SquareDashedBottom className="w-4 h-4" />,
    colorClass: 'text-slate-500',
    category: 'section'
  },
  sticky_note: {
    type: 'sticky_note',
    name: { en: 'Sticky Note', tr: 'Yapışkan Not' },
    defaultName: 'Note',
    icon: <StickyNote className="w-4 h-4" />,
    colorClass: 'text-yellow-500',
    category: 'annotation'
  }
};

export const getRegisteredNodes = () => Object.values(NodeRegistry);
export const getNodeDefinition = (type: string) => NodeRegistry[type];
export const getDefaultIcon = (colorClass: string) => <Cpu className={`w-4 h-4 ${colorClass}`} />;
