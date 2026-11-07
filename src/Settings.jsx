import React, { useState } from 'react';
import { ACCENTS, buildBackup, fmt, makeDefaults, parseBackup, resizeImage, round2, uid } from './store';
import { saveBackup } from './backup';

export default function Settings({ state, setState, onClose }) {
  const [tab, setTab] = useState('general');
  const { settings: s, categories, items } = state;
  const set = (patch) => setState((st) => ({ ...st, settings: { ...st.settings, ...patch } }));
  const [note, setNote] = useState(null); // {ok, text}
  const [taxText, setTaxText] = useState(String(s.taxRate));

  // ---------- menu editor ----------
  const empty = { id: '', name: '', price: '', category: categories[0] || '', icon: '', image: '' };
  const [form, setForm] = useState(empty);
  const [err, setErr] = useState('');
  const [newCat, setNewCat] = useState('');

  const saveItem = () => {
    const name = form.name.trim();
    const price = Number(form.price);
    if (!name) return setErr('Please enter a name.');
    if (form.price === '' || !Number.isFinite(price) || price < 0) return setErr('Please enter a valid price.');
    if (!categories.includes(form.category)) return setErr('Please pick a category.');
    const id = form.id && items.some((x) => x.id === form.id) ? form.id : uid();
    const it = { id, name: name.slice(0, 40), price: round2(price), category: form.category, icon: form.icon.trim().slice(0, 4), image: form.image || '' };
    setState((st) => ({ ...st, items: st.items.some((x) => x.id === id) ? st.items.map((x) => (x.id === id ? it : x)) : [...st.items, it] }));
    setForm({ ...empty, category: form.category });
    setErr('');
  };
  const pickPhoto = async (e) => {
    const file = e.target.files && e.target.files[0];
    e.target.value = '';
    if (!file) return;
    try {
      const image = await resizeImage(file, { max: 480 });
      setForm((f) => ({ ...f, image }));
      setErr('');
    } catch (ex) {
      setErr(ex.message || 'Could not use that photo.');
    }
  };
  const delItem = (it) => {
    if (!window.confirm(`Delete "${it.name}"?`)) return;
    setState((st) => ({ ...st, items: st.items.filter((x) => x.id !== it.id) }));
    if (form.id === it.id) setForm(empty);
  };
  const addCat = () => {
    const c = newCat.trim().slice(0, 24);
    if (!c || categories.some((x) => x.toLowerCase() === c.toLowerCase())) return;
    setState((st) => ({ ...st, categories: [...st.categories, c] }));
    setNewCat('');
  };
  const delCat = (c) => setState((st) => ({ ...st, categories: st.categories.filter((x) => x !== c) }));

  // ---------- logo ----------
  const pickLogo = async (e) => {
    const file = e.target.files && e.target.files[0];
    e.target.value = '';
    if (!file) return;
    try {
      set({ logo: await resizeImage(file, { max: 256, png: true }) });
      setNote({ ok: true, text: 'Logo updated.' });
    } catch (ex) {
      setNote({ ok: false, text: ex.message || 'Could not use that logo.' });
    }
  };

  // ---------- backup / restore ----------
  const exportBackup = async () => {
    try {
      const day = new Date().toISOString().slice(0, 10);
      await saveBackup(buildBackup(state), `quick-coffee-backup-${day}.json`);
      setNote({ ok: true, text: 'Backup created. Keep the file somewhere safe.' });
    } catch (ex) {
      if (ex && /cancel/i.test(String(ex.message))) return;
      setNote({ ok: false, text: 'Could not create the backup: ' + (ex?.message || 'unknown error') });
    }
  };
  const importBackup = async (e) => {
    const file = e.target.files && e.target.files[0];
    e.target.value = '';
    if (!file) return;
    try {
      const restored = parseBackup(await file.text());
      if (!window.confirm(`Restore this backup? It will REPLACE the current menu, settings and sales on this device (${restored.items.length} items, ${restored.sales.length} sales).`)) return;
      setState(() => restored);
      setTaxText(String(restored.settings.taxRate));
      setForm({ ...empty, category: restored.categories[0] });
      setNote({ ok: true, text: 'Backup restored.' });
    } catch (ex) {
      setNote({ ok: false, text: ex.message || 'Could not restore that file.' });
    }
  };

  const reset = () => {
    if (window.confirm('Reset menu, name, logo and theme to defaults? Sales history is kept.')) {
      const d = makeDefaults();
      setState((st) => ({ ...st, settings: d.settings, categories: d.categories, items: d.items }));
      setTaxText('0');
      setForm({ ...empty, category: d.categories[0] });
    }
  };

  return (
    <div className="overlay">
      <div className="modal wide">
        <div className="modal-head">
          <h2>Settings</h2>
          <button className="x" onClick={onClose}>✕</button>
        </div>
        <div className="tabs">
          {[['general', 'Shop'], ['theme', 'Theme'], ['menu', 'Menu'], ['backup', 'Backup']].map(([k, l]) => (
            <button key={k} className={'tab' + (tab === k ? ' on' : '')} onClick={() => { setTab(k); setNote(null); }}>{l}</button>
          ))}
        </div>

        <div className="scroll pad-s">
          {note && <p className={note.ok ? 'ok' : 'err'}>{note.text}</p>}

          {tab === 'general' && (
            <>
              <div className="field">Logo
                <div className="logo-row">
                  <div className="logo-prev">{s.logo ? <img src={s.logo} alt="logo" /> : <span>No logo</span>}</div>
                  <label className="btn ghost">
                    🖼 {s.logo ? 'Change logo' : 'Upload logo'}
                    <input type="file" accept="image/*" hidden onChange={pickLogo} />
                  </label>
                  {s.logo && <button className="btn ghost" onClick={() => set({ logo: '' })}>Remove</button>}
                </div>
                <span className="hint">PNG with a transparent background looks best. Shown at the top of the screen and on receipts.</span>
              </div>
              <label className="field">Shop name
                <input value={s.shopName} maxLength={40} placeholder="Coffee Shop" onChange={(e) => set({ shopName: e.target.value })} />
              </label>
              <label className="field">Currency symbol
                <input value={s.currency} maxLength={4} placeholder="₱" onChange={(e) => set({ currency: e.target.value })} />
              </label>
              <label className="field">Tax % (leave 0 for none)
                <input
                  inputMode="decimal"
                  value={taxText}
                  onChange={(e) => {
                    const t = e.target.value.replace(/[^0-9.]/g, '');
                    setTaxText(t);
                    const n = parseFloat(t);
                    set({ taxRate: Number.isFinite(n) ? Math.min(100, Math.max(0, n)) : 0 });
                  }}
                  onBlur={() => setTaxText(String(s.taxRate))}
                />
              </label>
              <button className="btn danger" onClick={reset}>Reset menu, logo & theme to defaults</button>
            </>
          )}

          {tab === 'theme' && (
            <>
              <div className="field">Mode
                <div className="seg">
                  <button className={s.theme === 'dark' ? 'on' : ''} onClick={() => set({ theme: 'dark' })}>🌙 Dark</button>
                  <button className={s.theme === 'light' ? 'on' : ''} onClick={() => set({ theme: 'light' })}>☀️ Light</button>
                </div>
              </div>
              <div className="field">Accent color
                <div className="swatches">
                  {ACCENTS.map((a) => (
                    <button key={a.color} title={a.name} className={'sw' + (s.accent.toLowerCase() === a.color ? ' on' : '')} style={{ background: a.color }} onClick={() => set({ accent: a.color })} />
                  ))}
                  <label className="sw custom" title="Pick any color">
                    <input type="color" value={s.accent} onChange={(e) => set({ accent: e.target.value })} />
                    🎨
                  </label>
                </div>
              </div>
            </>
          )}

          {tab === 'menu' && (
            <>
              <h4>{form.id ? 'Edit item' : 'Add item'}</h4>
              <div className="form-grid">
                <input placeholder="Name" maxLength={40} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
                <input placeholder="Price" inputMode="decimal" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value.replace(/[^0-9.]/g, '') })} />
                <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
                  {categories.map((c) => <option key={c}>{c}</option>)}
                </select>
                <input placeholder="Emoji (optional)" maxLength={4} value={form.icon} onChange={(e) => setForm({ ...form, icon: e.target.value })} />
              </div>
              <div className="photo-row">
                <div className="photo-prev">{form.image ? <img src={form.image} alt="" /> : <span>{form.icon || '☕'}</span>}</div>
                <label className="btn ghost">
                  {form.image ? '📷 Change photo' : '📷 Add photo'}
                  <input type="file" accept="image/*" hidden onChange={pickPhoto} />
                </label>
                {form.image && <button className="btn ghost" onClick={() => setForm({ ...form, image: '' })}>Remove photo</button>}
              </div>
              {err && <p className="err">{err}</p>}
              <div className="modal-foot left">
                <button className="btn primary" onClick={saveItem}>{form.id ? 'Save changes' : 'Add item'}</button>
                {form.id && <button className="btn ghost" onClick={() => { setForm({ ...empty, category: form.category }); setErr(''); }}>Cancel</button>}
              </div>

              <h4>Categories</h4>
              <div className="chips">
                {categories.map((c) => {
                  const used = items.some((i) => i.category === c);
                  return (
                    <span className="chip" key={c}>
                      {c}
                      <button disabled={used || categories.length <= 1} title={used ? 'Move or delete its items first' : 'Delete'} onClick={() => delCat(c)}>✕</button>
                    </span>
                  );
                })}
              </div>
              <div className="inline">
                <input placeholder="New category" maxLength={24} value={newCat} onChange={(e) => setNewCat(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && addCat()} />
                <button className="btn ghost" onClick={addCat}>Add</button>
              </div>

              <h4>All items ({items.length})</h4>
              {items.map((it) => (
                <div className="item-row" key={it.id}>
                  <span className="item-name">
                    {it.image ? <img className="thumb" src={it.image} alt="" /> : <span className="thumb ph">{it.icon || '☕'}</span>}
                    <span>{it.name} <em>· {it.category}</em></span>
                  </span>
                  <span>{fmt(it.price, s.currency)}</span>
                  <button className="link" onClick={() => { setForm({ id: it.id, name: it.name, price: String(it.price), category: it.category, icon: it.icon, image: it.image || '' }); setErr(''); document.querySelector('.scroll.pad-s')?.scrollTo?.({ top: 0, behavior: 'smooth' }); }}>Edit</button>
                  <button className="link red" onClick={() => delItem(it)}>Delete</button>
                </div>
              ))}
            </>
          )}

          {tab === 'backup' && (
            <>
              <p className="hint">Your data lives on this device only. A backup file holds your menu, photos, logo, settings and sales so you can move to a new phone or recover after clearing the app.</p>
              <div className="backup-actions">
                <button className="btn primary" onClick={exportBackup}>⬇️ Export backup</button>
                <label className="btn ghost">
                  ⬆️ Restore from backup
                  <input type="file" accept=".json,application/json" hidden onChange={importBackup} />
                </label>
              </div>
              <p className="hint">{state.items.length} items · {state.sales.length} sales saved on this device.</p>
            </>
          )}
        </div>
        <div className="modal-foot"><button className="btn primary" onClick={onClose}>Done</button></div>
      </div>
    </div>
  );
}
