/**
 * Original editorial illustration of one living room, before and after.
 * The window, door, floor and sofa stay in place in both versions — the
 * same "keep" promise the product makes.
 */
interface Props {
  variant: 'before' | 'after'
  className?: string
  title?: string
}

export function RoomIllustration({ variant, className, title }: Props) {
  const after = variant === 'after'
  const wall = after ? '#F1EADD' : '#C9C3B8'
  const accent = after ? '#8C9A7C' : '#BDB6AA'
  const floor = '#B89773'
  const sofa = after ? '#D9C7A8' : '#8E877C'
  return (
    <svg viewBox="0 0 640 440" className={className} role="img" aria-label={title ?? `Illustrated living room, ${variant}`}>
      <defs>
        <linearGradient id={`light-${variant}`} x1="0" x2="1" y1="0" y2="1">
          <stop offset="0" stopColor="#FFF8E6" stopOpacity={after ? 0.55 : 0.12} />
          <stop offset="1" stopColor="#FFF8E6" stopOpacity="0" />
        </linearGradient>
        <pattern id={`boards-${variant}`} width="80" height="12" patternUnits="userSpaceOnUse">
          <rect width="80" height="12" fill={floor} />
          <path d="M0 11.5h80M52 0v12" stroke="#9E7E5C" strokeWidth="1" />
        </pattern>
      </defs>
      {/* walls */}
      <rect width="640" height="330" fill={wall} />
      <rect x="380" width="260" height="330" fill={accent} opacity={after ? 1 : 0.5} />
      {/* floor (kept) */}
      <rect y="330" width="640" height="110" fill={`url(#boards-${variant})`} />
      <rect y="326" width="640" height="6" fill={after ? '#E7DDCB' : '#A9A196'} />
      {/* window (kept) */}
      <rect x="70" y="60" width="180" height="190" fill="#DCE6E8" stroke="#F7F3EC" strokeWidth="10" />
      <path d="M160 60v190M70 155h180" stroke="#F7F3EC" strokeWidth="6" />
      <rect x="70" y="60" width="180" height="190" fill={`url(#light-${variant})`} />
      {after && (
        <>
          <path d="M56 46h208" stroke="#7A5634" strokeWidth="4" strokeLinecap="round" />
          <path d="M60 48c10 60 6 150 14 222h34c-8-70-2-160-6-222z" fill="#EDE3D2" opacity="0.92" />
          <path d="M260 48c-10 60-6 150-14 222h-34c8-70 2-160 6-222z" fill="#EDE3D2" opacity="0.92" />
        </>
      )}
      {/* door (kept) */}
      <rect x="540" y="110" width="74" height="216" fill={after ? '#A9825A' : '#8E7A62'} />
      <circle cx="552" cy="222" r="4" fill="#3A3836" />
      {/* pendant */}
      {after ? (
        <>
          <path d="M330 0v70" stroke="#3A3836" strokeWidth="2" />
          <ellipse cx="330" cy="92" rx="34" ry="28" fill="#FBF6EC" stroke="#E7DDCB" />
          <ellipse cx="330" cy="130" rx="120" ry="40" fill="#FFF3D6" opacity="0.35" />
        </>
      ) : (
        <>
          <path d="M330 0v40" stroke="#3A3836" strokeWidth="2" />
          <circle cx="330" cy="48" r="10" fill="#E9E4DA" />
        </>
      )}
      {/* artwork */}
      {after ? (
        <g>
          <rect x="400" y="96" width="96" height="120" fill="#F7F3EC" stroke="#7A5634" strokeWidth="5" />
          <circle cx="436" cy="146" r="22" fill="#B9694A" opacity="0.85" />
          <rect x="430" y="164" width="44" height="30" fill="#5E6B53" opacity="0.85" />
        </g>
      ) : (
        <rect x="410" y="120" width="70" height="56" fill="#A39C90" />
      )}
      {/* rug */}
      {after && <ellipse cx="320" cy="388" rx="210" ry="34" fill="#E7DDCB" />}
      {after && <ellipse cx="320" cy="388" rx="186" ry="26" fill="none" stroke="#C9A47A" strokeWidth="3" />}
      {/* sofa (kept, re-upholstered look only in "after") */}
      <g>
        <rect x="200" y="252" width="270" height="70" rx={after ? 16 : 4} fill={sofa} />
        <rect x="186" y="270" width="34" height="74" rx={after ? 14 : 4} fill={sofa} />
        <rect x="450" y="270" width="34" height="74" rx={after ? 14 : 4} fill={sofa} />
        <rect x="214" y="300" width="242" height="36" rx={after ? 10 : 3} fill={after ? '#CDB995' : '#7D766C'} />
        <path d="M206 344v12M464 344v12" stroke="#3A3836" strokeWidth="5" />
        {after && (
          <>
            <rect x="232" y="266" width="54" height="40" rx="10" fill="#8C9A7C" />
            <rect x="380" y="266" width="54" height="40" rx="10" fill="#B9694A" />
          </>
        )}
      </g>
      {/* coffee table */}
      {after ? (
        <g>
          <ellipse cx="330" cy="372" rx="70" ry="14" fill="#A9825A" />
          <path d="M300 380v24M360 380v24" stroke="#7A5634" strokeWidth="5" />
          <rect x="316" y="356" width="22" height="12" rx="3" fill="#F7F3EC" />
        </g>
      ) : (
        <g>
          <rect x="270" y="360" width="120" height="16" fill="#5D554B" />
          <path d="M278 376v26M382 376v26" stroke="#4A433B" strokeWidth="5" />
        </g>
      )}
      {/* plants */}
      {after && (
        <g>
          <rect x="500" y="300" width="34" height="40" rx="4" fill="#B9694A" />
          <path d="M517 300c-24-30-18-70 0-90 18 20 24 60 0 90z" fill="#5E6B53" />
          <path d="M517 302c-40-10-50-40-44-62 22 4 40 30 44 62z" fill="#6F7F63" />
          <path d="M517 302c40-10 50-40 44-62-22 4-40 30-44 62z" fill="#7D8C70" />
        </g>
      )}
      {!after && <rect width="640" height="440" fill="#4A463F" opacity="0.18" />}
    </svg>
  )
}
