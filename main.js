/* 澄 — sumi.musikaroid.com */
(function () {
  'use strict';
  var $ = function (s) { return document.querySelector(s); };
  var de = document.documentElement;
  var state = { items: [], posts: [], videos: [], filter: 'all', sort: 'desc', selected: null, playing: false };
  var label = function (d) { return d.split('-').map(Number).join('.'); };
  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); };

  /* lang / theme */
  function setLang(l) { de.dataset.lang = l; try { localStorage.setItem('sumi-lang', l); } catch (e) {} syncHeader(); }
  function setTheme(t) { de.dataset.theme = t; try { localStorage.setItem('sumi-theme', t); } catch (e) {} syncHeader(); }
  function syncHeader() {
    var ja = $('#btn-ja'), en = $('#btn-en'), th = $('#btn-theme');
    if (ja) { ja.style.opacity = de.dataset.lang === 'ja' ? 1 : 0.45; en.style.opacity = de.dataset.lang === 'en' ? 1 : 0.45; }
    if (th) th.textContent = de.dataset.theme === 'dark' ? '\u25CF' : '\u25CB';
  }
  document.addEventListener('DOMContentLoaded', function () {
    syncHeader();
    if ($('#btn-ja')) { $('#btn-ja').onclick = function () { setLang('ja'); }; $('#btn-en').onclick = function () { setLang('en'); }; }
    if ($('#btn-theme')) $('#btn-theme').onclick = function () { setTheme(de.dataset.theme === 'dark' ? 'light' : 'dark'); };
    reveal(); ripple();
    if ($('#disco-track')) loadData();
  });

  /* data */
  function loadData() {
    fetch('discography.json').then(function (r) { return r.json(); }).then(function (d) { state.items = d; renderDisco(); renderTimeline(); tickCountdown(); setInterval(tickCountdown, 1000); }).catch(function () {});
    fetch('posts.json').then(function (r) { return r.json(); }).then(function (d) { state.posts = d; renderNews(); }).catch(function () {});
    fetch('videos.json').then(function (r) { return r.json(); }).then(function (d) { state.videos = d; renderVideos(); }).catch(function () {});
  }
  function byId(id) { for (var i = 0; i < state.items.length; i++) if (state.items[i].id === id) return state.items[i]; return null; }

  /* discography slider */
  function renderDisco() {
    var t = $('#disco-track'); if (!t) return;
    var list = state.items.filter(function (it) {
      if (state.filter === 'all') return true;
      if (state.filter === 'water') return (it.tags || []).indexOf('\u6C34') >= 0;
      if (state.filter === 'ep') return it.type === 'EP';
      return it.type === 'Single';
    }).sort(function (a, b) { return state.sort === 'desc' ? b.date.localeCompare(a.date) : a.date.localeCompare(b.date); });
    t.innerHTML = list.map(function (it) {
      var art = it.jacket
        ? '<span class="tile-img" role="img" aria-label="' + esc(it.title) + ' jacket" style="background-image:url(' + esc(it.jacket) + ')"></span>'
        : '<span class="tile-char">' + esc((it.title || '?').charAt(0)) + '</span>';
      return '<button class="tile" data-id="' + esc(it.id) + '">'
        + '<span class="tile-art">' + art
        + '<span class="tile-cover"><span style="font-size:13px;letter-spacing:.12em;color:var(--ink);text-align:center;padding:0 10px"><span lang="ja">' + esc(it.title) + '</span><span lang="en">' + esc(it.title_en || it.title) + '</span></span>'
        + '<span class="k" style="font-size:10px;letter-spacing:.2em;color:var(--dim)">' + label(it.date) + '</span></span></span>'
        + '<span class="tile-meta"><span><span lang="ja">' + esc(it.title) + '</span><span lang="en">' + esc(it.title_en || it.title) + '</span></span><span class="k" style="flex:none">' + label(it.date) + '</span></span>'
        + '</button>';
    }).join('');
    t.querySelectorAll('.tile').forEach(function (el) { el.onclick = function () { openModal(el.dataset.id); }; });
  }
  document.addEventListener('click', function (e) {
    var b = e.target.closest ? e.target.closest('[data-filter],[data-sort],[data-scroll]') : null;
    if (!b) return;
    if (b.dataset.filter) { state.filter = b.dataset.filter; press('[data-filter]', b); renderDisco(); }
    if (b.dataset.sort) { state.sort = b.dataset.sort; press('[data-sort]', b); renderDisco(); }
    if (b.dataset.scroll) { var tr = $('#disco-track'); if (tr) tr.scrollBy({ left: (b.dataset.scroll === 'next' ? 1 : -1) * tr.clientWidth * 0.8, behavior: 'smooth' }); }
  });
  function press(sel, on) { document.querySelectorAll(sel).forEach(function (x) { x.setAttribute('aria-pressed', x === on ? 'true' : 'false'); }); }

  /* videos (lazy) */
  function renderVideos() {
    var t = $('#mv-track'); if (!t) return;
    t.innerHTML = state.videos.map(function (v) {
      return '<div class="mv-card" data-vid="' + esc(v.id) + '"><button class="mv-btn" aria-label="Play video">'
        + '<span class="mv-thumb" style="background-image:url(https://i.ytimg.com/vi/' + esc(v.id) + '/hqdefault.jpg)"></span>'
        + '<span class="mv-play"><span class="playglyph">\u25B7</span></span></button></div>';
    }).join('');
    t.querySelectorAll('.mv-card').forEach(function (card) {
      card.querySelector('.mv-btn').onclick = function () {
        card.innerHTML = '<iframe src="https://www.youtube.com/embed/' + esc(card.dataset.vid) + '?autoplay=1" title="YouTube video player" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen style="position:absolute;inset:0;width:100%;height:100%;border:0"></iframe>';
      };
    });
  }

  /* timeline */
  function renderTimeline() {
    var t = $('#tl-track'); if (!t) return;
    var asc = state.items.slice().sort(function (a, b) { return a.date.localeCompare(b.date); });
    t.innerHTML = asc.map(function (it, i) {
      var gap = 0;
      if (i > 0) { var days = (new Date(it.date) - new Date(asc[i - 1].date)) / 864e5; gap = Math.max(20, Math.min(110, Math.round(days * 5))); }
      var art = it.jacket
        ? '<span class="tile-img" role="img" aria-label="' + esc(it.title) + ' jacket" style="background-image:url(' + esc(it.jacket) + ')"></span>'
        : '<span style="font-size:15px;color:var(--mist);opacity:.6">' + esc((it.title || '?').charAt(0)) + '</span>';
      return '<button class="tl-row" data-id="' + esc(it.id) + '" style="margin-top:' + gap + 'px"><span class="tl-dot"></span>'
        + '<span class="tl-art">' + art + '</span>'
        + '<span class="tl-title"><span lang="ja">' + esc(it.title) + '</span><span lang="en">' + esc(it.title_en || it.title) + '</span></span>'
        + '<span class="tl-date">' + label(it.date) + '</span></button>';
    }).join('');
    t.querySelectorAll('.tl-row').forEach(function (el) { el.onclick = function () { openModal(el.dataset.id); }; });
  }

  /* news */
  function renderNews() {
    var t = $('#news-list'); if (!t) return;
    var list = state.posts.slice().sort(function (a, b) { return b.date.localeCompare(a.date); });
    t.innerHTML = list.map(function (p) {
      return '<div class="news-row"><span class="news-date">' + label(p.date) + '</span><span><span lang="ja">' + esc(p.title) + '</span><span lang="en">' + esc(p.title_en || p.title) + '</span></span></div>';
    }).join('') + '<div style="border-top:1px solid var(--line)"></div>';
  }

  /* countdown */
  function tickCountdown() {
    var block = $('#next-block'); if (!block) return;
    var now = new Date();
    var next = null;
    state.items.slice().sort(function (a, b) { return a.date.localeCompare(b.date); }).some(function (it) {
      if (new Date(it.date + 'T00:00:00+09:00') > now) { next = it; return true; } return false;
    });
    if (!next) { block.hidden = true; return; }
    block.hidden = false;
    $('#next-title-ja').textContent = next.title;
    $('#next-title-en').textContent = next.title_en || next.title;
    $('#next-date').textContent = label(next.date);
    var ms = Math.max(0, new Date(next.date + 'T00:00:00+09:00') - now);
    var p = function (n) { return String(n).padStart(2, '0'); };
    $('#cd-d').textContent = String(Math.floor(ms / 864e5));
    $('#cd-h').textContent = p(Math.floor(ms / 36e5) % 24);
    $('#cd-m').textContent = p(Math.floor(ms / 6e4) % 60);
    $('#cd-s').textContent = p(Math.floor(ms / 1e3) % 60);
  }

  /* modal */
  function openModal(id) {
    var it = byId(id); if (!it) return;
    state.selected = id; state.playing = false;
    var bg = $('#modal-bg');
    var art = it.jacket
      ? '<span class="tile-img" role="img" aria-label="' + esc(it.title) + ' jacket" style="background-image:url(' + esc(it.jacket) + ')"></span>'
      : '<span style="font-size:56px;font-weight:300;color:var(--mist);opacity:.55">' + esc((it.title || '?').charAt(0)) + '</span>';
    var note = it.note ? '<p style="margin:0;font-size:11px;letter-spacing:.14em;color:var(--dim)"><span lang="ja">' + esc(it.note) + '</span><span lang="en">' + esc(it.note_en || it.note) + '</span></p>' : '';
    var spotify = it.spotify ? 'https://open.spotify.com/album/' + it.spotify : 'https://open.spotify.com/artist/7iUpxz4w4S5UPru251vW0m';
    var apple = it.apple ? 'https://music.apple.com/jp/album/' + it.apple : 'https://music.apple.com/jp/artist/1893806816';
    var ytm = it.tcid ? 'https://www.tunecore.co.jp/to/youtube_music_key/' + it.tcid : 'https://www.youtube.com/channel/UC_r294gFgAMD6ftGgnqs63Q';
    bg.innerHTML = '<div class="modal" role="dialog" aria-modal="true" aria-label="' + esc(it.title) + '">'
      + '<button class="modal-close" aria-label="Close">\u00D7</button>'
      + '<span class="modal-art">' + art + '</span>'
      + '<div style="display:flex;flex-direction:column;gap:12px;min-width:200px;flex:1">'
      + '<p style="margin:0;font-size:20px;font-weight:300;letter-spacing:.12em"><span lang="ja">' + esc(it.title) + '</span><span lang="en">' + esc(it.title_en || it.title) + '</span></p>'
      + note
      + '<p class="k" style="margin:0;font-size:11px;letter-spacing:.2em;color:var(--dim)">' + esc(it.type) + ' \u2014 ' + label(it.date) + '</p>'
      + '<div style="display:flex;flex-direction:column;gap:13px;margin-top:22px;padding-top:24px;border-top:1px solid var(--line)">'
      + ((it.apple || it.url) ? '<button id="modal-play" style="background:none;border:1px solid var(--line);cursor:pointer;padding:10px 18px;margin-bottom:6px;font-family:Karla,\'Zen Old Mincho\',serif;font-size:11px;letter-spacing:.24em;color:var(--ink);align-self:flex-start"><span lang="ja">\u25B7 \u8A66\u8074\u3059\u308B</span><span lang="en">\u25B7 PLAY</span></button>' : '')
      + (it.url ? '<a class="mlink" target="_blank" rel="noopener" href="' + esc(it.url) + '">LINKCO.RE \u2197</a>' : '')
      + '<a class="mlink" target="_blank" rel="noopener" href="' + esc(spotify) + '">SPOTIFY \u2197</a>'
      + '<a class="mlink" target="_blank" rel="noopener" href="' + esc(apple) + '">APPLE MUSIC \u2197</a>'
      + '<a class="mlink" target="_blank" rel="noopener" href="' + esc(ytm) + '">YOUTUBE MUSIC \u2197</a>'
      + '</div></div><div id="modal-embed" style="width:100%;display:none;flex-direction:column;gap:14px;align-items:center"></div></div>';
    bg.hidden = false;
    document.body.style.overflow = 'hidden';
    bg.onclick = function (e) { if (e.target === bg) closeModal(); };
    bg.querySelector('.modal-close').onclick = closeModal;
    var playBtn = bg.querySelector('#modal-play');
    if (playBtn) playBtn.onclick = function () {
      var box = bg.querySelector('#modal-embed');
      box.style.display = 'flex';
      box.innerHTML = it.apple
        ? '<iframe src="https://embed.music.apple.com/jp/album/' + esc(it.apple) + '" title="Apple Music player" allow="autoplay *; encrypted-media *; fullscreen *; clipboard-write" style="width:100%;max-width:500px;height:450px;border:0;background:transparent"></iframe>'
        : '<iframe src="https://linkco.re/embed/' + esc(it.url.split('/').pop()) + '" title="preview" style="width:300px;height:560px;border:0;background:transparent"></iframe>';
    };
  }
  function closeModal() { var bg = $('#modal-bg'); bg.hidden = true; bg.innerHTML = ''; document.body.style.overflow = ''; }
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') { var bg = $('#modal-bg'); if (bg && !bg.hidden) closeModal(); } });

  /* reveal on scroll */
  function reveal() {
    if (matchMedia('(prefers-reduced-motion: reduce)').matches || !('IntersectionObserver' in window)) return;
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        if (e.isIntersecting) {
          e.target.animate([{ opacity: 0, transform: 'translateY(26px)' }, { opacity: 1, transform: 'none' }], { duration: 1200, easing: 'cubic-bezier(.2,.6,.2,1)', fill: 'backwards' });
          io.unobserve(e.target);
        }
      });
    }, { threshold: 0.1 });
    document.querySelectorAll('[data-reveal]').forEach(function (el) { io.observe(el); });
  }

  /* cursor ripple (fine pointer only) */
  function ripple() {
    if (matchMedia('(prefers-reduced-motion: reduce)').matches || !matchMedia('(pointer: fine)').matches) return;
    var last = 0;
    addEventListener('mousemove', function (e) {
      var n = performance.now(); if (n - last < 180) return; last = n;
      var d = document.createElement('div');
      d.className = 'ripple';
      d.style.left = (e.clientX - 7) + 'px'; d.style.top = (e.clientY - 7) + 'px';
      document.body.appendChild(d);
      d.animate([{ transform: 'scale(.35)', opacity: 0.45 }, { transform: 'scale(2.4)', opacity: 0 }], { duration: 950, easing: 'ease-out' }).onfinish = function () { d.remove(); };
    });
  }
})();
