'use strict';
/* sales.js - daily sales sheet editor, history and print layout */
const Sales = {
  cur: null, dirty: false, bad: new Set(), H: { d: '', month: '', from: '', to: '' },
  blank: date => ({ id: null, sr: '', dsr: '', market: '', date: date || U.today(), rows: Store.db.products.map(p => ({ pid: p.id, name: p.name, unit: p.unit, price: p.price, qty: 0 })) }),
  mark() { Sales.dirty = true; clearTimeout(Sales._t); Sales._t = setTimeout(() => { try { localStorage.setItem(KEY + '_draft', JSON.stringify(Sales.cur)); } catch (e) { } }, 400); },
  clean() { Sales.dirty = false; clearTimeout(Sales._t); try { localStorage.removeItem(KEY + '_draft'); } catch (e) { } },
  /* Restores an unsaved sheet after refresh or crash */
  loadDraft() {
    try {
      const d = JSON.parse(localStorage.getItem(KEY + '_draft'));
      if (d && Array.isArray(d.rows) && /^\d{4}-\d{2}-\d{2}$/.test(d.date) && d.rows.every(r => r && Number.isFinite(r.price) && Number.isFinite(r.qty) && r.qty >= 0 && r.price >= 0)) { Sales.cur = d; Sales.dirty = true; return true; }
    } catch (e) { }
    return false;
  },
  line: r => U.r2(r.price * r.qty),
  total: s => U.r2(s.rows.reduce((a, r) => a + Sales.line(r), 0)),
  sold: s => s.rows.filter(r => r.qty > 0).length,

  render(el) {
    if (!Sales.cur || (!Sales.cur.id && !Sales.dirty)) Sales.cur = Sales.blank(Sales.cur && Sales.cur.date);
    const c = Sales.cur, free = Store.db.products.filter(p => !c.rows.some(r => r.pid === p.id));
    Sales.bad = new Set();
    el.innerHTML = `<div class="bar"><div><label for="sd">Sales date</label><input id="sd" type="date" value="${c.date}"></div>
      <div class="grow"><label for="ap">Add product to this sheet</label><div class="row"><select id="ap"><option value="">Select product...</option>${free.map(p => `<option value="${U.esc(p.id)}">${U.esc(p.name)} (${p.unit})</option>`).join('')}</select><button class="btn" id="apb">Add</button></div></div>
      <div class="row"><button class="btn" id="ocr"><i data-lucide="scan-text"></i>Import from photo</button><button class="btn" id="nw"><i data-lucide="file-plus"></i>New sheet</button><button class="btn" id="pr"><i data-lucide="printer"></i>Print</button><button class="btn" id="pdf"><i data-lucide="file-down"></i>Download PDF</button><button class="btn primary" id="sv"><i data-lucide="save"></i>Save sheet</button></div></div>
      <div class="bar" style="margin-bottom:8px"><div class="grow"><label for="rs">Find product in this sheet</label><input id="rs" style="width:100%" placeholder="Type to filter rows"></div><label style="display:flex;gap:6px;align-items:center;margin:0 0 8px"><input type="checkbox" id="so"> Show only sold products</label></div>
      <div class="bar"><div><label for="m_sr">এস আর (SR) ${Bn.btn('m_sr')}</label><input id="m_sr" value="${U.esc(c.sr)}"></div><div><label for="m_dsr">ডি এস আর (DSR) ${Bn.btn('m_dsr')}</label><input id="m_dsr" value="${U.esc(c.dsr)}"></div><div class="grow"><label for="m_market">মার্কেট (Market) ${Bn.btn('m_market')}</label><input id="m_market" style="width:100%" value="${U.esc(c.market)}"></div></div>
      <div id="note"></div>
      <div class="card tw sheetwrap"><table class="tbl"><thead><tr><th>SL</th><th>Product name</th><th>Unit</th><th class="n">Price per unit</th><th class="n">Quantity sold</th><th class="n">Total price</th><th></th></tr></thead><tbody id="tb">${c.rows.map(Sales.rowHTML).join('')}</tbody></table>
      ${c.rows.length ? '' : '<div class="empty">This sheet has no products. Add products above, or register them in Products.</div>'}</div>
      <div class="gt"><div><span class="tag">${c.id ? 'Editing saved sheet' : 'New sheet'}</span> &nbsp; Products sold: <b id="cnt" style="font-size:inherit"></b></div><div>Grand total &nbsp;<b id="gtv"></b></div><div class="prog"><i id="pg"></i></div></div>`;
    const $ = s => U.$(s, el), tb = $('#tb');
    Sales.sum(); Sales.note(el);
    const flt = () => { const q = $('#rs').value.toLowerCase(), so = $('#so').checked; tb.querySelectorAll('tr').forEach(tr => { const r = c.rows[tr.dataset.i]; tr.hidden = !((!q || r.name.toLowerCase().includes(q)) && (!so || r.qty > 0)); }); };
    $('#rs').oninput = flt; $('#so').onchange = flt;
    $('#sd').onchange = e => { c.date = e.target.value; Sales.mark(); Sales.note(el); };
    $('#apb').onclick = () => { const p = Prod.find($('#ap').value); if (!p) return U.toast('Select a product first', 'err'); c.rows.push({ pid: p.id, name: p.name, unit: p.unit, price: p.price, qty: 0 }); Sales.mark(); Sales.render(el); };
    $('#nw').onclick = async () => { if (Sales.dirty && !(await U.confirm('Discard changes?', 'This sheet has unsaved changes. Start a new sheet anyway?', 'Discard'))) return; Sales.cur = Sales.blank(); Sales.clean(); Sales.render(el); };
    $('#pr').onclick = $('#pdf').onclick = e => { if (e.currentTarget.id === 'pdf') U.toast('In the print dialog, choose "Save as PDF" as the destination'); Sales.printAsk(c); };
    ['sr', 'dsr', 'market'].forEach(k => $('#m_' + k).oninput = e => { c[k] = e.target.value; Sales.mark(); });
    $('#sv').onclick = Sales.save; $('#ocr').onclick = () => Ocr.open(el);
    tb.oninput = e => {
      const tr = e.target.closest('tr'), i = +tr.dataset.i, f = e.target.dataset.f, r = c.rows[i];
      if (f === 'unit') {
        Sales.mark();
        if (e.target.value !== '__custom') { r.unit = e.target.value; return; }
        U.modal('Custom unit', '<label for="cu">Unit or pack size (e.g. 750 g, 3 KG, Dozen)</label><input id="cu" style="width:100%">', [{ label: 'Cancel', v: false }, { label: 'Use unit', v: true, cls: 'primary' }], () => U.$('#cu').value.trim() ? true : false)
          .then(ok => { const u = ok && U.$('#cu').value.trim(); if (u) r.unit = u; Sales.render(el); });
        return;
      }
      const v = e.target.value, n = v === '' && f === 'qty' ? 0 : U.num(v), key = i + f;
      if (!(n >= 0)) { e.target.classList.add('bad'); Sales.bad.add(key); return; }
      e.target.classList.remove('bad'); Sales.bad.delete(key); r[f] = f === 'price' ? U.r2(n) : n; Sales.mark();
      tr.querySelector('.lt').textContent = U.money(Sales.line(r)); tr.classList.toggle('zero', !(r.qty > 0)); Sales.sum();
    };
    tb.onfocusin = e => { if (e.target.tagName === 'INPUT') e.target.select(); };
    tb.onclick = e => { const b = e.target.closest('[data-rm]'); if (!b) return; c.rows.splice(+b.closest('tr').dataset.i, 1); Sales.mark(); Sales.render(el); };
    tb.onkeydown = e => {
      if (e.target.tagName !== 'INPUT' || !['Enter', 'ArrowDown', 'ArrowUp'].includes(e.key)) return; e.preventDefault();
      const all = [...tb.querySelectorAll(`[data-f="${e.target.dataset.f}"]`)].filter(x => !x.closest('tr').hidden), i = all.indexOf(e.target) + (e.key === 'ArrowUp' ? -1 : 1);
      all[i] && (all[i].focus(), all[i].select());
    };
  },
  rowHTML(r, i) {
    return `<tr data-i="${i}" class="${r.qty > 0 ? '' : 'zero'}"><td class="sl">${i + 1}</td><td class="pn">${U.esc(r.name)}</td><td data-l="Unit"><select data-f="unit" aria-label="Unit of ${U.esc(r.name)}">${[...new Set([...allUnits(), r.unit])].map(u => `<option ${u === r.unit ? 'selected' : ''}>${U.esc(u)}</option>`).join('')}<option value="__custom">+ Custom unit...</option></select></td>
      <td class="n" data-l="Price per unit"><input class="in" data-f="price" inputmode="decimal" type="number" min="0" step="any" value="${r.price}" aria-label="Price of ${U.esc(r.name)}"></td>
      <td class="n" data-l="Quantity sold"><input class="in" data-f="qty" inputmode="decimal" type="number" min="0" step="any" placeholder="0" value="${r.qty || ''}" aria-label="Quantity of ${U.esc(r.name)}"></td>
      <td class="n lt" data-l="Total">${U.money(Sales.line(r))}</td><td class="rm"><button class="ic" data-rm aria-label="Remove ${U.esc(r.name)} from sheet"><i data-lucide="x"></i></button></td></tr>`;
  },
  sum() {
    const c = Sales.cur, g = U.$('#gtv'), t = U.money(Sales.total(c));
    if (g.textContent !== t) { g.textContent = t; g.classList.remove('bump'); void g.offsetWidth; g.classList.add('bump'); }
    U.$('#cnt').textContent = Sales.sold(c) + ' of ' + c.rows.length; U.$('#pg').style.width = (c.rows.length ? Sales.sold(c) / c.rows.length * 100 : 0) + '%';
  },
  note(el) {
    const c = Sales.cur, ex = Store.db.sales.filter(s => s.date === c.date && s.id !== c.id), n = U.$('#note', el);
    const z = c.rows.filter(r => !r.price).length, zw = z ? `<div class="note">${z} products have no price yet. Set prices in Products, or type them here.</div>` : '';
    n.innerHTML = zw + (ex.length ? `<div class="note">A sheet for ${U.fdate(c.date)} already exists (${U.money(ex[0] && Sales.total(ex[0]))}). <button class="btn sm" id="opn">Open it</button></div>` : '');
    if (ex.length) U.$('#opn', el).onclick = () => { Sales.cur = JSON.parse(JSON.stringify(ex[0])); Sales.clean(); Sales.render(el); };
  },
  async save() {
    const c = Sales.cur, db = Store.db;
    if (!c.date) return U.toast('Choose a sales date', 'err');
    if (Sales.bad.size) return U.toast('Fix the highlighted price or quantity values first', 'err');
    const ex = db.sales.filter(s => s.date === c.date && s.id !== c.id);
    if (ex.length) {
      const a = await U.ask('A sheet already exists for ' + U.fdate(c.date), `This date already has ${ex.length} saved sheet(s) totalling ${U.money(Rep.sum(ex))}. How should this one be saved?`,
        [{ label: 'Cancel', v: false }, { label: 'Save as extra transaction', v: 'add' }, { label: 'Replace existing', v: 'rep', cls: 'danger' }]);
      if (!a) return; if (a === 'rep') db.sales = db.sales.filter(s => s !== ex[0]);
    }
    const rec = { id: c.id || U.uid(), sr: c.sr || '', dsr: c.dsr || '', market: c.market || '', date: c.date, rows: c.rows.map(r => ({ pid: r.pid, name: r.name, unit: r.unit, price: U.r2(r.price), qty: r.qty })), updated: new Date().toISOString() };
    const i = db.sales.findIndex(s => s.id === rec.id); i >= 0 ? db.sales[i] = rec : db.sales.push(rec);
    c.id = rec.id; Sales.clean(); Store.save(); U.toast('Sales sheet saved: ' + U.money(Sales.total(rec))); Sales.render(U.$('#view'));
  },
  /* Print layout (A4) built from a sheet */
  /* Asks whether to print every product or only sold ones (same choice for Print and Download PDF) */
  async printAsk(s) {
    const all = Store.db.settings.showZero, v = await U.ask('Print which products?', `All ${s.rows.length} products, or only the ${Sales.sold(s)} with quantity sold? The grand total is the same either way.`,
      [{ label: 'Cancel', v: false }, { label: 'Only sold products', v: 'sold', cls: all ? '' : 'primary' }, { label: 'All products', v: 'all', cls: all ? 'primary' : '' }]);
    if (!v) return; if (v === 'sold' && !Sales.sold(s)) return U.toast('No products have a quantity yet', 'err');
    Sales.print(s, v === 'sold');
  },
  /* Prints the sheet in the same layout as the paper form: two product columns, Bengali labels */
  async print(s, onlySold) {
    const S = Store.db.settings, bn = x => S.bnDigits ? String(x).replace(/\d/g, d => '০১২৩৪৫৬৭৮৯'[d]) : String(x), nf = n => bn(Number.isInteger(n) ? n : U.r2(n));
    let L = [], R = [];
    if (onlySold) { const a = s.rows.filter(r => r.qty > 0), h = Math.ceil(a.length / 2); L = a.slice(0, h); R = a.slice(h); }
    else {
      const ex = [];
      s.rows.forEach(r => { const p = Prod.find(r.pid) || {}, side = p.col === 'L' ? L : p.col === 'R' ? R : null; if (side && p.row > 0 && !side[p.row - 1]) side[p.row - 1] = r; else ex.push(r); });
      ex.forEach(r => (L.length <= R.length ? L : R).push(r));
    }
    const n = Math.max(L.length, R.length, onlySold ? 1 : 29);
    const cells = r => r ? `<td>${U.esc(r.name)}</td>` + (r.qty > 0 ? `<td class="n">${nf(r.qty)}</td><td class="n">${nf(r.price)}</td><td class="n">${nf(Sales.line(r))}</td>` : '<td></td><td></td><td></td>') : '<td></td><td></td><td></td><td></td>';
    const th = '<th>পণ্যের নাম গ্রুপ-এ</th><th>পরিমাণ</th><th>দর</th><th>টাকা</th>', dv = v => `<span>${U.esc(v)}</span>`;
    U.$('#printArea').innerHTML = `<div class="fh"><img src="hdr-left.png" alt=""><div class="fc"><h1>${U.esc(S.titleBn)}</h1><div class="pill"><img src="mgi-l.png" alt="">${U.esc(S.distBn)}<img src="mgi-r.png" alt=""></div><p>${U.esc(S.addrBn)}</p><p>${U.esc(S.phoneBn)}</p><p>${U.esc(S.phone2Bn)}</p></div><img src="hdr-right.png" alt=""></div>
      <div class="ff"><div>এস আর: ${dv(s.sr)}</div><div>মার্কেট: ${dv(s.market)}</div><div>ডি এস আর: ${dv(s.dsr)}</div><div>ডেলিভারীর তারিখ: ${dv(bn(s.date.split('-').reverse().join('/')))}</div></div>
      <table class="ft"><colgroup><col style="width:27%"><col style="width:7%"><col style="width:6.5%"><col style="width:9.5%"><col style="width:27%"><col style="width:7%"><col style="width:6.5%"><col style="width:9.5%"></colgroup>
      <thead><tr>${th}${th}</tr></thead><tbody>${[...Array(n)].map((_, i) => `<tr>${cells(L[i])}${cells(R[i])}</tr>`).join('')}</tbody></table>
      <div class="fgt">সর্বমোট টাকা: ${bn(Sales.total(s).toLocaleString('en-IN', { maximumFractionDigits: 2 }))}</div>`;
    try { await document.fonts.ready; await Promise.all([...document.images].map(i => i.decode().catch(() => 0))); } catch (e) { }
    window.print();
  },

  /* ---- History ---- */
  filtered() {
    const h = Sales.H;
    return Store.db.sales.filter(s => (!h.d || s.date === h.d) && (!h.month || s.date.startsWith(h.month)) && (!h.from || s.date >= h.from) && (!h.to || s.date <= h.to)).sort((a, b) => a.date < b.date ? 1 : a.date > b.date ? -1 : b.updated > a.updated ? 1 : -1);
  },
  history(el) {
    const h = Sales.H, list = Sales.filtered(), f = (k, l, t = 'date') => `<div><label for="h_${k}">${l}</label><input id="h_${k}" type="${t}" value="${h[k]}"></div>`;
    el.innerHTML = `<div class="bar">${f('d', 'Search by date')}${f('month', 'Month and year', 'month')}${f('from', 'From')}${f('to', 'To')}<button class="btn" id="hc">Clear filters</button></div>
      <div class="grid"><div class="stat"><span>Sheets shown</span><b>${list.length}</b></div><div class="stat"><span>Total sales for selection</span><b>${U.money(Rep.sum(list))}</b></div></div>
      <div class="card tw"><table class="tbl"><thead><tr><th>Date</th><th class="n">Products sold</th><th class="n">Grand total</th><th></th></tr></thead><tbody>
      ${list.map(s => `<tr data-id="${s.id}"><td>${U.fdate(s.date)}</td><td class="n">${Sales.sold(s)}</td><td class="n">${U.money(Sales.total(s))}</td><td class="n">
      <button class="btn sm" data-a="v">View</button> <button class="btn sm" data-a="e">Edit</button> <button class="btn sm" data-a="p">Print</button> <button class="btn sm danger" data-a="x">Delete</button></td></tr>`).join('')}</tbody></table>
      ${list.length ? '' : '<div class="empty">No saved sales sheets match. Save a daily sheet to see it here.</div>'}</div>`;
    ['d', 'month', 'from', 'to'].forEach(k => U.$('#h_' + k, el).onchange = e => { h[k] = e.target.value; Sales.history(el); });
    U.$('#hc', el).onclick = () => { Sales.H = { d: '', month: '', from: '', to: '' }; Sales.history(el); };
    el.querySelectorAll('[data-a]').forEach(b => b.onclick = async () => {
      const s = Store.db.sales.find(x => x.id === b.closest('tr').dataset.id), a = b.dataset.a;
      if (a === 'p') Sales.printAsk(s);
      if (a === 'e') { if (Sales.dirty && !(await U.confirm('Discard changes?', 'The sheet open in Daily Sales has unsaved changes. Replace it?', 'Discard'))) return; Sales.cur = JSON.parse(JSON.stringify(s)); Sales.clean(); location.hash = '#sales'; }
      if (a === 'v') U.modal('Sales on ' + U.fdate(s.date), `<div class="tw" style="max-height:50vh"><table class="tbl"><thead><tr><th>Product</th><th>Unit</th><th class="n">Price</th><th class="n">Qty</th><th class="n">Total</th></tr></thead><tbody>${s.rows.map(r => `<tr><td>${U.esc(r.name)}</td><td>${r.unit}</td><td class="n">${U.money(r.price)}</td><td class="n">${r.qty}</td><td class="n">${U.money(Sales.line(r))}</td></tr>`).join('')}</tbody></table></div><p><b>Grand total: ${U.money(Sales.total(s))}</b></p>`);
      if (a === 'x' && await U.confirm('Delete sales record?', `Delete the sheet for <b>${U.fdate(s.date)}</b> (${U.money(Sales.total(s))})? Export a backup first if unsure.`)) {
        Store.db.sales = Store.db.sales.filter(x => x !== s); if (Sales.cur && Sales.cur.id === s.id) Sales.cur.id = null; Store.save(); U.toast('Sales record deleted'); Sales.history(el);
      }
    });
  }
};
