interface LogoProps {
  size?: number;
}

export function LogoIcon({ size = 36 }: LogoProps) {
  const id = `px-${size}`;
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 36 36"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id={`${id}-bg`} x1="0" y1="0" x2="36" y2="36" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#34C759" />
          <stop offset="100%" stopColor="#00C7BE" />
        </linearGradient>
        <linearGradient id={`${id}-shine`} x1="18" y1="0" x2="18" y2="20" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.28" />
          <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
        </linearGradient>
        <clipPath id={`${id}-clip`}>
          <rect width="36" height="36" rx="9" />
        </clipPath>
      </defs>

      <rect width="36" height="36" rx="9" fill={`url(#${id}-bg)`} />
      <rect width="36" height="36" rx="9" fill="none" stroke="rgba(0,0,0,0.1)" strokeWidth="0.8" />
      <rect width="36" height="22" rx="9" fill={`url(#${id}-shine)`} clipPath={`url(#${id}-clip)`} />

      <path d="M10.5 26L25.5 11" stroke="white" strokeWidth="2.8" strokeLinecap="round" />
      <path d="M16 11H25.5V20.5" stroke="white" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function LogoFull({ size = 36 }: LogoProps) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <div style={{ flexShrink: 0 }}>
        <LogoIcon size={size} />
      </div>
      <div>
        <div style={{ fontWeight: 800, fontSize: size * 0.44, letterSpacing: '-0.4px', lineHeight: 1, color: 'rgba(var(--rgb-fg), 0.95)' }}>
          Path
        </div>
        <div style={{ fontSize: size * 0.27, color: 'rgba(var(--rgb-fg),0.38)', marginTop: 2, fontWeight: 400, letterSpacing: '0.02em' }}>
          by pixmatic
        </div>
      </div>
    </div>
  );
}
