import { useEffect, useState } from 'react';

const KEY = 'quick_coffee_pos_v1';
const CART_KEY = 'quick_coffee_cart_v1';
const MAX_IMG = 600000; // chars of data URL kept per picture

export const uid = () => 'i' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
export const round2 = (n) => Math.round((Number(n) + Number.EPSILON) * 100) / 100;
export const fmt = (n, cur = '₱') => `${cur}${round2(Number.isFinite(Number(n)) ? n : 0).toFixed(2)}`;
const num = (v, d = 0) => (Number.isFinite(Number(v)) ? Number(v) : d);
const okImage = (v) => typeof v === 'string' && /^data:image\/(png|jpe?g|webp|gif);base64,/i.test(v) && v.length < MAX_IMG;

export const ACCENTS = [
  { name: 'Mocha', color: '#b9783f' },
  { name: 'Espresso', color: '#8b5a2b' },
  { name: 'Matcha', color: '#2fa36b' },
  { name: 'Ocean', color: '#3b82f6' },
  { name: 'Berry', color: '#e11d48' },
  { name: 'Grape', color: '#8b5cf6' },
  { name: 'Orange', color: '#f97316' },
  { name: 'Teal', color: '#14b8a6' },
];

const item = (name, price, category, icon = '') => ({ id: uid(), name, price, category, icon, image: '' });

export const makeDefaults = () => ({
  settings: { shopName: 'Quick Coffee', currency: '₱', taxRate: 0, theme: 'dark', accent: '#b9783f', logo: '' },
  categories: ['Hot Coffee', 'Iced Coffee', 'Food'],
  items: [
    item('Espresso', 80, 'Hot Coffee', '☕'),
    item('Americano', 90, 'Hot Coffee', '☕'),
    item('Cappuccino', 120, 'Hot Coffee', '☕'),
    item('Latte', 120, 'Hot Coffee', '☕'),
    item('Mocha', 130, 'Hot Coffee', '🍫'),
    item('Iced Americano', 100, 'Iced Coffee', '🧊'),
    item('Iced Latte', 130, 'Iced Coffee', '🧊'),
    item('Caramel Macchiato', 150, 'Iced Coffee', '🍮'),
    item('Croissant', 85, 'Food', '🥐'),
    item('Blueberry Muffin', 75, 'Food', '🧁'),
    item('Ham & Cheese Sandwich', 110, 'Food', '🥪'),
    item('Chocolate Cake', 120, 'Food', '🍰'),
  ],
  sales: [],
  orderCounter: 1,
});

const cleanLines = (arr) =>
  (Array.isArray(arr) ? arr : [])
    .filter((l) => l && typeof l.name === 'string' && Number.isFinite(Number(l.price)) && Number(l.price) >= 0 && Number.isFinite(Number(l.qty)) && Number(l.qty) >= 1)
    .map((l) => ({ id: String(l.id ?? uid()), name: l.name, price: round2(l.price), qty: Math.min(999, Math.floor(Number(l.qty))) }));

// Never trust saved/imported data: fix anything missing or broken so the app can't crash.
export const sanitize = (raw) => {
  const d = makeDefaults();
  if (!raw || typeof raw !== 'object') return d;
  const s = raw.settings && typeof raw.settings === 'object' ? raw.settings : {};
  const settings = {
    shopName: typeof s.shopName === 'string' ? s.shopName.slice(0, 40) : d.settings.shopName,
    currency: typeof s.currency === 'string' ? s.currency.slice(0, 4) : d.settings.currency,
    taxRate: Number.isFinite(Number(s.taxRate)) ? Math.min(100, Math.max(0, Number(s.taxRate))) : 0,
    theme: s.theme === 'light' ? 'light' : 'dark',
    accent: /^#[0-9a-fA-F]{6}$/.test(s.accent || '') ? s.accent : d.settings.accent,
    logo: okImage(s.logo) ? s.logo : '',
  };
  const catList = Array.isArray(raw.categories)
    ? [...new Set(raw.categories.filter((c) => typeof c === 'string' && c.trim()).map((c) => c.trim()))]
    : [];
  const cats = catList.length ? catList : d.categories;
  const items = Array.isArray(raw.items)
    ? raw.items
        .filter((i) => i && typeof i.name === 'string' && i.name.trim() && Number.isFinite(Number(i.price)) && Number(i.price) >= 0)
        .map((i) => ({
          id: typeof i.id === 'string' && i.id ? i.id : uid(),
          name: i.name.trim().slice(0, 40),
          price: round2(i.price),
          category: cats.includes(i.category) ? i.category : cats[0],
          icon: typeof i.icon === 'string' ? i.icon.slice(0, 4) : '',
          image: okImage(i.image) ? i.image : '',
        }))
    : d.items;
  const sales = (Array.isArray(raw.sales) ? raw.sales : [])
    .map((x) => {
      if (!x || typeof x !== 'object') return null;
      const total = Number(x.total);
      const t = new Date(x.date);
      if (!Number.isFinite(total) || Number.isNaN(t.getTime())) return null;
      return {
        id: Math.max(0, Math.floor(num(x.id))),
        date: t.toISOString(),
        items: cleanLines(x.items),
        subtotal: num(x.subtotal, total),
        tax: num(x.tax, 0),
        total,
        paid: num(x.paid, total),
        change: num(x.change, 0),
      };
    })
    .filter(Boolean)
    .slice(0, 1000);
  const maxId = sales.reduce((m, x) => Math.max(m, x.id), 0);
  const orderCounter = Math.max(Number.isInteger(raw.orderCounter) && raw.orderCounter > 0 ? raw.orderCounter : 1, maxId + 1);
  return { settings, categories: cats, items, sales, orderCounter };
};

