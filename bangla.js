'use strict';
/* bangla.js - one-click English (phonetic, Avro-style) to Bengali conversion for text boxes */
const Bn = {
  /* Common words in this business and names: used before the phonetic rules */
  dict: { foisal: 'ফয়সাল', chowdhury: 'চৌধুরী', choudhury: 'চৌধুরী', traders: 'ট্রেডার্স', mesars: 'মেসার্স', rangunia: 'রাঙ্গুনিয়া', chattogram: 'চট্টগ্রাম', chittagong: 'চট্টগ্রাম', ichakhali: 'ইছাখালী', sakib: 'সাকিব', forkan: 'ফোরকান', rofiq: 'রফিক', megna: 'মেঘনা', meghna: 'মেঘনা', group: 'গ্রুপ', of: 'অব', industries: 'ইন্ডাস্ট্রিজ', fresh: 'ফ্রেশ', pure: 'পিওর', super: 'সুপার', premium: 'প্রিমিয়াম', gold: 'গোল্ড', bag: 'ব্যাগ', tea: 'টি', tree: 'ট্রি', poly: 'পলি', whole: 'হোল', wheat: 'হুইট', up: 'আপ', milk: 'দুধ', dudh: 'দুধ', doodh: 'দুধ', cha: 'চা', pata: 'পাতা', danadar: 'দানাদার', chini: 'চিনি', moyda: 'ময়দা', maida: 'ময়দা', ata: 'আটা', atta: 'আটা', suji: 'সুজি', pani: 'পানি', tel: 'তেল', soyabin: 'সয়াবিন', soybean: 'সয়াবিন', gram: 'গ্রাম', kg: 'কেজি', keji: 'কেজি', kejhi: 'কেজি', litar: 'লিটার', liter: 'লিটার', litre: 'লিটার', ml: 'এম.এল.', mililiter: 'মিলিলিটার', milliliter: 'মিলিলিটার', market: 'মার্কেট', product: 'প্রোডাক্ট', line: 'লাইন', carton: 'কার্টন', piece: 'পিস', bosta: 'বস্তা' },
  /* [pattern, type, value, kar]  type: c consonant, v vowel (value = independent, kar = sign), s direct text */
  tab: [['rri', 'v', 'ঋ', 'ৃ'], ['Ng', 'c', 'ঙ'], ['NG', 'c', 'ঞ'], ['ng', 's', 'ং'], ['kh', 'c', 'খ'], ['gh', 'c', 'ঘ'], ['ch', 'c', 'ছ'], ['jh', 'c', 'ঝ'], ['Th', 'c', 'ঠ'], ['Dh', 'c', 'ঢ'], ['th', 'c', 'থ'], ['dh', 'c', 'ধ'], ['ph', 'c', 'ফ'], ['bh', 'c', 'ভ'], ['sh', 'c', 'শ'], ['Sh', 'c', 'ষ'], ['Rh', 'c', 'ঢ়'],
    ['oi', 'v', 'ঐ', 'ৈ'], ['OI', 'v', 'ঐ', 'ৈ'], ['ou', 'v', 'ঔ', 'ৌ'], ['OU', 'v', 'ঔ', 'ৌ'], ['aa', 'v', 'আ', 'া'], ['ii', 'v', 'ঈ', 'ী'], ['ee', 'v', 'ঈ', 'ী'], ['uu', 'v', 'ঊ', 'ূ'], ['oo', 'v', 'উ', 'ু'],
    ['k', 'c', 'ক'], ['g', 'c', 'গ'], ['c', 'c', 'চ'], ['j', 'c', 'জ'], ['T', 'c', 'ট'], ['D', 'c', 'ড'], ['N', 'c', 'ণ'], ['t', 'c', 'ত'], ['d', 'c', 'দ'], ['n', 'c', 'ন'], ['p', 'c', 'প'], ['f', 'c', 'ফ'], ['b', 'c', 'ব'], ['v', 'c', 'ভ'], ['m', 'c', 'ম'], ['z', 'c', 'য'], ['r', 'c', 'র'], ['l', 'c', 'ল'], ['S', 'c', 'শ'], ['s', 'c', 'স'], ['h', 'c', 'হ'], ['R', 'c', 'ড়'], ['y', 'c', 'য়'], ['Y', 'c', 'য়'], ['q', 'c', 'ক'], ['w', 's', 'ও'], ['x', 's', 'ক্স'], ['Z', 'y', '্য'],
    ['a', 'v', 'আ', 'া'], ['i', 'v', 'ই', 'ি'], ['I', 'v', 'ঈ', 'ী'], ['u', 'v', 'উ', 'ু'], ['U', 'v', 'ঊ', 'ূ'], ['e', 'v', 'এ', 'ে'], ['E', 'v', 'এ', 'ে'], ['o', 'v', 'অ', ''], ['O', 'v', 'ও', 'ো']],
  phon(w) {
    let out = '', i = 0, prevC = false;
    while (i < w.length) {
      const e = Bn.tab.find(t => w.startsWith(t[0], i));
      if (!e) { out += w[i++]; prevC = false; continue; }
      i += e[0].length;
      if (e[1] === 'c') { out += (prevC ? '্' : '') + e[2]; prevC = true; }
      else if (e[1] === 'v') { out += prevC ? e[3] : e[2]; prevC = false; }
      else if (e[1] === 'y') { out += prevC ? e[2] : ''; }
      else { out += e[2]; prevC = false; }
    }
    return out;
  },
  convert(text) {
    return String(text).replace(/[A-Za-z]+/g, w => Bn.dict[w.toLowerCase()] || Bn.phon(w)).replace(/\d/g, d => '০১২৩৪৫৬৭৮৯'[d]);
  },
  btn: id => `<button type="button" class="btn sm bnb" data-for="${id}" title="Convert English letters to Bengali">→ বাংলা</button>`
};
/* One click converts the text box; click again to undo */
document.addEventListener('click', e => {
  const b = e.target.closest('.bnb'); if (!b) return;
  const i = document.getElementById(b.dataset.for); if (!i) return;
  if (b.dataset.undo === '1') { i.value = i.dataset.orig || ''; b.dataset.undo = '0'; b.textContent = '→ বাংলা'; }
  else { i.dataset.orig = i.value; i.value = Bn.convert(i.value); b.dataset.undo = '1'; b.textContent = '↩ Undo'; }
  i.dispatchEvent(new Event('input', { bubbles: true })); i.focus();
});
