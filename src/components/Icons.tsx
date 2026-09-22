import type { SVGProps } from 'react';

type P = SVGProps<SVGSVGElement>;
const base = (d: React.ReactNode) =>
  function Icon(props: P) {
    return (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false" {...props}>
        {d}
      </svg>
    );
  };

export const IconCommand = base(<><path d="M12 3l2.2 5.3L20 9l-4.4 3.8L17 18.5 12 15.6 7 18.5l1.4-5.7L4 9l5.8-.7z" /></>);
export const IconCalendar = base(<><rect x="3" y="5" width="18" height="16" rx="3" /><path d="M3 10h18M8 3v4M16 3v4" /></>);
export const IconDrafts = base(<><path d="M5 4h10l4 4v12H5z" /><path d="M15 4v4h4M8 13h8M8 17h5" /></>);
export const IconChart = base(<><path d="M4 20V10M10 20V4M16 20v-7M22 20H2" /></>);
export const IconBrand = base(<><circle cx="12" cy="12" r="8" /><path d="M12 8v4l3 2" /></>);
export const IconLink = base(<><path d="M10 14a4 4 0 005.7 0l3-3a4 4 0 00-5.7-5.7l-1 1" /><path d="M14 10a4 4 0 00-5.7 0l-3 3a4 4 0 005.7 5.7l1-1" /></>);
export const IconSearch = base(<><circle cx="11" cy="11" r="7" /><path d="M20 20l-3.5-3.5" /></>);
export const IconBell = base(<><path d="M6 16V11a6 6 0 0112 0v5l2 2H4z" /><path d="M10 20a2 2 0 004 0" /></>);
export const IconSun = base(<><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" /></>);
export const IconMoon = base(<path d="M20 15A8 8 0 019 4a8 8 0 1011 11z" />);
export const IconCopy = base(<><rect x="8" y="8" width="12" height="12" rx="2" /><path d="M16 8V6a2 2 0 00-2-2H6a2 2 0 00-2 2v8a2 2 0 002 2h2" /></>);
export const IconSpark = base(<path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5L18 18M6 18l2.5-2.5M15.5 8.5L18 6" />);
export const IconLock = base(<><rect x="5" y="11" width="14" height="10" rx="2" /><path d="M8 11V8a4 4 0 018 0v3" /></>);
export const IconChevronLeft = base(<path d="M15 18l-6-6 6-6" />);
export const IconChevronRight = base(<path d="M9 18l6-6-6-6" />);
export const IconX = base(<path d="M6 6l12 12M18 6L6 18" />);
export const IconPlus = base(<path d="M12 5v14M5 12h14" />);
export const IconHistory = base(<><path d="M3 12a9 9 0 103-6.7L3 8" /><path d="M3 3v5h5M12 7v5l3 2" /></>);
export const IconSync = base(<><path d="M20 11a8 8 0 00-14.9-3M4 13a8 8 0 0014.9 3" /><path d="M20 4v7h-7M4 20v-7h7" /></>);
export const IconInfo = base(<><circle cx="12" cy="12" r="9" /><path d="M12 11v5M12 8h.01" /></>);
export const IconCheck = base(<path d="M5 12l5 5L20 7" />);
export const IconLogout = base(<><path d="M15 4h4v16h-4M10 8l-4 4 4 4M6 12h10" /></>);
export const IconTable = base(<><rect x="3" y="4" width="18" height="16" rx="2" /><path d="M3 10h18M9 4v16" /></>);
