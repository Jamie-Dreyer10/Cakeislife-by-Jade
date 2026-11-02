/* Cake is Life by Jade - page behaviour. You should not need to edit this file. */
(function () {
  'use strict';
  var S = window.SITE || {};
  var $ = function (id) { return document.getElementById(id); };

  /* ---------- Contact details from config.js ---------- */
  var waNumber = (S.whatsapp || '').replace(/\D/g, '');
  var waReady = /^\d{9,15}$/.test(waNumber);
  var waBase = 'https://wa.me/' + waNumber;
  var hello = encodeURIComponent('Hi Jade, I would like to ask about a cake.');

  ['waFloat', 'footWa'].forEach(function (id) {
    var el = $(id); if (el) el.href = waBase + '?text=' + hello;
  });
  var waLink = $('waLink');
  if (waLink) { waLink.href = waBase + '?text=' + hello; waLink.textContent = S.phoneDisplay || 'Message me'; }
  var reopen = $('reopenChat'); if (reopen) reopen.href = waBase;

  function setText(id, text) { var el = $(id); if (el) el.textContent = text; }
  setText('baseText', S.baseArea || '');
  setText('serviceText', S.serviceArea || '');
  setText('year', new Date().getFullYear());

  if (S.email && $('emailRow')) {
    $('emailRow').hidden = false;
    $('emailLink').href = 'mailto:' + S.email;
    $('emailLink').textContent = S.email;
  }

  var socials = $('socials');
  function addSocial(label, url) {
    if (!url || !socials) return;
    var a = document.createElement('a');
    a.href = url; a.textContent = label; a.target = '_blank'; a.rel = 'noopener';
    socials.appendChild(a);
  }
  addSocial('Facebook', S.facebook);
  addSocial('Instagram', S.instagram);

  /* ---------- Mobile menu ---------- */
  var toggle = document.querySelector('.nav-toggle');
  var nav = $('nav');
  if (toggle && nav) {
    toggle.addEventListener('click', function () {
      var open = nav.classList.toggle('open');
      toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
      toggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    });
    nav.addEventListener('click', function (e) {
      if (e.target.tagName === 'A') {
        nav.classList.remove('open');
        toggle.setAttribute('aria-expanded', 'false');
      }
    });
  }

  /* ---------- Catalogue filter ---------- */
  var grid = $('galleryGrid');
  var items = grid ? Array.prototype.slice.call(grid.querySelectorAll('.g-item')) : [];
  var chips = document.querySelectorAll('.chip');

  chips.forEach(function (chip) {
    chip.addEventListener('click', function () {
      var f = chip.getAttribute('data-filter');
      chips.forEach(function (c) { c.classList.remove('is-active'); });
      chip.classList.add('is-active');
      items.forEach(function (it) {
        var cats = (it.getAttribute('data-cat') || '').split(' ');
        it.hidden = !(f === 'all' || cats.indexOf(f) !== -1);
      });
    });
  });

  /* ---------- Order form helpers (index page only) ---------- */
  var form = $('orderForm');

  function prefillFromTitle(title) {
    if (!form || !title) return;
    var d = $('f-details');
    if (d && !d.value.trim()) {
      d.value = 'I love the ' + title + ' in your gallery and would like something similar. ';
    }
  }

  if (form) {
    var ref = new URLSearchParams(window.location.search).get('ref');
    if (ref) prefillFromTitle(ref.slice(0, 80));
  }

  /* ---------- Lightbox ---------- */
  var lb = $('lightbox');
  var lbImg = $('lbImg');
  var lbOrder = $('lbOrder');
  var current = -1;
  var lastFocus = null;

  function visibleItems() { return items.filter(function (it) { return !it.hidden; }); }

  function show(i) {
    var list = visibleItems();
    if (!list.length) return;
    current = (i + list.length) % list.length;
    var it = list[current], img = it.querySelector('img');
    lbImg.src = img.getAttribute('src');
    lbImg.alt = img.getAttribute('alt') || '';
    if (lbOrder && !form) {
      lbOrder.href = 'index.html?ref=' + encodeURIComponent(it.getAttribute('data-title') || '') + '#order';
    }
  }
  function openLb(item) {
    lastFocus = document.activeElement;
    show(visibleItems().indexOf(item));
    lb.hidden = false;
    document.body.style.overflow = 'hidden';
    lb.querySelector('.lb-close').focus();
  }
  function closeLb(skipFocus) {
    lb.hidden = true;
    lbImg.src = '';
    document.body.style.overflow = '';
    if (!skipFocus && lastFocus) lastFocus.focus({ preventScroll: true });
  }

  if (grid && lb) {
    grid.addEventListener('click', function (e) {
      var btn = e.target.closest('.g-btn');
      if (btn) openLb(btn.closest('.g-item'));
    });
    lb.querySelector('.lb-close').addEventListener('click', function () { closeLb(); });
    lb.querySelector('.lb-prev').addEventListener('click', function () { show(current - 1); });
    lb.querySelector('.lb-next').addEventListener('click', function () { show(current + 1); });
    lb.addEventListener('click', function (e) { if (e.target === lb) closeLb(); });

    if (lbOrder && form) {
      lbOrder.addEventListener('click', function () {
        var it = visibleItems()[current];
        if (it) prefillFromTitle(it.getAttribute('data-title'));
        closeLb(true);
      });
    }

    document.addEventListener('keydown', function (e) {
      if (lb.hidden) return;
      if (e.key === 'Escape') closeLb();
      if (e.key === 'ArrowLeft') show(current - 1);
      if (e.key === 'ArrowRight') show(current + 1);
    });

    var touchX = null;
    lb.addEventListener('touchstart', function (e) { touchX = e.touches[0].clientX; }, { passive: true });
    lb.addEventListener('touchend', function (e) {
      if (touchX === null) return;
      var dx = e.changedTouches[0].clientX - touchX;
      if (Math.abs(dx) > 50) show(current + (dx < 0 ? 1 : -1));
      touchX = null;
    });
  }

  if (!form) return;

  /* ---------- Order form: photos ---------- */
  var MAX_PHOTOS = 6;
  var photos = [];                       // { file, url }
  var fileInput = $('f-photos');
  var thumbs = $('thumbs');
  var errBox = $('formError');

  function showError(msg) { errBox.textContent = msg; errBox.hidden = false; }

  function pushPhoto(f) { var entry = { file: f, url: URL.createObjectURL(f) }; photos.push(entry); return entry; }

  // Shrink big phone photos so they send quickly
  function compress(file) {
    return new Promise(function (resolve) {
      var url = URL.createObjectURL(file);
      var img = new Image();
      img.onload = function () {
        var max = 1600, w = img.naturalWidth, h = img.naturalHeight;
        var scale = Math.min(1, max / Math.max(w, h));
        if (scale === 1 && file.size < 800 * 1024 && file.type === 'image/jpeg') {
          URL.revokeObjectURL(url); return resolve(file);
        }
        var c = document.createElement('canvas');
        c.width = Math.round(w * scale); c.height = Math.round(h * scale);
        c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
        c.toBlob(function (blob) {
          URL.revokeObjectURL(url);
          if (!blob) return resolve(file);
          var name = (file.name || 'photo').replace(/\.[^.]+$/, '') + '.jpg';
          try { resolve(new File([blob], name, { type: 'image/jpeg' })); }
          catch (err) { resolve(file); }
        }, 'image/jpeg', 0.82);
      };
      img.onerror = function () { URL.revokeObjectURL(url); resolve(file); };
      img.src = url;
    });
  }

  function renderThumbs() {
    thumbs.innerHTML = '';
    photos.forEach(function (p, i) {
      var li = document.createElement('li');
      var im = document.createElement('img');
      im.src = p.url; im.alt = 'Selected photo ' + (i + 1);
      var rm = document.createElement('button');
      rm.type = 'button'; rm.textContent = '×'; rm.setAttribute('aria-label', 'Remove photo ' + (i + 1));
      rm.addEventListener('click', function () {
        URL.revokeObjectURL(p.url);
        photos.splice(i, 1);
        renderThumbs();
      });
      li.appendChild(im); li.appendChild(rm);
      thumbs.appendChild(li);
    });
  }

  fileInput.addEventListener('change', function () {
    errBox.hidden = true;
    var chosen = Array.prototype.slice.call(fileInput.files || [])
      .filter(function (f) { return /^image\//.test(f.type) || /\.(jpe?g|png|webp|heic|heif)$/i.test(f.name); });
    var room = MAX_PHOTOS - photos.length;
    if (chosen.length > room) showError('You can add up to ' + MAX_PHOTOS + ' photos. Extra photos were skipped.');
    chosen = chosen.slice(0, Math.max(room, 0));
    fileInput.value = '';
    Promise.all(chosen.map(compress)).then(function (files) {
      files.forEach(pushPhoto);
      renderThumbs();
    });
  });

  /* ---------- Cake designer ---------- */
  var cdSvg = $('cdSvg');
  if (cdSvg) {
    var COLORS = [
      { name: 'Blush pink', hex: '#F6A3C7' },
      { name: 'Hot pink', hex: '#EC5C9C' },
      { name: 'Berry', hex: '#B8325E' },
      { name: 'Lilac', hex: '#C9A8EC' },
      { name: 'Sky blue', hex: '#9CC9EE' },
      { name: 'Sage green', hex: '#A9CBA3' },
      { name: 'Butter yellow', hex: '#F6DE8A' },
      { name: 'Peach', hex: '#F8C6A5' },
      { name: 'Ivory', hex: '#FBF6EE' },
      { name: 'Black', hex: '#34303A' }
    ];
    // 0 = bento, 1 = one tier, 2 = two tiers
    var GEO = {
      0: { w: [178], h: [96] },
      1: { w: [190], h: [130] },
      2: { w: [210, 146], h: [84, 76] }
    };
    var CD = { tiers: 2, hex: COLORS[0].hex, cname: COLORS[0].name, custom: false, flavour: 'Vanilla', bows: true, pearls: true, drip: false, leaves: true, topper: 'Happy Birthday' };

    var esc = function (s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); };
    var rgb = function (hex) { var n = parseInt(hex.slice(1), 16); return [n >> 16 & 255, n >> 8 & 255, n & 255]; };
    var mix = function (hex, toWhite, amt) {
      var c = rgb(hex), t = toWhite ? 255 : 0;
      return 'rgb(' + c.map(function (v) { return Math.round(v + (t - v) * amt); }).join(',') + ')';
    };
    var toHex = function (r, g, b) { return '#' + [r, g, b].map(function (v) { return ('0' + Math.round(v).toString(16)).slice(-2); }).join('').toUpperCase(); };
    function hsvToHex(h, s, v) {
      var c = v * s, x = c * (1 - Math.abs((h / 60) % 2 - 1)), m = v - c, r = 0, g = 0, b = 0;
      if (h < 60) { r = c; g = x; } else if (h < 120) { r = x; g = c; } else if (h < 180) { g = c; b = x; }
      else if (h < 240) { g = x; b = c; } else if (h < 300) { r = x; b = c; } else { r = c; b = x; }
      return toHex((r + m) * 255, (g + m) * 255, (b + m) * 255);
    }
    function hexToHsv(hex) {
      var c = rgb(hex).map(function (v) { return v / 255; }), mx = Math.max(c[0], c[1], c[2]), mn = Math.min(c[0], c[1], c[2]), d = mx - mn, h = 0;
      if (d) {
        if (mx === c[0]) h = ((c[1] - c[2]) / d) % 6; else if (mx === c[1]) h = (c[2] - c[0]) / d + 2; else h = (c[0] - c[1]) / d + 4;
        h *= 60; if (h < 0) h += 360;
      }
      return { h: h, s: mx ? d / mx : 0, v: mx };
    }
    // give a picked colour a friendly name, e.g. "deep teal"
    function describeColor(hex) {
      var c = rgb(hex).map(function (v) { return v / 255; }), mx = Math.max(c[0], c[1], c[2]), mn = Math.min(c[0], c[1], c[2]);
      var l = (mx + mn) / 2, d = mx - mn, sat = d === 0 ? 0 : d / (1 - Math.abs(2 * l - 1));
      var h = hexToHsv(hex).h;
      if (l < 0.12) return 'black';
      if (l > 0.94) return 'white';
      if (sat < 0.12) return l < 0.35 ? 'charcoal' : l > 0.8 ? 'light grey' : 'grey';
      var name;
      if (h < 15 || h >= 345) name = l > 0.72 ? 'pink' : 'red';
      else if (h < 40) name = l < 0.42 ? 'brown' : 'orange';
      else if (h < 65) name = 'yellow';
      else if (h < 95) name = 'lime green';
      else if (h < 165) name = 'green';
      else if (h < 195) name = 'teal';
      else if (h < 255) name = 'blue';
      else if (h < 290) name = 'purple';
      else name = 'pink';
      var pre = '';
      if (name !== 'pink' || l < 0.72) { if (l > 0.8) pre = 'pale '; else if (l > 0.64) pre = 'light '; else if (l < 0.28) pre = 'dark '; else if (l < 0.4 && name !== 'brown') pre = 'deep '; }
      return pre + name;
    }
    var lum = function (hex) { var c = rgb(hex); return (0.299 * c[0] + 0.587 * c[1] + 0.114 * c[2]) / 255; };

    function bow(x, y, colour) {
      return '<g transform="translate(' + x + ',' + y + ')" fill="' + colour + '" stroke="rgba(0,0,0,.12)" stroke-width=".6">' +
        '<path d="M0,0 C-8,-12 -21,-6 -17,4 C-14,9 -4,4 0,0Z"/><path d="M0,0 C8,-12 21,-6 17,4 C14,9 4,4 0,0Z"/>' +
        '<path d="M0,2 C-4,14 -9,22 -10,32 L-5,29 L-3,34 C-1,22 1,12 0,2Z"/><path d="M0,2 C4,14 9,22 10,32 L5,29 L3,34 C1,22 -1,12 0,2Z"/>' +
        '<circle r="3" cy="1"/></g>';
    }
    function sprig(x, y, rot, h, colour) {
      return '<g transform="translate(' + x + ',' + y + ') rotate(' + rot + ')" style="color:' + colour + '">' +
        '<use href="#cdLeaf" x="' + (-h / 4) + '" y="' + (-h) + '" width="' + (h / 2) + '" height="' + h + '"/></g>';
    }

    function renderCake() {
      var n = CD.tiers, W = GEO[n].w, H = GEO[n].h, cx = 150, base = 300, ry = 10;
      var bento = n === 0, count = bento ? 1 : n;
      var col = CD.hex, light = mix(col, true, .3);
      var dark = lum(col) < 0.35, pale = lum(col) > 0.82;
      var dripCol = dark ? '#D9A441' : '#6B4332';
      var ribbon = pale ? '#EC5C9C' : '#FFFFFF';
      var green = '#6E9A6A';
      var pr = W[0] / 2 + 26;
      var s = '<defs><linearGradient id="cdShade" x1="0" x2="1" y1="0" y2="0"><stop offset="0" stop-color="#fff" stop-opacity=".3"/><stop offset=".4" stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".16"/></linearGradient>' +
        '<symbol id="cdLeaf" viewBox="0 0 100 200"><path d="M50 198 C 48 140 56 70 50 6" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"/>' +
        '<path fill="currentColor" d="M50 150 C 22 146 8 124 10 104 C 36 106 52 126 50 150Z"/><path fill="currentColor" d="M50 120 C 78 116 92 94 90 74 C 64 76 48 96 50 120Z"/>' +
        '<path fill="currentColor" d="M50 92 C 24 88 12 68 14 50 C 38 52 52 70 50 92Z"/><path fill="currentColor" d="M51 64 C 76 60 88 42 86 26 C 64 28 50 44 51 64Z"/>' +
        '<path fill="currentColor" d="M50 30 C 42 20 44 10 50 4 C 58 12 58 22 50 30Z"/></symbol></defs>';

      var bw = W[0] + 40, bx = cx - bw / 2;
      if (bento) {
        // a little kraft bento box (back of the box first)
        s += '<ellipse cx="150" cy="' + (base + 30) + '" rx="' + (bw / 2 + 8) + '" ry="10" fill="#2A2233" opacity=".08"/>' +
          '<ellipse cx="150" cy="' + (base - 2) + '" rx="' + (bw / 2) + '" ry="16" fill="#C4A271"/>';
      } else {
        // plate
        s += '<ellipse cx="150" cy="' + (base + 24) + '" rx="' + (pr + 8) + '" ry="12" fill="#2A2233" opacity=".08"/>' +
          '<ellipse cx="150" cy="' + (base + 10) + '" rx="' + pr + '" ry="15" fill="#E7DDE3"/>' +
          '<ellipse cx="150" cy="' + (base + 4) + '" rx="' + pr + '" ry="15" fill="#fff" stroke="#EFE3EA"/>';
      }

      if (CD.leaves) {
        var lx = bento ? bw / 2 - 8 : W[0] / 2 - 4;
        s += sprig(cx - lx, base + 6, -52, 62, green) + sprig(cx + lx, base + 6, 52, 62, green);
      }

      var yBot = bento ? base - 4 : base, topY = yBot, topW = W[0];
      for (var i = 0; i < count; i++) {
        var w = W[i], h = H[i], x = cx - w / 2, yTop = yBot - h;
        s += '<path d="M' + x + ',' + yTop + ' L' + x + ',' + yBot + ' A' + (w / 2) + ',' + ry + ' 0 0 0 ' + (x + w) + ',' + yBot + ' L' + (x + w) + ',' + yTop + ' Z" fill="' + col + '"/>';
        s += '<path d="M' + x + ',' + yTop + ' L' + x + ',' + yBot + ' A' + (w / 2) + ',' + ry + ' 0 0 0 ' + (x + w) + ',' + yBot + ' L' + (x + w) + ',' + yTop + ' Z" fill="url(#cdShade)"/>';
        s += '<ellipse cx="' + cx + '" cy="' + yTop + '" rx="' + (w / 2) + '" ry="' + ry + '" fill="' + light + '"/>';
        if (CD.drip) {
          s += '<path d="M' + x + ',' + yTop + ' A' + (w / 2) + ',' + ry + ' 0 0 0 ' + (x + w) + ',' + yTop + ' L' + (x + w) + ',' + (yTop + 9) + ' A' + (w / 2) + ',' + ry + ' 0 0 1 ' + x + ',' + (yTop + 9) + ' Z" fill="' + dripCol + '"/>';
          var cnt = Math.round(w / 26);
          for (var k = 0; k < cnt; k++) {
            var t = -1 + (2 * (k + 0.5)) / cnt, dx = cx + t * (w / 2) * 0.96;
            var edge = yTop + ry * Math.sqrt(1 - t * t * 0.92);
            var len = 12 + ((k * 7 + i * 5) % 4) * 6;
            s += '<rect x="' + (dx - 5) + '" y="' + (edge + 2) + '" width="10" height="' + len + '" rx="5" fill="' + dripCol + '"/>';
          }
        }
        if (CD.pearls) {
          var np = Math.floor(w / 17);
          for (var p = 1; p < np; p++) {
            var tt = -1 + (2 * p) / np, px = cx + tt * (w / 2), py = (bento ? yTop : yBot) + ry * Math.sqrt(1 - tt * tt) - 1;
            s += '<circle cx="' + px.toFixed(1) + '" cy="' + py.toFixed(1) + '" r="3.6" fill="#E3B34F" stroke="#B98A2E" stroke-width=".6"/><circle cx="' + (px - 1.1).toFixed(1) + '" cy="' + (py - 1.2).toFixed(1) + '" r="1.1" fill="#fff" opacity=".85"/>';
          }
        }
        topY = yTop; topW = w; yBot = yTop;
      }

      if (bento) {
        // front wall of the box, drawn over the bottom of the cake
        s += '<path d="M' + bx + ',' + (base - 2) + ' A' + (bw / 2) + ',16 0 0 0 ' + (bx + bw) + ',' + (base - 2) + ' L' + (bx + bw - 12) + ',' + (base + 30) + ' L' + (bx + 12) + ',' + (base + 30) + ' Z" fill="#D9B98A"/>' +
          '<path d="M' + bx + ',' + (base - 2) + ' A' + (bw / 2) + ',16 0 0 0 ' + (bx + bw) + ',' + (base - 2) + '" fill="none" stroke="#B9935C" stroke-width="2.5"/>';
      }
      if (CD.leaves) s += sprig(cx + topW / 2 - 12, topY + 2, 38, 50, green);
      if (CD.bows) s += bow(cx - topW / 2 + 6, topY + 5, ribbon) + bow(cx + topW / 2 - 6, topY + 5, ribbon);

      // topper
      var text = CD.topper.trim();
      if (text) {
        var lines = [text];
        if (text.length > 15 && text.indexOf(' ') > -1) {
          var mid = text.length / 2, best = -1, bd = 99;
          for (var q = 0; q < text.length; q++) if (text[q] === ' ' && Math.abs(q - mid) < bd) { bd = Math.abs(q - mid); best = q; }
          if (best > 0) lines = [text.slice(0, best), text.slice(best + 1)];
        }
        var longest = Math.max.apply(null, lines.map(function (l) { return l.length; }));
        var fs = Math.max(11, Math.min(24, 230 / (longest * 0.52)));
        var ty = topY - ry - 2, stick = lines.length > 1 ? (bento ? 44 : 54) : (bento ? 32 : 40);
        s += '<line x1="' + cx + '" y1="' + ty + '" x2="' + cx + '" y2="' + (ty - stick) + '" stroke="#C9962E" stroke-width="2.4" stroke-linecap="round"/>';
        lines.forEach(function (l, idx) {
          var y = ty - stick - 4 + idx * (fs + 3) - (lines.length - 1) * (fs + 3);
          s += '<text x="' + cx + '" y="' + y.toFixed(1) + '" text-anchor="middle" font-family="Courgette, \'Brush Script MT\', cursive" font-size="' + fs.toFixed(1) + '" fill="#C9962E" stroke="#fff" stroke-width="3" paint-order="stroke" stroke-linejoin="round">' + esc(l) + '</text>';
        });
      }
      cdSvg.innerHTML = s;
      cdSvg.setAttribute('aria-label', 'Preview: ' + (bento ? 'bento' : n + ' tier') + ' ' + CD.flavour.toLowerCase() + ' cake in ' + CD.cname.toLowerCase() + (text ? ' with the topper "' + text + '"' : ''));
      $('cdColorName').textContent = CD.cname;
    }

    // controls
    var swWrap = $('cdColors');
    var HSV = hexToHsv(CD.hex);
    var wheel = $('cdWheel'), wheelDot = $('cdWheelDot'), wheelDisc = $('cdWheelDisc'), bright = $('cdBright'), chip = $('cdChip');

    function syncWheel() {
      var a = HSV.h * Math.PI / 180;
      wheelDot.style.left = (50 + 50 * HSV.s * Math.sin(a)) + '%';
      wheelDot.style.top = (50 - 50 * HSV.s * Math.cos(a)) + '%';
      wheelDisc.style.filter = 'brightness(' + HSV.v + ')';
      bright.value = Math.round(HSV.v * 100);
      chip.style.background = CD.hex;
    }
    function setPressed(idx) {
      Array.prototype.forEach.call(swWrap.children, function (el, j) { el.setAttribute('aria-pressed', j === idx ? 'true' : 'false'); });
    }
    function fromWheel() {
      CD.hex = hsvToHex(HSV.h, HSV.s, HSV.v);
      CD.cname = describeColor(CD.hex); CD.custom = true;
      setPressed(-1); syncWheel(); renderCake();
    }

    COLORS.forEach(function (c, i) {
      var b = document.createElement('button');
      b.type = 'button'; b.className = 'swatch'; b.style.background = c.hex;
      b.setAttribute('aria-label', c.name); b.title = c.name;
      b.setAttribute('aria-pressed', i === 0 ? 'true' : 'false');
      b.addEventListener('click', function () {
        CD.hex = c.hex; CD.cname = c.name; CD.custom = false;
        HSV = hexToHsv(c.hex);
        setPressed(i); syncWheel(); renderCake();
      });
      swWrap.appendChild(b);
    });

    var dragging = false;
    function pointerToHsv(e) {
      var r = wheel.getBoundingClientRect(), rad = r.width / 2;
      var dx = e.clientX - (r.left + rad), dy = e.clientY - (r.top + rad);
      var ang = Math.atan2(dx, -dy) * 180 / Math.PI; if (ang < 0) ang += 360;
      HSV.h = ang; HSV.s = Math.min(1, Math.hypot(dx, dy) / rad);
      fromWheel();
    }
    wheel.addEventListener('pointerdown', function (e) {
      dragging = true; try { wheel.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ }
      pointerToHsv(e); e.preventDefault();
    });
    wheel.addEventListener('pointermove', function (e) { if (dragging) pointerToHsv(e); });
    ['pointerup', 'pointercancel'].forEach(function (ev) { wheel.addEventListener(ev, function () { dragging = false; }); });
    wheel.addEventListener('keydown', function (e) {
      var k = e.key, used = true;
      if (k === 'ArrowLeft') HSV.h = (HSV.h + 352) % 360;
      else if (k === 'ArrowRight') HSV.h = (HSV.h + 8) % 360;
      else if (k === 'ArrowUp') HSV.s = Math.min(1, HSV.s + 0.08);
      else if (k === 'ArrowDown') HSV.s = Math.max(0, HSV.s - 0.08);
      else used = false;
      if (used) { e.preventDefault(); fromWheel(); }
    });
    bright.addEventListener('input', function () { HSV.v = parseInt(bright.value, 10) / 100; fromWheel(); });
    syncWheel();

    var tierBtns = $('cdTiers').querySelectorAll('button');
    Array.prototype.forEach.call(tierBtns, function (b) {
      b.addEventListener('click', function () {
        CD.tiers = parseInt(b.getAttribute('data-tiers'), 10);
        Array.prototype.forEach.call(tierBtns, function (o) { o.setAttribute('aria-pressed', o === b ? 'true' : 'false'); });
        renderCake();
      });
    });
    var flavBtns = $('cdFlavours').querySelectorAll('button');
    Array.prototype.forEach.call(flavBtns, function (b) {
      b.addEventListener('click', function () {
        CD.flavour = b.getAttribute('data-flavour');
        Array.prototype.forEach.call(flavBtns, function (o) { o.setAttribute('aria-pressed', o === b ? 'true' : 'false'); });
        renderCake();
      });
    });
    [['cdBows', 'bows'], ['cdPearls', 'pearls'], ['cdDrip', 'drip'], ['cdLeaves', 'leaves']].forEach(function (pair) {
      $(pair[0]).addEventListener('change', function (e) { CD[pair[1]] = e.target.checked; renderCake(); });
    });
    $('cdTopper').addEventListener('input', function (e) { CD.topper = e.target.value; renderCake(); });
    renderCake();

    // turn the sketch into a small picture so it travels with the order
    function sketchToFile() {
      return new Promise(function (resolve) {
        try {
          var clone = cdSvg.cloneNode(true);
          clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
          clone.setAttribute('width', '600'); clone.setAttribute('height', '680');
          var xml = new XMLSerializer().serializeToString(clone);
          var img = new Image();
          img.onload = function () {
            try {
              var c = document.createElement('canvas'); c.width = 600; c.height = 680;
              var g = c.getContext('2d'); g.fillStyle = '#FFFAF6'; g.fillRect(0, 0, 600, 680);
              g.drawImage(img, 0, 0, 600, 680);
              c.toBlob(function (b) {
                if (!b) return resolve(null);
                try { resolve(new File([b], 'my-cake-design.jpg', { type: 'image/jpeg' })); } catch (e) { resolve(null); }
              }, 'image/jpeg', 0.9);
            } catch (e) { resolve(null); }
          };
          img.onerror = function () { resolve(null); };
          img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(xml);
        } catch (e) { resolve(null); }
      });
    }

    var sketchEntry = null;
    $('cdUse').addEventListener('click', function () {
      var extras = [];
      if (CD.bows) extras.push('ribbon bows');
      if (CD.pearls) extras.push('gold pearls');
      if (CD.drip) extras.push('chocolate drip');
      if (CD.leaves) extras.push('leaves and greenery');
      var topper = CD.topper.trim();
      var sizeText = CD.tiers === 0 ? 'bento' : CD.tiers + ' tier';
      var line = 'Cake designer idea: ' + sizeText + ' ' + CD.flavour.toLowerCase() + ' cake in ' + CD.cname.toLowerCase() + (CD.custom ? ' (colour ' + CD.hex + ')' : '') +
        (extras.length ? ', with ' + extras.join(', ') : ', no extras') +
        (topper ? ', topper says "' + topper + '"' : '') + '.';

      var d = $('f-details');
      var already = d.value.indexOf('Cake designer idea:') > -1;
      d.value = already ? d.value.replace(/Cake designer idea:[^\n]*/, line) : (d.value.trim() ? d.value.trim() + '\n' + line : line);
      $('f-type').value = CD.tiers === 0 ? 'Bento cake' : CD.tiers + ' tier cake';
      $('f-flavour').value = CD.flavour;

      sketchToFile().then(function (file) {
        if (sketchEntry) {
          var at = photos.indexOf(sketchEntry);
          if (at > -1) { URL.revokeObjectURL(sketchEntry.url); photos.splice(at, 1); }
          sketchEntry = null;
        }
        if (file && photos.length < MAX_PHOTOS) sketchEntry = pushPhoto(file);
        renderThumbs();
        $('cdDone').hidden = false;
        $('order').scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    });
  }

  /* ---------- Order form: send ---------- */
  var dateInput = $('f-date');
  if (dateInput) {
    var t = new Date();
    dateInput.min = t.getFullYear() + '-' + String(t.getMonth() + 1).padStart(2, '0') + '-' + String(t.getDate()).padStart(2, '0');
  }

  var photoStep = $('photoStep');
  var fallback = $('photoFallback');
  var sendBtn = $('sendBtn');
  var sentOk = $('sentOk');
  var emailTo = (S.email || '').trim();
  var emailEndpoint = emailTo ? 'https://formsubmit.co/' + emailTo : '';

  // Emails the order (and photos) to Jade. Resolves true if it was sent, false if it could not be.
  function sendEmail(fd) {
    if (!emailEndpoint || !window.fetch) return Promise.resolve(false);
    var ctl = window.AbortController ? new AbortController() : null;
    var timer = setTimeout(function () { if (ctl) ctl.abort(); }, 20000);
    return fetch(emailEndpoint, { method: 'POST', body: fd, mode: 'no-cors', signal: ctl ? ctl.signal : undefined })
      .then(function () { clearTimeout(timer); return true; })
      .catch(function () { clearTimeout(timer); return false; });
  }

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    errBox.hidden = true;
    sentOk.hidden = true;

    var v = function (id) { return ($(id).value || '').trim(); };
    var name = v('f-name'), occasion = v('f-occasion'), date = v('f-date'),
        type = v('f-type'), details = v('f-details');

    if (!name || !occasion || !date || !type || !details) {
      showError('Please fill in your name, the occasion, the date, what you would like, and a few details about your cake.');
      return;
    }
    if (!waReady) {
      showError('The WhatsApp number has not been set up yet. Please add it in config.js.');
      return;
    }
    if (v('f-honey')) return; // a robot filled the hidden box, so ignore it

    var nice = date;
    try {
      nice = new Date(date + 'T12:00:00').toLocaleDateString('en-ZA', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
    } catch (err) { /* keep raw date */ }

    var flavour = v('f-flavour') || 'Not given';
    var area = v('f-area') || 'Not given';
    var method = v('f-method');

    // the email (with photos attached)
    var fd = new FormData();
    fd.append('_subject', 'New cake order from ' + name + ' (' + occasion + ', ' + nice + ')');
    fd.append('_template', 'table');
    fd.append('_captcha', 'false');
    fd.append('Name', name);
    fd.append('Occasion', occasion);
    fd.append('Date needed', nice);
    fd.append('I would like', type);
    fd.append('Flavour', flavour);
    fd.append('Area', area);
    fd.append('Collect or deliver', method);
    fd.append('Details', details);
    if (v('f-link')) fd.append('Design link', v('f-link'));
    photos.forEach(function (p, i) { fd.append('Photo ' + (i + 1), p.file, p.file.name || ('photo-' + (i + 1) + '.jpg')); });

    // open the WhatsApp tab right now so phones and browsers allow it, then fill it in
    var waWin = null;
    try { waWin = window.open('', '_blank'); } catch (err) { waWin = null; }

    sendBtn.disabled = true;
    sendBtn.textContent = 'Sending your order...';

    sendEmail(fd).then(function (emailed) {
      var lines = [
        'Hi Jade! I would like to order a cake.',
        '',
        'Name: ' + name,
        'Occasion: ' + occasion,
        'Date needed: ' + nice,
        'I would like: ' + type,
        'Flavour: ' + flavour,
        'My area: ' + area,
        'Collect or deliver: ' + method,
        '',
        'Details: ' + details
      ];
      if (v('f-link')) lines.push('', 'Design I like: ' + v('f-link'));
      if (photos.length) {
        lines.push('', emailed
          ? 'I have also emailed ' + photos.length + ' inspiration photo' + (photos.length > 1 ? 's' : '') + ' to you.'
          : 'I am sending ' + photos.length + ' inspiration photo' + (photos.length > 1 ? 's' : '') + ' next.');
      }
      var url = waBase + '?text=' + encodeURIComponent(lines.join('\n'));
      if (waWin && !waWin.closed) { waWin.location.href = url; } else { window.location.href = url; }

      sendBtn.disabled = false;
      sendBtn.textContent = 'Send my order';
      if (emailed) {
        photoStep.hidden = true;
        sentOk.hidden = false;
        sentOk.scrollIntoView({ behavior: 'smooth', block: 'center' });
      } else if (photos.length && photoStep) {
        fallback.hidden = true;
        photoStep.hidden = false;
        photoStep.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    });
  });

  $('sharePhotos').addEventListener('click', function () {
    var files = photos.map(function (p) { return p.file; });
    var canShare = navigator.share && navigator.canShare && navigator.canShare({ files: files });
    if (!canShare) { fallback.hidden = false; return; }
    navigator.share({ files: files, title: 'Cake inspiration for Jade', text: 'Inspiration photos for my cake order' })
      .then(function () { $('photoStepText').textContent = 'Thank you! Jade will reply to you on WhatsApp soon.'; })
      .catch(function (err) { if (!err || err.name !== 'AbortError') fallback.hidden = false; });
  });
})();
