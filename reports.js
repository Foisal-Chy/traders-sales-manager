/* MGI Fresh | Dealership Management System. Developed by Md. Foisal Hossen Chowdhury, Department of CSE, International Islamic University Chittagong (IIUC). */
'use strict';
/* reports.js - financial overview and CSV export (calculations from saved sales only) */
const Rep = {
  st: { p: 'daily', from: '', to: '', a: '', b: '' },
  sum: a => U.r2(a.reduce((x, s) => x + Sales.total(s), 0)),
  key(date, p) {
    if (p === 'monthly') return date.slice(0, 7); if (p === 'yearly') return date.slice(0, 4);
    if (p === 'weekly') { const d = new Date(date + 'T00:00:00'); d.setDate(d.getDate() - (d.getDay() + 6) % 7); return U.ymd(d); }
    return date;
  },
  group(p) {
    const m = {}; Store.db.sales.forEach(s => { const k = Rep.key(s.date, p), x = m[k] || (m[k] = { k, total: 0, n: 0 }); x.total = U.r2(x.total + Sales.total(s)); x.n++; });
    return Object.values(m).sort((a, b) => a.k < b.k ? -1 : 1);
  },
  productStats(from, to) {
    const m = {};
    Store.db.sales.filter(s => (!from || s.date >= from) && (!to || s.date <= to)).forEach(s => s.rows.forEach(r => {
      if (!Sales.has(r)) return; const k = r.pid + '|' + r.unit, x = m[k] || (m[k] = { name: r.name, unit: r.unit, qty: 0, rev: 0 });
      x.qty = U.r2(x.qty + (r.qty || 0)); x.rev = U.r2(x.rev + Sales.line(r));
    }));
    return Object.values(m).sort((a, b) => b.rev - a.rev);
  },
  render(el) {
    const st = Rep.st, g = Rep.group(st.p), ps = Rep.productStats(st.from, st.to), tot = Rep.sum(ps.length ? [{ rows: ps.map(p => ({ price: p.rev, qty: 1 })) }] : []);
    const day = d => Rep.sum(Store.db.sales.filter(s => s.date === d)), A = day(st.a), B = day(st.b), diff = U.r2(B - A);
    const fld = (k, l, t = 'date') => `<div><label for="r_${k}">${l}</label><input id="r_${k}" type="${t}" value="${st[k]}"></div>`;
    el.innerHTML = `<div class="bar"><div><label for="r_p">Sales period</label><select id="r_p">${['daily', 'weekly', 'monthly', 'yearly'].map(p => `<option value="${p}" ${p === st.p ? 'selected' : ''}>${p[0].toUpperCase() + p.slice(1)}</option>`).join('')}</select></div>
      <button class="btn" id="r_xlsx"><i data-lucide="file-spreadsheet"></i>Export Excel</button><button class="btn" id="r_csv"><i data-lucide="download"></i>Export sales CSV</button><button class="btn" id="r_pcsv"><i data-lucide="download"></i>Export product report CSV</button></div>
      <div class="card"><h3>${st.p[0].toUpperCase() + st.p.slice(1)} sales ${st.p === 'weekly' ? '(week starting Monday)' : ''}</h3><div class="chart"><canvas id="rc"></canvas></div>
      ${g.length ? `<div class="tw" style="max-height:260px;margin-top:12px"><table class="tbl"><thead><tr><th>Period</th><th class="n">Sheets</th><th class="n">Total sales</th></tr></thead><tbody>${g.slice().reverse().map(x => `<tr><td>${x.k}</td><td class="n">${x.n}</td><td class="n">${U.money(x.total)}</td></tr>`).join('')}</tbody></table></div>` : '<div class="empty">No saved sales yet.</div>'}</div>
      <div class="card"><h3>Product-wise sales and best sellers</h3><div class="bar">${fld('from', 'From')}${fld('to', 'To')}</div>
      ${ps.length ? `<div class="tw rt" style="max-height:340px"><table class="tbl"><thead><tr><th>#</th><th>Product</th><th class="n">Total quantity sold</th><th class="n">Revenue</th><th class="n">Share</th></tr></thead><tbody>${ps.map((p, i) => `<tr><td class="hm" data-l="#">${i + 1}</td><td class="k" data-l="Product">${U.esc(p.name)}</td><td class="n" data-l="Quantity sold">${p.qty} ${U.esc(p.unit)}</td><td class="n" data-l="Revenue">${U.money(p.rev)}</td><td class="n" data-l="Share">${tot ? U.r2(p.rev / tot * 100) : 0}%</td></tr>`).join('')}</tbody></table></div>` : '<div class="empty">No product sales in this range.</div>'}</div>
      <div class="card"><h3>Compare two dates</h3><div class="bar">${fld('a', 'Date A')}${fld('b', 'Date B')}</div>
      ${st.a && st.b ? `<div class="grid"><div class="stat"><span>${U.fdate(st.a)}</span><b>${U.money(A)}</b></div><div class="stat"><span>${U.fdate(st.b)}</span><b>${U.money(B)}</b></div><div class="stat"><span>Difference (B minus A)</span><b>${U.money(diff)}${A ? ` (${U.r2(diff / A * 100)}%)` : ''}</b></div></div>` : '<p class="muted">Choose two dates to compare their total sales.</p>'}</div>`;
    U.chart('rc', 'bar', g.map(x => x.k), g.map(x => x.total), 'Sales');
    ['p', 'from', 'to', 'a', 'b'].forEach(k => U.$('#r_' + k, el).onchange = e => { st[k] = e.target.value; Rep.render(el); U.icons(); });
    U.$('#r_xlsx', el).onclick = Biz.xlsx;
    U.$('#r_csv', el).onclick = () => {
      const rows = [['Date', 'SR', 'DSR', 'Market', 'Product', 'Sold by', 'Unit price', 'Quantity', 'Second unit', 'Second price', 'Second qty', 'Total price']];
      Store.db.sales.slice().sort((a, b) => a.date < b.date ? -1 : 1).forEach(s => s.rows.filter(Sales.has).forEach(r => rows.push([s.date, s.sr || '', s.dsr || '', s.market || '', r.name, r.unit, r.price.toFixed(2), r.qty, r.pe ? (r.pu || 'Piece') : '', r.pe ? (r.pp || 0).toFixed(2) : '', r.pe ? r.pq || 0 : '', Sales.line(r).toFixed(2)])));
      U.download('mgi-sales-report-' + U.today() + '.csv', U.toCSV(rows), 'text/csv'); U.toast('Sales CSV exported');
    };
    U.$('#r_pcsv', el).onclick = () => { U.download('mgi-product-report-' + U.today() + '.csv', U.toCSV([['Product', 'Sold by', 'Quantity sold', 'Revenue'], ...ps.map(p => [p.name, p.unit, p.qty, p.rev.toFixed(2)])]), 'text/csv'); U.toast('Product report exported'); };
  }
};
