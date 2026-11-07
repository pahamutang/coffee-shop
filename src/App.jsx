import React, { useEffect, useMemo, useState } from 'react';
import { useStore, fmt, round2, onColor, loadCart, saveCart } from './store';
import { isNative } from './backup';
import { useLayout } from './useLayout';
import PayModal from './PayModal';
import Settings from './Settings';
import Sales from './Sales';

const MAX_QTY = 999;

export default function App() {
  const [state, setState, saveError] = useStore();
  const { settings, categories, items, sales } = state;
  const cur = settings.currency;
  const shopName = settings.shopName.trim() || 'Coffee Shop';

  const [cat, setCat] = useState('All');
  const [cart, setCart] = useState(loadCart); // [{id,name,price,qty}]
  const [modal, setModal] = useState(null); // 'pay' | 'settings' | 'sales' | 'receipt'
  const [receipt, setReceipt] = useState(null);
  const { sheet, compact } = useLayout();
  const [sheetOpen, setSheetOpen] = useState(false);

  useEffect(() => { saveCart(cart); }, [cart]);
  useEffect(() => { if (!sheet || cart.length === 0) setSheetOpen(false); }, [sheet, cart.length]);

  // Apply theme
  useEffect(() => {
    const r = document.documentElement;
    r.setAttribute('data-theme', settings.theme);
    r.style.setProperty('--accent', settings.accent);
    r.style.setProperty('--on-accent', onColor(settings.accent));
    document.title = shopName;
  }, [settings.theme, settings.accent, shopName]);

  const activeCat = cat === 'All' || categories.includes(cat) ? cat : 'All';
  const shown = useMemo(() => (activeCat === 'All' ? items : items.filter((i) => i.category === activeCat)), [items, activeCat]);

  const subtotal = round2(cart.reduce((s, l) => s + l.price * l.qty, 0));
  const tax = round2((subtotal * settings.taxRate) / 100);
  const total = round2(subtotal + tax);
  const count = cart.reduce((s, l) => s + l.qty, 0);

  const add = (it) =>
    setCart((c) => {
      const f = c.find((l) => l.id === it.id);
      return f ? c.map((l) => (l.id === it.id ? { ...l, qty: Math.min(MAX_QTY, l.qty + 1) } : l)) : [...c, { id: it.id, name: it.name, price: it.price, qty: 1 }];
    });
  const change = (id, d) => setCart((c) => c.map((l) => (l.id === id ? { ...l, qty: Math.min(MAX_QTY, l.qty + d) } : l)).filter((l) => l.qty > 0));
  const remove = (id) => setCart((c) => c.filter((l) => l.id !== id));

  const complete = (paid) => {
    if (cart.length === 0 || paid < total) return;
    const sale = {
      id: state.orderCounter,
      date: new Date().toISOString(),
      items: cart,
      subtotal,
      tax,
      total,
      paid,
      change: round2(paid - total),
    };
    setState((s) => ({ ...s, sales: [sale, ...s.sales].slice(0, 1000), orderCounter: s.orderCounter + 1 }));
    setReceipt(sale);
    setCart([]);
    setSheetOpen(false);
    setModal('receipt');
  };

  return (
    <div className={'app ' + (sheet ? 'sheet-mode' : 'split') + (compact ? ' compact' : '') + (sheet && cart.length > 0 ? ' cartbar-on' : '')}>
      <header className="top">
        <h1>
          {settings.logo ? <img className="logo" src={settings.logo} alt="" /> : <span>☕</span>}
          <span className="shop">{shopName}</span>
        </h1>
        <div className="top-actions">
          <button className="btn ghost" aria-label="Sales" onClick={() => setModal('sales')}>📊<span className="lbl"> Sales</span></button>
          <button className="btn ghost" aria-label="Settings" onClick={() => setModal('settings')}>⚙️<span className="lbl"> Settings</span></button>
        </div>
      </header>

      {saveError && (
        <div className="warn">⚠️ Storage is full — your latest changes are NOT being saved. Go to ⚙️ Settings → Backup to export, then remove some photos or old sales.</div>
      )}

      <main className="body">
        <section className="menu">
          <nav className="tabs">
            {['All', ...categories].map((c) => (
              <button key={c} className={'tab' + (c === activeCat ? ' on' : '')} onClick={() => setCat(c)}>{c}</button>
            ))}
          </nav>
          {shown.length === 0 ? (
            <p className="empty">No items here yet. Add some in ⚙️ Settings → Menu.</p>
          ) : (
            <div className="grid">
              {shown.map((it) => (
                <button key={it.id} className={'card' + (it.image ? ' has-img' : '')} onClick={() => add(it)}>
                  {it.image ? <img className="card-img" src={it.image} alt="" draggable="false" /> : <span className="card-icon">{it.icon || '☕'}</span>}
                  <span className="card-name">{it.name}</span>
                  <span className="card-price">{fmt(it.price, cur)}</span>
                </button>
              ))}
            </div>
          )}
        </section>

        <aside className={'order' + (sheet && sheetOpen ? ' open' : '')}>
          <div className="order-head">
            <h2>Current Order</h2>
            <div className="order-head-actions">
              {cart.length > 0 && <button className="link" onClick={() => setCart([])}>Clear</button>}
              <button className="link sheet-close" onClick={() => setSheetOpen(false)}>Close ⌄</button>
            </div>
          </div>
          <div className="lines">
            {cart.length === 0 && <p className="empty">Tap an item to add it.</p>}
            {cart.map((l) => (
              <div className="line" key={l.id}>
                <div className="line-info">
                  <div className="line-name">{l.name}</div>
                  <div className="line-sub">{fmt(l.price, cur)} each</div>
                </div>
                <div className="qty">
                  <button onClick={() => change(l.id, -1)}>−</button>
                  <span>{l.qty}</span>
                  <button onClick={() => change(l.id, 1)}>+</button>
                </div>
                <div className="line-total">{fmt(l.price * l.qty, cur)}</div>
                <button className="x" title="Remove" onClick={() => remove(l.id)}>✕</button>
              </div>
            ))}
          </div>
          <div className="sum">
            {settings.taxRate > 0 && (
              <>
                <div className="row"><span>Subtotal</span><span>{fmt(subtotal, cur)}</span></div>
                <div className="row"><span>Tax ({settings.taxRate}%)</span><span>{fmt(tax, cur)}</span></div>
              </>
            )}
            <div className="row big"><span>Total</span><span>{fmt(total, cur)}</span></div>
            <button className="btn primary pay" disabled={cart.length === 0} onClick={() => setModal('pay')}>
              Pay {count > 0 && `(${count} item${count > 1 ? 's' : ''})`}
            </button>
          </div>
        </aside>
      </main>

      {sheet && sheetOpen && <div className="backdrop" onClick={() => setSheetOpen(false)} />}
      {sheet && cart.length > 0 && !sheetOpen && (
        <div className="cartbar">
          <button className="cartbar-info" onClick={() => setSheetOpen(true)}>
            <span className="badge">{count}</span>
            <span className="cartbar-label">View order</span>
            <strong>{fmt(total, cur)}</strong>
          </button>
          <button className="btn primary" onClick={() => setModal('pay')}>Pay</button>
        </div>
      )}

      {modal === 'pay' && <PayModal total={total} currency={cur} onClose={() => setModal(null)} onComplete={complete} />}
      {modal === 'settings' && <Settings state={state} setState={setState} onClose={() => setModal(null)} />}
      {modal === 'sales' && <Sales sales={sales} currency={cur} setState={setState} onClose={() => setModal(null)} />}
      {modal === 'receipt' && receipt && (
        <div className="overlay">
          <div className="modal small">
            <div className="change-banner">
              <div>Change</div>
              <strong>{fmt(receipt.change, cur)}</strong>
            </div>
            <div className="receipt">
              {settings.logo && <img className="receipt-logo" src={settings.logo} alt="" />}
              <h3>{shopName}</h3>
              <p className="muted">Order #{receipt.id} · {new Date(receipt.date).toLocaleString()}</p>
              <hr />
              {receipt.items.map((l) => (
                <div className="row" key={l.id}><span>{l.qty} × {l.name}</span><span>{fmt(l.price * l.qty, cur)}</span></div>
              ))}
              <hr />
              {receipt.tax > 0 && <div className="row"><span>Tax</span><span>{fmt(receipt.tax, cur)}</span></div>}
              <div className="row b"><span>Total</span><span>{fmt(receipt.total, cur)}</span></div>
              <div className="row"><span>Paid</span><span>{fmt(receipt.paid, cur)}</span></div>
              <div className="row"><span>Change</span><span>{fmt(receipt.change, cur)}</span></div>
              <p className="muted center">Thank you!</p>
            </div>
            <div className="modal-foot">
              {!isNative() && <button className="btn ghost" onClick={() => window.print()}>🖨 Print</button>}
              <button className="btn primary" onClick={() => { setModal(null); setReceipt(null); }}>New Order</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
