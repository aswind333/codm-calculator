export function NavIcon({ kind }: { kind: 'calculator' | 'rules' | 'wheel' }) {
  return <svg className="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {kind === 'wheel' ? <><circle cx="12" cy="13" r="9" /><circle cx="12" cy="13" r="2" /><path d="m10 2 2 4 2-4ZM12 6v5m0 4v7m-9-9h7m4 0h7M6 7l4.5 4.5m3 3L18 19M6 19l4.5-4.5m3-3L18 7" /></> : kind === 'calculator' ? <><rect x="5" y="2" width="14" height="20" rx="2" /><path d="M8 6h8v4H8zM8 14h1m6 0h1M8 18h1m6 0h1" /></> : <><path d="M12 5C8 2 4 3 2 4v16c4-2 7-1 10 1 3-2 6-3 10-1V4c-2-1-6-2-10 1v16" /><path d="M15 8c0-3 5-3 5 0 0 2-2.5 2-2.5 4m0 3h.01" /></>}
  </svg>
}
