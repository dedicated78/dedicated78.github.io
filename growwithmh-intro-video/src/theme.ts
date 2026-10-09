// GrowwithMH design tokens. Brand colours come from the brief; derived tones only
// shift lightness so the palette stays warm and restrained.
export const C = {
  cream: '#FBFAF6',
  charcoal: '#192B2A',
  teal: '#17615A',
  mint: '#B7D8C5',
  muted: '#61716A',
  accent: '#DE8957',

  // Derived
  paper: '#FFFFFF',
  creamDeep: '#F1EEE5',
  creamLine: 'rgba(25,43,42,0.10)',
  creamLineSoft: 'rgba(25,43,42,0.06)',
  charcoalDeep: '#0F1D1C',
  charcoalPanel: '#203936',
  charcoalRaised: '#27443F',
  charcoalLine: 'rgba(183,216,197,0.16)',
  charcoalLineSoft: 'rgba(183,216,197,0.08)',
  mintText: '#CFE5D8',
  tealBright: '#2A8077',
} as const;

export const FONT_DISPLAY = '"GW Display", "Inter Display", "Inter", system-ui, sans-serif';
export const FONT_TEXT = '"GW Text", "Inter", system-ui, sans-serif';

export const W = 1080;
export const H = 1920;

// Platform-safe area (Reels / Stories overlays). Essential content stays inside it.
export const SAFE = {left: 90, right: 990, top: 250, bottom: 1500};

export const shadow = {
  // Soft directional shadows (light from top-left).
  creamPanel:
    '0 2px 0 rgba(255,255,255,0.9) inset, 24px 48px 90px -30px rgba(25,43,42,0.28), 8px 16px 32px -12px rgba(25,43,42,0.14)',
  creamCard: '10px 20px 44px -18px rgba(25,43,42,0.26), 0 1px 0 rgba(255,255,255,0.9) inset',
  darkPanel:
    '0 1px 0 rgba(255,255,255,0.10) inset, 30px 60px 120px -30px rgba(0,0,0,0.65), 0 0 80px -20px rgba(23,97,90,0.55)',
  creamOnDark:
    '30px 60px 120px -30px rgba(0,0,0,0.6), 0 0 90px -10px rgba(23,97,90,0.55), 0 1px 0 rgba(255,255,255,0.9) inset',
};
