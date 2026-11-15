'use strict';
/* products.js - product management */
const UNITS = ['Carton', 'Piece', 'Bosta', 'KG', 'Gram', '10 g', '50 g', '100 g', '200 g', '250 g', '500 g', '1 KG', '2 KG', '5 KG', '10 KG', '25 KG', '50 KG'];
/* All units: built-in list plus any custom unit already used on a product */
const allUnits = () => [...new Set([...UNITS, ...Store.db.products.map(p => p.unit)])];
/* Real product list from the printed sheet: name|category|unit|price|column(L/R)|printed row. Prices start at 0 - set them in Products. */
const SEED = `ফ্রেশ দুধ- ৫০০ গ্রাম|Milk|Carton|0|L|1
ফ্রেশ দুধ- ২৫০ গ্রাম|Milk|Carton|0|L|2
ফ্রেশ দুধ- ৯৫ গ্রাম|Milk|Carton|0|L|3
ফ্রেশ দুধ- ২৫ গ্রাম|Milk|Carton|0|L|4
ফ্রেশ দুধ- ১৫ গ্রাম|Milk|Carton|0|L|5
ফ্রেশ দুধ- ১০ গ্রাম|Milk|Carton|0|L|6
সুপার পিওর দুধ - ২ কেজি|Super Pure Milk|Carton|0|L|8
সুপার পিওর দুধ - ১ কেজি|Super Pure Milk|Carton|0|L|9
সুপার পিওর দুধ - ৫০০ গ্রাম|Super Pure Milk|Carton|0|L|10
সুপার পিওর দুধ - ২০০ গ্রাম|Super Pure Milk|Carton|0|L|11
সুপার পিওর দুধ - ৫০ গ্রাম|Super Pure Milk|Carton|0|L|12
সুপার পিওর দুধ - ১০ গ্রাম|Super Pure Milk|Carton|0|L|13
সুপার পিওর দুধ - ৫ গ্রাম|Super Pure Milk|Carton|0|L|14
চা পাতা প্রিমিয়াম- ৪০০ গ্রাম|Tea|Carton|0|L|16
চা পাতা প্রিমিয়াম- ২০০ গ্রাম|Tea|Carton|0|L|17
চা পাতা প্রিমিয়াম- ১০০ গ্রাম|Tea|Carton|0|L|18
চা পাতা প্রিমিয়াম- ৫০ গ্রাম|Tea|Carton|0|L|19
চা পাতা দানাদার- ৫০০ গ্রাম|Tea|Carton|0|L|21
চা পাতা দানাদার- ২৫০ গ্রাম|Tea|Carton|0|L|22
ফ্রেশ গোল্ড টি- ৫০০ গ্রাম|Tea|Carton|0|L|23
ফ্রেশ ট্রি ব্যাগ- ১০০ গ্রাম|Tea|Carton|0|L|24
ফ্রেশ চিনি - ১ কেজি|Sugar|Carton|0|L|26
ফ্রেশ চিনি - ৫০০ গ্রাম|Sugar|Carton|0|L|27
ফ্রেশ ময়দা- ২৫ কেজি|Flour|Bosta|0|L|29
ফ্রেশ ময়দা- ১ কেজি|Flour|Carton|0|R|1
ফ্রেশ আটা- ১ কেজি|Flour|Carton|0|R|2
ফ্রেশ আটা- ২ কেজি|Flour|Carton|0|R|3
ফ্রেশ আটা- ৫ কেজি|Flour|Carton|0|R|4
হোল হুইট আটা - ১ কেজি|Flour|Carton|0|R|5
ফ্রেশ সুজি- ৫০০ গ্রাম|Flour|Carton|0|R|6
ফ্রেশ পানি- ৮ লিটার|Water|Carton|0|R|8
ফ্রেশ পানি- ৫ লিটার|Water|Carton|0|R|9
ফ্রেশ পানি- ২ লিটার|Water|Carton|0|R|10
ফ্রেশ পানি- ১ লিটার|Water|Carton|0|R|11
ফ্রেশ পানি- ৫০০ এম.এল.|Water|Carton|0|R|12
ফ্রেশ পানি- ৩৩০ এম.এল.|Water|Carton|0|R|13
ফ্রেশ পানি- ২৫০ এম.এল.|Water|Carton|0|R|14
ফ্রেশ আপ- ১ লিটার|Drinks|Carton|0|R|16
ফ্রেশ গুগলি- ১ লিটার|Drinks|Carton|0|R|17
ফ্রেশ গুগলি- ৫০০ গ্রাম|Drinks|Carton|0|R|18
ফ্রেশ গুগলি- ২৫০ গ্রাম|Drinks|Carton|0|R|19
ফ্রেশ সয়াবিন তেল- ৫ লিটার|Oil|Carton|0|R|23
ফ্রেশ সয়াবিন তেল- ৩ লিটার|Oil|Carton|0|R|24
ফ্রেশ সয়াবিন তেল- ২ লিটার|Oil|Carton|0|R|25
ফ্রেশ সয়াবিন তেল- ১ লিটার|Oil|Carton|0|R|26
ফ্রেশ সয়াবিন তেল- ৫০০ মিলিলিটার|Oil|Carton|0|R|27
ফ্রেশ সয়াবিন তেল- ২৫০ মিলিলিটার|Oil|Carton|0|R|28
ফ্রেশ পলি সয়াবিন তেল- ১ লিটার|Oil|Carton|0|R|29`;

