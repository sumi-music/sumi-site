/* 澄 — sumi.musikaroid.com */
(function () {
  'use strict';
  var $ = function (s) { return document.querySelector(s); };
  var de = document.documentElement;
  var state = { items: [], posts: [], videos: [], filter: 'all', sort: 'desc', selected: null, playing: false, lastFocus: null };
  var label = function (d) { return d.split('-').map(Number).join('.'); };
  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); };

  /* lang / theme (storage key prefix follows site: musikaroid.com = mkr-, else sumi-) */
  var STORAGE_PREFIX = (location.hostname === 'musikaroid.com') ? 'mkr-' : 'sumi-';
  function setLang(l) { de.dataset.lang = l; try { localStorage.setItem(STORAGE_PREFIX + 'lang', l); } catch (e) {} syncHeader(); }
  function setTheme(t) { de.dataset.theme = t; try { localStorage.setItem(STORAGE_PREFIX + 'theme', t); } catch (e) {} syncHeader(); }
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
    loadData();
  });

  /* data */
  function loadData() {
    var isArticle = !!$('#article');
    var needsDisco = $('#disco-track') || $('#tl-track') || $('#latest-jacket') || $('#next-block') || isArticle;
    var needsPosts = $('#news-list') || $('#news-full') || isArticle;
    var needsVideos = $('#mv-track');
    var ready = { posts: false, disco: false };
    var tryRenderArticle = function () { if (isArticle && ready.posts && ready.disco) renderArticle(); };
    if (needsDisco) {
      fetch('discography.json').then(function (r) { return r.json(); }).then(function (d) {
        state.items = d;
        if ($('#disco-track')) renderDisco();
        if ($('#tl-track')) renderTimeline();
        if ($('#latest-jacket')) renderLatest();
        if ($('#next-block')) { tickCountdown(); setInterval(tickCountdown, 1000); }
        ready.disco = true; tryRenderArticle();
      }).catch(function () { ready.disco = true; tryRenderArticle(); });
    }
    if (needsPosts) {
      fetch('posts.json').then(function (r) { return r.json(); }).then(function (d) {
        state.posts = d;
        if ($('#news-list')) renderNews();
        if ($('#news-full')) renderNewsFull();
        ready.posts = true; tryRenderArticle();
      }).catch(function () { ready.posts = true; tryRenderArticle(); });
    }
    if (needsVideos) {
      fetch('videos.json').then(function (r) { return r.json(); }).then(function (d) { state.videos = d; renderVideos(); }).catch(function () {});
    }
    if ($('#artist-grid')) {
      fetch('artists.json').then(function (r) { return r.json(); }).then(function (d) { renderArtists(d.artists || []); }).catch(function () {});
    }
    /* Catalog is handled by sonotracks-catalog.js (packaged, auto-init on .sonotracks-dg). */
  }

  /* artists roster */
  function renderArtists(list) {
    var el = $('#artist-grid'); if (!el || !list.length) return;
    el.classList.remove('count-2', 'count-3plus');
    if (list.length === 2) el.classList.add('count-2');
    else if (list.length >= 3) el.classList.add('count-3plus');
    el.innerHTML = list.map(function (a) {
      var img = a.image ? '<img src="' + esc(a.image) + '" alt="' + esc(a.name) + '" loading="lazy">' : '';
      var host = a.url ? ' — ' + esc(a.url.replace(/^https?:\/\//,'').replace(/\/$/,'')).toUpperCase() : '';
      var nameBlock = '<span class="an">' + esc(a.name) + '</span>'
        + '<span class="aen">' + esc((a.name_en || a.name).toUpperCase()) + host + '</span>';
      var linked = a.url
        ? '<a class="artist-card__link" href="' + esc(a.url) + '" target="_blank" rel="noopener">' + img + nameBlock + '</a>'
        : '<div class="artist-card__link">' + img + nameBlock + '</div>';
      var role = a.role ? '<span class="arole"><span lang="ja">' + esc(a.role) + '</span><span lang="en">' + esc(a.role_en || a.role) + '</span></span>' : '';
      var tag = a.tagline ? '<span class="atag"><span lang="ja">' + esc(a.tagline) + '</span><span lang="en">' + esc(a.tagline_en || a.tagline) + '</span></span>' : '';
      var links = (a.links && a.links.length)
        ? '<div class="alinks">' + a.links.map(function (l) { return '<a href="' + esc(l.url) + '" target="_blank" rel="noopener">' + esc(l.label) + '</a>'; }).join('') + '</div>'
        : '';
      return '<div class="artist-card">' + linked + role + tag + links + '</div>';
    }).join('');
  }
  function byId(id) { for (var i = 0; i < state.items.length; i++) if (state.items[i].id === id) return state.items[i]; return null; }

  /* latest (most recent released) */
  function renderLatest() {
    var jkt = $('#latest-jacket'); if (!jkt || !state.items.length) return;
    var now = new Date();
    var released = state.items.filter(function (it) { return new Date(it.date + 'T00:00:00+09:00') <= now; })
      .sort(function (a, b) { return b.date.localeCompare(a.date); });
    var it = released[0]; if (!it) return;
    if (it.jacket) jkt.src = it.jacket;
    jkt.alt = it.title + ' jacket';
    $('#latest-title').textContent = it.title;
    var subJa = it.type + (it.note ? ' — ' + it.note : '');
    var subEn = it.type + (it.note ? ' — ' + (it.note_en || it.note) : '');
    $('#latest-subtitle').innerHTML = '<span lang="ja">' + esc(subJa) + '</span><span lang="en">' + esc(subEn) + '</span>';
    $('#latest-date').textContent = label(it.date);
    var lnk = $('#latest-link');
    if (it.url) { lnk.href = it.url; lnk.hidden = false; } else { lnk.hidden = true; }
  }

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
    requestAnimationFrame(function () { t.scrollTop = t.scrollHeight; });
  }

  /* news */
  function newsRow(p) {
    return '<a href="article.html?id=' + esc(p.id) + '" class="news-row" style="text-decoration:none;color:inherit"><span class="news-date">' + label(p.date) + '</span><span><span lang="ja">' + esc(p.title) + '</span><span lang="en">' + esc(p.title_en || p.title) + '</span></span></a>';
  }
  function renderNews() {
    var t = $('#news-list'); if (!t) return;
    var list = state.posts.slice().sort(function (a, b) { return b.date.localeCompare(a.date); }).slice(0, 5);
    t.innerHTML = list.map(newsRow).join('')
      + '<div style="border-top:1px solid var(--line)"></div>'
      + '<p style="margin:32px 0 0;text-align:right"><a href="news.html" class="mlink" style="border-bottom:1px solid var(--line);padding-bottom:3px"><span lang="ja">もっと見る →</span><span lang="en">More →</span></a></p>';
  }
  function renderNewsFull() {
    var t = $('#news-full'); if (!t) return;
    var list = state.posts.slice().sort(function (a, b) { return b.date.localeCompare(a.date); });
    t.innerHTML = list.map(newsRow).join('') + '<div style="border-top:1px solid var(--line)"></div>';
  }
  function renderArticle() {
    var container = $('#article'); if (!container) return;
    var qid = new URLSearchParams(location.search).get('id');
    var post = null;
    if (qid) for (var i = 0; i < state.posts.length; i++) if (state.posts[i].id === qid) { post = state.posts[i]; break; }
    if (!post) { location.replace('news.html'); return; }
    var image = post.image ? '<img src="' + esc(post.image) + '" alt="" loading="lazy" style="display:block;width:100%;max-width:680px;height:auto;border-radius:12px;margin:0 0 48px">' : '';
    var titleHtml = '<h1 style="margin:0;font-size:24px;font-weight:300;letter-spacing:0.12em;line-height:1.8"><span lang="ja">' + esc(post.title) + '</span><span lang="en">' + esc(post.title_en || post.title) + '</span></h1>';
    var dateHtml = '<p class="k" style="margin:14px 0 0;font-size:11px;letter-spacing:0.22em;color:var(--dim)">' + label(post.date) + '</p>';
    var paragraphs = function (text, extraStyle) {
      return (text || '').split('\n').map(function (s) { return s.trim(); }).filter(function (s) { return s; })
        .map(function (p) { return '<p style="margin:32px 0 0;font-size:14px;line-height:2.4;letter-spacing:0.06em' + (extraStyle || '') + '">' + esc(p) + '</p>'; }).join('');
    };
    var bodyJa = paragraphs(post.body);
    var bodyEn = paragraphs(post.body_en || post.body, ';font-family:Karla,\'Zen Old Mincho\',serif;line-height:2.2;letter-spacing:0.03em');
    var bodyHtml = (bodyJa || bodyEn) ? '<div style="margin-top:20px"><div lang="ja">' + bodyJa + '</div><div lang="en">' + bodyEn + '</div></div>' : '';
    var isYoutube = post.url && /youtube\.com|youtu\.be/.test(post.url);
    var urlLabel = isYoutube ? 'WATCH' : 'LISTEN';
    var embedHtml = '';
    if (isYoutube) {
      var m = post.url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([A-Za-z0-9_-]+)/);
      if (m) embedHtml = '<div style="margin:56px 0 0;aspect-ratio:16/9;max-width:680px"><iframe src="https://www.youtube.com/embed/' + esc(m[1]) + '" title="YouTube video" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen style="width:100%;height:100%;border:0"></iframe></div>';
    } else if (post.url && state.items && state.items.length) {
      for (var j = 0; j < state.items.length; j++) {
        if (state.items[j].url === post.url && state.items[j].apple) {
          embedHtml = '<iframe src="https://embed.music.apple.com/jp/album/' + esc(state.items[j].apple) + '" title="Apple Music player" allow="autoplay *; encrypted-media *; fullscreen *; clipboard-write" style="width:100%;max-width:680px;height:450px;border:0;margin:56px 0 0;background:transparent"></iframe>';
          break;
        }
      }
    }
    var urlHtml = post.url ? '<p style="margin:56px 0 0"><a class="mlink" target="_blank" rel="noopener" href="' + esc(post.url) + '" style="display:inline-block;border-bottom:1px solid var(--line);padding-bottom:5px">' + urlLabel + ' ↗</a></p>' : '';
    var linksHtml = '';
    if (post.links && post.links.length) {
      linksHtml = '<div style="display:flex;flex-wrap:wrap;gap:26px;margin-top:44px;font-family:Karla,sans-serif;font-size:11px;letter-spacing:0.22em">'
        + post.links.map(function (l) { return '<a href="' + esc(l.url) + '" target="_blank" rel="noopener" style="text-decoration:none;color:var(--ink)">' + esc(l.label) + '</a>'; }).join('')
        + '</div>';
    }
    container.innerHTML = image + titleHtml + dateHtml + embedHtml + bodyHtml + urlHtml + linksHtml;
    var t = (de.dataset.lang === 'en' && post.title_en ? post.title_en : post.title);
    document.title = t + ' — 澄 | Sumi';
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
    var spotify = it.spotify ? 'https://open.spotify.com/album/' + it.spotify : 'https://open.spotify.com/artist/3VquG01C3eNeHyNA8pDot6';
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
    state.lastFocus = document.activeElement;
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
    bg.querySelector('.modal-close').focus();
    bg.addEventListener('keydown', trapFocus);
  }
  function trapFocus(e) {
    if (e.key !== 'Tab') return;
    var bg = e.currentTarget;
    var focusables = bg.querySelectorAll('button, a[href], iframe, [tabindex]:not([tabindex="-1"])');
    if (!focusables.length) return;
    var first = focusables[0], last = focusables[focusables.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  }
  function closeModal() { var bg = $('#modal-bg'); bg.hidden = true; bg.innerHTML = ''; document.body.style.overflow = ''; bg.removeEventListener('keydown', trapFocus); if (state.lastFocus) { state.lastFocus.focus(); state.lastFocus = null; } }
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
