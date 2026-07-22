/**
 * ParticleSvg.tsx
 *
 * Renders the SVG content for each particle type.
 * Used in two contexts:
 *  1. AnimatedEdge — particle moving along the path (larger, with step number)
 *  2. ParticlePicker — thumbnail in the properties panel (smaller, static)
 */
import React from 'react';
import { ParticleType, PARTICLE_MAP } from '../../config/particles';

// ─────────────────────────────────────────────────────────────────────────────
// Animation particle (rendered inside AnimatedEdge <g> transform)
// Receives rotation context from the parent transform.
// ─────────────────────────────────────────────────────────────────────────────

interface AnimParticleProps {
  type: ParticleType;
  rotation: number;       // current path rotation — used to counter-rotate labels
  stepNumber: number | null;
  color?: string;
}

const C = '#ffffff'; // label/icon color on top of fill

export const AnimationParticle: React.FC<AnimParticleProps> = ({ type, rotation, stepNumber, color }) => {
  const def = PARTICLE_MAP[type];
  const fill = color || def?.color || '#6366f1';
  const R = -rotation; // counter-rotation for upright labels

  const label = stepNumber !== null ? (
    <text
      textAnchor="middle" dominantBaseline="central" fill={C}
      transform={`rotate(${R})`}
      style={{ fontSize: '8.5px', fontWeight: 900, fontFamily: 'sans-serif', userSelect: 'none', pointerEvents: 'none' }}
    >
      {stepNumber}
    </text>
  ) : null;

  switch (type) {
    // ── Dot ──────────────────────────────────────────────────────────────────
    case 'dot':
      return (
        <g transform={`rotate(${R})`}>
          <circle r={16} fill={fill} opacity={0.25} />
          <circle r={11} fill={fill} />
          {stepNumber !== null && (
            <>
              <circle r={6.5} fill={C} />
              <text textAnchor="middle" dominantBaseline="central" fill="#1e293b"
                style={{ fontSize: '8.5px', fontWeight: 900, fontFamily: 'sans-serif', userSelect: 'none' }}>
                {stepNumber}
              </text>
            </>
          )}
        </g>
      );

    // ── Arrow ─────────────────────────────────────────────────────────────────
    case 'arrow':
      return (
        <g>
          <path d="M -13 -9 L 13 0 L -13 9 Z" fill={fill} stroke={C} strokeWidth="1" strokeLinejoin="round" />
          {label && React.cloneElement(label, { transform: `rotate(${R}, 0, 0)`, x: '-3', y: '0' })}
        </g>
      );

    // ── Envelope (event) ─────────────────────────────────────────────────────
    case 'envelope':
      return (
        <g>
          <rect x="-14" y="-10" width="28" height="20" rx="3" fill={fill} stroke={C} strokeWidth="1" />
          <path d="M -14 -10 L 0 1 L 14 -10" fill="none" stroke={C} strokeWidth="1.5"
            strokeLinecap="round" strokeLinejoin="round" />
          {label && React.cloneElement(label, { transform: `rotate(${R}, 0, 4)`, y: '4' })}
        </g>
      );

    // ── REST / HTTP ───────────────────────────────────────────────────────────
    case 'rest': {
      // Globe outline + horizontal arrow
      return (
        <g>
          <g transform={`rotate(${R})`}>
            <circle r={13} fill={fill} />
            {/* Globe arcs */}
            <ellipse rx="5" ry="13" fill="none" stroke={C} strokeWidth="1" opacity="0.7" />
            <line x1="-13" y1="0" x2="13" y2="0" stroke={C} strokeWidth="1" opacity="0.7" />
            {/* Arrow right */}
            <path d="M -5 -4 L 5 0 L -5 4 Z" fill={C} transform="translate(3,0)" />
          </g>
        </g>
      );
    }

    // ── gRPC ─────────────────────────────────────────────────────────────────
    case 'grpc': {
      return (
        <g>
          <g transform={`rotate(${R})`}>
            <rect x="-14" y="-12" width="28" height="24" rx="4" fill={fill} />
            {/* Top arrow: left→right */}
            <path d="M -7 -5 L 7 -5 L 4 -8 M 7 -5 L 4 -2" fill="none" stroke={C} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            {/* Bottom arrow: right→left */}
            <path d="M 7 4 L -7 4 L -4 1 M -7 4 L -4 7" fill="none" stroke={C} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </g>
        </g>
      );
    }

    // ── WebSocket (lightning bolt) ────────────────────────────────────────────
    case 'ws': {
      return (
        <g>
          <g transform={`rotate(${R})`}>
            <circle r={13} fill={fill} />
            {/* Lightning bolt */}
            <path d="M 2 -11 L -4 1 L 1 1 L -2 11 L 4 -1 L -1 -1 Z" fill={C} />
          </g>
        </g>
      );
    }

    // ── GraphQL (diamond / hexagon) ───────────────────────────────────────────
    case 'graphql': {
      const HEX = 'M 0 -12 L 10.4 -6 L 10.4 6 L 0 12 L -10.4 6 L -10.4 -6 Z';
      return (
        <g>
          <g transform={`rotate(${R})`}>
            <path d={HEX} fill={fill} stroke={C} strokeWidth="1" />
            {/* GraphQL diamond inner */}
            <path d="M 0 -6 L 5 0 L 0 6 L -5 0 Z" fill="none" stroke={C} strokeWidth="1.2" />
          </g>
        </g>
      );
    }

    // ── Kafka / event stream (wave lines) ─────────────────────────────────────
    case 'kafka': {
      return (
        <g>
          <g transform={`rotate(${R})`}>
            <circle r={13} fill={fill} />
            {/* Three wave lines */}
            {[-5, 0, 5].map((oy, i) => (
              <path key={i} d={`M -8 ${oy} Q -4 ${oy - 4} 0 ${oy} Q 4 ${oy + 4} 8 ${oy}`}
                fill="none" stroke={C} strokeWidth="1.4" strokeLinecap="round" />
            ))}
          </g>
        </g>
      );
    }

    // ── Package / Queue ───────────────────────────────────────────────────────
    case 'pkg': {
      return (
        <g>
          <g transform={`rotate(${R})`}>
            <rect x="-12" y="-10" width="24" height="20" rx="3" fill={fill} stroke={C} strokeWidth="1" />
            {/* Box fold lines */}
            <line x1="-12" y1="-3" x2="12" y2="-3" stroke={C} strokeWidth="1" opacity="0.7" />
            <line x1="0" y1="-10" x2="0" y2="-3" stroke={C} strokeWidth="1" opacity="0.7" />
            {/* Bow tie on top */}
            <path d="M -4 -10 L 0 -6.5 L 4 -10" fill="none" stroke={C} strokeWidth="1" strokeLinecap="round" />
          </g>
        </g>
      );
    }

    // ── SQL / Database (cylinder) ─────────────────────────────────────────────
    case 'sql': {
      return (
        <g>
          <g transform={`rotate(${R})`}>
            {/* Cylinder body */}
            <rect x="-10" y="-8" width="20" height="16" fill={fill} />
            {/* Top ellipse */}
            <ellipse cx="0" cy="-8" rx="10" ry="4" fill={fill} stroke={C} strokeWidth="1" />
            {/* Bottom ellipse */}
            <ellipse cx="0" cy="8" rx="10" ry="4" fill={fill} stroke={C} strokeWidth="1" />
            {/* Side lines */}
            <line x1="-10" y1="-8" x2="-10" y2="8" stroke={C} strokeWidth="1" />
            <line x1="10" y1="-8" x2="10" y2="8" stroke={C} strokeWidth="1" />
          </g>
        </g>
      );
    }

    default:
      return (
        <g transform={`rotate(${R})`}>
          <circle r={11} fill={fill} />
        </g>
      );
  }
};


