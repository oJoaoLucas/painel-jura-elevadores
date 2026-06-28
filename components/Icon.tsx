// Ícones SVG limpos (traço), substituindo emojis pra dar cara profissional.
// Herdam a cor via currentColor e o tamanho via className.

type Props = { className?: string };

const base = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  viewBox: "0 0 24 24",
};

export function IconClock({ className = "h-4 w-4" }: Props) {
  return (
    <svg {...base} className={className}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </svg>
  );
}

export function IconUser({ className = "h-4 w-4" }: Props) {
  return (
    <svg {...base} className={className}>
      <circle cx="12" cy="8" r="3.5" />
      <path d="M5 20c0-3.5 3-6 7-6s7 2.5 7 6" />
    </svg>
  );
}

export function IconWrench({ className = "h-4 w-4" }: Props) {
  return (
    <svg {...base} className={className}>
      <path d="M14.5 6.5a3.5 3.5 0 0 0-4.6 4.3l-5 5a1.5 1.5 0 0 0 2.1 2.1l5-5a3.5 3.5 0 0 0 4.3-4.6l-2 2-1.9-1.9 2-2z" />
    </svg>
  );
}

export function IconCar({ className = "h-4 w-4" }: Props) {
  return (
    <svg {...base} className={className}>
      <path d="M3 13l1.8-5a2 2 0 0 1 1.9-1.4h10.6a2 2 0 0 1 1.9 1.4L21 13" />
      <path d="M3 13h18v4a1 1 0 0 1-1 1h-1.5a1 1 0 0 1-1-1v-1h-11v1a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1z" />
      <circle cx="7" cy="16" r="0.6" />
      <circle cx="17" cy="16" r="0.6" />
    </svg>
  );
}

export function IconMegaphone({ className = "h-4 w-4" }: Props) {
  return (
    <svg {...base} className={className}>
      <path d="M4 10v4a1 1 0 0 0 1 1h2l3.5 3V6L7 9H5a1 1 0 0 0-1 1z" />
      <path d="M15 8a5 5 0 0 1 0 8" />
    </svg>
  );
}

export function IconAlert({ className = "h-4 w-4" }: Props) {
  return (
    <svg {...base} className={className}>
      <path d="M12 4l9 16H3z" />
      <path d="M12 10v4" />
      <circle cx="12" cy="17" r="0.5" />
    </svg>
  );
}

export function IconCheck({ className = "h-4 w-4" }: Props) {
  return (
    <svg {...base} className={className} strokeWidth={2.5}>
      <path d="M4 12.5l5 5 11-11" />
    </svg>
  );
}

export function IconWifiOff({ className = "h-4 w-4" }: Props) {
  return (
    <svg {...base} className={className}>
      <path d="M3 3l18 18" />
      <path d="M5 12a11 11 0 0 1 4-2.5M2 8.5a16 16 0 0 1 5-3" />
      <path d="M19 12a11 11 0 0 0-3-2M22 8.5a16 16 0 0 0-6-3.2" />
      <path d="M9 16a5 5 0 0 1 5-0.6" />
      <circle cx="12" cy="19" r="0.5" />
    </svg>
  );
}

export function IconMute({ className = "h-4 w-4" }: Props) {
  return (
    <svg {...base} className={className}>
      <path d="M4 9v6h3l4 4V5L7 9H4z" />
      <path d="M16 9l5 6M21 9l-5 6" />
    </svg>
  );
}

export function IconLock({ className = "h-4 w-4" }: Props) {
  return (
    <svg {...base} className={className}>
      <rect x="5" y="11" width="14" height="9" rx="2" />
      <path d="M8 11V8a4 4 0 0 1 8 0v3" />
      <circle cx="12" cy="15.5" r="1" />
    </svg>
  );
}

export function IconEye({ className = "h-4 w-4" }: Props) {
  return (
    <svg {...base} className={className}>
      <path d="M2 12s3.5-6.5 10-6.5S22 12 22 12s-3.5 6.5-10 6.5S2 12 2 12z" />
      <circle cx="12" cy="12" r="2.6" />
    </svg>
  );
}

export function IconEyeOff({ className = "h-4 w-4" }: Props) {
  return (
    <svg {...base} className={className}>
      <path d="M3 3l18 18" />
      <path d="M10.6 6.2A10.9 10.9 0 0 1 12 5.5c6.5 0 10 6.5 10 6.5a17 17 0 0 1-3.2 4M6.6 8.1A17 17 0 0 0 2 12s3.5 6.5 10 6.5a10.6 10.6 0 0 0 3.4-.6" />
      <path d="M9.7 9.9a2.6 2.6 0 0 0 3.6 3.7" />
    </svg>
  );
}

export function IconLogout({ className = "h-4 w-4" }: Props) {
  return (
    <svg {...base} className={className}>
      <path d="M9 4H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h3" />
      <path d="M16 17l5-5-5-5" />
      <path d="M21 12H9" />
    </svg>
  );
}

export function IconScreen({ className = "h-4 w-4" }: Props) {
  return (
    <svg {...base} className={className}>
      <rect x="3" y="4" width="18" height="12" rx="2" />
      <path d="M8 20h8M12 16v4" />
    </svg>
  );
}

export function IconDesk({ className = "h-4 w-4" }: Props) {
  return (
    <svg {...base} className={className}>
      <rect x="3" y="4" width="18" height="11" rx="2" />
      <path d="M3 11h18M7 19l1-4M17 19l-1-4M6 19h12" />
    </svg>
  );
}

export function IconReceipt({ className = "h-4 w-4" }: Props) {
  return (
    <svg {...base} className={className}>
      <path d="M6 3h12v18l-3-1.6L12 21l-3-1.6L6 21z" />
      <path d="M9 8h6M9 12h6" />
    </svg>
  );
}

export function IconChart({ className = "h-4 w-4" }: Props) {
  return (
    <svg {...base} className={className}>
      <path d="M4 4v16h16" />
      <path d="M8 14v3M12 10v7M16 6v11" />
    </svg>
  );
}
