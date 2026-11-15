'use strict';
/* dashboard.js - summary cards, charts and recent activity (all from saved data) */
const Dash = {
  /* Animated count-up for the stat cards */
  count(el) {
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    el.querySelectorAll('[data-v]').forEach(b => { const to = +b.dataset.v, m = b.dataset.m === '1', t0 = performance.now();
      const f = now => { const k = Math.min(1, (now - t0) / 700), v = k === 1 ? to : to * (1 - Math.pow(1 - k, 3)); b.textContent = m ? U.money(v) : Math.round(v); if (k < 1) requestAnimationFrame(f); }; requestAnimationFrame(f); });
  },
  render(el) {
    const s = Store.db.sales, t = U.today(), days = new Set(s.map(x => x.date)).size, all = Rep.sum(s);
    const stats = [["Today's total sales", Rep.sum(s.filter(x => x.date === t)), 1, 'banknote'], ['Monthly sales', Rep.sum(s.filter(x => x.date.startsWith(t.slice(0, 7)))), 1, 'calendar-days'], ['Total products', Store.db.products.length, 0, 'package'], ['Total transactions', s.length, 0, 'receipt'], ['Average daily sales', days ? U.r2(all / days) : 0, 1, 'trending-up']];
    const top = Rep.productStats().slice(0, 5), recent = [...s].sort((a, b) => b.updated > a.updated ? 1 : -1).slice(0, 6);
    const lb = Store.db.settings.lastBackup, stale = s.length && (!lb || (Date.now() - new Date(lb)) / 864e5 > 7);
    el.innerHTML = `${stale ? '<div class="note">No backup in the last 7 days. Your data is stored only in this browser. <button class="btn sm" id="bk">Download backup now</button></div>' : ''}<div class="grid">${stats.map(x => `<div class="stat"><span class="si"><i data-lucide="${x[3]}"></i></span><span>${x[0]}</span><b data-v="${x[1]}" data-m="${x[2]}">${x[2] ? U.money(x[1]) : x[1]}</b></div>`).join('')}</div>
      <div class="grid two"><div class="card"><h3>Sales overview (last 14 days)</h3><div class="chart"><canvas id="c1"></canvas></div></div><div class="card"><h3>Monthly performance (last 12 months)</h3><div class="chart"><canvas id="c2"></canvas></div></div></div>
      <div class="grid two"><div class="card"><h3>Top selling products</h3>${top.length ? `<table class="tbl">${top.map(p => `<tr><td>${U.esc(p.name)}</td><td class="n">${p.qty} ${p.unit}</td><td class="n">${U.money(p.rev)}</td></tr>`).join('')}</table>` : '<div class="empty">No sales yet.</div>'}</div>
      <div class="card"><h3>Recent sales activity</h3>${recent.length ? `<table class="tbl">${recent.map(x => `<tr><td>${U.fdate(x.date)}</td><td class="n">${Sales.sold(x)} products</td><td class="n">${U.money(Sales.total(x))}</td></tr>`).join('')}</table>` : '<div class="empty">Save a daily sales sheet to see activity here.</div>'}</div></div>`;
    Dash.count(el);
    const bk = U.$('#bk', el); if (bk) bk.onclick = () => { Store.exportJSON(); Dash.render(el); U.icons(); };
    const dm = {}; s.forEach(x => dm[x.date] = U.r2((dm[x.date] || 0) + Sales.total(x)));
    const d14 = [...Array(14)].map((_, i) => { const d = new Date(); d.setDate(d.getDate() - 13 + i); return U.ymd(d); });
    U.chart('c1', 'line', d14.map(d => d.slice(5)), d14.map(d => dm[d] || 0), 'Sales');
    const m12 = [...Array(12)].map((_, i) => { const d = new Date(); d.setDate(1); d.setMonth(d.getMonth() - 11 + i); return U.ymd(d).slice(0, 7); });
    U.chart('c2', 'bar', m12, m12.map(m => Rep.sum(s.filter(x => x.date.startsWith(m)))), 'Sales');
  }
};
