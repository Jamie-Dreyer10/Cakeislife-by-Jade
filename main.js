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
      files.forEach(function (f) { photos.push({ file: f, url: URL.createObjectURL(f) }); });
      renderThumbs();
    });
  });

  /* ---------- Order form: send ---------- */
  var dateInput = $('f-date');
  if (dateInput) {
    var t = new Date();
    dateInput.min = t.getFullYear() + '-' + String(t.getMonth() + 1).padStart(2, '0') + '-' + String(t.getDate()).padStart(2, '0');
  }

  var photoStep = $('photoStep');
  var fallback = $('photoFallback');

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    errBox.hidden = true;

    var v = function (id) { return ($(id).value || '').trim(); };
    var name = v('f-name'), occasion = v('f-occasion'), date = v('f-date'),
        type = v('f-type'), details = v('f-details');

    if (!name || !occasion || !date || !type || !details) {
      showError('Please fill in your name, the occasion, the date, what you would like, and a few details about your cake.');
      return;
    }
    if (!waReady) {
      showError('The WhatsApp number has not been set up yet. Please add it in js/config.js.');
      return;
    }

    var nice = date;
    try {
      nice = new Date(date + 'T12:00:00').toLocaleDateString('en-ZA', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
    } catch (err) { /* keep raw date */ }

    var lines = [
      'Hi Jade! I would like to order a cake.',
      '',
      'Name: ' + name,
      'Occasion: ' + occasion,
      'Date needed: ' + nice,
      'I would like: ' + type,
      'People: ' + (v('f-servings') || 'Not sure yet'),
      'My area: ' + (v('f-area') || 'Not given'),
      'Collect or deliver: ' + v('f-method'),
      '',
      'Details: ' + details
    ];
    if (v('f-link')) lines.push('', 'Design I like: ' + v('f-link'));
    if (photos.length) lines.push('', 'I am sending ' + photos.length + ' inspiration photo' + (photos.length > 1 ? 's' : '') + ' next.');

    window.open(waBase + '?text=' + encodeURIComponent(lines.join('\n')), '_blank', 'noopener');

    if (photos.length && photoStep) {
      fallback.hidden = true;
      photoStep.hidden = false;
      photoStep.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
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
