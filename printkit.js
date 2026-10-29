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
  var mctx = null, imgStore = [];
  function measure(text, size, bold) {
    if (!mctx) mctx = document.createElement('canvas').getContext('2d');
    mctx.font = (bold ? 'bold ' : '') + size + 'px Helvetica, Arial, sans-serif';
    return mctx.measureText(text).width;
  }
  var WIN = { '\u2026': '\x85', '\u2013': '\x96', '\u2014': '\x97', '\u2022': '\x95', '\u2018': '\x91', '\u2019': '\x92', '\u201c': '\x93', '\u201d': '\x94', '\u20ac': '\x80', '\u2192': '->', '\u2190': '<-', '\u2264': '<=', '\u2265': '>=', '\u2212': '-', '\u25b2': '+', '\u25bc': '-', '\u25b4': '+', '\u25be': '-', '\uff0b': '+', '\uff0d': '-', '\u00d7': 'x' };
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

  function PdfBuilder(w, h) { this.w = w; this.h = h; this.pages = []; this.imgs = []; this.newPage(); }
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
  PdfBuilder.prototype.image = function (img, x, yTop, w, h) {
    var k = this.imgs.indexOf(img);
    if (k < 0) { k = this.imgs.length; this.imgs.push(img); }
    this.cur.used = this.cur.used || {}; this.cur.used[k] = 1;
    this.cur.push('q ' + num(w) + ' 0 0 ' + num(h) + ' ' + num(x) + ' ' + num(this.h - yTop - h) + ' cm /Im' + k + ' Do Q');
  };
  PdfBuilder.prototype.line = function (x1, y1, x2, y2, rgb, lw) {
    this.cur.push(col(rgb) + ' RG ' + num(lw || 0.5) + ' w ' + num(x1) + ' ' + num(this.h - y1) + ' m ' + num(x2) + ' ' + num(this.h - y2) + ' l S');
  };
  PdfBuilder.prototype.build = function () {
    var objs = [], n = this.pages.length, m = this.imgs.length, kids = [], imgBase = 5 + n * 2;
    for (var i = 0; i < n; i++) kids.push((5 + i * 2) + ' 0 R');
    objs[1] = '<< /Type /Catalog /Pages 2 0 R >>';
    objs[2] = '<< /Type /Pages /Kids [' + kids.join(' ') + '] /Count ' + n + ' >>';
    objs[3] = '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>';
    objs[4] = '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>';
    for (var k = 0; k < n; k++) {
      var content = this.pages[k].join('\n'), xo = '', used = this.pages[k].used || {};
      for (var u in used) if (used.hasOwnProperty(u)) xo += '/Im' + u + ' ' + (imgBase + (+u)) + ' 0 R ';
      objs[5 + k * 2] = '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ' + num(this.w) + ' ' + num(this.h) + '] /Resources << /Font << /F1 3 0 R /F2 4 0 R >>' + (xo ? ' /XObject << ' + xo + '>>' : '') + ' >> /Contents ' + (6 + k * 2) + ' 0 R >>';
      objs[6 + k * 2] = '<< /Length ' + content.length + ' >>\nstream\n' + content + '\nendstream';
    }
    for (var q0 = 0; q0 < m; q0++) {
      var im = this.imgs[q0];
      objs[imgBase + q0] = '<< /Type /XObject /Subtype /Image /Width ' + im.w + ' /Height ' + im.h + ' /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ' + im.data.length + ' >>\nstream\n' + im.data + '\nendstream';
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
    function imgOf(el) {
      if (el.nodeType !== 1) return null;
      var k = el.getAttribute('data-ppicimg');
      return k === null ? null : (imgStore[+k] || null);
    }
    function usable(el) {
      if (imgOf(el)) return cs(el).display !== 'none' && cs(el).visibility !== 'hidden';
      if (el.nodeType !== 1 || el.namespaceURI !== XHTML || SKIP[el.tagName]) return false;
      var c = cs(el);
      return c.display !== 'none' && c.visibility !== 'hidden';
    }
    function kidsOf(el) { return Array.prototype.filter.call(el.children, usable); }
    function blockLike(el) {
      if (el.tagName === 'TABLE' || imgOf(el)) return true;
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

    /* Batang (div/span/i dengan background + lebar/tinggi persen) tidak punya teks, jadi tadinya tidak tergambar sama sekali. */
    function bgColorOf(el) {
      var c = cs(el), bg = parseColor(c.backgroundColor);
      if (bg && bg[3] >= 0.3) return bg;
      var m = /rgba?\([^)]*\)/.exec(c.backgroundImage || '');
      var g = m ? parseColor(m[0]) : null;
      return g && g[3] >= 0.3 ? g : null;
    }
    function barBlock(el) {
      if (el.tagName === 'TABLE' || !el.children.length || el.children.length > 2) return null;
      var r = el.getBoundingClientRect();
      if (r.width < 8 || r.height < 3) return null;
      var fill = null, i, k;
      for (i = 0; i < el.children.length; i++) { k = el.children[i]; if (usable(k) && bgColorOf(k)) { fill = k; break; } }
      if (!fill) return null;
      var direct = ''; Array.prototype.forEach.call(el.childNodes, function (n) { if (n.nodeType === 3) direct += n.textContent; });
      if (norm(direct)) return null;
      var rf = fill.getBoundingClientRect(), horiz = rf.height >= r.height - 2.5 && rf.width <= r.width + 1, vert = rf.width >= r.width - 2.5 && rf.height <= r.height + 1;
      if (!horiz && !vert) return null;
      var label = norm(fill.textContent), hasKids = false;
      Array.prototype.forEach.call(fill.children, function (c2) { if (c2.children.length) hasKids = true; });
      if (hasKids) return null;
      var vertical = (horiz && vert) ? r.height > r.width : vert;
      if (vertical ? label.length > 12 : (label || r.height > 26)) return null;
      var frac = vertical ? rf.height / r.height : rf.width / r.width;
      frac = Math.max(0, Math.min(1, frac || 0));
      var track = bgColorOf(el) || [237, 242, 247, 1];
      return { type: 'bar', vertical: vertical, frac: frac, color: bgColorOf(fill), track: track, label: vertical ? label : '', h: vertical ? Math.max(28, Math.min(90, r.height * 0.7)) : Math.max(4, Math.min(9, r.height * 0.75)) };
    }

    function walk(el) {
      if (!usable(el)) return;
      var im = imgOf(el);
      if (im) { var ri = el.getBoundingClientRect(); blocks.push({ type: 'img', img: im, ar: (ri.height || im.h) / (ri.width || im.w), pw: (ri.width || im.w) * 0.75 }); return; }
      var bb = barBlock(el);
      if (bb) { blocks.push(bb); return; }
      if (!el.children.length && !norm(el.textContent)) {
        var rd = el.getBoundingClientRect(), dc = bgColorOf(el);
        if (dc && rd.width >= 4 && rd.width <= 30 && rd.height >= 4 && rd.height <= 30) { blocks.push({ type: 'dot', color: dc, size: Math.min(rd.width, rd.height) * 0.75, round: parseFloat(cs(el).borderTopLeftRadius) >= Math.min(rd.width, rd.height) / 2 - 1 }); return; }
      }
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
      var nodes = Array.prototype.slice.call(el.childNodes), i = 0;
      while (i < nodes.length) {
        var n = nodes[i];
        if (n.nodeType === 3) { pushText(n.textContent, st, 0.3); i++; continue; }
        if (n.nodeType !== 1 || !usable(n)) { i++; continue; }
        /* elemen bersaudara yang tampil sebaris (mis. kartu ringkasan) dijadikan kolom berdampingan */
        var group = [n], r0 = rectOf(n), lastRight = r0.r, j = i + 1;
        if (blockLike(n)) {
          while (j < nodes.length) {
            var m = nodes[j];
            if (m.nodeType === 3) { if (norm(m.textContent)) break; j++; continue; }
            if (m.nodeType !== 1 || !usable(m)) { j++; continue; }
            var rm = rectOf(m);
            if (blockLike(m) && Math.abs(rm.t - r0.t) <= 8 && rm.l >= lastRight - 2 && rm.w > 8) { group.push(m); lastRight = rm.r; j++; } else break;
          }
        }
        if (group.length >= 2) {
          var citems = group.map(function (g) { var rg = rectOf(g); return { blocks: mergeLabels(collect(g)), w: rg.w }; }).filter(function (it) { return it.blocks.length; });
          if (citems.length >= 2) blocks.push({ type: 'cols', items: citems });
          else if (citems.length === 1) citems[0].blocks.forEach(function (bk) { blocks.push(bk); });
          i = j;
        } else { walk(n); i++; }
      }
    }
    /* label singkat (mis. "PCS", "M3") digabung dengan baris angka di bawahnya agar kartu lebih ringkas */
    function mergeLabels(list) {
      var out = [];
      for (var i = 0; i < list.length; i++) {
        var a = list[i], b = list[i + 1];
        if (a.type === 'text' && b && b.type === 'text' && a.text.length <= 4) { out.push({ type: 'text', text: a.text + '   ' + b.text, style: b.style, gap: b.gap }); i++; }
        else out.push(a);
      }
      return out;
    }
    function rectOf(k) { var r = k.getBoundingClientRect(); return { l: r.left, r: r.right, t: r.top, w: r.width }; }
    function collect(el) { var saved = blocks; blocks = []; walk(el); var res = blocks; blocks = saved; return res; }
    walk(doc.body);

    /* ---- tata letak ---- */
    var land = (cfg.orientation || 'landscape') === 'landscape';
    var PW = land ? 841.89 : 595.28, PH = land ? 595.28 : 841.89, MX = 30, MT = 30, MB = 36;
    var W0 = PW - MX * 2, pdf = new PdfBuilder(PW, PH), y = MT;
    function ensure(h, pg) { if (pg && y + h > PH - MB) { pdf.newPage(); y = MT; return true; } return false; }

    function tableLayout(b, W) {
      var nat = [], pad = 3.5, i, tot = 0;
      for (i = 0; i < b.cols; i++) nat[i] = 0;
      b.rows.forEach(function (r) { var ci = 0; r.cells.forEach(function (c) { if (c.span === 1) nat[ci] = Math.max(nat[ci], measure(c.text, c.size, c.bold) + pad * 2); ci += c.span; }); });
      for (i = 0; i < b.cols; i++) { nat[i] = Math.min(Math.max(nat[i], 26), W * 0.42); tot += nat[i]; }
      var cw = nat.map(function (v) { return v * W / tot; });
      var rows = b.rows.map(function (r) {
        var hs = [], ci = 0;
        r.cells.forEach(function (c) {
          var wv = 0; for (var k = 0; k < c.span; k++) wv += cw[ci + k] || 0;
          hs.push({ c: c, w: wv, lines: wrapText(c.text, c.size, c.bold, Math.max(10, wv - pad * 2)) });
          ci += c.span;
        });
        return { r: r, hs: hs, h: Math.max.apply(null, hs.map(function (h) { return h.lines.length * h.c.size * 1.2 + pad * 2 - 1; })) };
      });
      return { rows: rows, pad: pad };
    }
    function colsLayout(b, W) {
      var gap = 8, n = b.items.length, tw = 0, i;
      var row = b.items.some(function (it) { return it.blocks.some(function (bl) { return (bl.type === 'bar' && !bl.vertical) || bl.type === 'dot'; }); }) &&
        b.items.every(function (it) { return it.blocks.length <= 2 && it.blocks.every(function (bl) { return bl.type !== 'img' && bl.type !== 'table' && bl.type !== 'cols'; }); });
      var pad = row ? 3 : 6;
      b.items.forEach(function (it) { tw += Math.max(1, it.w); });
      var widths = b.items.map(function (it) { return (W - gap * (n - 1)) * Math.max(1, it.w) / tw; });
      var h = 0;
      b.items.forEach(function (it, k) {
        var hh = pad * 2; it.blocks.forEach(function (bl) { hh += heightOf(bl, widths[k] - pad * 2); });
        h = Math.max(h, hh);
      });
      return { widths: widths, h: h, gap: row ? 4 : gap, pad: pad, row: row };
    }
    function imgSize(b, W) {
      var w = Math.min(W, b.pw), h = w * b.ar, maxH = PH * 0.5;
      if (h > maxH) { h = maxH; w = h / b.ar; }
      return { w: w, h: h };
    }
    function heightOf(b, W) {
      if (b.type === 'rule') return 8;
      if (b.type === 'img') return imgSize(b, W).h + 6;
      if (b.type === 'bar') return (b.vertical ? b.h : b.h + 4) + 4;
      if (b.type === 'dot') return 10;
      if (b.type === 'text') { var s = b.style; return s.size * b.gap + wrapText(b.text, s.size, s.bold, W).length * s.size * 1.25; }
      if (b.type === 'table') { var t = tableLayout(b, W), h = 8; t.rows.forEach(function (r) { h += r.h; }); return h; }
      if (b.type === 'cols') return colsLayout(b, W).h + 6;
      return 0;
    }
    function drawText(b, x0, W, pg) {
      var s = b.style, lh = s.size * 1.25, lines = wrapText(b.text, s.size, s.bold, W);
      y += s.size * b.gap;
      lines.forEach(function (ln) {
        ensure(lh, pg);
        var tw = measure(ln, s.size, s.bold), x = s.align === 'right' ? x0 + W - tw : s.align === 'center' ? x0 + (W - tw) / 2 : x0;
        pdf.text(ln, x, y + s.size * 0.9, s.size, s.bold, s.color);
        y += lh;
      });
    }
    function drawTable(b, x0, W, pg) {
      var t = tableLayout(b, W), pad = t.pad, heads = [];
      function drawRow(row, idx) {
        if (ensure(row.h, pg) && !row.r.head) heads.forEach(function (hr) { drawRow(hr, -1); });
        var x = x0;
        row.hs.forEach(function (h) {
          var c = h.c, fill = c.bg || (c.head ? [225, 238, 231] : (idx > 0 && idx % 2 === 0 ? [246, 250, 248] : null));
          pdf.rect(x, y, h.w, row.h, fill, [192, 204, 198], 0.5);
          var ty = y + pad + c.size * 0.9;
          h.lines.forEach(function (ln) {
            var tw = measure(ln, c.size, c.bold), tx = c.align === 'right' ? x + h.w - pad - tw : c.align === 'center' ? x + (h.w - tw) / 2 : x + pad;
            pdf.text(ln, tx, ty, c.size, c.bold, c.fg);
            ty += c.size * 1.2;
          });
          x += h.w;
        });
        y += row.h;
      }
      t.rows.forEach(function (row, idx) { if (row.r.head) heads.push(row); drawRow(row, idx); });
      y += 8;
    }
    function drawImg(b, x0, W, pg) {
      var sz = imgSize(b, W);
      ensure(sz.h + 6, pg);
      pdf.image(b.img, x0 + (W - sz.w) / 2, y, sz.w, sz.h);
      y += sz.h + 6;
    }
    function drawDot(b, x0, W, pg) {
      ensure(10, pg);
      pdf.rect(x0, y + 1.5, b.size, b.size, b.color, null);
      y += 10;
    }
    function drawBar(b, x0, W, pg) {
      var th = b.vertical ? b.h : b.h, yy;
      ensure(th + 8, pg);
      if (b.vertical) {
        var bw = Math.min(W * 0.7, 46), bx = x0 + (W - bw) / 2, fh = Math.max(1.5, b.frac * th);
        pdf.rect(bx, y + 2, bw, th, b.track, null);
        pdf.rect(bx, y + 2 + th - fh, bw, fh, b.color, null);
        if (b.label && fh >= 11) { var lw = measure(b.label, 7, true); pdf.text(b.label, bx + (bw - lw) / 2, y + 2 + th - fh + 8.5, 7, true, lum(b.color) > 0.62 ? [40, 50, 60] : [255, 255, 255]); }
        y += th + 8;
      } else {
        yy = y + 2;
        pdf.rect(x0, yy, W, th, b.track, null);
        if (b.frac > 0) pdf.rect(x0, yy, Math.max(1.5, b.frac * W), th, b.color, null);
        y += th + 8;
      }
    }
    function drawCols(b, x0, W, pg) {
      var L = colsLayout(b, W);
      ensure(L.h + 6, pg);
      var y0 = y, x = x0;
      b.items.forEach(function (it, k) {
        if (!L.row) pdf.rect(x, y0, L.widths[k], L.h, [247, 250, 248], [200, 210, 205], 0.6);
        y = y0 + L.pad;
        drawBlocks(it.blocks, x + (L.row ? 0 : L.pad), L.widths[k] - (L.row ? 0 : L.pad * 2), false);
        x += L.widths[k] + L.gap;
      });
      if (L.row) { pdf.line(x0, y0 + L.h + 2, x0 + W, y0 + L.h + 2, [226, 232, 228], 0.5); y = y0 + L.h + 4; }
      else y = y0 + L.h + 6;
    }
    function drawBlocks(list, x0, W, pg) {
      list.forEach(function (b) {
        if (b.type === 'rule') { ensure(8, pg); pdf.line(x0, y + 2, x0 + W, y + 2, [190, 200, 195], 0.7); y += 8; }
        else if (b.type === 'text') drawText(b, x0, W, pg);
        else if (b.type === 'table') drawTable(b, x0, W, pg);
        else if (b.type === 'cols') drawCols(b, x0, W, pg);
        else if (b.type === 'img') drawImg(b, x0, W, pg);
        else if (b.type === 'bar') drawBar(b, x0, W, pg);
        else if (b.type === 'dot') drawDot(b, x0, W, pg);
      });
    }
    drawBlocks(blocks, MX, W0, true);

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

  /* SVG (donut Passing Ratio, sparkline, grafik area) -> JPEG, lalu disisipkan ke PDF sebagai gambar. */
  function svgToJpeg(svg, win, cb) {
    var r = svg.getBoundingClientRect(), w = Math.round(r.width), h = Math.round(r.height), done = false;
    function fin(v) { if (!done) { done = true; cb(v); } }
    if (w < 60 || h < 30) return fin(null);
    try {
      var cl = svg.cloneNode(true), src = [svg].concat(Array.prototype.slice.call(svg.querySelectorAll('*'))), dst = [cl].concat(Array.prototype.slice.call(cl.querySelectorAll('*')));
      var PROPS = ['fill', 'fill-opacity', 'stroke', 'stroke-width', 'stroke-opacity', 'stroke-linecap', 'stroke-linejoin', 'opacity', 'font-size', 'font-weight', 'text-anchor', 'letter-spacing'];
      var GFX = { path: 1, rect: 1, circle: 1, ellipse: 1, line: 1, polyline: 1, polygon: 1, text: 1, tspan: 1, g: 1 };
      src.forEach(function (o, i) {
        var t = dst[i], tag = (o.localName || '').toLowerCase();
        if (!GFX[tag]) return;
        var c = win.getComputedStyle(o), css = (t.getAttribute('style') || '').replace(/;?\s*$/, ';');
        PROPS.forEach(function (pn) { var v = c.getPropertyValue(pn); if (v) css += pn + ':' + v + ';'; });
        if (tag === 'text' || tag === 'tspan') css += 'font-family:Helvetica,Arial,sans-serif;';
        t.setAttribute('style', css);
      });
      if (!cl.getAttribute('viewBox')) {
        var aw = parseFloat(svg.getAttribute('width')), ah = parseFloat(svg.getAttribute('height'));
        if (aw > 0 && ah > 0) cl.setAttribute('viewBox', '0 0 ' + aw + ' ' + ah);
      }
      cl.setAttribute('width', w); cl.setAttribute('height', h);
      cl.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
      var xml = new XMLSerializer().serializeToString(cl), img = new Image();
      var sc = Math.max(1, Math.min(2, Math.sqrt(1600000 / (w * h))));
      img.onload = function () {
        try {
          var cv = document.createElement('canvas'); cv.width = Math.round(w * sc); cv.height = Math.round(h * sc);
          var cx = cv.getContext('2d'); cx.fillStyle = '#ffffff'; cx.fillRect(0, 0, cv.width, cv.height);
          cx.drawImage(img, 0, 0, cv.width, cv.height);
          fin({ w: cv.width, h: cv.height, data: atob(cv.toDataURL('image/jpeg', 0.88).split(',')[1]) });
        } catch (e) { fin(null); }
      };
      img.onerror = function () { fin(null); };
      setTimeout(function () { fin(null); }, 5000);
      img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(xml);
    } catch (e) { fin(null); }
  }
  function donutToJpeg(el, win) {
    try {
      var r = el.getBoundingClientRect(), w = Math.round(r.width), h = Math.round(r.height);
      if (w < 40 || h < 40) return null;
      var bi = (el.getAttribute('style') || '') + ' ' + (win.getComputedStyle(el).backgroundImage || ''), re = /(rgba?\([^)]*\)|#[0-9a-fA-F]{3,8})\s+([\d.]+)%\s+([\d.]+)%/g, m, segs = [];
      while ((m = re.exec(bi))) segs.push({ c: m[1], a: +m[2], b: +m[3] });
      if (!segs.length) return null;
      var sc = 2, cv = document.createElement('canvas'); cv.width = w * sc; cv.height = h * sc;
      var cx = cv.getContext('2d'), R = Math.min(w, h) * sc / 2, mx = w * sc / 2, my = h * sc / 2;
      cx.fillStyle = '#ffffff'; cx.fillRect(0, 0, cv.width, cv.height);
      segs.forEach(function (sg) {
        cx.beginPath(); cx.moveTo(mx, my);
        cx.arc(mx, my, R, -Math.PI / 2 + sg.a / 100 * 2 * Math.PI, -Math.PI / 2 + sg.b / 100 * 2 * Math.PI);
        cx.closePath(); cx.fillStyle = sg.c; cx.fill();
      });
      var ce = el.querySelector('.donut-center'), cr = ce ? ce.getBoundingClientRect().width / 2 * sc : R * 0.62;
      cx.beginPath(); cx.arc(mx, my, cr, 0, 2 * Math.PI); cx.fillStyle = '#ffffff'; cx.fill();
      var tot = el.querySelector('.donut-total'), cap = el.querySelector('.donut-caption');
      cx.textAlign = 'center'; cx.textBaseline = 'middle'; cx.fillStyle = '#0f2540';
      if (tot) { cx.font = 'bold ' + Math.round(cr * 0.38) + 'px Helvetica, Arial, sans-serif'; cx.fillText(norm0(tot.textContent), mx, my - cr * 0.1); }
      if (cap) { cx.font = Math.round(cr * 0.2) + 'px Helvetica, Arial, sans-serif'; cx.fillStyle = '#64748b'; cx.fillText(norm0(cap.textContent), mx, my + cr * 0.32); }
      return { w: cv.width, h: cv.height, data: atob(cv.toDataURL('image/jpeg', 0.9).split(',')[1]) };
    } catch (e) { return null; }
  }
  function norm0(t) { return String(t || '').replace(/\s+/g, ' ').trim(); }
  function rasterizeSvgs(d, next) {
    var list = Array.prototype.filter.call(d.querySelectorAll('svg'), function (sv) {
      var cs = d.defaultView.getComputedStyle(sv); return cs.display !== 'none' && cs.visibility !== 'hidden';
    }), left = list.length, donuts = [];
    imgStore = [];
    Array.prototype.forEach.call(d.querySelectorAll('.donut'), function (dn) {
      var res = donutToJpeg(dn, d.defaultView);
      if (res) { imgStore.push(res); dn.setAttribute('data-ppicimg', String(imgStore.length - 1)); }
    });
    if (!left) return next();
    list.forEach(function (sv) {
      svgToJpeg(sv, d.defaultView, function (res) {
        if (res) { imgStore.push(res); sv.setAttribute('data-ppicimg', String(imgStore.length - 1)); }
        if (--left === 0) next();
      });
    });
  }

  /* Tulis HTML ke iframe tersembunyi (tanpa skrip), baca tata letaknya, buat PDF. */
  function renderHtmlToPdf(html, cfg, done) {
    var f = document.createElement('iframe');
    f.setAttribute('sandbox', 'allow-same-origin');
    f.style.cssText = 'position:fixed;left:-12000px;top:0;width:' + (cfg.layoutWidth || 1100) + 'px;height:900px;border:0;opacity:0;pointer-events:none';
    document.body.appendChild(f);
    var d = f.contentDocument;
    d.open(); d.write(html); d.close();
    /* animasi batang/grafik (ppicBarGrow, ppicCardEnter, dll.) belum selesai saat dibaca -> ukuran 0; matikan. */
    try {
      var st = d.createElement('style');
      st.textContent = '*,*::before,*::after{animation:none!important;transition:none!important}';
      d.head.appendChild(st);
      Array.prototype.forEach.call(d.querySelectorAll('details'), function (x) { x.setAttribute('open', ''); });
      Array.prototype.forEach.call(d.querySelectorAll('summary'), function (x) { x.parentNode && x.parentNode.removeChild(x); });
    } catch (e0) {}
    function cleanup() { try { f.parentNode.removeChild(f); } catch (e2) {} }
    setTimeout(function () {
      rasterizeSvgs(d, function () {
        var buf = null, err = null;
        try { buf = pdfFromDocument(d, cfg); } catch (e) { err = e; }
        imgStore = []; cleanup();
        done(err, buf);
      });
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

  window.PPICKit = { version: '4', openPrintWindow: openPrintWindow, attachPrintBar: attachPrintBar, exportPage: exportPage, exportWindow: exportWindow, _pdfFromDocument: pdfFromDocument, _renderHtmlToPdf: renderHtmlToPdf };
})();
