import React from 'react';

// Minimal 24px line icons, drawn for this film (no third-party icon artwork).
export type IconName =
  | 'search'
  | 'pin'
  | 'gear'
  | 'page'
  | 'key'
  | 'route'
  | 'spark'
  | 'clock'
  | 'phone'
  | 'globe'
  | 'link'
  | 'check'
  | 'arrow'
  | 'tools'
  | 'directions'
  | 'chat'
  | 'loop'
  | 'list';

export const Icon: React.FC<{
  name: IconName;
  size?: number;
  color?: string;
  stroke?: number;
  style?: React.CSSProperties;
}> = ({name, size = 24, color = 'currentColor', stroke = 1.8, style}) => {
  const p = {
    fill: 'none',
    stroke: color,
    strokeWidth: stroke,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
  };
  let body: React.ReactNode = null;
  switch (name) {
    case 'search':
      body = (
        <>
          <circle cx="10.5" cy="10.5" r="6.5" {...p} />
          <path d="M15.5 15.5 20 20" {...p} />
        </>
      );
      break;
    case 'pin':
      body = (
        <>
          <path d="M12 21s-6.5-6.1-6.5-11A6.5 6.5 0 0 1 18.5 10c0 4.9-6.5 11-6.5 11Z" {...p} />
          <circle cx="12" cy="10" r="2.4" {...p} />
        </>
      );
      break;
    case 'gear':
      body = (
        <>
          <circle cx="12" cy="12" r="3" {...p} />
          <path
            d="M12 3.5v2.2M12 18.3v2.2M3.5 12h2.2M18.3 12h2.2M6 6l1.6 1.6M16.4 16.4 18 18M6 18l1.6-1.6M16.4 7.6 18 6"
            {...p}
          />
        </>
      );
      break;
    case 'page':
      body = (
        <>
          <rect x="5" y="3.5" width="14" height="17" rx="2" {...p} />
          <path d="M8.5 8h7M8.5 11.5h7M8.5 15h4" {...p} />
        </>
      );
      break;
    case 'key':
      body = (
        <>
          <circle cx="8" cy="12" r="3.5" {...p} />
          <path d="M11.5 12H20M17 12v3M20 12v2.4" {...p} />
        </>
      );
      break;
    case 'route':
      body = (
        <>
          <circle cx="6" cy="18" r="2" {...p} />
          <circle cx="18" cy="6" r="2" {...p} />
          <path d="M8 18h6.5a3.5 3.5 0 0 0 0-7h-5a3.5 3.5 0 0 1 0-7H16" {...p} />
        </>
      );
      break;
    case 'spark':
      body = (
        <>
          <path d="M12 3.5c.6 4 2.4 5.9 6.5 6.5-4.1.6-5.9 2.5-6.5 6.5-.6-4-2.4-5.9-6.5-6.5 4.1-.6 5.9-2.5 6.5-6.5Z" {...p} />
          <path d="M18.5 16v4M16.5 18h4" {...p} />
        </>
      );
      break;
    case 'clock':
      body = (
        <>
          <circle cx="12" cy="12" r="8" {...p} />
          <path d="M12 7.5V12l3 2" {...p} />
        </>
      );
      break;
    case 'phone':
      body = (
        <path
          d="M6.5 4h3l1.5 4-2 1.3a10 10 0 0 0 5.7 5.7L16 13l4 1.5v3a2 2 0 0 1-2.2 2A15.5 15.5 0 0 1 4.5 6.2 2 2 0 0 1 6.5 4Z"
          {...p}
        />
      );
      break;
    case 'globe':
      body = (
        <>
          <circle cx="12" cy="12" r="8" {...p} />
          <path d="M4 12h16M12 4c2.2 2.3 3.2 5 3.2 8s-1 5.7-3.2 8c-2.2-2.3-3.2-5-3.2-8s1-5.7 3.2-8Z" {...p} />
        </>
      );
      break;
    case 'link':
      body = (
        <>
          <path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1" {...p} />
          <path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1" {...p} />
        </>
      );
      break;
    case 'check':
      body = <path d="m5 12.5 4.5 4.5L19 7.5" {...p} />;
      break;
    case 'arrow':
      body = <path d="M5 12h14M13 6l6 6-6 6" {...p} />;
      break;
    case 'tools':
      body = (
        <>
          <path d="M14.5 6.5a4 4 0 0 0 5 5L12 19a2.1 2.1 0 0 1-3-3l7.5-7.5Z" {...p} />
          <path d="M4 4l5 5" {...p} />
        </>
      );
      break;
    case 'directions':
      body = (
        <>
          <path d="M12 3 21 12l-9 9-9-9 9-9Z" {...p} />
          <path d="M9.5 13.5v-2h5M13 9.5l1.5 2-1.5 2" {...p} />
        </>
      );
      break;
    case 'chat':
      body = <path d="M5 5.5h14a1.5 1.5 0 0 1 1.5 1.5v8A1.5 1.5 0 0 1 19 16.5h-8L6.5 20v-3.5H5A1.5 1.5 0 0 1 3.5 15V7A1.5 1.5 0 0 1 5 5.5Z" {...p} />;
      break;
    case 'loop':
      body = (
        <>
          <path d="M19 12a7 7 0 1 1-2.1-5" {...p} />
          <path d="M17.5 3.5V7.5H13.5" {...p} />
        </>
      );
      break;
    case 'list':
      body = <path d="M9 7h11M9 12h11M9 17h11M4.5 7h.01M4.5 12h.01M4.5 17h.01" {...p} />;
      break;
  }
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" style={{display: 'block', ...style}}>
      {body}
    </svg>
  );
};
