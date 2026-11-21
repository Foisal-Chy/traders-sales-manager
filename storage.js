'use strict';
/* storage.js - utilities (U) and persistent data store (Store) */
const KEY = 'mgi_fresh_v1', APP_V = '13';
const U = {
  charts: {},
  r2: n => Math.round((Number(n) + Number.EPSILON) * 100) / 100,
  num(v) { const n = parseFloat(String(v).replace(/,/g, '')); return Number.isFinite(n) ? n : NaN; },
  money: n => '৳' + U.r2(n).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
  esc: s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])),
  uid: () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7),
  ymd(d) { return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); },
  today() { return U.ymd(new Date()); },
  fdate(s) { return s ? new Date(s + 'T00:00:00').toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : ''; },
  $: (s, r = document) => r.querySelector(s),
  icons() { window.lucide && lucide.createIcons(); },
  toast(msg, type = 'ok') {
    const t = document.createElement('div'); t.className = 'toast ' + type; t.textContent = msg;
    U.$('#toasts').appendChild(t); setTimeout(() => t.remove(), 3200);
  },
  /* Toast with an Undo button (9 seconds) for deletes */
  toastUndo(msg, fn) {
    const t = document.createElement('div'); t.className = 'toast'; t.innerHTML = U.esc(msg) + ' <button class="ub">Undo</button>';
    U.$('#toasts').appendChild(t); const id = setTimeout(() => t.remove(), 9000);
    t.querySelector('.ub').onclick = () => { clearTimeout(id); t.remove(); fn(); Store.save(); App.route(); U.toast('Restored'); };
  },
  /* Generic dialog. Resolves with the clicked button's value (false = cancelled). validate(v) may return false to keep it open. */
  modal(title, body, buttons = [{ label: 'OK', v: true, cls: 'primary' }], validate) {
    return new Promise(res => {
      const d = U.$('#dlg');
      d.innerHTML = `<form class="dlgbox"><h3>${U.esc(title)}</h3><div>${body}</div><div class="dlgact">${buttons.map((b, i) => `<button type="button" class="btn ${b.cls || ''}" data-i="${i}">${U.esc(b.label)}</button>`).join('')}</div></form>`;
      const done = v => { d.close(); res(v); };
      d.querySelectorAll('[data-i]').forEach(b => b.onclick = () => {
        const bt = buttons[b.dataset.i];
        if (bt.v !== false && validate && validate(bt.v) === false) return;
        done(bt.v);
      });
      d.querySelector('form').onsubmit = e => { e.preventDefault(); const p = d.querySelector('.primary'); p && p.click(); };
      d.oncancel = e => { e.preventDefault(); done(false); };
      d.showModal(); U.icons();
      const f = d.querySelector('input,select,textarea'); if (f && !matchMedia('(pointer: coarse)').matches) f.focus();
    });
  },
  ask: (title, msg, buttons) => U.modal(title, '<p>' + msg + '</p>', buttons),
  confirm: (title, msg, label = 'Delete') => U.ask(title, msg, [{ label: 'Cancel', v: false }, { label, v: true, cls: 'danger' }]),
  download(name, text, mime = 'text/plain') {
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([text], { type: mime }));
    a.download = name; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  },
  toCSV: rows => '\ufeff' + rows.map(r => r.map(x => { x = String(x ?? ''); if (/^[=+@-]/.test(x) && isNaN(x)) x = "'" + x; return /[",\n\r]/.test(x) ? '"' + x.replace(/"/g, '""') + '"' : x; }).join(',')).join('\r\n'),
  parseCSV(t) {
    const rows = []; let r = [], c = '', q = false;
    t = t.replace(/^\ufeff/, '');
    for (let i = 0; i < t.length; i++) {
      const ch = t[i];
      if (q) { if (ch === '"') { if (t[i + 1] === '"') { c += '"'; i++; } else q = false; } else c += ch; }
      else if (ch === '"') q = true;
      else if (ch === ',') { r.push(c); c = ''; }
      else if (ch === '\n' || ch === '\r') { if (ch === '\r' && t[i + 1] === '\n') i++; r.push(c); c = ''; rows.push(r); r = []; }
      else c += ch;
    }
    if (c !== '' || r.length) { r.push(c); rows.push(r); }
    return rows.filter(x => x.some(y => y.trim() !== ''));
  },
  chart(id, type, labels, data, label) {
    const c = U.$('#' + id); if (!c || !window.Chart) return;
    U.charts[id] && U.charts[id].destroy();
    const cs = getComputedStyle(document.documentElement), ac = cs.getPropertyValue('--accent').trim(), mu = cs.getPropertyValue('--muted').trim(), ln = cs.getPropertyValue('--line').trim();
    U.charts[id] = new Chart(c, {
      type, data: { labels, datasets: [{ label, data, borderColor: ac, backgroundColor: type === 'line' ? ac + '22' : ac, fill: type === 'line', tension: .3, borderRadius: 6 }] },
      options: { maintainAspectRatio: false, plugins: { legend: { display: false }, tooltip: { callbacks: { label: x => U.money(x.parsed.y ?? x.parsed.x) } } },
        scales: { x: { ticks: { color: mu }, grid: { display: false } }, y: { ticks: { color: mu }, grid: { color: ln }, beginAtZero: true } } }
    });
  }
};

const Store = {
  db: null,
  defaults: () => ({ v: 1, settings: { dealer: 'Foisal Chowdhury Traders', phone: '', email: '', address: '', theme: 'light', prep: '', auth: '', showZero: true, seeded: false, lastBackup: '', pin: '', bnDigits: true, sheetAsked: false, titleBn: 'মেসার্স ফয়সাল চৌধুরী ট্রেডার্স', distBn: 'পরিবেশক : মেঘনা গ্রুপ অব ইন্ডাস্ট্রিজ (ফ্রেশ)', addrBn: 'ইছাখালী, রাঙ্গুনিয়া, চট্টগ্রাম। প্রোডাক্ট লাইন-এ', phoneBn: '০১৮৭৯-৯০৮৪১৪, ০১৫৭৫-৬৮৭৪৫৯ (ফোরকান)', phone2Bn: '০১৯২৬-০২১৪৪০ (সাকিব)' }, products: [], sales: [], payments: [], stock: [], priceLog: [], staff: [], salaryPay: [] }),
  /* Strict validation used for localStorage and imports */
  valid(d) {
    return !!d && typeof d === 'object' && ['payments', 'stock', 'priceLog', 'staff', 'salaryPay'].every(k => d[k] === undefined || Array.isArray(d[k])) && Array.isArray(d.products) && Array.isArray(d.sales) && !!d.settings && typeof d.settings === 'object' &&
      d.products.every(p => p && p.id && p.name && Number.isFinite(p.price) && p.price >= 0) &&
      d.sales.every(s => s && s.id && /^\d{4}-\d{2}-\d{2}$/.test(s.date) && Array.isArray(s.rows) && s.rows.every(r => r && Number.isFinite(r.price) && Number.isFinite(r.qty) && r.price >= 0 && r.qty >= 0));
  },
  merge(d) { const x = Store.defaults(); Object.assign(x, d, { settings: Object.assign(x.settings, d.settings) }); if (x.settings.dealer === 'MGI Fresh Dealership') x.settings.dealer = Store.defaults().settings.dealer; return x; },
  /* Keeps every usable record from damaged data instead of throwing everything away */
  repair(d) {
    if (!d || typeof d !== 'object') return null;
    const ok = v => Number.isFinite(+v) && +v >= 0 && v !== null && v !== '', x = { ...d }; let skipped = 0;
    ['products', 'sales', 'payments', 'stock', 'priceLog', 'staff', 'salaryPay'].forEach(k => { x[k] = Array.isArray(d[k]) ? d[k] : []; });
    x.settings = d.settings && typeof d.settings === 'object' ? d.settings : {};
    x.products = x.products.filter(p => { const g = p && p.id && p.name && ok(p.price); if (!g) skipped++; return g; }).map(p => ({ ...p, price: +p.price }));
    x.sales = x.sales.map(s => s && Array.isArray(s.rows) ? { ...s, rows: s.rows.filter(r => { const g = r && ok(r.price) && ok(r.qty); if (!g) skipped++; return g; }).map(r => ({ ...r, price: +r.price, qty: +r.qty })) } : null)
      .filter(s => { const g = s && s.id && /^\d{4}-\d{2}-\d{2}$/.test(s.date); if (!g) skipped++; return g; });
    return { data: x, skipped };
  },
  load() {
    let raw = null, d = null;
    try { raw = localStorage.getItem(KEY); if (raw) { d = JSON.parse(raw); if (Store.valid(d)) { Store.db = Store.merge(d); return; } } } catch (e) { d = null; }
    if (raw) { try { localStorage.setItem(KEY + '_corrupt_' + Date.now(), raw); } catch (e) { } }
    const r = Store.repair(d);
    if (r) { Store.db = Store.merge(r.data); U.pending = 'Some saved records were damaged and skipped (' + r.skipped + '). A copy of the original was kept.'; return; }
    if (raw) U.pending = 'Saved data was unreadable. A copy was kept in the browser and the app was reset.';
    Store.db = Store.defaults();
  },
  /* Safety copy of everything before a restore, reset or delete-all, so it can be undone from Settings */
  keepPrev() { try { localStorage.setItem(KEY + '_prev', JSON.stringify(Store.db)); } catch (e) { } },
  async restorePrev() {
    let d; try { d = JSON.parse(localStorage.getItem(KEY + '_prev')); } catch (e) { return false; }
    if (!Store.valid(d)) return false; d = Store.merge(d); d.settings.pin = Store.db.settings.pin; Store.db = d; Store.save(); return true;
  },
  snap() { Store.lp = {}; Store.lpDb = Store.db; Store.db.products.forEach(p => Store.lp[p.id] = p.price); },
  logPrices() {
    if (Store.lpDb !== Store.db) return Store.snap();
    Store.db.products.forEach(p => { const o = Store.lp[p.id]; if (o !== undefined && o !== p.price) Store.db.priceLog.push({ date: U.today(), pid: p.id, name: p.name, old: o, price: p.price }); Store.lp[p.id] = p.price; });
    if (Store.db.priceLog.length > 3000) Store.db.priceLog = Store.db.priceLog.slice(-2000);
  },
  save() { Store.lp && Store.logPrices(); if (Store.enc) { clearTimeout(Store._w); Store._w = setTimeout(Store.flush, 100); return; } try { localStorage.setItem(KEY, JSON.stringify(Store.db)); } catch (e) { U.toast('Could not save: browser storage is full or blocked', 'err'); } },
  exportJSON() { Store.db.settings.lastBackup = U.today(); Store.save(); U.download('mgi-fresh-backup-' + U.today() + '.json', JSON.stringify({ app: 'mgi-fresh', exported: new Date().toISOString(), data: Store.db }, null, 2), 'application/json'); },
  parseImport(text) {
    try { const j = JSON.parse(text), d = j && j.data ? j.data : j; return Store.valid(d) ? { ok: true, data: Store.merge(d) } : { ok: false, error: 'File is not a valid MGI Fresh backup.' }; }
    catch (e) { return { ok: false, error: 'File is not valid JSON.' }; }
  }
};
