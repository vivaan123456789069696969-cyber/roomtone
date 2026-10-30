import type { Reference } from '../lib/inspiration'

/** Small original vignettes that let people recognise a style without naming it. */
const STYLE_ART: Record<string, { wall: string; floor: string; sofa: string; accent: string; round: number; extra: string }> = {
  'warm-contemporary': { wall: '#EFE6D6', floor: '#B89773', sofa: '#D9C7A8', accent: '#8C9A7C', round: 12, extra: 'lamp' },
  japandi: { wall: '#ECE6DB', floor: '#C9AE88', sofa: '#CFC3AE', accent: '#3A3836', round: 6, extra: 'low' },
  'indian-modern': { wall: '#F2E4CC', floor: '#9C6B45', sofa: '#2F5D5E', accent: '#C99A3B', round: 8, extra: 'arch' },
  scandinavian: { wall: '#F6F4EF', floor: '#D8C3A0', sofa: '#C9CDD0', accent: '#8AA0AE', round: 10, extra: 'plant' },
  'mid-century': { wall: '#EADFCB', floor: '#8A5A3A', sofa: '#C99A3B', accent: '#B9694A', round: 4, extra: 'legs' },
  'soft-industrial': { wall: '#B9B5AE', floor: '#7F7A73', sofa: '#6A4A36', accent: '#2C2D2F', round: 3, extra: 'pipe' },
  classic: { wall: '#EDE7DD', floor: '#9E7E5C', sofa: '#DDB7A8', accent: '#C9A24D', round: 14, extra: 'mould' },
  boho: { wall: '#F0E2CF', floor: '#C29A6C', sofa: '#E1B866', accent: '#B9694A', round: 16, extra: 'plant' },
}

export function StyleArt({ id }: { id: string }) {
  const s = STYLE_ART[id] ?? STYLE_ART['warm-contemporary']
  return (
    <svg viewBox="0 0 200 150" aria-hidden="true" preserveAspectRatio="xMidYMid slice">
      <rect width="200" height="110" fill={s.wall} />
      <rect y="110" width="200" height="40" fill={s.floor} />
      {s.extra === 'mould' && <rect x="30" y="18" width="70" height="60" fill="none" stroke="#fff" strokeWidth="3" />}
      {s.extra === 'arch' && <path d="M120 105V45a26 26 0 0 1 52 0v60z" fill={s.accent} opacity="0.85" />}
      {s.extra === 'pipe' && <path d="M0 22h200M150 22v40" stroke={s.accent} strokeWidth="4" />}
      <rect x="40" y="78" width="96" height="30" rx={s.round} fill={s.sofa} />
      <rect x="34" y="88" width="16" height="28" rx={s.round / 2} fill={s.sofa} />
      <rect x="126" y="88" width="16" height="28" rx={s.round / 2} fill={s.sofa} />
      {s.extra === 'legs' ? (
        <path d="M44 116l-5 14M134 116l5 14" stroke="#3A3836" strokeWidth="3" />
      ) : s.extra === 'low' ? null : (
        <path d="M46 116v6M130 116v6" stroke="#3A3836" strokeWidth="3" />
      )}
      {s.extra === 'lamp' && (
        <g>
          <path d="M166 120V60" stroke="#3A3836" strokeWidth="2" />
          <path d="M152 60h28l-6-18h-16z" fill={s.accent} />
        </g>
      )}
      {s.extra === 'plant' && (
        <g>
          <rect x="158" y="102" width="18" height="18" rx="2" fill={s.accent} />
          <path d="M167 102c-14-16-10-38 0-48 10 10 14 32 0 48z" fill="#6F7F63" />
        </g>
      )}
      {s.extra === 'low' && <rect x="150" y="104" width="34" height="10" fill={s.accent} />}
    </svg>
  )
}

