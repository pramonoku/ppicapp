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
      loadLib().then(function () {
        if (ui) ui.style.visibility = 'hidden';
        var root = document.getElementById('ppicRoot') || document.body;
        var w = root.scrollWidth, h = root.scrollHeight;
        var scale = Math.max(0.8, Math.min(2, Math.sqrt(12000000 / Math.max(1, w * h))));
        return window.html2pdf().set({
          margin: 8, filename: cfg.filename, image: { type: 'jpeg', quality: 0.92 },
          html2canvas: { scale: scale, useCORS: true, backgroundColor: '#ffffff', scrollY: 0, windowWidth: w },
          jsPDF: { unit: 'mm', format: 'a4', orientation: (cfg.orientation || 'landscape') },
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

  window.PPICKit = { version: '1', openPrintWindow: openPrintWindow, attachPrintBar: attachPrintBar };
})();
