// GrowwithMH series palette. Cream ground, charcoal type, deep teal as the one accent,
// muted amber used sparingly (owner's tie, warning/joke moments).
export const C = {
  cream: '#FBFAF6',
  ivory: '#F4F1EA',
  paper: '#FFFFFF',
  hair: '#E9E5DA',
  charcoal: '#192B2A',
  charcoalSoft: '#2A3B3A',
  teal: '#17615A',
  tealDeep: '#0E4842',
  tealBright: '#2A8077',
  mint: '#B7D8C5',
  mintSoft: '#DDEDE3',
  muted: '#61716A',
  amber: '#D39B4F',
  amberSoft: '#F3E3C8',
  creamLine: 'rgba(25,43,42,0.10)',
  // derived for older shared components
  creamDeep: '#F1EEE5',
  accent: '#D39B4F',
} as const;

export const FONT_DISPLAY = '"GW Poppins", "Poppins", "Inter", system-ui, sans-serif';
export const FONT_TEXT = '"GW Text", "Inter", system-ui, sans-serif';
export const W = 1080;
export const H = 1920;
// Reels/TikTok/Shorts overlays: keep the top 250 px and bottom 340 px clear of essentials.
export const SAFE = {top: 250, bottom: 1580, left: 90, right: 990};