const Prod = {
  q: '', cat: '', unit: '',
  find: id => Store.db.products.find(p => p.id.toLowerCase() === String(id).trim().toLowerCase()),
  nextId() { let n = Store.db.products.length + 1; while (Prod.find('P' + String(n).padStart(3, '0'))) n++; return 'P' + String(n).padStart(3, '0'); },
  /* Builds the product list that matches the printed sheet */
  build() { return SEED.split('\n').map((l, i) => { const [name, category, unit, price, col, row] = l.split('|'); return { id: 'P' + String(i + 1).padStart(3, '0'), name, category, unit, price: +price, desc: '', col, row: +row }; }); },
  seed() { const db = Store.db; if (db.settings.seeded || db.products.length) return; db.products = Prod.build(); db.settings.seeded = true; db.settings.sheetAsked = true; Store.save(); },
  useSheetList() { Store.db.products = Prod.build(); Store.db.settings.seeded = true; Sales.cur = null; Sales.clean(); Store.save(); },
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
      <div class="card tw"><table class="tbl"><thead><tr><th>ID</th><th>Product</th><th>Category</th><th>Unit</th><th class="n">Price per unit (editable)</th><th></th></tr></thead><tbody>
      ${list.map(p => `<tr data-id="${U.esc(p.id)}"><td>${U.esc(p.id)}</td><td>${U.esc(p.name)}</td><td>${U.esc(p.category || '-')}</td><td>${p.unit}</td><td class="n"><input class="in" type="number" min="0" step="any" value="${p.price}" aria-label="Price of ${U.esc(p.name)}"></td>
      <td class="n"><button class="ic" data-e aria-label="Edit ${U.esc(p.name)}"><i data-lucide="pencil"></i></button><button class="ic" data-d aria-label="Delete ${U.esc(p.name)}"><i data-lucide="trash-2"></i></button></td></tr>`).join('')}</tbody></table>
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
      tr.querySelector('[data-e]').onclick = () => Prod.edit(p, el);
      tr.querySelector('[data-d]').onclick = async () => { if (await U.confirm('Delete product?', `Delete <b>${U.esc(p.name)}</b>? Saved sales keep their own copy of this product.`)) { Store.db.products = Store.db.products.filter(x => x !== p); Store.save(); U.toast('Product deleted'); Prod.render(el); } };
    });
  },
  edit(p, el) {
    const cats = [...new Set(Store.db.products.map(x => x.category).filter(Boolean))];
    const body = `<div class="fg"><div><label for="f_id">Product ID</label><input id="f_id" value="${U.esc(p ? p.id : Prod.nextId())}" ${p ? 'readonly' : ''}></div>
      <div><label for="f_name">Product name${Bn.btn('f_name')}</label><input id="f_name" value="${U.esc(p?.name)}"></div>
      <div><label for="f_cat">Category (optional)${Bn.btn('f_cat')}</label><input id="f_cat" list="cl" value="${U.esc(p?.category)}"><datalist id="cl">${cats.map(c => `<option value="${U.esc(c)}">`).join('')}</datalist></div>
      <div><label for="f_unit">Unit or pack size (pick or type your own)</label><input id="f_unit" list="ul" value="${U.esc(p ? p.unit : 'Carton')}"><datalist id="ul">${allUnits().map(u => `<option value="${U.esc(u)}">`).join('')}</datalist></div>
      <div><label for="f_price">Price per unit (৳)</label><input id="f_price" type="number" min="0" step="any" value="${p ? p.price : ''}"></div>
      <div><label for="f_col">Printed sheet column</label><select id="f_col"><option value="">Auto</option><option value="L" ${p?.col === 'L' ? 'selected' : ''}>Left</option><option value="R" ${p?.col === 'R' ? 'selected' : ''}>Right</option></select></div><div><label for="f_row">Printed sheet row no.</label><input id="f_row" type="number" min="0" step="1" value="${p?.row || ''}"></div>
      <div class="full"><label for="f_desc">Description (optional)${Bn.btn('f_desc')}</label><textarea id="f_desc" rows="2">${U.esc(p?.desc)}</textarea></div></div><p id="f_err" style="color:var(--danger);margin:8px 0 0"></p>`;
    let out;
    U.modal(p ? 'Edit product' : 'Add product', body, [{ label: 'Cancel', v: false }, { label: 'Save product', v: true, cls: 'primary' }], () => {
      const v = id => U.$('#' + id).value.trim(), err = m => { U.$('#f_err').textContent = m; return false; };
      const id = v('f_id'), name = v('f_name'), price = U.num(v('f_price'));
      if (!id) return err('Product ID is required.'); if (!name) return err('Product name is required.');
      if (!p && Prod.find(id)) return err('That Product ID already exists.');
      if (!v('f_unit')) return err('Unit is required.');
      if (!(price >= 0)) return err('Price must be a number, 0 or more.');
      out = { id, name, category: v('f_cat'), unit: v('f_unit'), price: U.r2(price), desc: v('f_desc'), col: v('f_col'), row: Math.max(0, Math.floor(U.num(v('f_row')) || 0)) };
    }).then(ok => { if (!ok) return; p ? Object.assign(p, out) : Store.db.products.push(out); Store.save(); U.toast('Product saved'); Prod.render(el); });
  },
  exportCSV() { U.download('mgi-products-' + U.today() + '.csv', U.toCSV([['id', 'name', 'category', 'unit', 'price', 'description'], ...Store.db.products.map(p => [p.id, p.name, p.category, p.unit, p.price, p.desc])]), 'text/csv'); },
  async importCSV(file, el) {
    if (!file) return;
    const rows = U.parseCSV(await file.text()), head = (rows.shift() || []).map(h => h.trim().toLowerCase());
    const col = n => head.indexOf(n); let add = [], upd = [], bad = 0;
    if (['id', 'name', 'unit', 'price'].some(n => col(n) < 0)) return U.toast('CSV needs columns: id, name, category, unit, price, description', 'err');
    rows.forEach(r => {
      const rawUnit = (r[col('unit')] || '').trim(), unit = UNITS.find(u => u.toLowerCase() === rawUnit.toLowerCase()) || rawUnit, price = U.num(r[col('price')]), id = (r[col('id')] || '').trim(), name = (r[col('name')] || '').trim();
      if (!id || !name || !unit || !(price >= 0)) return bad++;
      const rec = { id, name, category: (r[col('category')] || '').trim(), unit, price: U.r2(price), desc: (r[col('description')] || '').trim() };
      (Prod.find(id) ? upd : add).push(rec);
    });
    if (!add.length && !upd.length) return U.toast('No valid rows found in CSV', 'err');
    if (await U.ask('Import products', `${add.length} new, ${upd.length} existing products to update, ${bad} invalid rows skipped.`, [{ label: 'Cancel', v: false }, { label: 'Import', v: true, cls: 'primary' }])) {
      add.forEach(r => !Prod.find(r.id) && Store.db.products.push(r)); upd.forEach(r => Object.assign(Prod.find(r.id), r));
      Store.save(); U.toast('Products imported'); Prod.render(el);
    }
  }
};
