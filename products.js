/* MGI Fresh | Dealership Management System. Developed by Md. Foisal Hossen Chowdhury, Department of CSE, International Islamic University Chittagong (IIUC). */
'use strict';
/* products.js - product management */
const UNITS = ['Carton', 'Piece', 'Bosta', 'KG', 'Gram', '10 g', '50 g', '100 g', '200 g', '250 g', '500 g', '1 KG', '2 KG', '5 KG', '10 KG', '25 KG', '50 KG'];
/* All units: built-in list plus any custom unit already used on a product */
const allUnits = () => [...new Set([...UNITS, ...Store.db.products.map(p => p.unit)])];
/* Real product list from the printed sheet: name|category|unit|price|column(L/R)|printed row. Prices start at 0 - set them in Products. */
const SELL = ['Carton', 'Piece', 'Dozen', 'Bosta', 'KG', 'Litre'];
const SEED = `ফ্রেশ দুধ- ৫০০ গ্রাম|Milk||436.5|L|1|Piece
ফ্রেশ দুধ- ২৫০ গ্রাম|Milk||217|L|2|Piece
ফ্রেশ দুধ- ৭৫ গ্রাম|Milk||69|L|3|Piece
ফ্রেশ দুধ- ২৫ গ্রাম|Milk||254|L|4|Dozen
ফ্রেশ দুধ- ১৫ গ্রাম|Milk||150|L|5|Dozen
ফ্রেশ দুধ- ১০ গ্রাম|Milk||96|L|6|Dozen
সুপার পিওর দুধ - ২ কেজি|Super Pure Milk||1300|L|8|Bosta
সুপার পিওর দুধ - ১ কেজি|Super Pure Milk||665|L|9|Piece
সুপার পিওর দুধ - ৫০০ গ্রাম|Super Pure Milk||340|L|10|Piece
সুপার পিওর দুধ - ২০০ গ্রাম|Super Pure Milk||143|L|11|Piece
সুপার পিওর দুধ - ৫০ গ্রাম|Super Pure Milk||41|L|12|Piece
সুপার পিওর দুধ - ১০ গ্রাম|Super Pure Milk||96|L|13|Piece
সুপার পিওর দুধ - ৫ গ্রাম|Super Pure Milk||96|L|14|Piece
চা পাতা প্রিমিয়াম- ৪০০ গ্রাম|Tea||212|L|16|Piece
চা পাতা প্রিমিয়াম- ২০০ গ্রাম|Tea||107|L|17|Piece
চা পাতা প্রিমিয়াম- ১০০ গ্রাম|Tea||520|L|18|Piece
চা পাতা প্রিমিয়াম- ৫০ গ্রাম|Tea||530|L|19|Piece
চা পাতা- ১৫ গ্রাম|Tea||7.5|L|20|Piece
চা পাতা দানাদার- ৫০০ গ্রাম|Tea||440|L|21|Piece
চা পাতা দানাদার- ২৫০ গ্রাম|Tea||442|L|22|Piece
ফ্রেশ গোল্ড টি CP- ৫০০ গ্রাম|Tea||450|L|23|Piece
ফ্রেশ গোল্ড টি NCP- ৫০০ গ্রাম|Tea||440|L|24|Piece
ফ্রেশ টি ব্যাগ- ১০০ গ্রাম|||78|L|25|Piece
সেভার টি ব্যাগ|Tea|Pack|580|L|26|Bosta
ফ্রেশ চিনি - ১ কেজি|Sugar||108|L|28|Piece
ফ্রেশ চিনি - ৫০০ গ্রাম|Sugar||55|L|29|Piece
ফ্রেশ ময়দা- ২৫ কেজি|Flour||1375|R|1|Bosta
ফ্রেশ ময়দা- ১ কেজি|Flour||74|R|2|Piece
ফ্রেশ আটা- ১ কেজি|Flour||52|R|3|Piece
ফ্রেশ আটা- ২ কেজি|Flour||103|R|4|Piece
ফ্রেশ আটা- ৫ কেজি|Flour||255|R|5|Piece
ফ্রেশ আটা- ২৫ কেজি|Flour||1250|R|6|Bosta
হোল হুইট আটা - ১ কেজি|Flour||61|R|7|Piece
মিক্স ময়দা|Flour|Pack|50|R|8|Piece
ফ্রেশ সুজি- ৫০০ গ্রাম|Flour||38.5|R|9|Piece
ফ্রেশ পানি- ৮ লিটার|Water||0|R|11|Carton
ফ্রেশ পানি- ৫ লিটার|Water||0|R|12|Carton
ফ্রেশ পানি- ২ লিটার|Water||165|R|13|Carton
ফ্রেশ পানি- ১ লিটার|Water||215|R|14|Carton
ফ্রেশ পানি- ৫০০ এম.এল.|Water||250|R|15|Carton
ফ্রেশ পানি- ৩৩০ এম.এল.|Water||0|R|16|Carton
ফ্রেশ পানি- ২৫০ এম.এল.|Water||160|R|17|Carton
ফ্রেশ আপ- ১ লিটার|Drinks||0|R|19|Carton
ফ্রেশ গুগলি- ১ লিটার|Drinks||0|R|20|Carton
ফ্রেশ গুগলি- ৫০০ গ্রাম|Drinks||0|R|21|Carton
ফ্রেশ গুগলি- ২৫০ গ্রাম|Drinks||0|R|22|Carton
ফ্রেশ সয়াবিন তেল- ৫ লিটার|Oil||0|R|24|Carton
ফ্রেশ সয়াবিন তেল- ৩ লিটার|Oil||0|R|25|Carton
ফ্রেশ সয়াবিন তেল- ২ লিটার|Oil||0|R|26|Carton
ফ্রেশ সয়াবিন তেল- ১ লিটার|Oil||0|R|27|Carton
ফ্রেশ সয়াবিন তেল- ৫০০ মিলিলিটার|Oil||0|R|28|Carton
ফ্রেশ সয়াবিন তেল- ২৫০ মিলিলিটার|Oil||0|R|29|Carton
ফ্রেশ পলি সয়াবিন তেল- ১ লিটার|Oil||0|R|30|Carton`;