const load = () => {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? sanitize(JSON.parse(raw)) : makeDefaults();
  } catch {
    return makeDefaults();
  }
};

export function useStore() {
  const [state, setState] = useState(load);
  const [saveError, setSaveError] = useState(false);
  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(state));
      setSaveError(false);
    } catch {
      setSaveError(true); // storage full or blocked — shown to the user as a warning
    }
  }, [state]);
  return [state, setState, saveError];
}

// ---- Open order (cart) survives closing the app ----
export const loadCart = () => {
  try {
    return cleanLines(JSON.parse(localStorage.getItem(CART_KEY) || '[]'));
  } catch {
    return [];
  }
};
export const saveCart = (cart) => {
  try {
    localStorage.setItem(CART_KEY, JSON.stringify(cart));
  } catch {
    /* ignore */
  }
};

// ---- Backup / restore ----
export const buildBackup = (state) =>
  JSON.stringify({ app: 'quick-coffee-pos', version: 1, exportedAt: new Date().toISOString(), data: state });

export const parseBackup = (text) => {
  if (typeof text !== 'string' || text.length > 40 * 1024 * 1024) throw new Error('That file is too large to be a backup.');
  let obj;
  try {
    obj = JSON.parse(text);
  } catch {
    throw new Error('That file is not a valid backup (could not read it).');
  }
  const data = obj && obj.app === 'quick-coffee-pos' && obj.data ? obj.data : obj;
  if (!data || typeof data !== 'object' || !Array.isArray(data.items) || typeof data.settings !== 'object' || !data.settings) {
    throw new Error('This is not a Quick Coffee POS backup file.');
  }
  return sanitize(data);
};

// Pick black/white text so it stays readable on any accent color.
export const onColor = (hex) => {
  const n = parseInt(hex.slice(1), 16);
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  return (r * 299 + g * 587 + b * 114) / 1000 > 150 ? '#1a1208' : '#ffffff';
};

// Shrink a chosen picture so many fit in storage. png:true keeps transparency (for logos).
export const resizeImage = (file, { max = 480, png = false } = {}) =>
  new Promise((resolve, reject) => {
    if (!file || !/^image\//.test(file.type)) return reject(new Error('Please choose an image file (PNG, JPG, WEBP).'));
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Could not read that file.'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('That image could not be opened.'));
      img.onload = () => {
        const w = img.naturalWidth || img.width || 300;
        const h = img.naturalHeight || img.height || 300;
        const encode = (m) => {
          const scale = Math.min(1, m / Math.max(w, h));
          const c = document.createElement('canvas');
          c.width = Math.max(1, Math.round(w * scale));
          c.height = Math.max(1, Math.round(h * scale));
          const ctx = c.getContext('2d');
          if (!png) {
            ctx.fillStyle = '#fff';
            ctx.fillRect(0, 0, c.width, c.height);
          }
          ctx.drawImage(img, 0, 0, c.width, c.height);
          return png ? c.toDataURL('image/png') : c.toDataURL('image/jpeg', 0.78);
        };
        let out = encode(max);
        if (out.length > 400000) out = encode(Math.round(max * 0.6)); // very detailed picture: shrink more
        if (out.length >= MAX_IMG) return reject(new Error('That picture is too detailed. Try a smaller one.'));
        resolve(out);
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
