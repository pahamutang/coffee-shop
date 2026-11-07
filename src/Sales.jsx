import React from 'react';
import { fmt, round2 } from './store';

export default function Sales({ sales, currency, setState, onClose }) {
  const today = new Date().toDateString();
  const list = sales.filter((s) => new Date(s.date).toDateString() === today);
  const sum = round2(list.reduce((a, s) => a + s.total, 0));

  const clear = () => {
    if (window.confirm('Delete ALL sales history? This cannot be undone.')) {
      setState((s) => ({ ...s, sales: [], orderCounter: 1 }));
    }
  };

  return (
    <div className="overlay">
      <div className="modal">
        <div className="modal-head">
          <h2>Today's Sales</h2>
          <button className="x" onClick={onClose}>✕</button>
        </div>
        <div className="stats">
          <div><span>Total sales</span><strong>{fmt(sum, currency)}</strong></div>
          <div><span>Orders</span><strong>{list.length}</strong></div>
        </div>
        <div className="scroll">
          {list.length === 0 && <p className="empty">No sales yet today.</p>}
          {list.map((s) => (
            <div className="hist" key={s.id + s.date}>
              <div className="row b"><span>Order #{s.id} · {new Date(s.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span><span>{fmt(s.total, currency)}</span></div>
              <div className="muted">{s.items.map((l) => `${l.qty}× ${l.name}`).join(', ')}</div>
            </div>
          ))}
        </div>
        <div className="modal-foot">
          <button className="btn danger" onClick={clear}>Clear history</button>
          <button className="btn primary" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}
