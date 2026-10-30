import { useId, useState, type ReactNode } from 'react'

/**
 * Accessible before/after comparison. A native range input drives the split,
 * so it works with keyboard (arrow keys, Home/End), touch and screen readers.
 */
export function CompareSlider({ before, after, label }: { before: ReactNode; after: ReactNode; label: string }) {
  const [pos, setPos] = useState(50)
  const id = useId()
  return (
    <div className="compare">
      <div>{before}</div>
      <div className="after" style={{ clipPath: `inset(0 0 0 ${pos}%)` }}>{after}</div>
      <div className="handle" style={{ left: `${pos}%` }} aria-hidden="true" />
      <span className="lbl" style={{ left: 12 }} aria-hidden="true">Before</span>
      <span className="lbl" style={{ right: 12 }} aria-hidden="true">After</span>
      <label htmlFor={id} className="visually-hidden">{label}: slide to compare before and after</label>
      <input
        id={id}
        type="range"
        min={0}
        max={100}
        value={pos}
        onChange={(e) => setPos(Number(e.target.value))}
        aria-valuetext={`${100 - pos}% showing after`}
      />
    </div>
  )
}
