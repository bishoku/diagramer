import { memo, type CSSProperties } from 'react';
import { type NodeProps } from '@xyflow/react';
import { useAppStore } from '../../../store/useAppStore';

// ── Types ───────────────────────────────────────────────────────────────────
interface SeqFragmentData {
  name: string;
  fragmentWidth: number;
  fragmentHeight: number;
}

// ── Component ───────────────────────────────────────────────────────────────
export const SeqFragmentNode = memo(function SeqFragmentNode({
  data,
}: NodeProps) {
  const theme = useAppStore((s) => s.theme);
  const isDark = theme !== 'light';
  const { name, fragmentWidth, fragmentHeight } =
    data as unknown as SeqFragmentData;

  // Container styles
  const containerStyle: CSSProperties = {
    width: fragmentWidth,
    height: fragmentHeight,
    border: `1.5px dashed ${
      isDark ? 'rgba(99,102,241,0.3)' : 'rgba(99,102,241,0.25)'
    }`,
    borderRadius: '8px',
    background: isDark
      ? 'rgba(99,102,241,0.04)'
      : 'rgba(99,102,241,0.03)',
    backdropFilter: 'blur(4px)',
    position: 'relative',
    pointerEvents: 'none',
    transition: 'border-color 0.2s ease, background 0.2s ease',
  };

  // Tab label styles (top-left UML combined fragment label)
  const tabStyle: CSSProperties = {
    position: 'absolute',
    top: 0,
    left: 0,
    display: 'flex',
    alignItems: 'center',
    gap: '5px',
    padding: '4px 12px 4px 10px',
    background: isDark
      ? 'rgba(99,102,241,0.12)'
      : 'rgba(99,102,241,0.08)',
    borderRight: `1.5px dashed ${
      isDark ? 'rgba(99,102,241,0.3)' : 'rgba(99,102,241,0.25)'
    }`,
    borderBottom: `1.5px dashed ${
      isDark ? 'rgba(99,102,241,0.3)' : 'rgba(99,102,241,0.25)'
    }`,
    borderRadius: '8px 0 6px 0',
    fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
    fontSize: '11px',
    fontWeight: 600,
    letterSpacing: '0.02em',
    textTransform: 'uppercase',
    color: isDark ? 'rgba(165,180,252,0.85)' : 'rgba(79,70,229,0.75)',
    userSelect: 'none',
  };

  // Fragment type indicator (UML "alt", "loop", etc. — we use "ref" for sections)
  const typeIndicatorStyle: CSSProperties = {
    fontSize: '9px',
    fontWeight: 700,
    padding: '1px 4px',
    borderRadius: '3px',
    background: isDark
      ? 'rgba(99,102,241,0.2)'
      : 'rgba(99,102,241,0.12)',
    color: isDark ? 'rgba(165,180,252,0.9)' : 'rgba(79,70,229,0.8)',
    letterSpacing: '0.05em',
  };

  return (
    <div style={containerStyle}>
      <div style={tabStyle}>
        <span style={typeIndicatorStyle}>ref</span>
        <span>{name}</span>
      </div>
    </div>
  );
});
