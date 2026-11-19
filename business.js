'use strict';
/* business.js - dues (baki), SR/market report, stock, returns/damage, price history, PIN lock, Excel export */
const Biz = {
  mk: m => String(m || '').trim().toLowerCase(),
  table(heads, rows) {
    return `<div class="card tw rt"><table class="tbl"><thead><tr>${heads.map((h, i) => `<th class="${i ? 'n' : ''}">${h}</th>`).join('')}</tr></thead><tbody>${rows.map(r => `<tr>${r.map((c, i) => `<td class="${i ? 'n' : 'k'}" data-l="${U.esc(heads[i])}">${c}</td>`).join('')}</tr>`).join('')}</tbody></table>${rows.length ? '' : '<div class="empty">Nothing here yet.</div>'}</div>`;
  },
  list(id, f) { const role = { sr: 'SR', dsr: 'DSR' }[f], n = [...Store.db.sales.map(s => (s[f] || '').trim()), ...(role ? Store.db.staff.filter(x => x.role === role && x.active !== false).map(x => x.name) : [])].filter(Boolean); return `<datalist id="${id}">${[...new Set(n)].map(v => `<option value="${U.esc(v)}">`).join('')}</datalist>`; },
  keepFocus(el, id, fn) { const i = U.$('#' + id, el), p = i.selectionStart; fn(); const n = U.$('#' + id); n.focus(); n.setSelectionRange(p, p); },

  /* ---------- Dues (baki) ---------- */
  ledger() {
    const m = {}, g = name => { const k = Biz.mk(name); return m[k] || (m[k] = { name: (name || '').trim(), rows: [] }); }, db = Store.db;
    db.sales.forEach(s => { const x = g(s.market); x.rows.push({ date: s.date, label: 'Sales sheet', debit: Sales.total(s), credit: 0 }); if (s.paid > 0) x.rows.push({ date: s.date, label: 'Paid at delivery', debit: 0, credit: U.r2(s.paid) }); });
    db.payments.forEach(p => g(p.market).rows.push({ date: p.date, label: 'Payment received' + (p.note ? ' - ' + p.note : ''), debit: 0, credit: p.amount, id: p.id }));
    db.stock.filter(e => e.type === 'return' && e.market).forEach(e => g(e.market).rows.push({ date: e.date, label: 'Return: ' + e.name, debit: 0, credit: U.r2(e.qty * e.rate) }));
    Object.values(m).forEach(x => { x.rows.sort((a, b) => a.date < b.date ? -1 : 1); x.debit = U.r2(x.rows.reduce((a, r) => a + r.debit, 0)); x.credit = U.r2(x.rows.reduce((a, r) => a + r.credit, 0)); x.due = U.r2(x.debit - x.credit); });
    return m;
  },
  totalDue: () => U.r2(Object.values(Biz.ledger()).reduce((a, x) => a + x.due, 0)),
  dues(el) {
    const L = Object.values(Biz.ledger()).sort((a, b) => b.due - a.due), q = (Biz.dq || '').toLowerCase(), rows = L.filter(x => !q || x.name.toLowerCase().includes(q)), tot = f => U.money(L.reduce((a, x) => a + x[f], 0));
    el.innerHTML = `<div class="grid"><div class="stat"><span>Total billed</span><b>${tot('debit')}</b></div><div class="stat"><span>Total received</span><b>${tot('credit')}</b></div><div class="stat"><span>Total due (baki)</span><b style="color:var(--danger)">${tot('due')}</b></div></div>
      <div class="bar"><div class="grow"><label for="dq">Search market or shop</label><input id="dq" style="width:100%" value="${U.esc(Biz.dq || '')}"></div><button class="btn primary" id="dpay"><i data-lucide="plus"></i>Add payment</button></div>
      ${Biz.table(['Market / shop', 'Billed', 'Received', 'Due', ''], rows.map(x => [U.esc(x.name || '(No market)'), U.money(x.debit), U.money(x.credit), `<b style="color:${x.due > 0 ? 'var(--danger)' : 'inherit'}">${U.money(x.due)}</b>`, `<button class="btn sm" data-l="${U.esc(Biz.mk(x.name))}">Ledger</button>`]))}<p class="muted">Due = sales sheets billed to a market, minus money paid at delivery, payments received and returns. Type the same market name on each sheet.</p>`;
    U.$('#dq', el).oninput = e => { Biz.dq = e.target.value; Biz.keepFocus(el, 'dq', () => Biz.dues(el)); U.icons(); };
    U.$('#dpay', el).onclick = () => Biz.addPayment(el);
    el.querySelectorAll('[data-l]').forEach(b => b.onclick = () => Biz.showLedger(b.dataset.l, el));
  },
  showLedger(key, el) {
    const x = Biz.ledger()[key]; let bal = 0;
    const rows = x.rows.map(r => { bal = U.r2(bal + r.debit - r.credit); return `<tr><td>${U.fdate(r.date)}</td><td>${U.esc(r.label)}</td><td class="n">${r.debit ? U.money(r.debit) : ''}</td><td class="n">${r.credit ? U.money(r.credit) : ''}</td><td class="n">${U.money(bal)}</td><td>${r.id ? `<button class="ic" data-dp="${r.id}" aria-label="Delete payment"><i data-lucide="trash-2"></i></button>` : ''}</td></tr>`; }).join('');
    U.modal('Ledger: ' + (x.name || '(No market)'), `<div class="tw" style="max-height:50vh"><table class="tbl"><thead><tr><th>Date</th><th>Details</th><th class="n">Billed</th><th class="n">Received</th><th class="n">Balance</th><th></th></tr></thead><tbody>${rows}</tbody></table></div><p><b>Due now: ${U.money(x.due)}</b></p>`, [{ label: 'Close', v: true, cls: 'primary' }]);
    U.$('#dlg').querySelectorAll('[data-dp]').forEach(b => b.onclick = async () => {
      if (await U.confirm('Delete payment?', 'This payment record will be removed and the due will go up.')) { Store.db.payments = Store.db.payments.filter(p => p.id !== b.dataset.dp); Store.save(); U.toast('Payment deleted'); Biz.dues(el); U.icons(); }
    });
  },
  addPayment(el) {
    let out;
    U.modal('Add payment received', `<div class="fg"><div class="full"><label for="y_m">Market / shop</label><input id="y_m" list="dl_market">${Biz.list('dl_market', 'market')}</div><div><label for="y_d">Date</label><input id="y_d" type="date" value="${U.today()}"></div><div><label for="y_a">Amount (৳)</label><input id="y_a" type="number" min="0" step="any"></div><div class="full"><label for="y_n">Note (optional)</label><input id="y_n"></div></div><p id="y_e" style="color:var(--danger)"></p>`,
      [{ label: 'Cancel', v: false }, { label: 'Save payment', v: true, cls: 'primary' }], () => {
        const m = U.$('#y_m').value.trim(), a = U.num(U.$('#y_a').value), d = U.$('#y_d').value, err = t => { U.$('#y_e').textContent = t; return false; };
        if (!m) return err('Enter the market or shop name.'); if (!(a > 0)) return err('Amount must be more than 0.'); if (!d) return err('Choose a date.');
        out = { id: U.uid(), date: d, market: m, amount: U.r2(a), note: U.$('#y_n').value.trim() };
      }).then(ok => { if (ok) { Store.db.payments.push(out); Store.save(); U.toast('Payment saved'); Biz.dues(el); U.icons(); } });
  },

  /* ---------- Team and salary (SR, DSR, Driver ...) ---------- */
  ROLES: ['SR', 'DSR', 'Driver', 'Helper', 'Other'],
  paidIn: (x, mo) => U.r2(Store.db.salaryPay.filter(p => p.sid === x.id && p.month === mo && p.type !== 'bonus').reduce((a, p) => a + p.amount, 0)),
  staffHtml() {
    const db = Store.db, mo = U.today().slice(0, 7);
    const rows = db.staff.map(x => {
      const paid = Biz.paidIn(x, mo), due = U.r2((x.salary || 0) - paid), key = Biz.mk(x.name);
      const sales = x.role === 'SR' || x.role === 'DSR' ? U.money(db.sales.filter(s => s.date.startsWith(mo) && Biz.mk(x.role === 'SR' ? s.sr : s.dsr) === key).reduce((a, s) => a + Sales.total(s), 0)) : '-';
      return [`<b>${U.esc(x.name)}</b>${x.active === false ? ' <small class="muted">(inactive)</small>' : ''}<br><small class="muted">${U.esc(x.role)}${x.phone ? ' - ' + U.esc(x.phone) : ''}</small>`, U.money(x.salary || 0), U.money(paid), `<b style="color:${due > 0 ? 'var(--danger)' : 'inherit'}">${U.money(due)}</b>`, sales, `<button class="btn sm" data-sp="${x.id}">Pay</button> <button class="btn sm" data-sh="${x.id}">History</button> <button class="ic" data-se="${x.id}" aria-label="Edit ${U.esc(x.name)}"><i data-lucide="pencil"></i></button>`];
    });
    return `<div class="bar"><h3 style="margin:0;flex:1">Team and salary (${mo})</h3><button class="btn primary" id="sadd"><i data-lucide="user-plus"></i>Add staff</button></div>${Biz.table(['Name / role', 'Monthly salary', 'Paid this month', 'Due', 'Sales this month', ''], rows)}<p class="muted">Add SR, DSR, driver and other staff with their salary. "Sales this month" uses the SR or DSR name typed on sales sheets.</p>`;
  },
  bindStaff(el) {
    const f = id => Store.db.staff.find(x => x.id === id);
    U.$('#sadd', el).onclick = () => Biz.editStaff(null, el);
    el.querySelectorAll('[data-se]').forEach(b => b.onclick = () => Biz.editStaff(f(b.dataset.se), el));
    el.querySelectorAll('[data-sp]').forEach(b => b.onclick = () => Biz.paySalary(f(b.dataset.sp), el));
    el.querySelectorAll('[data-sh]').forEach(b => b.onclick = () => Biz.payHistory(f(b.dataset.sh), el));
  },
  async editStaff(x, el) {
    let out; const btn = [{ label: 'Cancel', v: false }]; if (x) btn.push({ label: 'Delete', v: 'del', cls: 'danger' }); btn.push({ label: 'Save', v: true, cls: 'primary' });
    const v = await U.modal(x ? 'Edit staff' : 'Add staff', `<div class="fg"><div><label for="t_n">Name</label><input id="t_n" value="${U.esc(x && x.name)}"></div><div><label for="t_r">Role</label><select id="t_r">${Biz.ROLES.map(r => `<option ${x && x.role === r ? 'selected' : ''}>${r}</option>`).join('')}</select></div><div><label for="t_p">Phone</label><input id="t_p" type="tel" value="${U.esc(x && x.phone)}"></div><div><label for="t_s">Monthly salary (৳)</label><input id="t_s" type="number" min="0" step="any" value="${x ? x.salary : ''}"></div><div><label for="t_j">Joining date</label><input id="t_j" type="date" value="${(x && x.join) || ''}"></div><div><label for="t_a">Status</label><select id="t_a"><option value="1">Active</option><option value="0" ${x && x.active === false ? 'selected' : ''}>Inactive</option></select></div><div class="full"><label for="t_o">Note</label><input id="t_o" value="${U.esc(x && x.note)}"></div></div><p id="t_e" style="color:var(--danger)"></p>`, btn, v => {
      if (v === 'del') return true; const n = U.$('#t_n').value.trim(), s = U.num(U.$('#t_s').value || 0), err = m => { U.$('#t_e').textContent = m; return false; };
      if (!n) return err('Enter the name.'); if (!(s >= 0)) return err('Salary must be 0 or more.');
      out = { name: n, role: U.$('#t_r').value, phone: U.$('#t_p').value.trim(), salary: U.r2(s), join: U.$('#t_j').value, active: U.$('#t_a').value === '1', note: U.$('#t_o').value.trim() };
    });
    if (!v) return;
    if (v === 'del') { if (!(await U.confirm('Delete staff?', `Delete <b>${U.esc(x.name)}</b> and all salary records of this person?`))) return; Store.db.staff = Store.db.staff.filter(s => s !== x); Store.db.salaryPay = Store.db.salaryPay.filter(p => p.sid !== x.id); }
    else if (x) Object.assign(x, out); else Store.db.staff.push({ id: U.uid(), ...out });
    Store.save(); U.toast('Saved'); Biz.srm(el); U.icons();
  },
  paySalary(x, el) {
    const mo = U.today().slice(0, 7); let out;
    U.modal('Pay: ' + x.name, `<div class="fg"><div><label for="z_t">Type</label><select id="z_t"><option value="salary">Salary</option><option value="advance">Advance</option><option value="bonus">Bonus</option></select></div><div><label for="z_m">For month</label><input id="z_m" type="month" value="${mo}"></div><div><label for="z_a">Amount (৳)</label><input id="z_a" type="number" min="0" step="any" value="${Math.max(0, U.r2((x.salary || 0) - Biz.paidIn(x, mo))) || ''}"></div><div><label for="z_d">Date paid</label><input id="z_d" type="date" value="${U.today()}"></div><div class="full"><label for="z_n">Note</label><input id="z_n"></div></div><p id="z_e" style="color:var(--danger)"></p>`,
      [{ label: 'Cancel', v: false }, { label: 'Save payment', v: true, cls: 'primary' }], () => {
        const a = U.num(U.$('#z_a').value), m = U.$('#z_m').value, d = U.$('#z_d').value, err = t => { U.$('#z_e').textContent = t; return false; };
        if (!(a > 0)) return err('Amount must be more than 0.'); if (!m || !d) return err('Choose the month and date.');
        out = { id: U.uid(), sid: x.id, date: d, month: m, amount: U.r2(a), type: U.$('#z_t').value, note: U.$('#z_n').value.trim() };
      }).then(ok => { if (ok) { Store.db.salaryPay.push(out); Store.save(); U.toast('Payment saved'); Biz.srm(el); U.icons(); } });
  },
  payHistory(x, el) {
    const L = Store.db.salaryPay.filter(p => p.sid === x.id).sort((a, b) => a.date < b.date ? 1 : -1);
    U.modal('Salary history: ' + x.name, L.length ? `<div class="tw" style="max-height:50vh"><table class="tbl"><thead><tr><th>Date</th><th>Month</th><th>Type</th><th class="n">Amount</th><th></th></tr></thead><tbody>${L.map(p => `<tr><td>${U.fdate(p.date)}</td><td>${p.month}</td><td>${p.type}${p.note ? ' - ' + U.esc(p.note) : ''}</td><td class="n">${U.money(p.amount)}</td><td><button class="ic" data-dp="${p.id}" aria-label="Delete payment"><i data-lucide="trash-2"></i></button></td></tr>`).join('')}</tbody></table></div>` : '<p class="muted">No payments recorded yet.</p>', [{ label: 'Close', v: true, cls: 'primary' }]);
    U.$('#dlg').querySelectorAll('[data-dp]').forEach(b => b.onclick = async () => { if (await U.confirm('Delete payment?', 'This salary record will be removed.')) { Store.db.salaryPay = Store.db.salaryPay.filter(p => p.id !== b.dataset.dp); Store.save(); Biz.srm(el); U.icons(); Biz.payHistory(x, el); } });
  },

  /* ---------- SR / DSR / Market report ---------- */
  srm(el) {
    const st = Biz.st || (Biz.st = { from: '', to: '', m: '' }), S = Store.db.sales.filter(s => (!st.from || s.date >= st.from) && (!st.to || s.date <= st.to));
    const grp = f => { const m = {}; S.forEach(s => { const k = (s[f] || '').trim() || '(blank)', x = m[k] || (m[k] = { k, t: 0, n: 0 }); x.t = U.r2(x.t + Sales.total(s)); x.n++; }); return Object.values(m).sort((a, b) => b.t - a.t); };
    const tb = (t, f) => `<h3 style="margin:14px 0 8px">${t}</h3>` + Biz.table([t, 'Sheets', 'Total sales'], grp(f).map(x => [U.esc(x.k), x.n, U.money(x.t)]));
    const mks = [...new Set(S.map(s => (s.market || '').trim()).filter(Boolean))].sort(), pm = {};
    S.filter(s => (s.market || '').trim() === st.m).forEach(s => s.rows.forEach(r => { if (Sales.has(r)) { const x = pm[r.pid] || (pm[r.pid] = { name: r.name, q: 0, t: 0 }); x.q = U.r2(x.q + r.qty); x.t = U.r2(x.t + Sales.line(r)); } }));
    el.innerHTML = `${Biz.staffHtml()}<h3 style="margin:18px 0 8px">Sales by SR, DSR and market</h3><div class="bar"><div><label for="o_f">From</label><input id="o_f" type="date" value="${st.from}"></div><div><label for="o_t">To</label><input id="o_t" type="date" value="${st.to}"></div></div>${tb('SR (এস আর)', 'sr')}${tb('DSR (ডি এস আর)', 'dsr')}${tb('Market (মার্কেট)', 'market')}
      <h3 style="margin:14px 0 8px">Top products in a market</h3><div class="bar"><div><label for="o_m">Market</label><select id="o_m"><option value="">Select...</option>${mks.map(m => `<option ${m === st.m ? 'selected' : ''}>${U.esc(m)}</option>`).join('')}</select></div></div>${st.m ? Biz.table(['Product', 'Qty sold', 'Amount'], Object.values(pm).sort((a, b) => b.t - a.t).slice(0, 10).map(x => [U.esc(x.name), x.q, U.money(x.t)])) : ''}`;
    [['o_f', 'from'], ['o_t', 'to'], ['o_m', 'm']].forEach(([id, k]) => U.$('#' + id, el).onchange = e => { st[k] = e.target.value; Biz.srm(el); U.icons(); });
    Biz.bindStaff(el);
  },

  /* ---------- Stock, returns, damage ---------- */
  stockCalc() {
    const m = {}; Store.db.products.forEach(p => m[p.id] = { p, inn: 0, sold: 0, ret: 0, dmg: 0 });
    Store.db.stock.forEach(e => { const x = m[e.pid]; if (x) { if (e.type === 'in') x.inn += e.qty; else if (e.type === 'return') x.ret += e.qty; else x.dmg += e.qty; } });
    Store.db.sales.forEach(s => s.rows.forEach(r => { const x = m[r.pid]; if (x) x.sold += r.qty; }));
    return Object.values(m).map(x => (x.cur = U.r2(x.inn + x.ret - x.sold - x.dmg), x));
  },
  low: () => Biz.stockCalc().filter(x => x.p.min > 0 && x.cur <= x.p.min),
  lowHtml() { const l = Biz.low(); return l.length ? `<div class="note">⚠ Low stock: ${l.slice(0, 4).map(x => U.esc(x.p.name) + ' (' + x.cur + ')').join(', ')}${l.length > 4 ? ' and ' + (l.length - 4) + ' more' : ''}. <a href="#stock">See stock</a></div>` : ''; },
  stock(el) {
    const q = (Biz.sq || '').toLowerCase(), all = Biz.stockCalc(), rows = all.filter(x => !q || x.p.name.toLowerCase().includes(q));
    const T = { in: 'Stock in', return: 'Customer return', damage: 'Damaged / expired' }, ev = Store.db.stock.slice().sort((a, b) => a.date < b.date ? 1 : -1).slice(0, 30);
    el.innerHTML = `${Biz.lowHtml()}<div class="bar"><div class="grow"><label for="sq">Search product</label><input id="sq" style="width:100%" value="${U.esc(Biz.sq || '')}"></div><div class="row"><button class="btn primary" data-t="in">Stock in</button><button class="btn" data-t="return">Customer return</button><button class="btn" data-t="damage">Damaged / expired</button></div></div>
      ${Biz.table(['Product', 'In', 'Sold', 'Returned', 'Damaged', 'In stock', 'Alert at'], rows.map(x => [U.esc(x.p.name), x.inn, x.sold, x.ret, x.dmg, `<b style="color:${x.cur < 0 || (x.p.min > 0 && x.cur <= x.p.min) ? 'var(--danger)' : 'inherit'}">${x.cur}</b>`, x.p.min || '-']))}
      <h3 style="margin:14px 0 8px">Recent entries</h3>${Biz.table(['Date / type', 'Product', 'Qty', 'Details', ''], ev.map(e => [U.fdate(e.date) + ' ' + T[e.type], U.esc(e.name), e.qty, U.esc([e.market, e.note].filter(Boolean).join(' - ')), `<button class="ic" data-x="${e.id}" aria-label="Delete entry"><i data-lucide="trash-2"></i></button>`]))}<p class="muted">In stock = Stock in + Returned - Sold (from sales sheets) - Damaged. Add your opening stock as a Stock in entry. Set the alert level in each product.</p>`;
    U.$('#sq', el).oninput = e => { Biz.sq = e.target.value; Biz.keepFocus(el, 'sq', () => Biz.stock(el)); U.icons(); };
    el.querySelectorAll('[data-t]').forEach(b => b.onclick = () => Biz.addStock(b.dataset.t, el));
    el.querySelectorAll('[data-x]').forEach(b => b.onclick = async () => { if (await U.confirm('Delete entry?', 'Stock numbers (and the market due for a return) will change.')) { Store.db.stock = Store.db.stock.filter(e => e.id !== b.dataset.x); Store.save(); Biz.stock(el); U.icons(); } });
  },
  addStock(type, el) {
    const P = Store.db.products, ret = type === 'return'; let out;
    U.modal({ in: 'Stock in (from company)', return: 'Customer return', damage: 'Damaged / expired' }[type], `<div class="fg"><div class="full"><label for="k_p">Product</label><select id="k_p">${P.map(p => `<option value="${U.esc(p.id)}">${U.esc(p.name)}</option>`).join('')}</select></div><div><label for="k_d">Date</label><input id="k_d" type="date" value="${U.today()}"></div><div><label for="k_q">Quantity</label><input id="k_q" type="number" min="0" step="any"></div>
      ${ret ? `<div><label for="k_m">Market / shop</label><input id="k_m" list="dl_market">${Biz.list('dl_market', 'market')}</div><div><label for="k_r">Rate (৳ per unit)</label><input id="k_r" type="number" min="0" step="any" value="${P[0] ? P[0].price : ''}"></div>` : ''}<div class="full"><label for="k_n">Note (optional)</label><input id="k_n"></div></div><p id="k_e" style="color:var(--danger)"></p>`,
      [{ label: 'Cancel', v: false }, { label: 'Save', v: true, cls: 'primary' }], () => {
        const p = Prod.find(U.$('#k_p').value), q = U.num(U.$('#k_q').value), err = t => { U.$('#k_e').textContent = t; return false; };
        if (!p) return err('Choose a product.'); if (!(q > 0)) return err('Quantity must be more than 0.');
        const r = ret ? U.num(U.$('#k_r').value) : 0, m = ret ? U.$('#k_m').value.trim() : ''; if (ret && (!m || !(r >= 0))) return err('Enter the market and a rate.');
        out = { id: U.uid(), date: U.$('#k_d').value || U.today(), pid: p.id, name: p.name, type, qty: q, rate: r || 0, market: m, note: U.$('#k_n').value.trim() };
      }).then(ok => { if (ok) { Store.db.stock.push(out); Store.save(); U.toast('Entry saved'); Biz.stock(el); U.icons(); } });
    if (ret) { const s = U.$('#k_p'); s.onchange = () => { const p = Prod.find(s.value); if (p) U.$('#k_r').value = p.price; }; }
  },

  /* ---------- Price history ---------- */
  priceHistory(p) {
    const L = Store.db.priceLog.filter(x => x.pid === p.id).slice().reverse();
    U.modal('Price history: ' + p.name, L.length ? `<div class="tw" style="max-height:50vh"><table class="tbl"><thead><tr><th>Date</th><th class="n">Old price</th><th class="n">New price</th></tr></thead><tbody>${L.map(x => `<tr><td>${U.fdate(x.date)}</td><td class="n">${U.money(x.old)}</td><td class="n">${U.money(x.price)}</td></tr>`).join('')}</tbody></table></div>` : '<p class="muted">No price change recorded yet. Current price: ' + U.money(p.price) + '</p>', [{ label: 'Close', v: true, cls: 'primary' }]);
  },

  /* ---------- Excel export (SheetJS, loaded on demand) ---------- */
  async xlsx() {
    try { if (!window.XLSX) await new Promise((ok, no) => { const s = document.createElement('script'); s.src = 'https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js'; s.onload = ok; s.onerror = no; document.head.appendChild(s); }); }
    catch (e) { return U.toast('Could not load the Excel library. Check your internet.', 'err'); }
    const wb = XLSX.utils.book_new(), add = (n, a) => XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(a), n), S = Store.db.sales.slice().sort((a, b) => a.date < b.date ? -1 : 1);
    add('Sales', [['Date', 'SR', 'DSR', 'Market', 'Product', 'Unit', 'Rate', 'Qty', 'Amount'], ...S.flatMap(s => s.rows.filter(Sales.has).map(r => [s.date, s.sr || '', s.dsr || '', s.market || '', r.name, r.unit, r.price, r.qty, Sales.line(r)]))]);
    add('Daily totals', [['Date', 'SR', 'DSR', 'Market', 'Total', 'Paid at delivery'], ...S.map(s => [s.date, s.sr || '', s.dsr || '', s.market || '', Sales.total(s), s.paid || 0])]);
    add('Product-wise', [['Product', 'Unit', 'Qty sold', 'Revenue'], ...Rep.productStats().map(p => [p.name, p.unit, p.qty, p.rev])]);
    add('Dues', [['Market', 'Billed', 'Received', 'Due'], ...Object.values(Biz.ledger()).map(x => [x.name || '(No market)', x.debit, x.credit, x.due])]);
    add('Stock', [['Product', 'In', 'Sold', 'Returned', 'Damaged', 'In stock'], ...Biz.stockCalc().map(x => [x.p.name, x.inn, x.sold, x.ret, x.dmg, x.cur])]);
    add('Staff', [['Name', 'Role', 'Phone', 'Monthly salary'], ...Store.db.staff.map(x => [x.name, x.role, x.phone || '', x.salary || 0])]);
    XLSX.writeFile(wb, 'foisal-traders-' + U.today() + '.xlsx'); U.toast('Excel file downloaded');
  }
};