function Material({ m }: { m: string }) {
  switch (m) {
    case 'oak':
      return (
        <g>
          <rect width="120" height="120" fill="#D8C3A0" />
          {[14, 34, 58, 80, 102].map((y, i) => (
            <path key={y} d={`M0 ${y}c30 ${i % 2 ? 6 : -6} 60 ${i % 2 ? -4 : 4} 120 0`} stroke="#BFA27A" strokeWidth="2" fill="none" />
          ))}
        </g>
      )
    case 'cane':
      return (
        <g>
          <rect width="120" height="120" fill="#E6CFA4" />
          {Array.from({ length: 7 }).map((_, i) => (
            <g key={i} stroke="#B48A55" strokeWidth="2.5">
              <path d={`M${i * 20} 0v120`} />
              <path d={`M0 ${i * 20}h120`} />
            </g>
          ))}
          {Array.from({ length: 6 }).map((_, i) => (
            <path key={`d${i}`} d={`M${i * 20} 0l120 120M${i * 20} 120L${i * 20 + 120} 0`} stroke="#C9A06A" strokeWidth="1.2" />
          ))}
        </g>
      )
    case 'linen':
      return (
        <g>
          <rect width="120" height="120" fill="#E9E1D3" />
          {Array.from({ length: 30 }).map((_, i) => (
            <path key={i} d={`M0 ${i * 4 + 1}h120`} stroke="#D9CFBE" strokeWidth="1" />
          ))}
          <path d="M20 0c10 40-6 80 10 120" stroke="#D2C6B2" strokeWidth="6" fill="none" opacity="0.6" />
        </g>
      )
    case 'terrazzo':
      return (
        <g>
          <rect width="120" height="120" fill="#EEE8DE" />
          {[
            [14, 18, '#B9694A'], [60, 12, '#8C9A7C'], [96, 30, '#3A3836'], [30, 56, '#C99A3B'], [80, 64, '#B9694A'],
            [18, 96, '#8C9A7C'], [56, 98, '#3A3836'], [104, 100, '#C99A3B'], [44, 34, '#A3A6A8'], [90, 88, '#A3A6A8'],
          ].map(([x, y, c], i) => (
            <path key={i} d={`M${x} ${y}l6 -3 4 5 -5 5 -6 -2z`} fill={c as string} />
          ))}
        </g>
      )
    default:
      return <rect width="120" height="120" fill="#DDD3C3" />
  }
}

function ObjectArt({ object, colour }: { object: string; colour: string }) {
  return (
    <g>
      <rect width="120" height="120" fill="#EFE8DC" />
      <rect y="92" width="120" height="28" fill="#E3D8C6" />
      {object === 'sofa' && (
        <g fill={colour}>
          <rect x="16" y="58" width="88" height="30" rx="12" />
          <rect x="10" y="70" width="18" height="26" rx="8" />
          <rect x="92" y="70" width="18" height="26" rx="8" />
        </g>
      )}
      {object === 'table' && (
        <g>
          <ellipse cx="60" cy="78" rx="38" ry="10" fill={colour} />
          <path d="M44 84v16M76 84v16" stroke="#7A5634" strokeWidth="4" />
        </g>
      )}
      {object === 'lamp' && (
        <g>
          <path d="M60 0v34" stroke="#3A3836" strokeWidth="2" />
          <ellipse cx="60" cy="52" rx="26" ry="22" fill={colour} stroke="#DDD3C3" />
          <ellipse cx="60" cy="86" rx="40" ry="10" fill="#FFF3D6" opacity="0.6" />
        </g>
      )}
      {object === 'curtain' && (
        <g>
          <rect x="30" y="14" width="60" height="74" fill="#DCE6E8" />
          <path d="M24 10h72" stroke="#7A5634" strokeWidth="3" />
          <path d="M26 12c6 30 2 60 8 84h18c-4-26 0-56-4-84z" fill={colour} opacity="0.95" />
          <path d="M94 12c-6 30-2 60-8 84H68c4-26 0-56 4-84z" fill={colour} opacity="0.95" />
        </g>
      )}
      {object === 'plant' && (
        <g>
          <rect x="46" y="72" width="28" height="24" rx="3" fill="#B9694A" />
          <path d="M60 72c-20-24-14-52 0-64 14 12 20 40 0 64z" fill={colour} />
          <path d="M60 74c-28-6-34-28-30-42 16 4 28 22 30 42z" fill="#5E6B53" />
        </g>
      )}
      {object === 'cushion' && (
        <g>
          <rect x="28" y="40" width="64" height="52" rx="10" fill="#F4EEE3" />
          {[0, 1, 2].map((r) =>
            [0, 1, 2].map((c) => <circle key={`${r}${c}`} cx={42 + c * 18} cy={54 + r * 13} r="5" fill={colour} />),
          )}
        </g>
      )}
    </g>
  )
}

export function RefArt({ art }: { art: Reference['art'] }) {
  return (
    <svg viewBox="0 0 120 120" aria-hidden="true" preserveAspectRatio="xMidYMid slice">
      {art.kind === 'palette' &&
        art.colours.map((c, i) => <rect key={c} x={(i * 120) / art.colours.length} width={120 / art.colours.length + 0.5} height="120" fill={c} />)}
      {art.kind === 'material' && <Material m={art.material} />}
      {art.kind === 'object' && <ObjectArt object={art.object} colour={art.colour} />}
    </svg>
  )
}

export function EmptyRoomArt() {
  return (
    <svg viewBox="0 0 160 110" className="art" aria-hidden="true">
      <rect x="10" y="10" width="140" height="70" fill="#EFE8DC" />
      <rect x="10" y="80" width="140" height="20" fill="#E3D8C6" />
      <rect x="28" y="24" width="38" height="40" fill="#DCE6E8" stroke="#F7F3EC" strokeWidth="3" />
      <rect x="112" y="36" width="22" height="44" fill="#C9A47A" />
      <path d="M80 92h40" stroke="#C4B7A2" strokeWidth="2" strokeDasharray="4 4" />
    </svg>
  )
}
