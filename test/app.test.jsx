// @vitest-environment jsdom
import React from 'react';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { describe, it, expect, afterEach } from 'vitest';
import App from '../src/App';

afterEach(() => { cleanup(); localStorage.clear(); });

describe('POS', () => {
  it('adds items, computes change, completes sale', () => {
    render(<App />);
    fireEvent.click(screen.getAllByText('Latte')[0]);
    fireEvent.click(screen.getAllByText('Latte')[0]);
    fireEvent.click(screen.getByText('Croissant'));
    expect(screen.getAllByText('₱325.00').length).toBeGreaterThan(0); // 240+85
    fireEvent.click(screen.getByText(/^Pay/));
    const k=(n)=>fireEvent.click(screen.getByRole('button',{name:n})); k('5');k('0');k('0');
    expect(screen.getAllByText(/₱175\.00/).length).toBe(2); // change
    fireEvent.click(screen.getByText(/Complete Sale/));
    expect(screen.getByText('New Order')).toBeTruthy();
  });
  it('blocks short payment', () => {
    render(<App />);
    fireEvent.click(screen.getByText('Espresso'));
    fireEvent.click(screen.getByText(/^Pay/));
    const k=(n)=>fireEvent.click(screen.getByRole('button',{name:n})); k('5');k('0');
    expect(screen.getByText(/Complete Sale/).disabled).toBe(true);
  });
  it('survives corrupt storage and rename works', () => {
    localStorage.setItem('quick_coffee_pos_v1', '{"items":[{"name":5}],"settings":{"accent":"zzz"}}');
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: 'Settings' }));
    const input = screen.getByPlaceholderText('Coffee Shop');
    fireEvent.change(input, { target: { value: 'Bean There' } });
    expect(screen.getByText('Bean There')).toBeTruthy();
    fireEvent.change(input, { target: { value: '' } });
    expect(screen.getByText('Coffee Shop')).toBeTruthy();
  });
  it('shows saved photos and drops invalid image data', () => {
    const img = 'data:image/jpeg;base64,/9j/4AAQ';
    localStorage.setItem('quick_coffee_pos_v1', JSON.stringify({
      categories: ['Hot'],
      items: [
        { id: 'a', name: 'Pic Coffee', price: 50, category: 'Hot', image: img },
        { id: 'b', name: 'Bad Pic', price: 60, category: 'Hot', image: 'javascript:alert(1)' },
      ],
    }));
    const { container } = render(<App />);
    const imgs = container.querySelectorAll('img.card-img');
    expect(imgs.length).toBe(1);
    expect(imgs[0].getAttribute('src')).toBe(img);
  });
  it('settings shows photo controls and can open edit', () => {
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: 'Settings' }));
    fireEvent.click(screen.getByText('Menu'));
    expect(screen.getByText('📷 Add photo')).toBeTruthy();
    fireEvent.click(screen.getAllByText('Edit')[0]);
    expect(screen.getByText('Save changes')).toBeTruthy();
  });
});