/* ---------- PIN lock (stops casual viewing; data is not encrypted) ---------- */
const Pin = {
  async hash(s) {
    const t = 'fc|' + s;
    if (window.crypto && crypto.subtle) { const b = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(t)); return [...new Uint8Array(b)].map(x => x.toString(16).padStart(2, '0')).join(''); }
    let h = 5381; for (const c of t) h = ((h << 5) + h + c.charCodeAt(0)) | 0; return 'x' + h;
  },
  lock() {
    if (!Store.db.settings.pin) return;
    const dl = U.$('#dlg'); if (dl.open) dl.close();
    let o = U.$('#lock'); if (!o) { o = document.createElement('div'); o.id = 'lock'; document.body.appendChild(o); }
    o.innerHTML = `<form class="lockbox"><div class="logo">MGI</div><h2>${U.esc(Store.db.settings.dealer)}</h2><p class="muted">Enter your PIN to open</p><input id="lp" type="password" inputmode="numeric" autocomplete="off" maxlength="8" aria-label="PIN" style="width:100%;text-align:center;font-size:22px"><p id="le" style="color:var(--danger);min-height:1.3em;margin:6px 0"></p><button class="btn primary" style="width:100%;justify-content:center">Unlock</button><p class="muted" style="font-size:12px">Forgot the PIN? Clear this site's data in your browser settings, then restore your backup file.</p></form>`;
    o.hidden = false; const f = U.$('#lp', o); f.focus();
    U.$('.lockbox', o).onsubmit = async e => { e.preventDefault(); if (await Pin.hash(f.value) === Store.db.settings.pin) { o.hidden = true; Pin.touch(); } else { U.$('#le', o).textContent = 'Wrong PIN'; f.value = ''; } };
  },
  touch() { clearTimeout(Pin.t); if (Store.db.settings.pin) Pin.t = setTimeout(Pin.lock, 5 * 60 * 1000); },
  async change() {
    const S = Store.db.settings; let cur, np;
    if (S.pin) { const ok = await U.modal('Current PIN', '<input id="p0" type="password" inputmode="numeric" style="width:100%">', [{ label: 'Cancel', v: false }, { label: 'Next', v: true, cls: 'primary' }], () => { cur = U.$('#p0').value; }); if (!ok) return; if (await Pin.hash(cur) !== S.pin) return U.toast('Wrong PIN', 'err'); }
    const btn = [{ label: 'Cancel', v: false }, { label: 'Save PIN', v: true, cls: 'primary' }]; if (S.pin) btn.splice(1, 0, { label: 'Remove PIN', v: 'rm', cls: 'danger' });
    const v = await U.modal(S.pin ? 'Change or remove PIN' : 'Set a PIN', '<label for="p1">New PIN (4 to 8 digits)</label><input id="p1" type="password" inputmode="numeric" maxlength="8" style="width:100%"><label for="p2" style="margin-top:8px">Repeat new PIN</label><input id="p2" type="password" inputmode="numeric" maxlength="8" style="width:100%"><p id="pe" style="color:var(--danger)"></p>', btn, v => {
      if (v === 'rm') return true; const a = U.$('#p1').value, b = U.$('#p2').value;
      if (!/^\d{4,8}$/.test(a)) { U.$('#pe').textContent = 'PIN must be 4 to 8 digits.'; return false; } if (a !== b) { U.$('#pe').textContent = 'The two PINs do not match.'; return false; } np = a;
    });
    if (!v) return; S.pin = v === 'rm' ? '' : await Pin.hash(np); Store.save(); U.toast(v === 'rm' ? 'PIN removed' : 'PIN set'); Pin.touch(); App.route();
  }
};
['click', 'keydown', 'touchstart'].forEach(ev => document.addEventListener(ev, () => { const o = U.$('#lock'); if (!o || o.hidden) Pin.touch(); }));
