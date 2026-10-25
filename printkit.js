/* PPICapp print kit
   Dimuat oleh aplikasi (Google Apps Script) dari pembungkus PWA, hanya saat dibuka lewat pembungkus.
   Isi: jendela cetak khusus + tombol Cetak / Buat PDF / Bagikan PDF untuk iPhone mode layar utama,
   yang tidak punya dialog cetak. Dipisah dari Index.html agar tidak berisiko merusak login. */
(function () {
  'use strict';
  if (window.PPICKit) return;
  var LIB = 'https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js';

  /* Berjalan DI DALAM jendela cetak (dikirim sebagai teks; jangan memakai variabel luar). */
  function popupBoot(cfg) {
    var busy = false, blob = null, file = null;
    var msg = document.getElementById('ppicMsg');
    var ui = document.querySelector('.ppic-print-ui');
    var btnPdf = document.getElementById('ppicPdf');
    var btnShare = document.getElementById('ppicShare');
    var btnOpen = document.getElementById('ppicOpen');
    function say(t) { msg.textContent = t || ''; }
    var isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    var standalone = (navigator.standalone === true) || (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches);
    if (isIOS && standalone) document.getElementById('ppicDoPrint').style.display = 'none';
    document.getElementById('ppicClose').onclick = function () { window.close(); };
    document.getElementById('ppicDoPrint').onclick = function () {
      try { window.print(); } catch (e) { say('Cetak tidak tersedia di sini. Pakai tombol Buat PDF.'); }
    };
    function loadLib() {
      return new Promise(function (res, rej) {
        if (window.html2pdf) return res();
        var sc = document.createElement('script');
        sc.src = cfg.lib;
        sc.onload = function () { res(); };
        sc.onerror = function () { rej(new Error('pustaka PDF tidak bisa dimuat, cek internet')); };
        document.head.appendChild(sc);
      });
    }
    btnPdf.onclick = function () {
      if (busy) return;
      busy = true; btnShare.style.display = 'none'; btnOpen.style.display = 'none';
      say('Menyiapkan PDF…');
      loadLib().then(function () { return new Promise(function (r) { setTimeout(r, 80); }); }).then(function () {
        if (ui) ui.style.visibility = 'hidden';
        var root = document.getElementById('ppicRoot') || document.body;
        var w = root.scrollWidth, h = root.scrollHeight;
        var maxPx = isIOS ? 3500000 : 12000000, maxScale = isIOS ? 1.1 : 2;
        var scale = Math.max(0.5, Math.min(maxScale, Math.sqrt(maxPx / Math.max(1, w * h))));
        if (isIOS && h > 9000) say('Laporan panjang, hasil PDF dibuat lebih ringan. Mohon tunggu…');
        return window.html2pdf().set({
          margin: 8, filename: cfg.filename, image: { type: 'jpeg', quality: isIOS ? 0.8 : 0.92 },
          html2canvas: { scale: scale, useCORS: true, backgroundColor: '#ffffff', scrollY: 0, windowWidth: w },
          jsPDF: { unit: 'mm', format: 'a4', orientation: (cfg.orientation || 'landscape'), compress: true },
          pagebreak: { mode: ['css', 'legacy'], avoid: ['tr', '.card', '.sum-box'] }
        }).from(root).outputPdf('blob');
      }).then(function (b) {
        if (ui) ui.style.visibility = '';
        blob = b; file = new File([b], cfg.filename, { type: 'application/pdf' });
        btnShare.style.display = ''; btnOpen.style.display = '';
        say('PDF siap. Ketuk "Bagikan PDF" untuk menyimpan atau mencetaknya.');
        busy = false;
      }).catch(function (e) {
        if (ui) ui.style.visibility = '';
        say('Gagal membuat PDF: ' + ((e && e.message) || e));
        busy = false;
      });
    };
    /* Bagikan harus dipanggil langsung dari ketukan pengguna, karena itu dipisah dari proses pembuatan PDF. */
    btnShare.onclick = function () {
      if (!blob) return;
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        navigator.share({ files: [file], title: cfg.title }).catch(function (e) {
          if (e && e.name === 'AbortError') return;
          say('Bagikan gagal: ' + ((e && e.message) || e) + '. Coba tombol Buka PDF.');
        });
      } else {
        say('Perangkat ini tidak mendukung Bagikan. Pakai tombol Buka PDF.');
      }
    };
    btnOpen.onclick = function () {
      if (!blob) return;
      var url = URL.createObjectURL(blob);
      var w2 = window.open(url, '_blank');
      if (!w2) location.href = url;
    };
  }

  function barHtml() {
    return '<button type="button" id="ppicDoPrint">Cetak</button>' +
      '<button type="button" id="ppicPdf">Buat PDF</button>' +
      '<button type="button" id="ppicShare" style="display:none">Bagikan PDF</button>' +
      '<button type="button" id="ppicOpen" class="alt" style="display:none">Buka PDF</button>' +
      '<button type="button" class="alt" id="ppicClose">Tutup</button><span id="ppicMsg"></span>';
  }
  var BAR_CSS = '.ppic-print-ui{position:fixed;left:0;right:0;bottom:0;z-index:99999;display:flex;flex-wrap:wrap;gap:10px;align-items:center;justify-content:center;padding:12px 14px;background:#064e3b;color:#fff;font:600 15px/1.3 system-ui,sans-serif}' +
    '.ppic-print-ui button{font:inherit;font-weight:800;border:0;border-radius:999px;padding:11px 20px;background:#10b981;color:#fff;min-height:0}' +
    '.ppic-print-ui button.alt{background:rgba(255,255,255,.18)}' +
    '#ppicMsg{flex:1 0 100%;text-align:center;font-weight:600;font-size:14px}' +
    '@media screen{body{padding-bottom:120px}}@media print{.ppic-print-ui{display:none!important}}';

  /* Pasang bar Cetak/PDF pada jendela cetak yang sudah dibuat oleh kode lain. */
  function attachPrintBar(w, cfg) {
    if (w && w.__ppicFake) return;
    try {
      var d = w.document;
      var st = d.createElement('style'); st.textContent = BAR_CSS; d.head.appendChild(st);
      var bar = d.createElement('div'); bar.className = 'ppic-print-ui'; bar.innerHTML = barHtml(); d.body.appendChild(bar);
      var bootCfg = { title: cfg.title, filename: cfg.filename, orientation: cfg.orientation || 'landscape', lib: LIB };
      var sc = d.createElement('script');
      sc.textContent = '(' + popupBoot.toString() + ')(' + JSON.stringify(bootCfg) + ');';
      d.body.appendChild(sc);
    } catch (e) { /* abaikan; jendela cetak tetap terbuka */ }
  }

  /* Salin satu halaman aplikasi ke jendela baru dengan tata letak cetaknya. cfg: nodeId, bodyClass, title, filename, orientation, after */
  function openPrintWindow(cfg) {
    if (cfg.pdfDirect) { exportPage(cfg); return; }
    var page = document.getElementById(cfg.nodeId);
    var restore = function () { document.body.classList.remove(cfg.bodyClass); if (cfg.after) { try { cfg.after(); } catch (e) {} } };
    if (!page) { restore(); return; }
    var w = window.open('', '_blank');
    if (!w) { restore(); alert('Jendela cetak diblokir. Izinkan pop-up untuk PPICapp lalu coba lagi.'); return; }
    var orig = Array.prototype.map.call(document.querySelectorAll('style'), function (st) { return st.textContent; }).join('\n');
    /* gaya asli tetap (agar aturan @page ikut), ditambah salinan @media print -> tampil di layar sebagai pratinjau */
    var forced = orig.replace(/@media\s+print\s*\{/g, '@media all{');
    var clone = page.cloneNode(true);
    clone.classList.remove('page-hidden');
    Array.prototype.forEach.call(clone.querySelectorAll('script,.print-btn,.expand-btn'), function (el) { el.remove(); });
    var html = '<!doctype html><html lang="id"><head><meta charset="utf-8"><meta name="viewport" content="width=1100"><title>' + cfg.title + '</title>' +
      '<style>' + orig + '</style><style>' + forced + '</style>' +
      '<style>html,body{margin:0!important;background:#fff!important}</style></head>' +
      '<body class="' + cfg.bodyClass + '"><div id="app" style="display:block"><main style="display:block;padding:0"><div id="ppicRoot">' + clone.outerHTML + '</div></main></div></body></html>';
    w.document.open(); w.document.write(html); w.document.close();
    attachPrintBar(w, cfg);
    restore();
  }


  /* ====================== PDF vektor (tanpa pustaka, ringan di iPhone) ======================
     Teks dan tabel diambil dari tata letak cetak, lalu ditulis sebagai PDF biasa (font Helvetica).
     Tidak memakai gambar halaman, jadi hemat memori dan tidak butuh internet. */
  var XHTML = 'http://www.w3.org/1999/xhtml';
  var SKIP = { SCRIPT: 1, STYLE: 1, NOSCRIPT: 1, BUTTON: 1, INPUT: 1, SELECT: 1, TEXTAREA: 1, CANVAS: 1, IMG: 1, HEAD: 1, LINK: 1, META: 1, TITLE: 1, IFRAME: 1 };
  var mctx = null;
  function measure(text, size, bold) {
    if (!mctx) mctx = document.createElement('canvas').getContext('2d');
    mctx.font = (bold ? 'bold ' : '') + size + 'px Helvetica, Arial, sans-serif';
    return mctx.measureText(text).width;
  }
  var WIN = { '\u2026': '\x85', '\u2013': '\x96', '\u2014': '\x97', '\u2022': '\x95', '\u2018': '\x91', '\u2019': '\x92', '\u201c': '\x93', '\u201d': '\x94', '\u20ac': '\x80', '\u2192': '->', '\u2190': '<-', '\u2264': '<=', '\u2265': '>=', '\u2212': '-' };
  function toWin(str) {
    var out = '';
    for (var i = 0; i < str.length; i++) {
      var ch = str.charAt(i), c = str.charCodeAt(i);
      if (WIN[ch] !== undefined) out += WIN[ch];
      else if (c === 160) out += ' ';
      else if (c >= 32 && c < 127) out += ch;
      else if (c >= 161 && c <= 255) out += ch;
      else out += '?';
    }
    return out;
  }
  function pdfStr(str) { return '(' + toWin(str).replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)') + ')'; }
  function num(v) { return String(Math.round(v * 100) / 100); }
  function col(c) { return (c[0] / 255).toFixed(3) + ' ' + (c[1] / 255).toFixed(3) + ' ' + (c[2] / 255).toFixed(3); }

  function PdfBuilder(w, h) { this.w = w; this.h = h; this.pages = []; this.newPage(); }
  PdfBuilder.prototype.newPage = function () { this.cur = []; this.pages.push(this.cur); };
  PdfBuilder.prototype.text = function (str, x, yTop, size, bold, rgb) {
    this.cur.push('BT /' + (bold ? 'F2' : 'F1') + ' ' + num(size) + ' Tf ' + col(rgb) + ' rg ' + num(x) + ' ' + num(this.h - yTop) + ' Td ' + pdfStr(str) + ' Tj ET');
  };
  PdfBuilder.prototype.rect = function (x, yTop, w, h, fill, stroke, lw) {
    var ops = '';
    if (fill) ops += col(fill) + ' rg ';
    if (stroke) ops += col(stroke) + ' RG ' + num(lw || 0.5) + ' w ';
    ops += num(x) + ' ' + num(this.h - yTop - h) + ' ' + num(w) + ' ' + num(h) + ' re ' + (fill && stroke ? 'B' : fill ? 'f' : 'S');
    this.cur.push(ops);
  };
  PdfBuilder.prototype.line = function (x1, y1, x2, y2, rgb, lw) {
    this.cur.push(col(rgb) + ' RG ' + num(lw || 0.5) + ' w ' + num(x1) + ' ' + num(this.h - y1) + ' m ' + num(x2) + ' ' + num(this.h - y2) + ' l S');
  };
  PdfBuilder.prototype.build = function () {
    var objs = [], n = this.pages.length, kids = [];
    for (var i = 0; i < n; i++) kids.push((5 + i * 2) + ' 0 R');
    objs[1] = '<< /Type /Catalog /Pages 2 0 R >>';
    objs[2] = '<< /Type /Pages /Kids [' + kids.join(' ') + '] /Count ' + n + ' >>';
    objs[3] = '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>';
    objs[4] = '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>';
    for (var k = 0; k < n; k++) {
      var content = this.pages[k].join('\n');
      objs[5 + k * 2] = '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ' + num(this.w) + ' ' + num(this.h) + '] /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents ' + (6 + k * 2) + ' 0 R >>';
      objs[6 + k * 2] = '<< /Length ' + content.length + ' >>\nstream\n' + content + '\nendstream';
    }
    var out = '%PDF-1.4\n%\xE2\xE3\xCF\xD3\n', offsets = [];
    for (var o = 1; o < objs.length; o++) { offsets[o] = out.length; out += o + ' 0 obj\n' + objs[o] + '\nendobj\n'; }
    var xref = out.length;
    out += 'xref\n0 ' + objs.length + '\n0000000000 65535 f \n';
    for (var q = 1; q < objs.length; q++) out += ('0000000000' + offsets[q]).slice(-10) + ' 00000 n \n';
    out += 'trailer\n<< /Size ' + objs.length + ' /Root 1 0 R >>\nstartxref\n' + xref + '\n%%EOF';
    var u8 = new Uint8Array(out.length);
    for (var z = 0; z < out.length; z++) u8[z] = out.charCodeAt(z) & 255;
    return u8.buffer;
  };

  function wrapText(text, size, bold, maxW) {
    var words = String(text).split(' '), lines = [], line = '';
    words.forEach(function (w) {
      var test = line ? line + ' ' + w : w;
      if (measure(test, size, bold) <= maxW) { line = test; return; }
      if (line) lines.push(line);
      if (measure(w, size, bold) > maxW) {
        var chunk = '';
        for (var i = 0; i < w.length; i++) {
          var t = chunk + w.charAt(i);
          if (measure(t, size, bold) <= maxW) chunk = t; else { if (chunk) lines.push(chunk); chunk = w.charAt(i); }
        }
        line = chunk;
      } else line = w;
    });
    if (line) lines.push(line);
    return lines.length ? lines : [''];
  }

  function parseColor(str) {
    var m = /rgba?\(\s*([\d.]+)[ ,]+([\d.]+)[ ,]+([\d.]+)(?:[ ,/]+([\d.]+))?/.exec(str || '');
    if (!m) return null;
    return [Math.round(+m[1]), Math.round(+m[2]), Math.round(+m[3]), m[4] === undefined ? 1 : +m[4]];
  }
  function lum(c) { return (0.299 * c[0] + 0.587 * c[1] + 0.114 * c[2]) / 255; }

  function pdfFromDocument(doc, cfg) {
    var win = doc.defaultView;
    function cs(el) { return win.getComputedStyle(el); }
    function norm(t) { return String(t || '').replace(/\s+/g, ' ').trim(); }
    function usable(el) {
      if (el.nodeType !== 1 || el.namespaceURI !== XHTML || SKIP[el.tagName]) return false;
      var c = cs(el);
      return c.display !== 'none' && c.visibility !== 'hidden';
    }
    function kidsOf(el) { return Array.prototype.filter.call(el.children, usable); }
    function blockLike(el) {
      if (el.tagName === 'TABLE') return true;
      var d = cs(el).display;
      return !(d === 'inline' || d === 'inline-block' || d === 'inline-flex' || d === 'inline-grid' || d === 'contents' || d === 'ruby');
    }
    function hasBlockDesc(el) { return kidsOf(el).some(function (k) { return blockLike(k) || hasBlockDesc(k); }); }
    function styleOf(el) {
      var c = cs(el), size = Math.min(22, Math.max(6.5, parseFloat(c.fontSize) * 0.75 || 9));
      var fg = parseColor(c.color) || [0, 0, 0, 1];
      if (lum(fg) > 0.8) fg = [20, 30, 40];
      var ta = c.textAlign;
      return { size: size, bold: parseInt(c.fontWeight, 10) >= 600 || c.fontWeight === 'bold', color: fg, align: ta === 'right' || ta === 'end' ? 'right' : ta === 'center' ? 'center' : 'left' };
    }
    function leafText(el) {
      var out = '';
      function sp() { if (out && !/\s$/.test(out)) out += ' '; }
      (function rec(n) {
        if (n.nodeType === 3) { out += n.textContent; return; }
        if (n.nodeType !== 1 || !usable(n)) return;
        var c = cs(n), blk = c.display !== 'inline';
        if (blk || parseFloat(c.marginLeft) > 2 || parseFloat(c.paddingLeft) > 2) sp();
        Array.prototype.forEach.call(n.childNodes, rec);
        if (blk || parseFloat(c.marginRight) > 2 || parseFloat(c.paddingRight) > 2) sp();
      })(el);
      return norm(out);
    }
    var blocks = [];
    function pushText(text, style, gapScale) { var t = norm(text); if (t) blocks.push({ type: 'text', text: t, style: style, gap: gapScale || 0.3 }); }

    function tableBlock(tbl) {
      var rows = [], cols = 0;
      Array.prototype.forEach.call(tbl.rows, function (tr) {
        if (cs(tr).display === 'none') return;
        var cells = [], n = 0;
        Array.prototype.forEach.call(tr.cells, function (td) {
          var c = cs(td);
          if (c.display === 'none' || c.visibility === 'hidden') return;
          var head = td.tagName === 'TH' || (tr.parentNode && tr.parentNode.tagName === 'THEAD');
          var text = norm(td.innerText), span = Math.max(1, td.colSpan || 1);
          var bg = parseColor(c.backgroundColor); if (bg && (bg[3] < 0.5 || lum(bg) > 0.97)) bg = null;
          var fg = parseColor(c.color) || [0, 0, 0, 1];
          if (!bg && lum(fg) > 0.8) fg = [20, 30, 40];
          var ta = c.textAlign, numeric = /^[+\-]?[\d.,]+\s?(%|PCS|M\u00b3)?$/.test(text);
          cells.push({ text: text, span: span, head: head, bold: head || parseInt(c.fontWeight, 10) >= 600, size: Math.min(10.5, Math.max(6.5, parseFloat(c.fontSize) * 0.75 || 8.5)), bg: bg, fg: fg, align: (ta === 'right' || ta === 'end' || (numeric && !head)) ? 'right' : ta === 'center' ? 'center' : 'left' });
          n += span;
        });
        if (cells.length) { rows.push({ cells: cells, head: cells.every(function (x) { return x.head; }) }); cols = Math.max(cols, n); }
      });
      return rows.length ? { type: 'table', rows: rows, cols: cols } : null;
    }

    function walk(el) {
      if (!usable(el)) return;
      if (el.tagName === 'TABLE') { var tb = tableBlock(el); if (tb) blocks.push(tb); return; }
      if (el.tagName === 'HR') { blocks.push({ type: 'rule' }); return; }
      var kids = kidsOf(el), st = styleOf(el), c = cs(el);
      var isHeading = /^H[1-6]$/.test(el.tagName);
      if (!kids.some(function (k) { return blockLike(k) || hasBlockDesc(k); })) { pushText(leafText(el), st, isHeading ? 0.6 : 0.3); return; }
      if ((c.display === 'flex' || c.display === 'grid') && kids.every(function (k) { return !hasBlockDesc(k); })) {
        var parts = kids.map(function (k) { return leafText(k); }).filter(Boolean);
        if (parts.length) pushText(parts.join('    '), styleOf(kids[0]), 0.3);
        return;
      }
      Array.prototype.forEach.call(el.childNodes, function (n) {
        if (n.nodeType === 3) pushText(n.textContent, st, 0.3);
        else if (n.nodeType === 1) walk(n);
      });
    }
    walk(doc.body);

    /* ---- tata letak ---- */
    var land = (cfg.orientation || 'landscape') === 'landscape';
    var PW = land ? 841.89 : 595.28, PH = land ? 595.28 : 841.89, MX = 30, MT = 30, MB = 36;
    var W = PW - MX * 2, pdf = new PdfBuilder(PW, PH), y = MT;
    function ensure(h) { if (y + h > PH - MB) { pdf.newPage(); y = MT; return true; } return false; }

    blocks.forEach(function (b) {
      if (b.type === 'rule') { ensure(8); pdf.line(MX, y + 2, MX + W, y + 2, [190, 200, 195], 0.7); y += 8; return; }
      if (b.type === 'text') {
        var s = b.style, lh = s.size * 1.25, lines = wrapText(b.text, s.size, s.bold, W);
        y += s.size * b.gap;
        lines.forEach(function (ln) {
          ensure(lh);
          var tw = measure(ln, s.size, s.bold), x = s.align === 'right' ? MX + W - tw : s.align === 'center' ? MX + (W - tw) / 2 : MX;
          pdf.text(ln, x, y + s.size * 0.9, s.size, s.bold, s.color);
          y += lh;
        });
        return;
      }
      /* tabel */
      var nat = [], pad = 3.5, i;
      for (i = 0; i < b.cols; i++) nat[i] = 0;
      b.rows.forEach(function (r) { var ci = 0; r.cells.forEach(function (c) { if (c.span === 1) nat[ci] = Math.max(nat[ci], measure(c.text, c.size, c.bold) + pad * 2); ci += c.span; }); });
      var tot = 0;
      for (i = 0; i < b.cols; i++) { nat[i] = Math.min(Math.max(nat[i], 26), W * 0.42); tot += nat[i]; }
      var cw = nat.map(function (v) { return v * W / tot; });
      var heads = [];
      function drawRow(r, idx) {
        var hs = [], ci = 0;
        r.cells.forEach(function (c) {
          var wv = 0; for (var k = 0; k < c.span; k++) wv += cw[ci + k] || 0;
          var lines = wrapText(c.text, c.size, c.bold, Math.max(10, wv - pad * 2));
          hs.push({ c: c, w: wv, lines: lines, x0: ci });
          ci += c.span;
        });
        var rh = Math.max.apply(null, hs.map(function (h) { return h.lines.length * h.c.size * 1.2 + pad * 2 - 1; }));
        if (ensure(rh) && !r.head) heads.forEach(function (hr) { drawRow(hr, -1); });
        var x = MX;
        hs.forEach(function (h) {
          var c = h.c, fill = c.bg || (c.head ? [225, 238, 231] : (idx > 0 && idx % 2 === 0 ? [246, 250, 248] : null));
          pdf.rect(x, y, h.w, rh, fill, [192, 204, 198], 0.5);
          var ty = y + pad + c.size * 0.9;
          h.lines.forEach(function (ln) {
            var tw = measure(ln, c.size, c.bold), tx = c.align === 'right' ? x + h.w - pad - tw : c.align === 'center' ? x + (h.w - tw) / 2 : x + pad;
            pdf.text(ln, tx, ty, c.size, c.bold, c.fg);
            ty += c.size * 1.2;
          });
          x += h.w;
        });
        y += rh;
      }
      b.rows.forEach(function (r, idx) { if (r.head) heads.push(r); drawRow(r, idx); });
      y += 8;
    });

    /* ---- footer ---- */
    var n = pdf.pages.length, stamp;
    try { stamp = new Date().toLocaleString('id-ID'); } catch (e) { stamp = ''; }
    for (var pi = 0; pi < n; pi++) {
      pdf.cur = pdf.pages[pi];
      pdf.text((cfg.title || 'PPICapp') + '  |  dicetak ' + stamp, MX, PH - 16, 7, false, [120, 130, 140]);
      var label = 'Halaman ' + (pi + 1) + ' dari ' + n;
      pdf.text(label, PW - MX - measure(label, 7, false), PH - 16, 7, false, [120, 130, 140]);
    }
    return pdf.build();
  }

  function toast(msg, ms) {
    var t = document.getElementById('ppicToast');
    if (!t) {
      t = document.createElement('div'); t.id = 'ppicToast';
      t.style.cssText = 'position:fixed;left:50%;bottom:24px;transform:translateX(-50%);z-index:2147483647;max-width:90%;text-align:center;background:#064e3b;color:#fff;padding:10px 18px;border-radius:999px;font:600 14px system-ui,sans-serif;box-shadow:0 8px 24px rgba(0,0,0,.35)';
      document.body.appendChild(t);
    }
    t.textContent = msg; t.style.display = 'block'; clearTimeout(t._h);
    if (ms) t._h = setTimeout(function () { t.style.display = 'none'; }, ms);
  }

  /* Tulis HTML ke iframe tersembunyi (tanpa skrip), baca tata letaknya, buat PDF. */
  function renderHtmlToPdf(html, cfg, done) {
    var f = document.createElement('iframe');
    f.setAttribute('sandbox', 'allow-same-origin');
    f.style.cssText = 'position:fixed;left:-12000px;top:0;width:' + (cfg.layoutWidth || 1100) + 'px;height:900px;border:0;opacity:0;pointer-events:none';
    document.body.appendChild(f);
    var d = f.contentDocument;
    d.open(); d.write(html); d.close();
    setTimeout(function () {
      var buf = null, err = null;
      try { buf = pdfFromDocument(d, cfg); } catch (e) { err = e; }
      try { f.parentNode.removeChild(f); } catch (e2) {}
      done(err, buf);
    }, 300);
  }

  function sendPdf(buf, cfg) {
    var origin = window.pwaOrigin;
    if (!origin || (origin.indexOf('https://') !== 0 && origin.indexOf('http://localhost') !== 0)) { toast('PDF tidak bisa dikirim: pembungkus tidak terdeteksi.', 5000); return; }
    try {
      window.top.postMessage({ source: 'ppicapp', type: 'pdf', filename: cfg.filename || 'laporan.pdf', title: cfg.title || '', buffer: buf }, origin, [buf]);
      toast('PDF siap. Ketuk "Bagikan PDF" pada jendela yang muncul.', 4000);
    } catch (e) { toast('PDF gagal dikirim: ' + (e && e.message || e), 5000); }
  }

  function finishExport(err, buf, cfg) {
    if (err || !buf) { toast('Gagal membuat PDF: ' + ((err && err.message) || 'tidak diketahui'), 6000); return; }
    sendPdf(buf, cfg);
  }

  /* Salin satu halaman aplikasi (tata letak cetak) lalu ekspor sebagai PDF, tanpa jendela popup. */
  function exportPage(cfg) {
    var page = document.getElementById(cfg.nodeId);
    var restore = function () { document.body.classList.remove(cfg.bodyClass); if (cfg.after) { try { cfg.after(); } catch (e) {} } };
    if (!page) { restore(); return; }
    var orig = Array.prototype.map.call(document.querySelectorAll('style'), function (st) { return st.textContent; }).join('\n');
    var forced = orig.replace(/@media\s+print\s*\{/g, '@media all{');
    var clone = page.cloneNode(true);
    clone.classList.remove('page-hidden');
    Array.prototype.forEach.call(clone.querySelectorAll('script,.print-btn,.expand-btn'), function (el) { el.remove(); });
    var html = '<!doctype html><html lang="id"><head><meta charset="utf-8"><style>' + orig + '</style><style>' + forced + '</style><style>html,body{margin:0!important;background:#fff!important}</style></head>' +
      '<body class="' + cfg.bodyClass + '"><div id="app" style="display:block"><main style="display:block;padding:0">' + clone.outerHTML + '</main></div></body></html>';
    restore();
    toast('Membuat PDF…');
    renderHtmlToPdf(html, cfg, function (err, buf) { finishExport(err, buf, cfg); });
  }

  /* Pengganti window.open: kode cetak yang sudah ada menulis HTML ke objek ini, lalu hasilnya diekspor sebagai PDF. */
  function exportWindow(cfg) {
    var chunks = [];
    return {
      __ppicFake: true,
      document: {
        open: function () {}, write: function (h) { chunks.push(h); },
        close: function () { toast('Membuat PDF…'); setTimeout(function () { renderHtmlToPdf(chunks.join(''), cfg, function (err, buf) { finishExport(err, buf, cfg); }); }, 0); }
      },
      focus: function () {}, print: function () {}, close: function () {}
    };
  }

  window.PPICKit = { version: '2', openPrintWindow: openPrintWindow, attachPrintBar: attachPrintBar, exportPage: exportPage, exportWindow: exportWindow, _pdfFromDocument: pdfFromDocument, _renderHtmlToPdf: renderHtmlToPdf };
})();
