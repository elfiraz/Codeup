const cds = require('@sap/cds');
const { SELECT, INSERT } = cds.ql;

module.exports = cds.service.impl(async function () {
  const { Suppliers, Materials } = this.entities;

  // ── CSV PARSER (harici kütüphane yok) ──────────────────────
  function parseCSV(csv) {
    const lines = csv.replace(/\r/g, '').split('\n').filter(l => l.trim());
    if (lines.length < 2) return { headers: [], rows: [] };
    const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
    const rows = lines.slice(1).map((line, idx) => {
      const vals = []; let cur = '', inQ = false;
      for (const ch of line) {
        if (ch === '"') { inQ = !inQ; continue; }
        if (ch === ',' && !inQ) { vals.push(cur.trim()); cur = ''; } else cur += ch;
      }
      vals.push(cur.trim());
      const obj = {}; headers.forEach((h, i) => { obj[h] = vals[i] ?? ''; });
      obj.__row = idx + 2;
      return obj;
    });
    return { headers, rows };
  }

  const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  // ── OTOMATİK NUMARALAMA ────────────────────────────────────
  this.before('CREATE', Suppliers, async req => {
    if (!req.data.TedarikciNo) {
      const r = await SELECT.one.from(Suppliers).columns('max(TedarikciNo) as m');
      req.data.TedarikciNo = String((parseInt(r?.m || '90000000', 10)) + 1);
    }
  });

  this.before('CREATE', Materials, async req => {
    if (!req.data.MalzemeNo) {
      const r = await SELECT.one.from(Materials).columns('max(MalzemeNo) as m');
      const n = parseInt((r?.m || 'MAT0000000').replace(/\D/g, ''), 10) || 0;
      req.data.MalzemeNo = 'MAT' + String(n + 1).padStart(7, '0');
    }
  });

  // ── VALİDASYON ─────────────────────────────────────────────
  this.before(['CREATE','UPDATE'], Suppliers, req => {
    const { Ad, Email } = req.data;
    if (Ad !== undefined && !Ad?.trim())       req.error(400, 'Ad zorunludur.');
    if (Email !== undefined && !Email?.trim()) req.error(400, 'Email zorunludur.');
    if (Email && !emailRe.test(Email))         req.error(400, 'Geçersiz email formatı.');
  });

  this.before(['CREATE','UPDATE'], Materials, req => {
    const { MalzemeTanimi } = req.data;
    if (MalzemeTanimi !== undefined && !MalzemeTanimi?.trim())
      req.error(400, 'Malzeme Tanımı zorunludur.');
  });

  // ── CSV VALIDATE — Suppliers (many $self = koleksiyon üzerinde çağrı) ─
  this.on('validateCSV', Suppliers, async req => {
    const { headers, rows } = parseCSV(req.data.csvContent);
    const errs = [];
    if (!headers.includes('Ad'))    errs.push({ row:0, column:'Ad',    error:'Zorunlu sütun eksik: Ad' });
    if (!headers.includes('Email')) errs.push({ row:0, column:'Email', error:'Zorunlu sütun eksik: Email' });
    if (errs.length) return errs;
    for (const r of rows) {
      if (!r.Ad?.trim())    errs.push({ row:r.__row, column:'Ad',    error:'Ad boş olamaz' });
      if (!r.Email?.trim()) errs.push({ row:r.__row, column:'Email', error:'Email boş olamaz' });
      else if (!emailRe.test(r.Email)) errs.push({ row:r.__row, column:'Email', error:'Geçersiz email' });
    }
    return errs;
  });

  this.on('uploadCSV', Suppliers, async req => {
    const { rows } = parseCSV(req.data.csvContent);
    let inserted = 0, errors = 0;
    for (const r of rows) {
      try {
        const res = await SELECT.one.from(Suppliers).columns('max(TedarikciNo) as m');
        await INSERT.into(Suppliers).entries({
          TedarikciNo: String((parseInt(res?.m||'90000000',10))+1),
          Ad: r.Ad, Email: r.Email,
          Ulke: r.Ulke||'TÜRKİYE', Doviz: r.Doviz||'TRY',
          Telefon: r.Telefon||'',
          TedarikciIstatGrup: r.TedarikciIstatGrup||'',
          IstatGrupAciklama: r.IstatGrupAciklama||''
        });
        inserted++;
      } catch(e) { errors++; }
    }
    return { inserted, errors };
  });

  this.on('validateCSV', Materials, async req => {
    const { headers, rows } = parseCSV(req.data.csvContent);
    const errs = [];
    if (!headers.includes('MalzemeTanimi')) {
      errs.push({ row:0, column:'MalzemeTanimi', error:'Zorunlu sütun eksik' });
      return errs;
    }
    for (const r of rows)
      if (!r.MalzemeTanimi?.trim())
        errs.push({ row:r.__row, column:'MalzemeTanimi', error:'Malzeme Tanımı boş olamaz' });
    return errs;
  });

  this.on('uploadCSV', Materials, async req => {
    const { rows } = parseCSV(req.data.csvContent);
    let inserted = 0, errors = 0;
    for (const r of rows) {
      try {
        const res = await SELECT.one.from(Materials).columns('max(MalzemeNo) as m');
        const n = parseInt((res?.m||'MAT0000000').replace(/\D/g,''),10)||0;
        await INSERT.into(Materials).entries({
          MalzemeNo: 'MAT'+String(n+1).padStart(7,'0'),
          MalzemeTanimi: r.MalzemeTanimi,
          Site: r.Site||'100', Doviz: r.Doviz||'TRY',
          Fiyat: parseFloat(r.Fiyat)||0, Stok: parseFloat(r.Stok)||0,
          SatinalmaGrubu: r.SatinalmaGrubu||'',
          TedarikciNo: r.TedarikciNo||''
        });
        inserted++;
      } catch(e) { errors++; }
    }
    return { inserted, errors };
  });
});
