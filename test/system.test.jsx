// @vitest-environment jsdom
import React from 'react';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { describe, it, expect, afterEach, vi } from 'vitest';
import App from '../src/App';
import { buildBackup, parseBackup, sanitize, makeDefaults, fmt, round2 } from '../src/store';

afterEach(() => { cleanup(); localStorage.clear(); vi.restoreAllMocks(); });
const KEY = 'quick_coffee_pos_v1';
const PNG = 'data:image/png;base64,iVBORw0KGgo=';
const click = (n) => fireEvent.click(screen.getByRole('button', { name: n }));

describe('money math', () => {
  it('rounds safely', () => {
    expect(round2(0.1 + 0.2)).toBe(0.3);
    expect(fmt(79.9)).toBe('₱79.90');
    expect(fmt(NaN)).toBe('₱0.00');
  });
  it('change with decimals + tax', () => {
    localStorage.setItem(KEY, JSON.stringify({ ...makeDefaults(), settings: { ...makeDefaults().settings, taxRate: 12 }, items: [{ id: 'a', name: 'X', price: 100, category: 'Food' }], categories: ['Food'] }));
    render(<App />);
    fireEvent.click(screen.getAllByText('X')[0]);
    expect(screen.getAllByText('₱112.00').length).toBeGreaterThan(0); // 100 + 12%
    fireEvent.click(screen.getByText(/^Pay/));
    ['2', '0', '0'].forEach(click);
    expect(screen.getAllByText(/₱88\.00/).length).toBe(2);
  });
  it('exact payment gives zero change and can complete', () => {
    render(<App />);
    fireEvent.click(screen.getAllByText('Espresso')[0]);
    fireEvent.click(screen.getByText(/^Pay/));
    fireEvent.click(screen.getByText('Exact'));
    expect(screen.getByText(/Complete Sale/).disabled).toBe(false);
    fireEvent.click(screen.getByText(/Complete Sale/));
    expect(screen.getByText('New Order')).toBeTruthy();
  });
});

describe('saving', () => {
  it('open order survives a restart', () => {
    const a = render(<App />);
    fireEvent.click(screen.getAllByText('Latte')[0]);
    a.unmount();
    render(<App />);
    expect(screen.getAllByText('Latte').length).toBe(2); // menu card + order line
  });
  it('sales and items persist across restart', () => {
    const a = render(<App />);
    fireEvent.click(screen.getAllByText('Espresso')[0]);
    fireEvent.click(screen.getByText(/^Pay/));
    fireEvent.click(screen.getByText('Exact'));
    fireEvent.click(screen.getByText(/Complete Sale/));
    fireEvent.click(screen.getByText('New Order'));
    a.unmount();
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: 'Sales' }));
    expect(screen.getByText(/Order #1/)).toBeTruthy();
  });
  it('warns when storage is full', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('quota'); });
    render(<App />);
    expect(screen.getByText(/Storage is full/)).toBeTruthy();
  });
});

describe('backup / restore', () => {
  it('round-trips everything including logo and photos', () => {
    const st = makeDefaults();
    st.settings.logo = PNG; st.settings.shopName = 'Bean Bar'; st.items[0].image = PNG;
    const back = parseBackup(buildBackup(st));
    expect(back.settings.logo).toBe(PNG);
    expect(back.settings.shopName).toBe('Bean Bar');
    expect(back.items[0].image).toBe(PNG);
    expect(back.items.length).toBe(st.items.length);
  });
  it('rejects bad files with a friendly message', () => {
    expect(() => parseBackup('not json')).toThrow(/valid backup/);
    expect(() => parseBackup('{"hello":1}')).toThrow(/not a Quick Coffee/);
    expect(() => parseBackup('[]')).toThrow(/not a Quick Coffee/);
  });
  it('cleans malicious / broken data', () => {
    const s = sanitize({ settings: { logo: 'javascript:alert(1)', accent: 'red', taxRate: 'x' }, items: [{ name: 'A', price: -5 }, { name: 'B', price: '3', category: 'nope' }], categories: [1, ' ', 'Tea'], sales: [{ total: 'a' }, { total: 5, date: 'bad' }, { total: 5, date: '2026-01-01', items: [{ name: 'Z', price: 5, qty: 0 }] }, null], orderCounter: -3 });
    expect(s.settings.logo).toBe('');
    expect(s.settings.accent).toBe('#b9783f');
    expect(s.settings.taxRate).toBe(0);
    expect(s.items.map((i) => i.name)).toEqual(['B']);
    expect(s.items[0].category).toBe('Tea');
    expect(s.sales.length).toBe(1);
    expect(s.sales[0].items.length).toBe(0);
    expect(s.orderCounter).toBeGreaterThan(0);
  });
  it('backup tab renders', () => {
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: 'Settings' }));
    fireEvent.click(screen.getByText('Backup'));
    expect(screen.getByText('⬇️ Export backup')).toBeTruthy();
    expect(screen.getByText('⬆️ Restore from backup')).toBeTruthy();
  });
});

