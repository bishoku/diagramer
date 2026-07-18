import { memo, type CSSProperties } from 'react';
import { type NodeProps } from '@xyflow/react';
import { useAppStore } from '../../../store/useAppStore';

// ── Types ───────────────────────────────────────────────────────────────────
interface SeqFragmentData {
  name: string;
  fragmentType: string;
  fragmentWidth: number;
  fragmentHeight: number;
}

// Fragment type color mapping for visual distinction
const FRAGMENT_COLORS: Record<string, { border: string; bg: string; tab: string; text: string; indicator: string; indicatorText: string }> = {
  alt:      { border: 'rgba(99,102,241,',  bg: 'rgba(99,102,241,',  tab: 'rgba(99,102,241,',  text: 'rgba(165,180,252,', indicator: 'rgba(99,102,241,',  indicatorText: 'rgba(165,180,252,' },
  loop:     { border: 'rgba(16,185,129,',  bg: 'rgba(16,185,129,',  tab: 'rgba(16,185,129,',  text: 'rgba(52,211,153,',  indicator: 'rgba(16,185,129,',  indicatorText: 'rgba(52,211,153,'  },
  opt:      { border: 'rgba(245,158,11,',  bg: 'rgba(245,158,11,',  tab: 'rgba(245,158,11,',  text: 'rgba(252,211,77,',  indicator: 'rgba(245,158,11,',  indicatorText: 'rgba(252,211,77,'  },
  par:      { border: 'rgba(168,85,247,',  bg: 'rgba(168,85,247,',  tab: 'rgba(168,85,247,',  text: 'rgba(196,148,252,', indicator: 'rgba(168,85,247,',  indicatorText: 'rgba(196,148,252,' },
  critical: { border: 'rgba(244,63,94,',   bg: 'rgba(244,63,94,',   tab: 'rgba(244,63,94,',   text: 'rgba(251,113,133,', indicator: 'rgba(244,63,94,',   indicatorText: 'rgba(251,113,133,' },
  break:    { border: 'rgba(244,63,94,',   bg: 'rgba(244,63,94,',   tab: 'rgba(244,63,94,',   text: 'rgba(251,113,133,', indicator: 'rgba(244,63,94,',   indicatorText: 'rgba(251,113,133,' },
  rect:     { border: 'rgba(100,116,139,', bg: 'rgba(100,116,139,', tab: 'rgba(100,116,139,', text: 'rgba(148,163,184,', indicator: 'rgba(100,116,139,', indicatorText: 'rgba(148,163,184,' },
  ref:      { border: 'rgba(99,102,241,',  bg: 'rgba(99,102,241,',  tab: 'rgba(99,102,241,',  text: 'rgba(165,180,252,', indicator: 'rgba(99,102,241,',  indicatorText: 'rgba(165,180,252,' },
};
const DEFAULT_FRAG_COLOR = FRAGMENT_COLORS.ref;

// ── Component ───────────────────────────────────────────────────────────────
export const SeqFragmentNode = memo(function SeqFragmentNode({
  data,
}: NodeProps) {
  const theme = useAppStore((s) => s.theme);
  const isDark = theme !== 'light';
  const { name, fragmentType, fragmentWidth, fragmentHeight } =
    data as unknown as SeqFragmentData;

  const fc = FRAGMENT_COLORS[fragmentType] || DEFAULT_FRAG_COLOR;

  // Container styles
  const containerStyle: CSSProperties = {
    width: fragmentWidth,
    height: fragmentHeight,
    border: `1.5px dashed ${
      isDark ? `${fc.border}0.3)` : `${fc.border}0.25)`
    }`,
    borderRadius: '8px',
    background: isDark
      ? `${fc.bg}0.04)`
      : `${fc.bg}0.03)`,
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
      ? `${fc.tab}0.12)`
      : `${fc.tab}0.08)`,
    borderRight: `1.5px dashed ${
      isDark ? `${fc.border}0.3)` : `${fc.border}0.25)`
    }`,
    borderBottom: `1.5px dashed ${
      isDark ? `${fc.border}0.3)` : `${fc.border}0.25)`
    }`,
    borderRadius: '8px 0 6px 0',
    fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
    fontSize: '11px',
    fontWeight: 600,
    letterSpacing: '0.02em',
    textTransform: 'uppercase',
    color: isDark ? `${fc.text}0.85)` : `${fc.text}0.75)`,
    userSelect: 'none',
  };

  // Fragment type indicator (UML "alt", "loop", etc.)
  const typeIndicatorStyle: CSSProperties = {
    fontSize: '9px',
    fontWeight: 700,
    padding: '1px 4px',
    borderRadius: '3px',
    background: isDark
      ? `${fc.indicator}0.2)`
      : `${fc.indicator}0.12)`,
    color: isDark ? `${fc.indicatorText}0.9)` : `${fc.indicatorText}0.8)`,
    letterSpacing: '0.05em',
  };

  return (
    <div style={containerStyle}>
      <div style={tabStyle}>
        <span style={typeIndicatorStyle}>{fragmentType}</span>
        <span>{name}</span>
      </div>
    </div>
  );
});
