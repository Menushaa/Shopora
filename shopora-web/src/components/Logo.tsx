import { Link } from 'react-router-dom';

/** The Shopora bag-with-a-smile mark. Pure SVG so it stays sharp at any size. */
export function LogoMark({ size = 44 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id="shopora-mark" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#8B5CF6" />
          <stop offset="1" stopColor="#5B21B6" />
        </linearGradient>
      </defs>
      <rect x="2" y="2" width="60" height="60" rx="17" fill="url(#shopora-mark)" />
      <path d="M18 26h28l-2.2 21a4.3 4.3 0 0 1-4.3 3.8H24.5a4.3 4.3 0 0 1-4.3-3.8z" fill="#fff" />
      <path d="M25 26v-3.5a7 7 0 0 1 14 0V26" fill="none" stroke="#fff" strokeWidth="3.2" strokeLinecap="round" />
      <path d="M26.5 37q5.5 6.5 11 0" fill="none" stroke="#6D28D9" strokeWidth="2.8" strokeLinecap="round" />
    </svg>
  );
}

export default function Logo({ light = false }: { light?: boolean }) {
  return (
    <Link to="/" className={`logo${light ? ' logo--light' : ''}`} aria-label="Shopora home">
      <LogoMark />
      <span className="logo__text">
        <span className="logo__name">Shopora</span>
        <span className="logo__tag">Your World of Shopping</span>
      </span>
    </Link>
  );
}