describe('logo', () => {
  it('shows saved logo in header, emoji when none', () => {
    const a = render(<App />);
    expect(a.container.querySelector('img.logo')).toBeNull();
    a.unmount();
    localStorage.setItem(KEY, JSON.stringify({ ...makeDefaults(), settings: { ...makeDefaults().settings, logo: PNG } }));
    const b = render(<App />);
    expect(b.container.querySelector('img.logo').getAttribute('src')).toBe(PNG);
  });
  it('can remove logo in settings', () => {
    localStorage.setItem(KEY, JSON.stringify({ ...makeDefaults(), settings: { ...makeDefaults().settings, logo: PNG } }));
    const { container } = render(<App />);
    fireEvent.click(screen.getByRole('button', { name: 'Settings' }));
    fireEvent.click(screen.getByText('Remove'));
    expect(container.querySelector('img.logo')).toBeNull();
    expect(screen.getByText('🖼 Upload logo')).toBeTruthy();
  });
});

describe('settings inputs', () => {
  it('lets you type a decimal tax like 8.5', () => {
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: 'Settings' }));
    const tax = screen.getByDisplayValue('0');
    fireEvent.change(tax, { target: { value: '8.' } });
    expect(tax.value).toBe('8.');
    fireEvent.change(tax, { target: { value: '8.5' } });
    expect(tax.value).toBe('8.5');
    fireEvent.change(tax, { target: { value: '500' } });
    fireEvent.blur(tax);
    expect(tax.value).toBe('100');
  });
  it('adds, edits and deletes an item; validation messages', () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: 'Settings' }));
    fireEvent.click(screen.getByText('Menu'));
    fireEvent.click(screen.getByRole('button', { name: 'Add item' }));
    expect(screen.getByText('Please enter a name.')).toBeTruthy();
    fireEvent.change(screen.getByPlaceholderText('Name'), { target: { value: 'Flat White' } });
    fireEvent.click(screen.getByRole('button', { name: 'Add item' }));
    expect(screen.getByText('Please enter a valid price.')).toBeTruthy();
    fireEvent.change(screen.getByPlaceholderText('Price'), { target: { value: '1.2.3' } });
    fireEvent.click(screen.getByRole('button', { name: 'Add item' }));
    expect(screen.getByText('Please enter a valid price.')).toBeTruthy();
    fireEvent.change(screen.getByPlaceholderText('Price'), { target: { value: '99.5' } });
    fireEvent.click(screen.getByRole('button', { name: 'Add item' }));
    expect(screen.getAllByText(/Flat White/).length).toBeGreaterThan(0);
    // delete the item while it is being edited -> form resets, no ghost item
    const rows = screen.getAllByText('Edit');
    fireEvent.click(rows[rows.length - 1]);
    const dels = screen.getAllByText('Delete');
    fireEvent.click(dels[dels.length - 1]);
    expect(screen.queryByText(/Flat White/)).toBeNull();
    expect(screen.getByRole('button', { name: 'Add item' })).toBeTruthy();
  });
  it('cannot delete a category that still has items', () => {
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: 'Settings' }));
    fireEvent.click(screen.getByText('Menu'));
    const x = screen.getAllByTitle('Move or delete its items first');
    expect(x.every((b) => b.disabled)).toBe(true);
  });
});

describe('payment popup layout', () => {
  it('Complete Sale sits outside the scrolling area so it is always visible', () => {
    render(<App />);
    fireEvent.click(screen.getAllByText('Espresso')[0]);
    fireEvent.click(screen.getByText(/^Pay/));
    const btn = screen.getByText(/Complete Sale/);
    expect(btn.closest('.pay-body')).toBeNull();
    expect(screen.getAllByRole('button', { name: 'Clear' }).some((b) => b.closest('.pay-body'))).toBe(true);
    fireEvent.click(screen.getByText('Exact'));
    expect(screen.getByText(/Complete Sale · Change ₱0\.00/)).toBeTruthy();
  });
});
