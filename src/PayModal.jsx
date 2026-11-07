import React, { useEffect, useState } from 'react';
import { fmt, round2 } from './store';

const KEYS = ['7', '8', '9', '4', '5', '6', '1', '2', '3', '.', '0', '⌫'];

export default function PayModal({ total, currency, onClose, onComplete }) {
  const [val, setVal] = useState('');
  const paid = parseFloat(val) || 0;
  const diff = round2(paid - total);
  const ok = total > 0 && diff >= 0;

  const press = (k) =>
    setVal((v) => {
      if (k === 'C') return '';
      if (k === '⌫') return v.slice(0, -1);
      if (k === '.') return v.includes('.') ? v : (v || '0') + '.';
      if (v.includes('.') && v.split('.')[1].length >= 2) return v;
      if (v.length >= 9) return v;
      return v === '0' ? k : v + k;
    });

  // Keyboard support for desktop
  useEffect(() => {
    const h = (e) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      if (/^[0-9.]$/.test(e.key)) press(e.key);
      else if (e.key === 'Backspace') press('⌫');
      else if (e.key === 'Escape') onClose();
      else if (e.key === 'Enter' && ok) {
        e.preventDefault(); // otherwise a focused button also "clicks" and the sale could be completed twice
        if (!e.repeat) onComplete(paid);
      }
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  });

  const quick = [...new Set([total, 50, 100, 200, 500, 1000].filter((q) => q >= total).map(round2))];

  return (
    <div className="overlay">
      <div className="modal pay-modal">
        <div className="modal-head">
          <h2>Payment</h2>
          <button className="x" onClick={onClose}>✕</button>
        </div>

        <div className="scroll pay-body">
        <div className="pay-box">
          <div className="pay-row"><span>Total to pay</span><strong>{fmt(total, currency)}</strong></div>
          <div className="pay-row"><span>Cash received</span><strong className="received">{val ? fmt(paid, currency) : '—'}</strong></div>
          <div className={'pay-change ' + (!val ? 'idle' : ok ? 'good' : 'bad')}>
            {!val && 'Enter the amount the customer gave'}
            {val && ok && <>Change: <b>{fmt(diff, currency)}</b></>}
            {val && !ok && <>Not enough — short by <b>{fmt(-diff, currency)}</b></>}
          </div>
        </div>

        <div className="quick">
          {quick.map((q, i) => (
            <button key={q} className="btn ghost" onClick={() => setVal(String(q))}>
              {i === 0 ? 'Exact' : fmt(q, currency).replace(/\.00$/, '')}
            </button>
          ))}
        </div>

        <div className="pad">
          {KEYS.map((k) => (
            <button key={k} onClick={() => press(k)}>{k}</button>
          ))}
          <button className="clr" onClick={() => press('C')}>Clear</button>
        </div>
        </div>

        <button className="btn primary pay pay-done" disabled={!ok} onClick={() => onComplete(paid)}>
          {ok ? `✓ Complete Sale · Change ${fmt(diff, currency)}` : 'Complete Sale'}
        </button>
      </div>
    </div>
  );
}