const Prod = {
  q: '', cat: '', unit: '',
  find: id => Store.db.products.find(p => p.id.toLowerCase() === String(id).trim().toLowerCase()),
  /* Ids already used by products, saved sales or stock, so a new product never inherits an old product's history */
  usedIds() { const s = new Set(Store.db.products.map(p => String(p.id).toLowerCase())); Store.db.sales.forEach(x => x.rows.forEach(r => s.add(String(r.pid).toLowerCase()))); Store.db.stock.forEach(e => s.add(String(e.pid).toLowerCase())); return s; },
  nextId() { const u = Prod.usedIds(); let n = Store.db.products.length + 1; while (u.has('p' + String(n).padStart(3, '0'))) n++; return 'P' + String(n).padStart(3, '0'); },
  /* Builds the product list that matches the printed sheet */
  build() { return SEED.split('\n').map((l, i) => { const [name, category, unit, price, col, row, su] = l.split('|'); return { id: 'P' + String(i + 1).padStart(3, '0'), name, category, unit: unit || name.split('-').pop().trim(), price: +price, desc: '', col, row: +row, su: su || 'Piece', pp: 0, pu: Prod.rulePu(name) }; }); },
  key: s => String(s).replace(/\s+/g, ''),
  /* The same product listed twice (same name): keep one, move its history to it, drop the other */
  dedupe() {
    const db = Store.db, by = {}, uses = id => db.sales.reduce((a, s) => a + s.rows.filter(r => r.pid === id).length, 0) + db.stock.filter(e => e.pid === id).length;
    db.products.forEach(p => (by[Prod.key(p.name)] = by[Prod.key(p.name)] || []).push(p));
    const groups = Object.values(by).filter(g => g.length > 1); if (!groups.length) return 0;
    Store.keepPrev(); let n = 0;
    groups.forEach(g => {
      g.sort((a, b) => uses(b.id) - uses(a.id) || (b.price > 0) - (a.price > 0)); const keep = g[0];
      g.slice(1).forEach(d => {
        ['price', 'su', 'pu', 'pp', 'ppc', 'ppb', 'lit', 'min', 'col', 'row', 'category', 'desc', 'unit'].forEach(k => { if (!keep[k] && d[k]) keep[k] = d[k]; });
        db.sales.forEach(s => s.rows.forEach(r => { if (r.pid === d.id) r.pid = keep.id; })); db.stock.forEach(e => { if (e.pid === d.id) e.pid = keep.id; }); db.priceLog.forEach(x => { if (x.pid === d.id) x.pid = keep.id; });
        db.products = db.products.filter(p => p !== d); n++;
      });
    });
    Store.save(); return n;
  },
  /* Products in printed-sheet order (left column then right column, by row) */
  sorted() { const k = p => (p.col === 'L' ? 0 : p.col === 'R' ? 1 : 2) * 1000 + (p.row || 0); return Store.db.products.map((p, i) => [p, i]).sort((a, b) => k(a[0]) - k(b[0]) || a[1] - b[1]).map(x => x[0]); },
  /* One-time: new sheet positions, renamed Gold Tea, new products, and a default 'sold by' unit */
  migrateLayout() {
    const S = Store.db.settings, P = Store.db.products; let ch = false;
    P.forEach(p => { if (!p.su) { p.su = 'Piece'; ch = true; } });
    if ((S.layoutV || 0) < 2 && P.some(p => p.col)) {
      const old = P.find(p => p.name === 'ফ্রেশ গোল্ড টি- ৫০০ গ্রাম'); if (old) old.name = 'ফ্রেশ গোল্ড টি CP- ৫০০ গ্রাম';
      Prod.build().forEach(b => { const x = P.find(q => Prod.key(q.name) === Prod.key(b.name)); if (x) { x.col = b.col; x.row = b.row; } else { b.id = Prod.nextId(); P.push(b); } }); ch = true;
    }
    if (P.some(p => p.col)) S.layoutV = 2; if (ch) Store.save();
  },
  seed() { const db = Store.db; if (db.settings.seeded || db.products.length) return; db.products = Prod.build(); db.settings.seeded = true; db.settings.sheetAsked = true; Store.save(); },
  /* One-time: products from the sheet get their written pack size (e.g. ৫০০ গ্রাম) as the unit */
  migrateUnits() { const S = Store.db.settings; if (S.unitV) return; Store.db.products.forEach(p => { if (p.col && p.row && ['Carton', 'Bosta'].includes(p.unit) && p.name.includes('-')) p.unit = p.name.split('-').pop().trim(); }); S.unitV = 1; Store.save(); },
  /* One-time: two names were misread from the photo (৭৫ গ্রাম, টি ব্যাগ); fix them in saved data and history too */
  migrateNames() {
    const S = Store.db.settings; if (S.nameV) return;
    const map = { 'ফ্রেশ দুধ- ৯৫ গ্রাম': 'ফ্রেশ দুধ- ৭৫ গ্রাম', 'ফ্রেশ ট্রি ব্যাগ- ১০০ গ্রাম': 'ফ্রেশ টি ব্যাগ- ১০০ গ্রাম' };
    Store.db.products.forEach(p => {
      const n = map[p.name]; if (!n) return; const o = p.name; if (p.unit === o.split('-').pop().trim()) p.unit = n.split('-').pop().trim(); p.name = n;
      Store.db.sales.forEach(s => s.rows.forEach(r => { if (r.pid === p.id && r.name === o) r.name = n; })); Store.db.stock.forEach(e => { if (e.pid === p.id && e.name === o) e.name = n; });
    });
    S.nameV = 1; Store.save();
  },
  /* One-time: fill in the rates (and P / D / B sold-by units) from the rate list. A price you already set is never changed. */
  migratePrices() {
    const S = Store.db.settings; if (S.priceV) return;
    Prod.build().forEach(b => { if (!(b.price > 0)) return; const p = Store.db.products.find(x => Prod.key(x.name) === Prod.key(b.name)); if (!p) return; if (!(p.price > 0)) p.price = b.price; if (b.su !== 'Carton' && (p.su || 'Piece') === 'Carton') p.su = b.su; });
    if (Store.db.products.some(p => p.col)) { S.priceV = 1; Store.save(); }
  },
  /* The rule for 'sold by': most products Piece, rate above 1000 Bosta, the three small milk packs (25, 15, 10 gram) Dozen, water Carton, Saver tea bag Bosta */
  /* Liquids (water, soybean oil, Googly, Up) can also be sold by the Litre, besides the Carton */
  rulePu: n => /পানি|সয়াবিন|গুগলি|ফ্রেশ আপ/.test(n) ? 'Litre' : 'Piece',
  ruleSu(p) {
    const n = p.name; if (/পানি|সয়াবিন|গুগলি|ফ্রেশ আপ/.test(n)) return 'Carton'; if (n.includes('সেভার')) return 'Bosta';
    if (/^ফ্রেশ দুধ- (২৫|১৫|১০) গ্রাম$/.test(n)) return 'Dozen'; return p.price > 1000 ? 'Bosta' : 'Piece';
  },
  /* One-time: apply that rule to the products on the printed sheet */
  migrateSold() { const S = Store.db.settings; if (S.suV >= 2) return; if (Store.db.products.some(p => p.col)) { Store.db.products.forEach(p => { if (p.col) p.su = Prod.ruleSu(p); }); S.suV = 2; Store.save(); } },
  /* One-time: soybean oil, Googly and Up are sold like water (Carton, also by Litre) */
  migrateLiquids() {
    const S = Store.db.settings; if (S.liqV) return;
    if (Store.db.products.some(p => p.col)) { Store.db.products.forEach(p => { if (p.col && new RegExp('পানি|সয়াবিন|গুগলি|ফ্রেশ আপ').test(p.name)) { if (!p.pu || p.pu === 'Piece') p.pu = 'Litre'; if (p.su === 'Piece') p.su = 'Carton'; } }); S.liqV = 1; Store.save(); }
  },
  /* One-time: rate of চা পাতা- ১৫ গ্রাম is 7.5 (only if no price is set yet) */
  migratePrices2() {
    const S = Store.db.settings; if (S.priceV2) return;
    const p = Store.db.products.find(x => x.name === 'চা পাতা- ১৫ গ্রাম'); if (p && !(p.price > 0)) p.price = 7.5;
    if (Store.db.products.some(x => x.col)) { S.priceV2 = 1; Store.save(); }
  },
  useSheetList() {
    const old = Store.db.products, u = Prod.usedIds(); let n = 1;
    Store.db.products = Prod.build().map(b => { const o = old.find(p => Prod.key(p.name) === Prod.key(b.name)); if (o) return { ...b, ...o, price: o.price || b.price, col: b.col, row: b.row }; while (u.has('p' + String(n).padStart(3, '0'))) n++; const id = 'P' + String(n++).padStart(3, '0'); u.add(id.toLowerCase()); return { ...b, id }; });
    Store.db.settings.seeded = true; Store.db.settings.layoutV = 2; Sales.cur = null; Sales.clean(); Store.snap(); Store.save(); },
  filtered() {
    const q = Prod.q.toLowerCase();
    return Store.db.products.filter(p => (!q || (p.name + p.id + (p.category || '')).toLowerCase().includes(q)) && (!Prod.cat || p.category === Prod.cat) && (!Prod.unit || p.unit === Prod.unit));
  },
  render(el) {
    const cats = [...new Set(Store.db.products.map(p => p.category).filter(Boolean))].sort(), list = Prod.filtered();
    el.innerHTML = `${Store.db.products.some(p => !p.price) ? `<div class="note">${Store.db.products.filter(p => !p.price).length} products have no price yet. Type each price in the Price column below.</div>` : ''}<div class="bar"><div class="field grow"><label for="pq">Search products</label><input id="pq" style="width:100%" placeholder="Name, ID or category" value="${U.esc(Prod.q)}"></div>
      <div><label for="pc">Category</label><select id="pc"><option value="">All</option>${cats.map(c => `<option ${c === Prod.cat ? 'selected' : ''}>${U.esc(c)}</option>`).join('')}</select></div>
      <div><label for="pu">Unit</label><select id="pu"><option value="">All</option>${allUnits().map(u => `<option ${u === Prod.unit ? 'selected' : ''}>${U.esc(u)}</option>`).join('')}</select></div>
      <div class="row"><button class="btn primary" id="add"><i data-lucide="plus"></i>Add product</button><button class="btn" id="imp"><i data-lucide="upload"></i>Import CSV</button><button class="btn" id="exp"><i data-lucide="download"></i>Export CSV</button><input type="file" id="impf" accept=".csv,text/csv" hidden></div></div>
      <div class="card tw rt"><table class="tbl"><thead><tr><th>ID</th><th>Product</th><th>Category</th><th>Pack size</th><th>Sold by</th><th class="n">Price per unit (editable)</th><th></th></tr></thead><tbody>
      ${list.map(p => `<tr data-id="${U.esc(p.id)}"><td class="hm" data-l="ID">${U.esc(p.id)}</td><td class="k" data-l="Product">${U.esc(p.name)}</td><td data-l="Category">${U.esc(p.category || '-')}</td><td data-l="Pack size">${U.esc(p.unit)}</td><td data-l="Sold by"><select data-su aria-label="Sold by of ${U.esc(p.name)}">${SELL.map(u => `<option ${u === (p.su || 'Piece') ? 'selected' : ''}>${u}</option>`).join('')}</select></td><td class="n" data-l="Price per unit"><input class="in" type="number" min="0" step="any" value="${p.price}" aria-label="Price of ${U.esc(p.name)}"></td>
      <td class="n" data-l=""><button class="ic" data-h aria-label="Price history of ${U.esc(p.name)}"><i data-lucide="history"></i></button><button class="ic" data-e aria-label="Edit ${U.esc(p.name)}"><i data-lucide="pencil"></i></button><button class="ic" data-d aria-label="Delete ${U.esc(p.name)}"><i data-lucide="trash-2"></i></button></td></tr>`).join('')}</tbody></table>
      ${list.length ? '' : '<div class="empty">No products found. Add a product or change the filters.</div>'}</div><p class="muted">${list.length} of ${Store.db.products.length} products. Changing a price here does not alter saved sales sheets.</p>`;
    const $ = s => U.$(s, el);
    $('#pq').oninput = e => { Prod.q = e.target.value; const pos = e.target.selectionStart; Prod.render(el); const i = U.$('#pq'); i.focus(); i.setSelectionRange(pos, pos); };
    $('#pc').onchange = e => { Prod.cat = e.target.value; Prod.render(el); };
    $('#pu').onchange = e => { Prod.unit = e.target.value; Prod.render(el); };
    $('#add').onclick = () => Prod.edit(null, el);
    $('#exp').onclick = Prod.exportCSV;
    $('#imp').onclick = () => $('#impf').click();
    $('#impf').onchange = e => Prod.importCSV(e.target.files[0], el);
    el.querySelectorAll('tbody tr').forEach(tr => {
      const p = Prod.find(tr.dataset.id);
      tr.querySelector('input').onchange = e => { const n = U.num(e.target.value); if (!(n >= 0)) { e.target.classList.add('bad'); return U.toast('Price must be a number, 0 or more', 'err'); } e.target.classList.remove('bad'); p.price = U.r2(n); Store.save(); U.toast('Price updated for ' + p.name); };
      tr.querySelector('[data-su]').onchange = e => { p.su = e.target.value; Store.save(); U.toast('Saved'); };
      tr.querySelector('[data-h]').onclick = () => Biz.priceHistory(p);
      tr.querySelector('[data-e]').onclick = () => Prod.edit(p, el);
      tr.querySelector('[data-d]').onclick = async () => { if (await U.confirm('Delete product?', `Delete <b>${U.esc(p.name)}</b>? Saved sales keep their own copy of this product.`)) { const i = Store.db.products.indexOf(p); Store.db.products.splice(i, 1); Store.save(); Prod.render(el); U.icons(); U.toastUndo('Product deleted', () => Store.db.products.splice(i, 0, p)); } };
    });
  },
  edit(p, el) {
    const cats = [...new Set(Store.db.products.map(x => x.category).filter(Boolean))];
    const body = `<div class="fg"><div><label for="f_id">Product ID</label><input id="f_id" value="${U.esc(p ? p.id : Prod.nextId())}" ${p ? 'readonly' : ''}></div>
      <div><label for="f_name">Product name</label><input id="f_name" value="${U.esc(p?.name)}"></div>
      <div><label for="f_cat">Category (optional)</label><input id="f_cat" list="cl" value="${U.esc(p?.category)}"><datalist id="cl">${cats.map(c => `<option value="${U.esc(c)}">`).join('')}</datalist></div>
      <div><label for="f_unit">Unit or pack size (pick or type your own)</label><input id="f_unit" list="ul" value="${U.esc(p ? p.unit : 'Carton')}"><datalist id="ul">${allUnits().map(u => `<option value="${U.esc(u)}">`).join('')}</datalist></div>
      <div><label for="f_price">Price per unit (৳)</label><input id="f_price" type="number" min="0" step="any" value="${p ? p.price : ''}"></div>
      <div><label for="f_su">Sold by (rate unit)</label><select id="f_su">${SELL.map(u => `<option ${(p?.su || 'Piece') === u ? 'selected' : ''}>${u}</option>`).join('')}</select></div>
      <div class="full"><label for="f_desc">Description (optional)</label><textarea id="f_desc" rows="2">${U.esc(p?.desc)}</textarea></div>
      <details class="meta full"><summary>More options: second unit, stock, sheet position</summary><div class="fg" style="margin-top:10px"><div><label for="f_pp">Second-unit price (optional)</label><input id="f_pp" type="number" min="0" step="any" value="${p?.pp || ''}"></div><div><label for="f_pu">Second unit (for mixed sales)</label><select id="f_pu">${['Piece', 'Litre', 'Dozen'].map(u => `<option ${(p?.pu || 'Piece') === u ? 'selected' : ''}>${u}</option>`).join('')}</select></div><div><label for="f_lit">Litres in 1 piece (for stock)</label><input id="f_lit" type="number" min="0" step="any" value="${p?.lit || ''}"></div><div><label for="f_ppc">Pieces in 1 carton (for exact stock)</label><input id="f_ppc" type="number" min="0" step="any" value="${p?.ppc || ''}"></div><div><label for="f_ppb">Pieces in 1 bosta (optional)</label><input id="f_ppb" type="number" min="0" step="any" value="${p?.ppb || ''}"></div><div><label for="f_min">Low stock alert at (in sold-by unit)</label><input id="f_min" type="number" min="0" step="any" value="${p?.min || ''}"></div><div><label for="f_col">Printed sheet column</label><select id="f_col"><option value="">Auto</option><option value="L" ${p?.col === 'L' ? 'selected' : ''}>Left</option><option value="R" ${p?.col === 'R' ? 'selected' : ''}>Right</option></select></div><div><label for="f_row">Printed sheet row no.</label><input id="f_row" type="number" min="0" step="1" value="${p?.row || ''}"></div></div></details></div><p id="f_err" style="color:var(--danger);margin:8px 0 0"></p>`;
    let out;
    U.modal(p ? 'Edit product' : 'Add product', body, [{ label: 'Cancel', v: false }, { label: 'Save product', v: true, cls: 'primary' }], () => {
      const v = id => U.$('#' + id).value.trim(), err = m => { U.$('#f_err').textContent = m; return false; };
      const id = v('f_id'), name = v('f_name'), price = U.num(v('f_price'));
      if (!id) return err('Product ID is required.'); if (!name) return err('Product name is required.'); if (Store.db.products.some(x => x !== p && Prod.key(x.name) === Prod.key(name))) return err('A product with this name already exists.');
      if (!p && Prod.find(id)) return err('That Product ID already exists.');
      if (!v('f_unit')) return err('Unit is required.');
      if (!(price >= 0)) return err('Price must be a number, 0 or more.');
      out = { id, name, category: v('f_cat'), unit: v('f_unit'), price: U.r2(price), desc: v('f_desc'), su: v('f_su'), pu: v('f_pu'), lit: Math.max(0, U.num(v('f_lit')) || 0), pp: U.r2(Math.max(0, U.num(v('f_pp')) || 0)), ppc: Math.max(0, U.num(v('f_ppc')) || 0), ppb: Math.max(0, U.num(v('f_ppb')) || 0), min: Math.max(0, U.num(v('f_min')) || 0), col: v('f_col'), row: Math.max(0, Math.floor(U.num(v('f_row')) || 0)) };
    }).then(ok => { if (!ok) return; p ? Object.assign(p, out) : Store.db.products.push(out); Store.save(); U.toast('Product saved'); Prod.render(el); });
  },
  exportCSV() { U.download('mgi-products-' + U.today() + '.csv', U.toCSV([['id', 'name', 'category', 'unit', 'price', 'description', 'sold_by', 'piece_price', 'sheet_col', 'sheet_row', 'low_stock_alert'], ...Store.db.products.map(p => [p.id, p.name, p.category, p.unit, p.price, p.desc, p.su || 'Piece', p.pp || 0, p.col || '', p.row || '', p.min || 0])]), 'text/csv'); },
  async importCSV(file, el) {
    if (!file) return;
    const rows = U.parseCSV(await file.text()), head = (rows.shift() || []).map(h => h.trim().toLowerCase());
    const col = n => head.indexOf(n); let add = [], upd = [], bad = 0;
    if (['id', 'name', 'unit', 'price'].some(n => col(n) < 0)) return U.toast('CSV needs columns: id, name, category, unit, price, description', 'err');
    rows.forEach(r => {
      const rawUnit = (r[col('unit')] || '').trim(), unit = UNITS.find(u => u.toLowerCase() === rawUnit.toLowerCase()) || rawUnit, price = U.num(r[col('price')]), id = (r[col('id')] || '').trim(), name = (r[col('name')] || '').trim();
      if (!id || !name || !unit || !(price >= 0)) return bad++;
      const rec = { id, name, category: (r[col('category')] || '').trim(), unit, price: U.r2(price), desc: (r[col('description')] || '').trim() };
      const g = n => (col(n) >= 0 ? (r[col(n)] || '').trim() : ''), su = SELL.find(u => u.toLowerCase() === g('sold_by').toLowerCase());
      if (su) rec.su = su; if (g('piece_price') !== '' && U.num(g('piece_price')) >= 0) rec.pp = U.r2(U.num(g('piece_price'))); if (['L', 'R'].includes(g('sheet_col').toUpperCase())) { rec.col = g('sheet_col').toUpperCase(); rec.row = Math.max(0, Math.floor(U.num(g('sheet_row')) || 0)); } if (U.num(g('low_stock_alert')) >= 0) rec.min = U.num(g('low_stock_alert'));
      (Prod.find(id) ? upd : add).push(rec);
    });
    if (!add.length && !upd.length) return U.toast('No valid rows found in CSV', 'err');
    if (await U.ask('Import products', `${add.length} new, ${upd.length} existing products to update, ${bad} invalid rows skipped.`, [{ label: 'Cancel', v: false }, { label: 'Import', v: true, cls: 'primary' }])) {
      add.forEach(r => !Prod.find(r.id) && Store.db.products.push(r)); upd.forEach(r => Object.assign(Prod.find(r.id), r));
      Store.save(); U.toast('Products imported'); Prod.render(el);
    }
  }
};
