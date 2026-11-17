export function PrizeMark({ rank }: { rank: number }) {
  const paths = [
    <path key="crown" d="m3 6 4 4 5-6 5 6 4-4-2 13H5L3 6Zm3 10h12" />,
    <g key="medal"><path d="m7 3 5 6 5-6M5 3h4m6 0h4" /><circle cx="12" cy="15" r="6" /><path d="m12 12 1 2 2 .3-1.5 1.5.3 2.2-1.8-1-1.8 1 .3-2.2L9 14.3l2-.3Z" /></g>,
    <path key="star" d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1 6.2-5.5-2.9-5.5 2.9 1-6.2L3 9.6l6.2-.9Z" />,
  ]
  return <span className={`prize-mark rank-${rank}`} aria-hidden="true">{rank <= 3
    ? <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round">{paths[rank - 1]}</svg>
    : String(rank).padStart(2, '0')}</span>
}
