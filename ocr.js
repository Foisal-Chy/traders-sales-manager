'use strict';
/* ocr.js - read a photographed sales sheet in the browser (Tesseract.js), review it, then load it into Daily Sales */
const Ocr = {
  load() {
    return window.Tesseract ? Promise.resolve() : new Promise((ok, no) => {
      const s = document.createElement('script'); s.src = 'https://cdn.jsdelivr.net/npm/tesseract.js@5.1.1/dist/tesseract.min.js';
      s.onload = ok; s.onerror = () => no(new Error('Could not load the reader. Check your internet connection.')); document.head.appendChild(s);
    });
  },
  lev(a, b) {
    const d = [...Array(a.length + 1)].map((_, i) => [i, ...Array(b.length).fill(0)]); for (let j = 1; j <= b.length; j++) d[0][j] = j;
    for (let i = 1; i <= a.length; i++) for (let j = 1; j <= b.length; j++) d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    return d[a.length][b.length];
  },
  tok: s => s.toLowerCase().replace(/[^a-z\s]/g, ' ').split(/\s+/).filter(w => w.length > 1 && !['kg', 'carton', 'piece', 'bosta', 'gram'].includes(w)),
  match(words) {
    let best = null, bs = 0;
    Store.db.products.forEach(p => { const pt = Ocr.tok(p.name); if (!pt.length) return; const h = pt.filter(t => words.some(w => w === t || (t.length > 3 && Ocr.lev(w, t) <= 1))).length / pt.length; if (h > bs) { bs = h; best = p; } });
    return bs >= .5 ? best : null;
  },
  /* Enlarges the photo and stretches contrast so small or faint numbers are read better */
  async prep(file) {
    const bm = await createImageBitmap(file), k = Math.min(3, Math.max(1, 2200 / bm.width)), c = document.createElement('canvas');
    c.width = Math.round(bm.width * k); c.height = Math.round(bm.height * k);
    const x = c.getContext('2d'); x.drawImage(bm, 0, 0, c.width, c.height);
    const im = x.getImageData(0, 0, c.width, c.height), d = im.data, h = new Array(256).fill(0);
    for (let i = 0; i < d.length; i += 4) { const g = Math.round(.299 * d[i] + .587 * d[i + 1] + .114 * d[i + 2]); d[i] = g; h[g]++; }
    const n = d.length / 4; let a = 0, lo = 0, hi = 255; for (let v = 0; v < 256; v++) { a += h[v]; if (a >= n * .02) { lo = v; break; } }
    a = 0; for (let v = 255; v >= 0; v--) { a += h[v]; if (a >= n * .02) { hi = v; break; } }
    const sc = 255 / Math.max(1, hi - lo);
    for (let i = 0; i < d.length; i += 4) { const v = Math.max(0, Math.min(255, (d[i] - lo) * sc)); d[i] = d[i + 1] = d[i + 2] = v; }
    x.putImageData(im, 0, 0); return c;
  },
  /* Turns OCR text into rows: product, price, quantity, and a flag when the row needs a human check */
  parse(text) {
    const rows = []; let written = null;
    text.split('\n').map(l => l.replace(/[|_]/g, ' ').replace(/\b[a-zA-Z](\d{1,5})\b/g, '$1').trim()).filter(Boolean).forEach(line => {
      let nums = (line.match(/(?<![A-Za-z\d.,])\d[\d,]*(?:\.\d+)?(?![A-Za-z\d])/g) || []).map(U.num).filter(Number.isFinite);
      if (/total/i.test(line) && nums.length) { written = Math.max(...nums); return; }
      const p = Ocr.match(Ocr.tok(line)); if (/^\s*\d{1,3}[\s.)]/.test(line) && nums.length > 1) nums = nums.slice(1);
      if (!nums.length || (!p && (nums.length < 3 || !Ocr.tok(line).length))) return;
      let price = p ? p.price : 0, qty = 0, ok = false;
      for (let i = 0; i + 2 < nums.length && !ok; i++) if (Math.abs(nums[i] * nums[i + 1] - nums[i + 2]) <= 1) { price = nums[i]; qty = nums[i + 1]; ok = true; }
      if (!ok && p) { const q = nums.find(n => nums.some(t => t !== n && Math.abs(U.r2(p.price * n) - t) <= 1)); if (q !== undefined) { qty = q; ok = true; } }
      if (!ok) { // columns are Price, Qty, Total: drop the price, the next number is the quantity
        const rest = nums.slice(); let i = p ? rest.findIndex(n => Math.abs(n - p.price) < 0.01) : -1; if (i < 0 && rest.length > 1) i = 0;
        if (i >= 0) { price = rest[i]; rest.splice(i, 1); } qty = rest.length ? rest[0] : 0;
      }
      rows.push({ pid: p ? p.id : '', unit: p ? p.unit : '', price, qty, ok: ok && !!p, raw: line });
    });
    return { rows, written };
  },
  async open() {
    const d = U.$('#dlg'); d.classList.add('wide');
    const pr = U.modal('Enter sales from a photo', `<p class="muted">Choose a photo of the sheet. Free tools cannot read handwritten numbers reliably, so the safest way is to see the photo beside the entry table and type the quantity and rate. The total is checked against the total written on paper.</p><input type="file" id="ocf" accept="image/*" style="width:100%"><div id="ocs" class="row" style="margin-top:10px"></div>`, [{ label: 'Cancel', v: false }]);
    U.$('#ocf').onchange = e => {
      const f = e.target.files[0]; if (!f) return;
      U.$('#ocs').innerHTML = '<button class="btn primary" id="oa">Type beside the photo (recommended)</button><button class="btn" id="ob2">Try automatic reading (printed English sheets only)</button><span id="ost" class="muted"></span>';
      U.$('#oa').onclick = () => { d.close(); Ocr.assist(f); };
      U.$('#ob2').onclick = () => Ocr.auto(f);
    };
    await pr; d.classList.remove('wide');
  },
  assist(f) {
    const rows = Prod.sorted().map(p => ({ pid: p.id, unit: p.unit, price: p.price, qty: 0, ok: true, raw: p.name }));
    Ocr.review({ rows, written: null, manual: true }, URL.createObjectURL(f));
  },
  async auto(f) {
    const d = U.$('#dlg'), st = U.$('#ost');
    try {
      st.textContent = 'Loading reader...'; await Ocr.load();
      const w = await Tesseract.createWorker('eng', 1, { logger: m => { if (m.status === 'recognizing text') st.textContent = 'Reading sheet... ' + Math.round(m.progress * 100) + '%'; } });
      await w.setParameters({ tessedit_pageseg_mode: '6' });
      const { data } = await w.recognize(await Ocr.prep(f).catch(() => f)); await w.terminate();
      const res = Ocr.parse(data.text); d.close();
      if (!res.rows.length) return U.toast('No product rows could be read. Use "Type beside the photo" instead.', 'err');
      Ocr.review(res);
    } catch (x) { st.textContent = x.message || 'Could not read the image.'; }
  },
  async review(res, img) {
    const P = Store.db.products, rows = res.rows, d = U.$('#dlg'), date0 = (Sales.cur && Sales.cur.date) || U.today();
    const opt = r => '<option value="">- skip -</option>' + P.map(p => `<option value="${U.esc(p.id)}" ${p.id === r.pid ? 'selected' : ''}>${U.esc(p.name)}</option>`).join('');
    const tr = (r, i) => `<tr data-i="${i}"><td class="${res.manual ? '' : 'muted'}" style="${res.manual ? 'font-weight:600' : 'max-width:150px;font-size:11px'}">${U.esc(r.raw)}</td><td class="pc"><select data-f="pid" style="max-width:190px">${opt(r)}</select></td><td class="u"></td><td><input class="in" data-f="price" type="number" min="0" step="any" value="${r.price || ''}" placeholder="0"></td><td><input class="in" data-f="qty" type="number" min="0" step="any" value="${r.qty || ''}" placeholder="0"></td><td class="n lt"></td><td class="st"></td></tr>`;
    const body = `<div class="bar"><div><label for="od">Sales date</label><input id="od" type="date" value="${date0}"></div><div><label for="ow">Total written on paper (optional)</label><input id="ow" type="number" min="0" step="any" value="${res.written ?? ''}"></div><p id="oc" style="margin:0 0 6px"></p></div><div class="tw" style="max-height:46vh"><table class="tbl${res.manual ? ' man' : ''}"><thead><tr><th>${res.manual ? 'Product' : 'Read from photo'}</th><th class="pc">Product</th><th>Unit</th><th class="n">Price</th><th class="n">Qty</th><th class="n">Total</th><th></th></tr></thead><tbody id="ob">${rows.map(tr).join('')}</tbody></table></div><p><b>Grand total: <span id="ot"></span></b></p><label style="display:flex;gap:6px;align-items:center"><input type="checkbox" id="ou" checked> Also save these rates as the product prices</label>`;
    d.classList.add('wide');
    const refresh = () => {
      let g = 0;
      U.$('#ob').querySelectorAll('tr').forEach(t => { const r = rows[t.dataset.i], ln = r.pid ? U.r2(r.price * r.qty) : 0; g = U.r2(g + ln); t.querySelector('.lt').textContent = U.money(ln); t.querySelector('.u').textContent = r.unit; t.querySelector('.st').textContent = !r.pid ? '⚠ pick product' : res.manual ? (r.qty > 0 ? '✓' : '') : r.ok ? '✓' : '⚠ check'; });
      U.$('#ot').textContent = U.money(g);
      U.$('#oc').textContent = res.written == null ? 'The total written on the sheet was not detected.' : Math.abs(res.written - g) < 1 ? '✓ Matches the total written on the sheet (' + U.money(res.written) + ')' : '⚠ Sheet says ' + U.money(res.written) + ' but rows add up to ' + U.money(g) + '. Check the ⚠ rows.';
      return g;
    };
    const pr = U.modal(res.manual ? 'Type the quantity and rate from the photo' : 'Check the rows read from your photo', img ? `<div class="split"><div class="imgp"><label>Zoom <input type="range" id="oz" min="60" max="300" value="100"></label><div class="imgw"><img id="oimg" src="${img}" alt="Sales sheet photo"></div></div><div>${body}</div></div>` : body, [{ label: 'Cancel', v: false }, { label: 'Download CSV', v: 'csv' }, { label: 'Use in Daily Sales', v: 'use', cls: 'primary' }], v => {
      if (v === 'csv') { U.download('sales-from-photo-' + U.$('#od').value + '.csv', U.toCSV([['SL', 'Product', 'Unit', 'Unit price', 'Quantity', 'Total price'], ...rows.filter(r => r.pid).map((r, i) => [i + 1, Prod.find(r.pid).name, r.unit, r.price.toFixed(2), r.qty, U.r2(r.price * r.qty).toFixed(2)]), ['', '', '', '', 'Grand total', refresh().toFixed(2)]]), 'text/csv'); return false; }
      return U.$('#od').value ? true : false;
    });
    const ob = U.$('#ob'); refresh();
    if (U.$('#oz')) U.$('#oz').oninput = e => { U.$('#oimg').style.width = e.target.value + '%'; };
    U.$('#ow').oninput = e => { const n = U.num(e.target.value); res.written = n >= 0 ? n : null; refresh(); };
    d.onkeydown = e => { if (e.key !== 'Enter' || e.target.tagName !== 'INPUT') return; e.preventDefault(); if (e.target.dataset.f === 'qty') { const n = e.target.closest('tr').nextElementSibling; n && n.querySelector('[data-f=qty]').focus(); } };
    ob.oninput = ob.onchange = e => {
      const t = e.target.closest('tr'), r = rows[t.dataset.i], f = e.target.dataset.f;
      if (f === 'pid') { const p = Prod.find(e.target.value); r.pid = p ? p.id : ''; r.unit = p ? p.unit : ''; if (p) { r.price = p.price; t.querySelector('[data-f=price]').value = p.price; } }
      else { const n = U.num(e.target.value); e.target.classList.toggle('bad', !(n >= 0)); r[f] = n >= 0 ? n : 0; }
      r.ok = true; refresh();
    };
    const v = await pr, date = U.$('#od').value; d.classList.remove('wide'); d.onkeydown = null; const upd = U.$('#ou') && U.$('#ou').checked; img && URL.revokeObjectURL(img);
    if (v !== 'use') return;
    if (Sales.dirty && !(await U.confirm('Replace current sheet?', 'The sheet open in Daily Sales has unsaved changes. Replace it with the photo data?', 'Replace'))) return;
    if (upd) { rows.forEach(r => { const p = Prod.find(r.pid); if (p && r.qty > 0 && r.price > 0) p.price = U.r2(r.price); }); Store.save(); }
    const c = Sales.blank(date);
    rows.filter(r => r.pid).forEach(r => { const x = c.rows.find(y => y.pid === r.pid); if (x) { x.price = U.r2(r.price); x.qty = r.qty; } });
    Sales.cur = c; Sales.mark(); U.toast('Sheet loaded. Check it, then Save, Print or Download PDF.');
    location.hash === '#sales' ? Sales.render(U.$('#view')) : (location.hash = '#sales');
  }
};
