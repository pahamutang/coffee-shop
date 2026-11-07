import { useEffect, useState } from 'react';

// 'sheet' = narrow portrait-style screens (order opens as a bottom sheet)
// 'split' = menu + order side by side (tablets, laptops, phones held sideways)
// Is the device itself held sideways? Uses the screen orientation, NOT the window shape: when the on-screen keyboard
// opens on a portrait phone the window becomes short, but the phone is still portrait (so the layout must not flip).
const isLandscape = (w, h) => {
  try {
    const t = window.screen && window.screen.orientation && window.screen.orientation.type;
    if (t) return t.startsWith('landscape');
  } catch { /* fall through */ }
  return w > h;
};

const calc = () => {
  const w = window.innerWidth || 1024;
  const h = window.innerHeight || 768;
  return { sheet: w < 700 && !(w >= 540 && h <= 460), compact: h <= 520 && isLandscape(w, h) };
};

export function useLayout() {
  const [l, setL] = useState(calc);
  useEffect(() => {
    const f = () => setL((p) => {
      const n = calc();
      return n.sheet === p.sheet && n.compact === p.compact ? p : n;
    });
    window.addEventListener('resize', f);
    window.addEventListener('orientationchange', f);
    return () => {
      window.removeEventListener('resize', f);
      window.removeEventListener('orientationchange', f);
    };
  }, []);
  return l;
}