// ─────────────────────────────────────────────────────────────────────────────
// Picker thumbnail — rendered inside a 32×32 viewBox SVG in the properties panel
// ─────────────────────────────────────────────────────────────────────────────

interface PickerIconProps {
  type: ParticleType;
  size?: number;
}

export const ParticlePickerIcon: React.FC<PickerIconProps> = ({ type, size = 28 }) => {
  const def = PARTICLE_MAP[type];
  const fill = def?.color ?? '#4f46e5';
  const C = '#ffffff';

  const inner = (() => {
    switch (type) {
      case 'dot':
        return (
          <>
            <circle cx="16" cy="16" r="10" fill={fill} />
            <circle cx="16" cy="16" r="5" fill={C} opacity="0.5" />
          </>
        );
      case 'arrow':
        return (
          <path d="M 6 16 L 26 16 M 20 10 L 26 16 L 20 22" fill="none"
            stroke={fill} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
        );
      case 'envelope':
        return (
          <>
            <rect x="5" y="9" width="22" height="15" rx="2" fill={fill} />
            <path d="M 5 9 L 16 18 L 27 9" fill="none" stroke={C} strokeWidth="1.5"
              strokeLinecap="round" strokeLinejoin="round" />
          </>
        );
      case 'rest':
        return (
          <>
            <circle cx="16" cy="16" r="10" fill={fill} />
            <ellipse cx="16" cy="16" rx="4" ry="10" fill="none" stroke={C} strokeWidth="1" opacity="0.7" />
            <line x1="6" y1="16" x2="26" y2="16" stroke={C} strokeWidth="1" opacity="0.7" />
            <path d="M 14 13 L 19 16 L 14 19 Z" fill={C} />
          </>
        );
      case 'grpc':
        return (
          <>
            <rect x="5" y="7" width="22" height="18" rx="3" fill={fill} />
            <path d="M 9 12 L 17 12 M 15 9.5 L 17 12 L 15 14.5" fill="none"
              stroke={C} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M 23 20 L 15 20 M 17 17.5 L 15 20 L 17 22.5" fill="none"
              stroke={C} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </>
        );
      case 'ws':
        return (
          <>
            <circle cx="16" cy="16" r="10" fill={fill} />
            <path d="M 18 7 L 13 16 L 17 16 L 14 25 L 20 14 L 16 14 Z" fill={C} />
          </>
        );
      case 'graphql':
        return (
          <>
            <polygon points="16,6 24.7,11 24.7,21 16,26 7.3,21 7.3,11" fill={fill} stroke="none" />
            <polygon points="16,11 20,16 16,21 12,16" fill="none" stroke={C} strokeWidth="1.2" />
          </>
        );
      case 'kafka':
        return (
          <>
            <circle cx="16" cy="16" r="10" fill={fill} />
            {[11, 16, 21].map((oy, i) => (
              <path key={i} d={`M 9 ${oy} Q 12.5 ${oy - 3} 16 ${oy} Q 19.5 ${oy + 3} 23 ${oy}`}
                fill="none" stroke={C} strokeWidth="1.3" strokeLinecap="round" />
            ))}
          </>
        );
      case 'pkg':
        return (
          <>
            <rect x="6" y="10" width="20" height="16" rx="2" fill={fill} />
            <line x1="6" y1="16" x2="26" y2="16" stroke={C} strokeWidth="1.2" opacity="0.8" />
            <line x1="16" y1="10" x2="16" y2="16" stroke={C} strokeWidth="1.2" opacity="0.8" />
            <path d="M 12 10 L 16 13 L 20 10" fill="none" stroke={C} strokeWidth="1.2" strokeLinecap="round" />
          </>
        );
      case 'sql':
        return (
          <>
            <ellipse cx="16" cy="11" rx="9" ry="4" fill={fill} />
            <rect x="7" y="11" width="18" height="10" fill={fill} />
            <ellipse cx="16" cy="21" rx="9" ry="4" fill={fill} />
            <ellipse cx="16" cy="11" rx="9" ry="4" fill="none" stroke={C} strokeWidth="1" />
            <ellipse cx="16" cy="21" rx="9" ry="4" fill="none" stroke={C} strokeWidth="1" />
            <line x1="7" y1="11" x2="7" y2="21" stroke={C} strokeWidth="1" />
            <line x1="25" y1="11" x2="25" y2="21" stroke={C} strokeWidth="1" />
          </>
        );
      default:
        return <circle cx="16" cy="16" r="10" fill={fill} />;
    }
  })();

  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none">
      {inner}
    </svg>
  );
};
