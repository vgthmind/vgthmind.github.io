(function () {
  var header = document.querySelector('.header');
  if (header) {
    var onScroll = function () {
      if (window.scrollY > 40) header.classList.add('vg-scrolled');
      else header.classList.remove('vg-scrolled');
    };
    document.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }

  var cartLink = document.querySelector('nav.utility a.cart-link');
  var countEl = document.querySelector('.header-item-count');
  if (cartLink && countEl) {
    var toast = document.createElement('div');
    toast.className = 'vg-toast';
    toast.textContent = 'Ajoute au panier';
    document.body.appendChild(toast);

    function vgCartCount() {
      var n = parseInt((countEl.textContent || '0').replace(/[^0-9]/g, ''), 10);
      return isNaN(n) ? 0 : n;
    }
    var lastCount = null;
    setTimeout(function () { lastCount = vgCartCount(); }, 400);
    var toastTimer = null;
    var mo = new MutationObserver(function () {
      if (lastCount === null) return;
      var n = vgCartCount();
      if (n > lastCount) {
        cartLink.classList.remove('vg-bump');
        void cartLink.offsetWidth;
        cartLink.classList.add('vg-bump');
        toast.classList.add('vg-show');
        clearTimeout(toastTimer);
        toastTimer = setTimeout(function () { toast.classList.remove('vg-show'); }, 2000);
      }
      lastCount = n;
    });
    mo.observe(countEl, { childList: true, subtree: true, characterData: true });
  }
})();

(function () {
  var VG_SPEED = 400;
  var VG_DEBUG = false;
  try { VG_DEBUG = localStorage.getItem('vg-debug') === '1'; } catch (e) {}
  function vgLog() {
    if (!VG_DEBUG) return;
    try { console.log.apply(console, ['[vg-transition]'].concat(Array.prototype.slice.call(arguments))); } catch (e) {}
  }

  var POP_MS = 200, ASPIRATE_MS = 300, ARRIVE_CAP_MS = 300, ARRIVE_MS = 350, SHRINK_MS = 180;
  var NAV_SEL = '.cart-link, nav.sections .navigation a, nav.primary_navigation .page_list a, footer nav.footernav a, a.button.view-all-products';

  document.querySelectorAll('.cart-link[title]').forEach(function (el) { el.removeAttribute('title'); });

  var prefetched = {};
  var productsPreloaded = false;
  document.addEventListener('mouseover', function (e) {
    var link = e.target.closest ? e.target.closest(NAV_SEL) : null;
    if (!link) return;
    var href = link.getAttribute('href') || '/cart';
    if (!prefetched[href]) {
      prefetched[href] = true;
      var l = document.createElement('link');
      l.rel = 'prefetch';
      l.href = href;
      document.head.appendChild(l);
      vgLog('prefetched', href);
    }
    if (!productsPreloaded && (href === '/products' || href.indexOf('/products?') === 0)) {
      productsPreloaded = true;
      fetch('/products.json').then(function (r) { return r.json(); }).then(function (data) {
        var list = Array.isArray(data) ? data : ((data && data.products) || []);
        list.slice(0, 6).forEach(function (p) {
          if (p.images && p.images[0] && p.images[0].url) {
            var pl = document.createElement('link');
            pl.rel = 'preload';
            pl.as = 'image';
            pl.href = p.images[0].url;
            document.head.appendChild(pl);
          }
        });
        vgLog('products images preloaded', list.length);
      }).catch(function () {});
    }
  }, true);

  window.pageTransition = function (opts) {
    if (window.__vgTransitioning) { vgLog('blocked: transition in progress'); return; }
    window.__vgTransitioning = true;
    setTimeout(function () { window.__vgTransitioning = false; }, 3000);
    document.documentElement.classList.add('vg-managed');
    try { window.getSelection().removeAllRanges(); } catch (e) {}

    var href = opts.href;
    var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduceMotion) {
      vgLog('reduced motion: simple fade, no overlay');
      document.body.style.transition = 'opacity 150ms ease';
      document.body.style.opacity = '0';
      setTimeout(function () {
        window.__vgTransitioning = false;
        window.location.href = href;
      }, 150);
      return;
    }

    var w = opts.w || 280, h = opts.h || 280;
    var axis = opts.axis === 'y' ? 'y' : 'z';
    var persp = opts.persp || 1200;
    var popStart = Date.now();
    // SECTION 3 : x/y (px viewport) = point d'origine du clic. Absents pour
    // les transitions Section 2 (header/panier), qui restent centrees comme
    // avant (--vg-out-x/--vg-out-y et --vg-origin retombent sur leur valeur
    // CSS par defaut de 50%/50vw 50vh quand on ne les pose pas ici).
    var hasOrigin = opts.x != null && opts.y != null;
    // SECTION 3 : duree de depart (pop+aspiration) allongeable par opts pour
    // laisser le temps a l'orbite des compagnons de faire au moins un tour
    // complet (brief CLAUDE.md section 3) sans toucher aux durees de la
    // section 2 (header/panier, deja validees) qui gardent POP_MS/ASPIRATE_MS.
    var popMs = opts.popMs || POP_MS;
    var aspirateMs = opts.aspirateMs || ASPIRATE_MS;

    var overlay = document.createElement('div');
    overlay.id = 'vg-transition-out';
    var img = document.createElement('img');
    img.src = opts.icon;
    img.alt = '';
    img.style.width = w + 'px';
    img.style.height = h + 'px';
    img.style.setProperty('--vg-persp', persp + 'px');
    if (hasOrigin) {
      img.style.setProperty('--vg-out-x', opts.x + 'px');
      img.style.setProperty('--vg-out-y', opts.y + 'px');
    }
    var period = 360 / VG_SPEED;
    // SECTION 3 : l'icone part de la vignette AU REPOS (meme image, meme
    // taille : scale opts.grow = 1/1,15) et grossit jusqu'a x1,15, au lieu de
    // surgir de rien (scale 0) comme les icones du header.
    if (opts.grow) img.style.setProperty('--vg-s0', String(opts.grow));
    img.style.animationName = (opts.grow ? 'vg-out-grow, ' : 'vg-out-pop, ') + (axis === 'y' ? 'vg-out-spin-y' : 'vg-out-spin-z');
    img.style.animationDuration = popMs + 'ms, ' + period + 's';
    img.style.animationTimingFunction = (opts.grow ? 'cubic-bezier(.22,1,.36,1)' : 'cubic-bezier(.34,1.56,.64,1)') + ', linear';
    img.style.animationIterationCount = '1, infinite';
    img.style.animationFillMode = 'forwards, none';
    overlay.appendChild(img);
    document.documentElement.appendChild(overlay);

    vgLog('pop start', opts);
    if (opts.onPop) opts.onPop();

    setTimeout(function () {
      vgLog('aspirate start');
      document.documentElement.style.setProperty('--vg-persp', persp + 'px');
      if (hasOrigin) document.body.style.setProperty('--vg-origin', opts.x + 'px ' + opts.y + 'px');
      if (opts.s3) document.body.classList.add('vg-s3');
      document.body.classList.add('vg-aspirate');
      var elapsed = Date.now() - popStart;
      var liveAngle = (elapsed * VG_SPEED / 1000) % 360;
      var payload = { ts: Date.now(), href: href, icon: opts.icon, angle: liveAngle, speed: VG_SPEED, w: w, h: h, axis: axis, persp: persp };
      if (hasOrigin) { payload.x = opts.x; payload.y = opts.y; }
      try { sessionStorage.setItem('vg-transition', JSON.stringify(payload)); } catch (e) {}
      vgLog('flag written', payload);
      if (opts.onAspirate) opts.onAspirate();
      if (opts.passive) {
        setTimeout(function () {
          if (document.body.classList.contains('vg-aspirate')) {
            vgLog('passive submit did not navigate, reverting');
            document.body.classList.remove('vg-aspirate');
            if (overlay.parentNode) overlay.remove();
            try { sessionStorage.removeItem('vg-transition'); } catch (e) {}
            window.__vgTransitioning = false;
          }
        }, aspirateMs + 900);
      } else {
        setTimeout(function () {
          vgLog('navigating to', href);
          window.location.href = href;
        }, aspirateMs);
      }
    }, popMs);
  };

  function handleArrival() {
    var boot = window.__vgBoot;
    if (!boot) { vgLog('no boot state on arrival'); window.__vgTransitioning = false; return; }
    vgLog('arrival detected, liveAngle=', boot.liveAngle);
    var overlay = boot.overlay || document.getElementById('vg-transition-boot');
    if (!overlay) { window.__vgTransitioning = false; return; }
    var played = false;
    function playArrival() {
      if (played) return; played = true;
      vgLog('playing arrival animation');
      document.documentElement.style.setProperty('--vg-persp', (boot.data.persp || 1200) + 'px');
      // SECTION 3 : la nouvelle page sort du point clique (celui du vetement
      // qui tourne encore), pas du centre.
      if (boot.data.x != null && boot.data.y != null) document.body.style.setProperty('--vg-origin', boot.data.x + 'px ' + boot.data.y + 'px');
      overlay.style.transition = 'background-color 250ms ease';
      overlay.style.setProperty('background-color', 'transparent', 'important');
      var finished = false;
      function finishArrival() {
        if (finished) return; finished = true;
        document.body.removeEventListener('animationend', onAnimEnd);
        vgLog('arrival animation done, shrinking logo');
        document.body.classList.remove('vg-arrive');
        var img = overlay.querySelector('img');
        if (img) {
          img.style.transition = 'scale ' + SHRINK_MS + 'ms ease-in, opacity ' + SHRINK_MS + 'ms ease-in';
          img.style.scale = '0';
          img.style.opacity = '0';
        }
        setTimeout(function () {
          vgLog('removing boot overlay');
          if (overlay.parentNode) overlay.remove();
          window.__vgTransitioning = false;
        }, SHRINK_MS + 20);
      }
      function onAnimEnd(e) {
        if (e.target !== document.body || e.animationName !== 'vg-arrive-in') return;
        finishArrival();
      }
      document.body.addEventListener('animationend', onAnimEnd);
      setTimeout(finishArrival, ARRIVE_MS + 150);
      document.body.classList.add('vg-arrive');
    }
    var imgs = document.querySelectorAll('img');
    var pending = 0;
    imgs.forEach(function (im) {
      if (!im.complete) { pending++; im.addEventListener('load', dec, { once: true }); im.addEventListener('error', dec, { once: true }); }
    });
    function dec() { pending--; if (pending <= 0) playArrival(); }
    if (pending === 0) playArrival();
    setTimeout(playArrival, ARRIVE_CAP_MS);
  }
  if (document.readyState === 'loading') { document.addEventListener('DOMContentLoaded', handleArrival); } else { handleArrival(); }

  document.addEventListener('click', function (e) {
    var link = e.target.closest ? e.target.closest('.cart-link') : null;
    if (!link) return;
    e.preventDefault();
    if (window.__vgTransitioning) return;
    var href = link.getAttribute('href') || '/cart';
    window.pageTransition({ icon: 'https://vgthmind.github.io/assets/bigcartel/cart-icon.png', href: href, w: 280, h: 280, axis: 'y', persp: 1200 });
  }, true);

  document.addEventListener('click', function (e) {
    var btn = e.target.closest ? e.target.closest('form.product-form button[type="submit"]') : null;
    if (!btn || btn.disabled) return;
    if (window.__vgTransitioning) return;
    window.pageTransition({ icon: 'https://vgthmind.github.io/assets/bigcartel/cart-icon.png', href: '/cart', w: 280, h: 280, axis: 'y', persp: 1200, passive: true });
  }, true);
})();

(function () {
  function vgClearSelection() {
    try { window.getSelection().removeAllRanges(); } catch (e) {}
  }
  function vgBounce(el) {
    if (!el) return;
    el.classList.remove('vg-pill-bounce');
    void el.offsetWidth;
    el.classList.add('vg-pill-bounce');
    setTimeout(function () { el.classList.remove('vg-pill-bounce'); }, 260);
  }

  document.addEventListener('click', function (e) {
    var logo = e.target.closest ? e.target.closest('.logo a, a.logo, header .logo') : null;
    if (!logo) return;
    var href = (logo.tagName === 'A') ? logo.getAttribute('href') : null;
    if (!href) {
      var innerLink = logo.querySelector ? logo.querySelector('a') : null;
      href = innerLink ? innerLink.getAttribute('href') : '/';
    }
    if (!href) href = '/';
    e.preventDefault();
    if (window.__vgTransitioning) return;
    vgClearSelection();
    if (location.pathname === href) { vgBounce(logo); return; }
    window.pageTransition({
      icon: "https://assets.bigcartel.com/theme_images/122404563/Illustration_sans_titre+_1_.PNG",
      href: href,
      w: 280, h: 280, axis: 'y', persp: 1200
    });
  }, true);

  document.addEventListener('click', function (e) {
    var link = e.target.closest ? e.target.closest('nav.sections .navigation a, nav.primary_navigation .page_list a, footer nav.footernav a, a.button.view-all-products') : null;
    if (!link) return;
    var href = link.getAttribute('href') || '';
    var icon = null;
    if (href === '/products' || href.indexOf('/products?') === 0) icon = 'https://vgthmind.github.io/assets/bigcartel/products-icon.png';
    else if (href.indexOf('/infos-conditions-generales') !== -1) icon = 'https://vgthmind.github.io/assets/bigcartel/info-icon.png';
    else if (href.indexOf('/contact') !== -1) icon = 'https://vgthmind.github.io/assets/bigcartel/contact-icon.png';
    if (!icon) return;
    e.preventDefault();
    if (window.__vgTransitioning) return;
    vgClearSelection();
    if (location.pathname === href) { vgBounce(link); return; }
    window.pageTransition({ icon: icon, href: href, w: 280, h: 280, axis: 'y', persp: 1200 });
  }, true);

  function stripHeaderTitles() {
    document.querySelectorAll('.header a[title], nav.sections a[title], nav.primary_navigation a[title], footer nav.footernav a[title], ul.categories a[title]').forEach(function (el) {
      el.removeAttribute('title');
    });
  }
  stripHeaderTitles();
  document.addEventListener('DOMContentLoaded', stripHeaderTitles);
  setTimeout(stripHeaderTitles, 500);
  setTimeout(stripHeaderTitles, 1500);
})();

/* === SECTION 6 POINT 3 : panneau de recherche (V1 "carte verre") === */
/* Croix de fermeture : le bouton natif du theme (button.close-modal) est */
/* cache en CSS -- il etait rendu dans .wrapper, mal place, et faussait */
/* toute detection de visibilite. Une croix chromee est ajoutee SANS */
/* CONDITION dans .modal-content (qui porte la largeur du panneau, voir */
/* vg-transitions-dev.css ; sans elle .modal-content fait 1200px bord a */
/* bord -- mesure directe du 2026-09-28). */
/* Resultats en direct : filtrage local de /products.json pendant la */
/* frappe (deja charge une fois par la section 3, partage via */
/* window.__vgProducts). Vignettes detourees uniquement (NON_CUTOUT exclu), */
/* clavier haut/bas/Entree, Echap gere par le theme. Rien ne depend du */
/* seul survol : chaque resultat est un vrai lien, tactile compris. */
/* Sur telephone, la liste est bornee a la partie visible au-dessus du */
/* clavier (visualViewport) et defile a l'interieur. */
window.__VG_NON_CUTOUT = window.__VG_NON_CUTOUT || {
  'custom-hoodie': [2, 3],
  'ja_0001': [2, 3, 4],
  'pantalon-denim-bleu': [3, 4],
  'sacoche': [3, 4],
  'sma_0001': [2, 3, 4]
};
window.__vgProducts = window.__vgProducts || fetch('/products.json').then(function (r) { return r.json(); }).then(function (data) {
  return Array.isArray(data) ? data : ((data && data.products) || []);
}).catch(function () { return []; });

(function () {
  // Adresse de ce script (avec son ?v=) : sert a charger
  // search-keywords.json a cote de lui, avec le meme cache-busting.
  var SCRIPT_SRC = (document.currentScript && document.currentScript.src) || '';
  // Meme liste que le badge "piece unique" du Body (seule exception).
  var NOT_UNIQUE = ['cd-vgtape'];
  var HIDDEN_CATS = ['all', 'latest-drop'];
  var MAX_RESULTS = 12;

  function closeSearch() {
    // Reutilise le chemin de fermeture deja valide du theme (Echap).
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', code: 'Escape', keyCode: 27, which: 27, bubbles: true }));
  }

  function norm(s) {
    return (s || '').toString().normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
  }

  // Mots-cles par produit (type de vetement...), fichier separe facile a
  // editer : assets/bigcartel/search-keywords.json (cle = permalink).
  var keywordsReady = (function () {
    try {
      var u = new URL('search-keywords.json', SCRIPT_SRC || location.href);
      if (SCRIPT_SRC) u.search = new URL(SCRIPT_SRC).search;
      return fetch(u.toString()).then(function (r) { return r.ok ? r.json() : {}; }).catch(function () { return {}; });
    } catch (e) { return Promise.resolve({}); }
  })();

  function tokens(s) {
    return norm(s).split(/[^a-z0-9]+/).filter(Boolean);
  }

  // Index par produit : mots du nom, des mots-cles, de la description.
  var indexCache = typeof WeakMap === 'function' ? new WeakMap() : null;
  function indexOf(p, kw) {
    if (indexCache && indexCache.has(p)) return indexCache.get(p);
    var desc = (p.description || '').replace(/<[^>]*>/g, ' ');
    var tmp = document.createElement('textarea');
    tmp.innerHTML = desc;
    var idx = [
      tokens(p.name),
      tokens((kw[p.permalink] || []).join(' ')),
      tokens(tmp.value)
    ];
    if (indexCache) indexCache.set(p, idx);
    return idx;
  }

  // Rang d'un produit pour la requete : 0 = nom, 1 = mots-cles,
  // 2 = description, -1 = aucun. Chaque mot tape doit correspondre au
  // DEBUT d'un mot du produit ("sac" -> "sacoche", "short" -> "shorts") ;
  // le rang retenu est celui du mot le moins bien place. Pas de recherche
  // dans la categorie ("Pants/Shorts" ferait remonter tous les pantalons).
  function rank(qWords, idx) {
    var worst = 0;
    for (var i = 0; i < qWords.length; i++) {
      var w = qWords[i], best = -1;
      for (var f = 0; f < idx.length && best === -1; f++) {
        for (var t = 0; t < idx[f].length; t++) {
          if (idx[f][t].indexOf(w) === 0) { best = f; break; }
        }
      }
      if (best === -1) return -1;
      if (best > worst) worst = best;
    }
    return worst;
  }

  function cutoutThumb(p) {
    var bad = window.__VG_NON_CUTOUT[p.permalink] || [];
    var imgs = p.images || [];
    for (var i = 0; i < imgs.length; i++) {
      if (bad.indexOf(i) === -1 && imgs[i] && imgs[i].url) {
        try {
          var u = new URL(imgs[i].url, location.href);
          u.searchParams.set('w', '240');
          u.searchParams.set('h', '240');
          return u.toString();
        } catch (e) { return imgs[i].url; }
      }
    }
    return null;
  }

  function catLabel(p) {
    var cats = (p.categories || []).filter(function (c) { return HIDDEN_CATS.indexOf(c.permalink) === -1; });
    var parts = [];
    if (cats[0] && cats[0].name) parts.push(cats[0].name);
    if (p.status === 'sold-out') parts.push('Sold out');
    else if (NOT_UNIQUE.indexOf(p.permalink) === -1) parts.push('One of a kind');
    return parts.join(' · ');
  }

  function price(p) {
    var v = Number(p.default_price != null ? p.default_price : p.price);
    if (isNaN(v)) return '';
    return v.toFixed(2).replace('.', ',') + ' EUR';
  }

  function setup(modal) {
    if (modal.__vgSearchReady) return;
    modal.__vgSearchReady = true;
    var panel = modal.querySelector('.modal-content');
    var wrapper = modal.querySelector('.wrapper');
    var form = modal.querySelector('form.search-form');
    var input = modal.querySelector('input.search-input');

    var closeBtn = document.createElement('button');
    closeBtn.type = 'button';
    closeBtn.className = 'vg-search-close-fallback';
    closeBtn.setAttribute('aria-label', 'Close search');
    closeBtn.innerHTML = '<svg aria-hidden="true" viewBox="0 0 16 16" width="13" height="13"><path d="M2 2l12 12M14 2L2 14" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" fill="none"/></svg>';
    closeBtn.addEventListener('click', closeSearch);
    (panel || modal).appendChild(closeBtn);

    if (!form || !input || !wrapper) return;
    input.setAttribute('placeholder', 'Search products…');
    input.setAttribute('autocomplete', 'off');
    input.setAttribute('role', 'combobox');
    input.setAttribute('aria-autocomplete', 'list');
    input.setAttribute('aria-controls', 'vg-sr-list');
    input.setAttribute('aria-expanded', 'false');

    var box = document.createElement('div');
    box.className = 'vg-sr';
    box.hidden = true;
    box.innerHTML =
      '<div class="vg-sr-head"><span class="vg-sr-count" aria-live="polite"></span><a class="vg-sr-all" href="/products">See all</a></div>' +
      '<ul class="vg-sr-list" id="vg-sr-list" role="listbox" aria-label="Search results"></ul>' +
      '<div class="vg-sr-hint"><span><kbd>↑↓</kbd>navigate &nbsp; <kbd>Enter</kbd>open</span><span><kbd>Esc</kbd>close</span></div>';
    wrapper.appendChild(box);
    var countEl = box.querySelector('.vg-sr-count');
    var allLink = box.querySelector('.vg-sr-all');
    var list = box.querySelector('.vg-sr-list');

    var items = [];
    var active = -1;
    var reqId = 0;

    function fitToViewport() {
      // Borne la liste a ce qui reste visible au-dessus du clavier du
      // telephone (visualViewport) ; defile a l'interieur au-dela.
      if (box.hidden) return;
      var vv = window.visualViewport;
      var visibleBottom = vv ? (vv.offsetTop + vv.height) : window.innerHeight;
      var top = list.getBoundingClientRect().top;
      var reserve = window.matchMedia('(hover:none), (pointer:coarse)').matches ? 16 : 44;
      list.style.maxHeight = Math.max(140, Math.floor(visibleBottom - top - reserve)) + 'px';
    }

    function setActive(i) {
      if (items[active]) items[active].classList.remove('is-active');
      active = i;
      if (items[active]) {
        items[active].classList.add('is-active');
        input.setAttribute('aria-activedescendant', items[active].id);
        items[active].scrollIntoView({ block: 'nearest' });
      } else {
        input.removeAttribute('aria-activedescendant');
      }
    }

    function go(a) {
      var href = a.getAttribute('href');
      var icon = a.getAttribute('data-icon');
      if (typeof window.pageTransition === 'function' && icon && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        window.pageTransition({ icon: icon, href: href, w: 280, h: 280, axis: 'z', persp: 1000 });
      } else {
        location.href = href;
      }
    }

    function render(q, products, kw) {
      var nq = norm(q);
      list.innerHTML = '';
      items = [];
      active = -1;
      input.removeAttribute('aria-activedescendant');
      if (!nq) {
        box.hidden = true;
        input.setAttribute('aria-expanded', 'false');
        return;
      }
      var words = tokens(q);
      // Tous les produits en ligne (products.json ne contient que ceux-la),
      // epuises compris mais affiches "Sold out" et classes apres les
      // disponibles. Ordre : nom, puis mots-cles, puis description.
      var scored = [];
      products.forEach(function (p, order) {
        var r = rank(words, indexOf(p, kw));
        if (r === -1) return;
        scored.push({ p: p, r: r, sold: p.status && p.status !== 'active' ? 1 : 0, o: order });
      });
      scored.sort(function (a, b) { return (a.r - b.r) || (a.sold - b.sold) || (a.o - b.o); });
      var matches = scored.map(function (x) { return x.p; });
      allLink.setAttribute('href', '/products?search=' + encodeURIComponent(q.trim()));
      box.hidden = false;
      input.setAttribute('aria-expanded', 'true');
      if (!matches.length) {
        countEl.textContent = 'No results';
        allLink.style.visibility = 'hidden';
        fitToViewport();
        return;
      }
      allLink.style.visibility = '';
      countEl.textContent = matches.length + (matches.length > 1 ? ' results' : ' result');
      matches.slice(0, MAX_RESULTS).forEach(function (p, i) {
        var thumb = cutoutThumb(p);
        var li = document.createElement('li');
        var a = document.createElement('a');
        a.className = 'vg-sr-item';
        a.id = 'vg-sr-' + i;
        a.setAttribute('role', 'option');
        a.href = p.url || ('/product/' + p.permalink);
        if (thumb) a.setAttribute('data-icon', thumb);
        var img = document.createElement('img');
        img.className = 'vg-sr-thumb';
        img.alt = '';
        img.decoding = 'async';
        if (thumb) img.src = thumb;
        var txt = document.createElement('span');
        txt.className = 'vg-sr-txt';
        var nm = document.createElement('span');
        nm.className = 'vg-sr-name';
        nm.textContent = (p.name || '').trim();
        var ct = document.createElement('span');
        ct.className = 'vg-sr-cat';
        ct.textContent = catLabel(p);
        txt.appendChild(nm);
        txt.appendChild(ct);
        var pr = document.createElement('span');
        pr.className = 'vg-sr-price';
        pr.textContent = price(p);
        a.appendChild(img);
        a.appendChild(txt);
        a.appendChild(pr);
        a.addEventListener('click', function (e) {
          if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
          e.preventDefault();
          e.stopPropagation();
          go(a);
        });
        li.appendChild(a);
        list.appendChild(li);
        items.push(a);
      });
      fitToViewport();
    }

    function update() {
      var q = input.value;
      var id = ++reqId;
      Promise.all([window.__vgProducts, keywordsReady]).then(function (res) {
        if (id === reqId) render(q, res[0] || [], res[1] || {});
      });
    }

    input.addEventListener('input', update);
    input.addEventListener('keydown', function (e) {
      if (box.hidden || !items.length) return;
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setActive(active < items.length - 1 ? active + 1 : 0);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setActive(active > 0 ? active - 1 : items.length - 1);
      } else if (e.key === 'Enter' && active > -1) {
        e.preventDefault();
        go(items[active]);
      }
    });
    input.addEventListener('focus', function () { setTimeout(fitToViewport, 300); });
    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', fitToViewport);
      window.visualViewport.addEventListener('scroll', fitToViewport);
    }
    window.addEventListener('resize', fitToViewport);

    new MutationObserver(function () {
      if (modal.getAttribute('aria-hidden') === 'false') {
        if (input.value) update();
      }
    }).observe(modal, { attributes: true, attributeFilter: ['aria-hidden'] });
  }

  /* === MENU MOBILE (V1 plein ecran verre) : complements au DOM du theme === */
  /* Barre du haut avec le logo (la croix du theme reste a droite) et pied */
  /* de menu : recherche + panier. Le reste est du CSS sur les liens */
  /* existants, pour que les transitions de page continuent de marcher. */
  function setupMenu(nav) {
    if (nav.__vgMenuReady) return;
    nav.__vgMenuReady = true;
    var content = nav.querySelector('.overlay_content');
    if (!content) return;

    var headerLogo = document.querySelector('.header .logo img, header .logo img, .header img.store-logo');
    var bar = document.createElement('div');
    bar.className = 'vg-menu-bar';
    if (headerLogo) {
      var logo = headerLogo.cloneNode(true);
      logo.removeAttribute('srcset');
      logo.alt = '';
      bar.appendChild(logo);
    }
    content.insertBefore(bar, content.firstChild);

    var foot = document.createElement('div');
    foot.className = 'vg-menu-foot';
    var sBtn = document.createElement('button');
    sBtn.type = 'button';
    sBtn.className = 'vg-menu-search';
    sBtn.setAttribute('aria-label', 'Search');
    sBtn.innerHTML = '<svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><circle cx="10.5" cy="10.5" r="6.5"/><path d="M20 20l-4.8-4.8"/></svg>';
    sBtn.addEventListener('click', function () {
      var close = nav.querySelector('.close_overlay');
      if (close) close.click();
      var open = document.querySelector('.open-search-button');
      if (open) setTimeout(function () { open.click(); }, 220);
    });
    foot.appendChild(sBtn);
    var cart = document.querySelector('.header .cart-link');
    if (cart) foot.appendChild(cart.cloneNode(true));
    content.appendChild(foot);
  }

  function init() {
    var modal = document.getElementById('search-modal');
    var nav = document.getElementById('navigation-modal');
    if (modal) setup(modal);
    if (nav) setupMenu(nav);
    if (modal && nav) return;
    var obs = new MutationObserver(function () {
      var m = document.getElementById('search-modal');
      var n = document.getElementById('navigation-modal');
      if (m) setup(m);
      if (n) setupMenu(n);
      if (m && n) obs.disconnect();
    });
    obs.observe(document.documentElement, { childList: true, subtree: true });
  }
  // Ce script peut s'executer avant la fin du <body> (preload dans le
  // <head>) : on attend que les 2 modales existent.
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();

/* === SECTION 6 POINT 2 : sequence splash -> accueil (2 clips) === */
/* Reprend a l'identique le script auparavant colle dans le Body (meme */
/* logo, meme flag sessionStorage 'vg-splash-seen', meme tirage aleatoire */
/* de 2 clips parmi 4, meme duree totale ~2.2s). Corrige uniquement le */
/* defaut releve par Jules (0:03.0-0:03.8) : le script d'origine reassigne */
/* .src sur UN SEUL <video> partage entre les 2 clips, ce qui force le */
/* decodeur a se reinitialiser et produit une image noire le temps que le */
/* 2e clip charge. Ici, 2 <video> distincts se chargent en parallele et */
/* se fondent en fondu (crossfade CSS), donc plus jamais de noir entre les */
/* deux. Cette version REMPLACE entierement le script inline du Body : a */
/* l'application, supprimer le bloc <script> correspondant du Body (voir */
/* APPLIQUER_LOT_A.md), ce fichier prend le relais seul. */
(function () {
  if (location.pathname !== '/') return;
  var seen = false;
  try { seen = sessionStorage.getItem('vg-splash-seen'); } catch (err) {}
  if (seen) return;

  function boot() {
    var splash = document.createElement('div');
    splash.className = 'vg-splash';
    splash.innerHTML = '<img class="vg-splash-logo" src="https://assets.bigcartel.com/theme_images/122404563/Illustration_sans_titre+_1_.PNG" alt="vgthmind"><div class="vg-enter">Enter</div>';
    document.body.appendChild(splash);
    var prevOverflow = document.documentElement.style.overflow;
    document.documentElement.style.overflow = 'hidden';

    splash.addEventListener('click', function () {
      try { sessionStorage.setItem('vg-splash-seen', '1'); } catch (err) {}
      var clips = [
        'https://vgthmind.github.io/assets/bigcartel/clip_1.mp4',
        'https://vgthmind.github.io/assets/bigcartel/clip_2.mp4',
        'https://vgthmind.github.io/assets/bigcartel/clip_3.mp4',
        'https://vgthmind.github.io/assets/bigcartel/clip_4.mp4'
      ];
      for (var si = clips.length - 1; si > 0; si--) {
        var sj = Math.floor(Math.random() * (si + 1));
        var stmp = clips[si]; clips[si] = clips[sj]; clips[sj] = stmp;
      }
      var sequence = clips.slice(0, 2);

      var vidA = document.createElement('video');
      var vidB = document.createElement('video');
      [vidA, vidB].forEach(function (v) {
        v.className = 'vg-splash-video';
        v.muted = true;
        v.playsInline = true;
        v.preload = 'auto';
        splash.appendChild(v);
      });
      splash.classList.add('vg-splash-playing');

      var finished = false;
      function finish() {
        if (finished) return;
        finished = true;
        splash.classList.add('vg-splash-out');
        document.documentElement.style.overflow = prevOverflow;
        setTimeout(function () { splash.remove(); }, 650);
      }

      var hardStop = setTimeout(finish, 2200);

      function playOn(vid, src, onStarted) {
        vid.src = src;
        vid.addEventListener('playing', function once() {
          vid.removeEventListener('playing', once);
          if (onStarted) onStarted();
        });
        vid.play().catch(finish);
      }

      // Precharge le 2e clip en parallele du 1er (pas de .src partage :
      // chaque <video> garde le sien toute sa vie, donc pas de reset).
      playOn(vidA, sequence[0], function () {
        vidA.classList.add('vg-active');
        setTimeout(function () {
          if (finished) return;
          playOn(vidB, sequence[1], function () {
            vidB.classList.add('vg-active');
            vidA.classList.remove('vg-active');
            setTimeout(finish, 500);
          });
        }, 500);
      });
    });
  }

  if (document.readyState === 'loading') { document.addEventListener('DOMContentLoaded', boot); } else { boot(); }
})();

/* === Rognage automatique du vide transparent des photos detourees === */
/* Pour que le VETEMENT lui-meme ait la meme taille a l'ecran quel que soit */
/* le cadrage de la photo (un hoodie photographie avec du vide autour ne */
/* doit pas paraitre plus petit qu'un short qui remplit son image). Chaque */
/* photo est analysee une seule fois, en petit (200 px), sur un canvas : */
/* rectangle des pixels non transparents, en fractions de l'image. Resultat */
/* garde en memoire + localStorage (cle = chemin de l'image, sans les */
/* parametres de taille). Le CDN d'images BigCartel autorise le CORS. */
/* Utilise par les sections 4 et 5 (pop), et plus tard la section 3. */
window.__vgTrim = window.__vgTrim || (function () {
  var KEY = 'vgTrim2';
  var mem = {};
  try { mem = JSON.parse(localStorage.getItem(KEY) || '{}') || {}; } catch (e) { mem = {}; }
  var pending = {};
  var saveT = null;
  function keyOf(url) { try { return new URL(url, location.href).pathname; } catch (e) { return url; } }
  function save() {
    clearTimeout(saveT);
    saveT = setTimeout(function () {
      var keep = {};
      for (var k in mem) { if (mem[k]) keep[k] = mem[k]; }
      try { localStorage.setItem(KEY, JSON.stringify(keep)); } catch (e) {}
    }, 800);
  }
  function small(url) {
    try {
      var u = new URL(url, location.href);
      u.searchParams.set('w', '200');
      u.searchParams.set('h', '200');
      return u.toString();
    } catch (e) { return url; }
  }
  function analyse(im) {
    var W = im.naturalWidth, H = im.naturalHeight;
    if (!W || !H) return null;
    var c = document.createElement('canvas');
    c.width = W; c.height = H;
    var g = c.getContext('2d', { willReadFrequently: true });
    g.drawImage(im, 0, 0);
    var px = g.getImageData(0, 0, W, H).data; // exception si CORS refuse
    var l = W, t = H, r = -1, b = -1, n = 0;
    for (var y = 0; y < H; y++) {
      var row = y * W * 4;
      for (var x = 0; x < W; x++) {
        if (px[row + x * 4 + 3] > 24) {
          n++;
          if (x < l) l = x;
          if (x > r) r = x;
          if (y < t) t = y;
          if (y > b) b = y;
        }
      }
    }
    if (r < 0) return null;
    // f = part du rectangle du vetement reellement remplie (1 = objet plein
    // et carre comme la pochette du CD, ~0,6 pour un pantalon).
    return { ar: W / H, l: l / W, t: t / H, r: (r + 1) / W, b: (b + 1) / H, f: n / ((r + 1 - l) * (b + 1 - t)) };
  }
  function get(url) {
    if (!url) return null;
    var k = keyOf(url);
    return Object.prototype.hasOwnProperty.call(mem, k) ? mem[k] : undefined;
  }
  function load(url) {
    if (!url) return Promise.resolve(null);
    var k = keyOf(url);
    if (Object.prototype.hasOwnProperty.call(mem, k)) return Promise.resolve(mem[k]);
    if (pending[k]) return pending[k];
    pending[k] = new Promise(function (res) {
      var im = new Image();
      im.crossOrigin = 'anonymous';
      im.decoding = 'async';
      im.onload = function () {
        var box = null;
        try { box = analyse(im); } catch (e) { box = null; }
        mem[k] = box;
        delete pending[k];
        save();
        res(box);
      };
      im.onerror = function () { delete pending[k]; res(null); };
      im.src = small(url);
    });
    return pending[k];
  }
  // Rectangle du vetement quand l'image (rapport ar) est affichee en
  // "contain" dans un rectangle (left, top, width, height).
  function garment(box, rect) {
    var dw = Math.min(rect.width, rect.height * box.ar);
    var dh = dw / box.ar;
    var ox = rect.left + (rect.width - dw) / 2, oy = rect.top + (rect.height - dh) / 2;
    var gw = (box.r - box.l) * dw, gh = (box.b - box.t) * dh;
    // q = "poids visuel" relatif a la plus grande dimension : racine de la
    // surface reellement remplie / plus grande dimension (1 = carre plein).
    var big = Math.max(gw, gh), small = Math.min(gw, gh);
    var q = big ? Math.sqrt((box.f || 1) * small / big) : 1;
    return { cx: ox + box.l * dw + gw / 2, cy: oy + box.t * dh + gh / 2, w: gw, h: gh, size: big, q: q, dw: dw, dh: dh, ox: ox, oy: oy };
  }
  return { get: get, load: load, garment: garment };
})();

/* === SECTIONS 4 ET 5 : pop au survol (grilles produits, tuiles de */
/* l'accueil, image principale de la fiche produit) === */
/* UN SEUL systeme de survol. Il remplace les 3 qui se chevauchaient : */
/* l'image d'origine grossie "en flux" (width:320px, qui debordait et */
/* passait sous le header), .vg-hover-swap (fondu PAR-DESSUS une base */
/* restee visible = fantome avec des PNG detoures), et le script du Body */
/* qui echangeait src/srcset (il memorisait un srcset encore vide avant */
/* lazysizes et ne le restaurait jamais = 2e photo coincee au repos). */
/* Principe : au survol, une superposition position:fixed, de taille */
/* identique en pixels pour tous (POP), au-dessus du header, contenant la */
/* photo de repos et la 2e photo detouree, en fondu enchaine (l'une */
/* disparait pendant que l'autre apparait). L'image d'origine est masquee */
/* pendant le pop. Souris uniquement (rien sur tactile), rien en */
/* prefers-reduced-motion. transform/opacity uniquement. */
(function () {
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduceMotion) return;

  // Fiche produit : UNE seule cible pour toute la zone image (avant : la
  // diapo ET le lien de zoom qu'elle contient, le pop se fermait et se
  // rouvrait en passant de l'un a l'autre = alternance face/dos).
  var TARGETS = '.product-list-link, .vg-category-tile, .product-images';
  var current = null;
  // Element actuellement sous la souris (suivi explicite : l'etat :hover
  // peut etre en retard d'un instant dans l'apercu mis a l'echelle).
  var overEl = null;
  // Liste produits deja arrivee (sinon le pop s'ouvre quand meme, avec
  // l'image affichee, et la 2e photo est ajoutee a l'arrivee des donnees :
  // /products.json est demande plusieurs fois au chargement et peut mettre
  // quelques secondes -- le 1er survol ne donnait alors rien).
  var productsNow = null;
  Promise.resolve(window.__vgProducts).then(function (p) { productsNow = p || []; });

  // Meme taille pour tous (tuiles de l'accueil, Latest Drop compris, et
  // grilles produits) : ~1,75x une vignette de grille desktop (~320px).
  function popSize() {
    return Math.round(Math.min(560, window.innerHeight * 0.72, window.innerWidth * 0.5));
  }

  var TRIM = window.__vgTrim;
  // Plus grande dimension du vetement dans la boite du pop (le reste sert a
  // l'ombre portee).
  var FILL = 0.9;
  // Egalisation du poids visuel (surface visible) : q median mesure sur le
  // catalogue le 2026-09-29 = 0,73 (min 0,60 sacoche SC_0008, max 0,99 CD).
  // Un objet plus "plein" que ca (pochette du CD, cache-cou, hoodie
  // compact) est reduit pour peser pareil ; un
  // objet plus fin (pantalon) garde la taille max (jamais plus grand que la
  // boite).
  var AREA_Q = 0.72;
  function gFor(box, S) {
    var G = TRIM.garment(box, { left: 0, top: 0, width: S, height: S });
    return FILL * S * Math.min(1, AREA_Q / (G.q || AREA_Q));
  }

  function headerBottom() {
    var hd = document.querySelector('.header');
    if (!hd) return 0;
    var b = hd.getBoundingClientRect().bottom;
    return b > 0 ? b : 0;
  }

  // Tuiles de l'accueil : meme taille de pop pour les 6 (Latest Drop
  // compris), calee sur les tuiles normales (~1,7x) sans que Latest Drop,
  // plus grande au repos, ne retrecisse (>= 1,15x sa taille au repos).
  function tileSize() {
    var sel = ' .vg-category-tile-img:not(.vg-category-tile-img-alt)';
    var sm = document.querySelector('.vg-category-tile:not(.vg-tile-featured)' + sel);
    var ft = document.querySelector('.vg-category-tile.vg-tile-featured' + sel);
    var dim = function (e) { if (!e) return 0; var r = e.getBoundingClientRect(); return Math.max(r.width, r.height); };
    var g = Math.max(dim(sm) * 1.7, dim(ft) * 1.15);
    return Math.round(Math.min(popSize(), (g || popSize() * FILL) / FILL));
  }

  // Recadre une image du pop (transform uniquement) : son vetement mesure g
  // px (plus grande dimension) et son centre tombe en (x, y) dans la boite
  // de cote S. L'image elle-meme remplit la boite en "contain".
  function frame(img, box, S, g, x, y) {
    var G = TRIM.garment(box, { left: 0, top: 0, width: S, height: S });
    if (!G.size) return;
    var m = g / G.size;
    var tx = (x - S / 2) - m * (G.cx - S / 2);
    var ty = (y - S / 2) - m * (G.cy - S / 2);
    img.style.setProperty('transform', 'translate(' + tx.toFixed(1) + 'px,' + ty.toFixed(1) + 'px) scale(' + m.toFixed(4) + ')', 'important');
  }

  function slugOf(href) {
    var m = (href || '').match(/\/product\/([^\/?#]+)/);
    if (!m) return null;
    try { return decodeURIComponent(m[1]).normalize('NFC'); } catch (e) { return m[1]; }
  }

  function findProduct(products, slug) {
    if (!slug) return null;
    for (var i = 0; i < products.length; i++) {
      var p = products[i].permalink || '';
      try { p = decodeURIComponent(p); } catch (e) {}
      if (p.normalize('NFC') === slug) return products[i];
    }
    return null;
  }

  function sized(url, px) {
    try {
      var u = new URL(url, location.href);
      u.searchParams.set('w', String(px));
      u.searchParams.set('h', String(px));
      return u.toString();
    } catch (e) { return url; }
  }

  // Index d'image a exclure (photos non detourees), partage avec la section 3.
  function cutoutIndexes(p) {
    var bad = (window.__VG_NON_CUTOUT || {})[p.permalink] || [];
    var out = [];
    (p.images || []).forEach(function (im, i) { if (im && im.url && bad.indexOf(i) === -1) out.push(i); });
    return out;
  }

  function bgUrl(el) {
    if (!el) return null;
    var m = (getComputedStyle(el).backgroundImage || '').match(/url\(["']?(.*?)["']?\)/);
    return m ? m[1] : null;
  }

  function samePath(a, b) {
    try { return new URL(a, location.href).pathname === new URL(b, location.href).pathname; } catch (e) { return a === b; }
  }

  // Decrit ce qui doit popper pour une cible : element source a masquer,
  // rectangle de depart, image de repos, 2e image, mode (taille fixe ou sur place).
  function describe(el, products) {
    if (el.classList.contains('vg-category-tile')) {
      var base = el.querySelector('.vg-category-tile-img:not(.vg-category-tile-img-alt)');
      var alt = el.querySelector('.vg-category-tile-img-alt');
      var a = bgUrl(base);
      if (!a) return null;
      var b2 = bgUrl(alt);
      // Categorie a un seul produit (ex. Merch) : pas de 2e image fournie
      // par la tuile, on prend la 2e photo detouree de ce meme produit.
      if (!b2) {
        for (var t = 0; t < products.length && !b2; t++) {
          var tp = products[t];
          if (!tp.images || !tp.images[0] || !samePath(tp.images[0].url, a)) continue;
          var ti = cutoutIndexes(tp);
          for (var u = 0; u < ti.length; u++) { if (ti[u] > 0) { b2 = sized(tp.images[ti[u]].url, 900); break; } }
        }
      }
      return { src: base, rectEl: base, a: a, b: b2, mode: 'fixed' };
    }
    if (el.classList.contains('product-list-link')) {
      var img = el.querySelector('img.product-list-image') || el.querySelector('.product-list-image-container img');
      if (!img) return null;
      var p = findProduct(products, slugOf(el.getAttribute('href')));
      var rest = img.currentSrc || img.src;
      var second = null;
      if (p) {
        var idx = cutoutIndexes(p);
        if (p.images && p.images[0]) rest = sized(p.images[0].url, 900);
        for (var k = 0; k < idx.length; k++) { if (idx[k] > 0) { second = sized(p.images[idx[k]].url, 900); break; } }
      }
      return { src: img, rectEl: img, a: rest, b: second, mode: 'fixed' };
    }
    // Fiche produit : image REELLEMENT affichee dans la fenetre du carrousel
    // (la classe is-active peut designer une copie hors ecran du carrousel
    // en boucle : le pop partait alors hors ecran et une autre diapo restait
    // visible), pop sur place + photo suivante detouree du meme produit.
    var mainImg = visibleImg(el);
    if (!mainImg) return null;
    var prod = findProduct(products, slugOf(location.pathname));
    var shown = mainImg.currentSrc || mainImg.src;
    var next = null;
    if (prod) {
      var ids = cutoutIndexes(prod);
      var cur = -1;
      for (var j = 0; j < (prod.images || []).length; j++) { if (samePath(prod.images[j].url, shown)) { cur = j; break; } }
      for (var q = 0; q < ids.length; q++) { if (ids[q] !== cur) { next = sized(prod.images[ids[q]].url, 1200); break; } }
    }
    return { src: mainImg, rectEl: mainImg, a: shown, b: next, mode: 'inplace' };
  }

  function visibleImg(el) {
    var win = el.querySelector('.splide__track') || el;
    var wr = win.getBoundingClientRect();
    var best = null, bestA = 0;
    el.querySelectorAll('.zoom-image-container img, img.product-image').forEach(function (im) {
      var r = im.getBoundingClientRect();
      var w = Math.min(r.right, wr.right) - Math.max(r.left, wr.left);
      var h = Math.min(r.bottom, wr.bottom) - Math.max(r.top, wr.top);
      var a = (w > 0 && h > 0) ? w * h : 0;
      if (a > bestA) { bestA = a; best = im; }
    });
    return best;
  }

  function contentRect(img) {
    // Rectangle reellement occupe par l'image (object-fit:contain) ou par
    // le fond (background-size:contain) : evite de popper une boite vide.
    var r = img.getBoundingClientRect();
    var w = r.width, h = r.height, nw = img.naturalWidth, nh = img.naturalHeight;
    if (nw && nh && w && h) {
      var s = Math.min(w / nw, h / nh);
      var cw = nw * s, ch = nh * s;
      return { left: r.left + (w - cw) / 2, top: r.top + (h - ch) / 2, width: cw, height: ch };
    }
    return { left: r.left, top: r.top, width: w, height: h };
  }

  function open(el, d) {
    var boxA = TRIM.get(d.a);
    if (boxA === undefined) TRIM.load(d.a); // pour la prochaine fois
    var r;
    if (d.src.tagName === 'IMG') r = contentRect(d.src);
    else {
      r = d.rectEl.getBoundingClientRect();
      // Tuile : fond en "contain", rectangle reellement occupe par la photo.
      if (boxA) {
        var gt = TRIM.garment(boxA, r);
        r = { left: gt.ox, top: gt.oy, width: gt.dw, height: gt.dh };
      }
    }
    if (!r.width || !r.height) return;
    var cx = r.left + r.width / 2, cy = r.top + r.height / 2;
    var size, s0, target = null;
    if (d.mode === 'inplace') {
      size = Math.max(r.width, r.height) * 1.08;
      s0 = 1 / 1.08;
      // Fiche produit : la photo affichee ne bouge pas ; la 2e photo est
      // recadree pour que son vetement ait la meme taille et la meme place.
      if (boxA) {
        var gi = TRIM.garment(boxA, { left: 0, top: 0, width: size, height: size });
        target = { g: gi.size, x: gi.cx, y: gi.cy, frameA: false };
      }
    } else {
      var isTile = el.classList.contains('vg-category-tile');
      var top = 8;
      size = popSize();
      if (isTile) {
        // Tuiles : taille commune, et jamais par-dessus les pills du header.
        top = headerBottom() + 8;
        size = Math.min(tileSize(), window.innerHeight - top - 8);
      }
      s0 = Math.max(r.width, r.height) / size;
      if (boxA) {
        // Le vetement (pas la photo) a le meme poids visuel pour tous, et le
        // pop part exactement du vetement de la vignette.
        var gA = gFor(boxA, size);
        var gv = TRIM.garment(boxA, r);
        s0 = gv.size / gA;
        cx = gv.cx; cy = gv.cy;
        target = { g: gA, auto: true, x: size / 2, y: size / 2, frameA: true };
      }
      // Jamais coupe : le pop reste entierement dans la fenetre.
      var half = size / 2 + 8;
      cx = Math.min(Math.max(cx, half), window.innerWidth - half);
      cy = Math.min(Math.max(cy, top + size / 2), window.innerHeight - half);
    }
    var box = document.createElement('div');
    box.className = 'vg-pop';
    box.style.width = size + 'px';
    box.style.height = size + 'px';
    box.style.left = cx + 'px';
    box.style.top = cy + 'px';
    box.style.setProperty('--vg-pop-s0', String(s0));
    var ia = document.createElement('img');
    ia.className = 'vg-pop-img vg-pop-a';
    ia.alt = '';
    ia.src = d.a;
    if (target && target.frameA) frame(ia, boxA, size, target.g, target.x, target.y);
    box.appendChild(ia);
    document.documentElement.appendChild(box);
    d.src.classList.add('vg-pop-hidden');
    var state = { el: el, d: d, box: box, t: null, ib: null, size: size, target: target };
    current = state;
    if (d.b) addSecond(state, d.b);
    // Lecture de style forcee : l'etat initial (petit) est pris en compte
    // avant d'ajouter .is-open, donc la transition part bien de la vignette.
    // (Pas de requestAnimationFrame : il ne tourne pas si l'onglet est
    // considere comme masque, le pop restait alors bloque petit.)
    void getComputedStyle(box).transform;
    box.classList.add('is-open');
    state.opened = true;
    if (state.ib) scheduleSwap(state, 140);
  }

  function addSecond(state, url) {
    if (state.ib) return;
    var ib = document.createElement('img');
    ib.className = 'vg-pop-img vg-pop-b';
    ib.alt = '';
    ib.src = url;
    state.box.appendChild(ib);
    state.ib = ib;
    // Recadrage de la 2e photo (invisible jusqu'au fondu) : le fondu attend
    // qu'il soit fait, pour ne jamais montrer un vetement qui change de taille.
    state.framed = !state.target ? Promise.resolve() : TRIM.load(url).then(function (bx) {
      if (bx && state.target) frame(ib, bx, state.size, state.target.auto ? gFor(bx, state.size) : state.target.g, state.target.x, state.target.y);
    });
    if (state.opened) scheduleSwap(state, 60);
  }

  function scheduleSwap(state, delay) {
    var go = function () { if (current === state) state.box.classList.add('is-swapped'); };
    var loaded = state.ib.complete ? Promise.resolve(true) : new Promise(function (res) {
      state.ib.addEventListener('load', function () { res(false); }, { once: true });
    });
    Promise.all([loaded, state.framed]).then(function (v) {
      if (current !== state) return;
      state.t = setTimeout(go, v[0] ? delay : 60);
    });
  }

  function close(instant) {
    var st = current;
    if (!st) return;
    current = null;
    clearTimeout(st.t);
    var done = function () {
      if (st.box.parentNode) st.box.remove();
      st.d.src.classList.remove('vg-pop-hidden');
    };
    if (instant) { done(); return; }
    st.box.classList.remove('is-swapped');
    st.box.classList.remove('is-open');
    setTimeout(done, 230);
  }

  // Prechargement des photos du pop (repos + 2e photo) quand le navigateur
  // est inactif : sans lui, la 2e photo mettait 1 a 2 s a apparaitre au
  // premier survol.
  var preloaded = {};
  function preloadAll() {
    Promise.resolve(window.__vgProducts).then(function (products) {
      var els = Array.prototype.slice.call(document.querySelectorAll('.product-list-link, .vg-category-tile'));
      var urls = [];
      els.forEach(function (el) {
        var d = describe(el, products || []);
        if (!d) return;
        [d.a, d.b].forEach(function (u) { if (u && !preloaded[u]) { preloaded[u] = true; urls.push(u); } });
      });
      var idle = window.requestIdleCallback || function (fn) { return setTimeout(fn, 200); };
      (function next() {
        if (!urls.length) return;
        idle(function () {
          urls.splice(0, 4).forEach(function (u) { var im = new Image(); im.decoding = 'async'; im.src = u; TRIM.load(u); });
          next();
        });
      })();
    });
  }
  if (window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
    if (document.readyState === 'complete') setTimeout(preloadAll, 600);
    else window.addEventListener('load', function () { setTimeout(preloadAll, 600); });
    // Les tuiles de l'accueil sont creees apres coup par le Body.
    setTimeout(preloadAll, 3500);
  }

  // Fiche produit : seule l'image elle-meme declenche le pop (pas les
  // fleches, les vignettes, le compteur).
  function targetOf(t) {
    var el = t.closest ? t.closest(TARGETS) : null;
    if (el && el.classList.contains('product-images')) {
      if (!t.closest('.zoom-image-container, .splide__slide') || t.closest('button, .splide__arrows, .product-thumbnails-buttons-container, .mobile-buttons-indicator')) el = null;
    }
    return el;
  }

  document.addEventListener('pointerover', function (e) {
    if (e.pointerType && e.pointerType !== 'mouse') return;
    var el = targetOf(e.target);
    overEl = el;
    if (current && el === current.el) return;
    if (current) close(false);
    tryOpen(el);
  }, true);

  // Ecran tactile (pointeur principal pas une souris) : aucun pop, jamais.
  var FINE = window.matchMedia('(hover: hover) and (pointer: fine)');
  function tryOpen(el) {
    if (!el || !FINE.matches || window.__vgTransitioning || document.querySelector('.pswp--open')) return;
    var target = el;
    watchSlides();
    var d = describe(target, productsNow || []);
    if (!d) return;
    open(target, d);
    if (!productsNow && !d.b) {
      Promise.resolve(window.__vgProducts).then(function (products) {
        if (!current || current.el !== target) return;
        var d2 = describe(target, products || []);
        if (d2 && d2.b) addSecond(current, d2.b);
      });
    }
  }

  // Le pop se ferme au defilement ; si la souris est restee sur la meme
  // vignette, aucun pointerover ne repart : le moindre mouvement le rouvre.
  document.addEventListener('pointermove', function (e) {
    if (current || !overEl) return;
    if (e.pointerType && e.pointerType !== 'mouse') return;
    tryOpen(overEl);
  }, { passive: true, capture: true });

  document.addEventListener('pointerout', function (e) {
    var to = e.relatedTarget;
    if (overEl && (!to || !overEl.contains(to))) overEl = null;
    if (!current) return;
    if (to && current.el.contains(to)) return;
    if (!current.el.contains(e.target)) return;
    close(false);
  }, true);

  // Au clic (section 3 / navigation), le pop disparait immediatement : la
  // transition doit partir de la vignette au repos.
  document.addEventListener('click', function () { overEl = null; close(true); }, true);
  window.addEventListener('scroll', function () { close(true); }, { passive: true });
  // Carrousel de la fiche produit : des qu'une diapo bouge (fleche, clavier,
  // glisser), le pop disparait -- jamais de pop qui glisse avec la diapo. Il
  // revient au prochain mouvement de souris, sur la nouvelle diapo active.
  var slideWatch = null;
  function watchSlides() {
    if (slideWatch || !window.MutationObserver) return;
    var list = document.querySelector('.product-images .splide__list');
    if (!list) return;
    slideWatch = new MutationObserver(function () {
      if (!current || !current.el.classList.contains('product-images')) return;
      if (visibleImg(current.el) !== current.d.src) close(true);
    });
    slideWatch.observe(list, { attributes: true, subtree: true, attributeFilter: ['class'] });
  }
  window.addEventListener('blur', function () { close(true); });
})();

/* === SECTION 3 : clic produit/categorie (CLAUDE.md section 3) === */
/* Meme mecanique que pageTransition() (section 2) : l'"icone" qui */
/* tournoie est le vetement clique lui-meme, qui part de la vignette AU */
/* REPOS (meme image, meme taille, a sa place), grossit x1,15 et tournoie */
/* sur place ; la page est aspiree en spirale VERS ce point (aspiration */
/* dediee plus lente et visible, body.vg-s3) ; les autres vetements de la */
/* categorie / autres photos du produit orbitent autour (rayon et taille */
/* cales sur le vetement reel grace a window.__vgTrim, cercle garde dans */
/* l'ecran) puis sont aspires avec la page ; la page suivante sort du meme */
/* point pendant que le vetement tourne encore (script du <head>). */
/* Au clic : tout effet de survol est coupe (pop ferme, gris des voisins */
/* retire, html.vg-s3). Tactile : le tap lance directement la transition. */
/* prefers-reduced-motion : fondu simple (pageTransition), sans orbite. */
/* L'ancien systeme "swirl" (Body + Custom CSS) a ete retire le 2026-09-29. */
(function () {
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var GROW = 1.15;
  var S3_POP_MS = 260;      // grossissement x1,15 depuis la vignette
  var S3_ASPIRATE_MS = 650; // spirale visible ; total ~1,3-1,5 s avec l'arrivee
  var ORBIT_MS = S3_POP_MS + S3_ASPIRATE_MS;
  var NON_CUTOUT = window.__VG_NON_CUTOUT;
  var TRIM = window.__vgTrim;

  window.__vgProducts = window.__vgProducts || fetch('/products.json').then(function (r) { return r.json(); }).then(function (data) {
    return Array.isArray(data) ? data : ((data && data.products) || []);
  }).catch(function () { return []; });
  var productsNow = null;
  window.__vgProducts.then(function (p) { productsNow = p || []; });

  function slugFrom(href, kind) {
    var m = (href || '').match(kind === 'category' ? /\/category\/([^\/?#]+)/ : /\/product\/([^\/?#]+)/);
    if (!m) return null;
    try { return decodeURIComponent(m[1]).normalize('NFC'); } catch (e) { return m[1]; }
  }
  function samePermalink(p, slug) {
    var v = p || '';
    try { v = decodeURIComponent(v); } catch (e) {}
    return v.normalize('NFC') === slug;
  }
  function pathOf(u) { try { return new URL(u, location.href).pathname; } catch (e) { return (u || '').split('?')[0]; } }
  function cutoutUrls(product) {
    var bad = NON_CUTOUT[product.permalink] || [];
    var out = [];
    (product.images || []).forEach(function (im, i) { if (bad.indexOf(i) === -1 && im && im.url) out.push(im.url); });
    return out;
  }
  function companions(products, isCategory, slug, excludeUrl) {
    var ex = pathOf(excludeUrl), urls = [];
    if (isCategory) {
      products.forEach(function (p) {
        var inCat = (p.categories || []).some(function (c) { return c.permalink === slug; });
        if (!inCat) return;
        var u = cutoutUrls(p)[0];
        if (u && pathOf(u) !== ex) urls.push(u);
      });
    } else {
      var p = products.filter(function (pr) { return samePermalink(pr.permalink, slug); })[0];
      if (p) {
        urls = cutoutUrls(p).filter(function (u) { return pathOf(u) !== ex; });
        // Peu de photos (souvent 2 : face/dos) = un seul compagnon, a peine
        // visible : on complete avec des vetements de la meme categorie.
        if (urls.length < 4) {
          var cats = (p.categories || []).map(function (c) { return c.permalink; }).filter(function (c) { return c !== 'all' && c !== 'latest-drop'; });
          products.forEach(function (o) {
            if (urls.length >= 6 || o === p) return;
            if (!(o.categories || []).some(function (c) { return cats.indexOf(c.permalink) !== -1; })) return;
            var u = cutoutUrls(o)[0];
            if (u && pathOf(u) !== ex) urls.push(u);
          });
        }
      }
    }
    for (var i = urls.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var t = urls[i]; urls[i] = urls[j]; urls[j] = t; }
    return urls.slice(0, 6);
  }
  function small(url, px) {
    try { var u = new URL(url, location.href); u.searchParams.set('w', String(px)); u.searchParams.set('h', String(px)); return u.toString(); } catch (e) { return url; }
  }
  function bgUrl(el) {
    if (!el) return null;
    var m = (getComputedStyle(el).backgroundImage || '').match(/url\(["']?(.*?)["']?\)/);
    return m ? m[1] : null;
  }
  function headerBottom() {
    var hd = document.querySelector('.header');
    var b = hd ? hd.getBoundingClientRect().bottom : 0;
    return b > 0 ? b : 0;
  }

  // Rectangle reellement occupe par la photo de repos : <img> en contain
  // (grille) ou fond en contain (tuile).
  function restRect(el, url) {
    var r = el.getBoundingClientRect();
    var ar = null;
    if (el.tagName === 'IMG' && el.naturalWidth && el.naturalHeight) ar = el.naturalWidth / el.naturalHeight;
    else { var bx = TRIM && TRIM.get(url); if (bx) ar = bx.ar; }
    if (!ar || !r.width || !r.height) return { left: r.left, top: r.top, width: r.width, height: r.height };
    var w = Math.min(r.width, r.height * ar), h = w / ar;
    return { left: r.left + (r.width - w) / 2, top: r.top + (r.height - h) / 2, width: w, height: h };
  }

  // Orbite : un pivot de taille nulle au point clique tourne (au moins un
  // tour) ; chaque compagnon, place a "radius" du pivot, decrit un vrai
  // cercle autour du vetement ; le pivot retrecit vers 0 en fin
  // d'animation = aspires avec la page vers ce point. Rayon et taille
  // proportionnels au vetement REEL (rogne), cercle garde dans l'ecran.
  function spawnOrbit(urls, x, y, g) {
    if (reduceMotion || !urls.length) return;
    var n = urls.length;
    var tile = Math.max(44, Math.round(g * 0.42));
    var want = g * 0.5 + tile * 0.75;
    var room = Math.min(x, window.innerWidth - x, y - headerBottom(), window.innerHeight - y) - tile * 0.55;
    var radius = Math.max(g * 0.55, Math.min(want, room));
    for (var i = 0; i < n; i++) {
      var wrap = document.createElement('div');
      wrap.className = 'vg-orbit-wrap';
      wrap.style.left = x + 'px';
      wrap.style.top = y + 'px';
      var im = document.createElement('img');
      im.className = 'vg-orbit-tile';
      im.alt = '';
      im.src = small(urls[i], 300);
      im.style.width = tile + 'px';
      im.style.height = tile + 'px';
      im.style.left = (radius - tile / 2) + 'px';
      im.style.marginTop = (-tile / 2) + 'px';
      wrap.appendChild(im);
      document.documentElement.appendChild(wrap);
      var a0 = (i / n) * 360;
      var sweep = 380;
      if (wrap.animate) {
        wrap.animate([
          { transform: 'rotate(' + a0 + 'deg) scale(0.35)', opacity: 0, offset: 0 },
          { transform: 'rotate(' + (a0 + sweep * 0.14) + 'deg) scale(1)', opacity: 1, offset: 0.14 },
          { transform: 'rotate(' + (a0 + sweep * 0.78) + 'deg) scale(1)', opacity: 1, offset: 0.78 },
          { transform: 'rotate(' + (a0 + sweep) + 'deg) scale(0.04)', opacity: 0, offset: 1 }
        ], { duration: ORBIT_MS, easing: 'linear', fill: 'forwards' });
        // chaque compagnon tournoie aussi sur lui-meme
        im.animate([{ transform: 'rotate(0deg)' }, { transform: 'rotate(' + (i % 2 ? -200 : 200) + 'deg)' }], { duration: ORBIT_MS, easing: 'linear', fill: 'forwards' });
      }
      (function (w) { setTimeout(function () { if (w.parentNode) w.remove(); }, ORBIT_MS + 80); })(wrap);
    }
  }

  // Prechargement au survol : page suivante + compagnons (sinon ils
  // arrivent vides pendant les premieres centaines de ms de l'orbite).
  var prefetched = {};
  document.addEventListener('mouseover', function (e) {
    var link = e.target.closest ? e.target.closest('.product-list-link, .vg-category-tile') : null;
    if (!link) return;
    var href = link.getAttribute('href');
    if (!href || prefetched[href]) return;
    prefetched[href] = true;
    var l = document.createElement('link');
    l.rel = 'prefetch';
    l.href = href;
    document.head.appendChild(l);
    Promise.resolve(window.__vgProducts).then(function (products) {
      var isCat = link.classList.contains('vg-category-tile');
      companions(products || [], isCat, slugFrom(href, isCat ? 'category' : 'product'), '').forEach(function (u) { var im = new Image(); im.src = small(u, 300); });
    });
  }, true);

  // Retour arriere (bfcache) : rien ne doit rester masque ni coupe.
  window.addEventListener('pageshow', function (e) {
    if (!e.persisted) return;
    document.documentElement.classList.remove('vg-s3');
    if (document.body) document.body.classList.remove('vg-s3');
    document.querySelectorAll('.vg-pop-hidden').forEach(function (el) { el.classList.remove('vg-pop-hidden'); });
  });

  document.addEventListener('click', function (e) {
    var link = e.target.closest ? e.target.closest('.product-list-link, .vg-category-tile') : null;
    if (!link) return;
    var href = link.getAttribute('href');
    if (!href || href.charAt(0) === '#' || link.target === '_blank' || e.metaKey || e.ctrlKey || e.shiftKey || e.button > 0) return;
    if (window.__vgTransitioning) { e.preventDefault(); return; }
    var isCategory = link.classList.contains('vg-category-tile');
    var srcEl = isCategory
      ? link.querySelector('.vg-category-tile-img:not(.vg-category-tile-img-alt)')
      : (link.querySelector('img.product-list-image') || link.querySelector('.product-list-image-container img'));
    if (!srcEl) return;
    // Image de REPOS affichee (deja chargee = aucun saut, aucun flash).
    var icon = isCategory ? bgUrl(srcEl) : (srcEl.currentSrc || srcEl.src);
    if (!icon || icon.indexOf('w=20') !== -1) return; // placeholder flou : navigation normale
    e.preventDefault();
    try { window.getSelection().removeAllRanges(); } catch (err) {}
    // Coupe tout effet de survol (le pop est deja ferme par son propre
    // ecouteur de clic, enregistre avant celui-ci).
    document.documentElement.classList.add('vg-s3');

    var r = restRect(srcEl, icon);
    var x = r.left + r.width / 2, y = r.top + r.height / 2;
    var w = Math.round(r.width * GROW), h = Math.round(r.height * GROW);
    var g = Math.max(r.width, r.height) * GROW;
    var bx = TRIM && TRIM.get(icon);
    if (bx) g = TRIM.garment(bx, { left: 0, top: 0, width: w, height: h }).size;
    // La vignette d'origine disparait sous l'icone qui la remplace.
    srcEl.classList.add('vg-pop-hidden');

    var slug = slugFrom(href, isCategory ? 'category' : 'product');
    var urls = companions(productsNow || [], isCategory, slug, icon);
    window.pageTransition({
      icon: icon, href: href, x: x, y: y, w: w, h: h, axis: 'z', persp: 1000,
      grow: 1 / GROW, s3: true, popMs: S3_POP_MS, aspirateMs: S3_ASPIRATE_MS,
      onPop: function () { spawnOrbit(urls, x, y, g); }
    });
  }, true);
})();


/* === SECTION 6 : arrivee nette sur les pages (Products, fiche produit) === */
/* "Images floues/delavees a l'arrivee" (diagnostic 2026-09-29 sur le vrai */
/* brouillon) : (1) un script du Body (.vg-reveal, travail de nuit) met */
/* chaque produit et la fiche produit a opacity:0 et ne les fait apparaitre */
/* (0,6 s) qu'en entrant dans l'ecran -> juste apres une transition, toute */
/* la grille est delavee ; (2) les vignettes du theme demarrent en 20 px */
/* floutees (blur-up) jusqu'a ce que theme.js, charge tout a la fin, les */
/* promeuve. Ici : ce qui est DEJA visible a l'arrivee s'affiche tout de */
/* suite, net et opaque (le fondu au defilement reste pour la suite de la */
/* page), et les images visibles recoivent leur vraie resolution sans */
/* attendre theme.js. */
(function () {
  function inView(el) {
    var r = el.getBoundingClientRect();
    return r.bottom > 0 && r.top < window.innerHeight && r.width > 0;
  }
  function promote(img) {
    var set = img.getAttribute('data-srcset');
    if (!set || img.getAttribute('srcset')) return;
    var w = Math.round(img.getBoundingClientRect().width) || 320;
    img.setAttribute('sizes', w + 'px');
    img.setAttribute('srcset', set);
    var done = function () { img.classList.remove('lazyload', 'lazyloading'); img.classList.add('lazyloaded'); };
    if (img.complete && img.currentSrc && img.currentSrc.indexOf('w=20') === -1) done();
    else img.addEventListener('load', done, { once: true });
  }
  function run() {
    document.querySelectorAll('.product-list-image-container img.lazyload, .product-images img.lazyload').forEach(function (img) {
      if (inView(img)) promote(img);
    });
    document.querySelectorAll('.vg-reveal:not(.vg-visible)').forEach(function (el) {
      if (!inView(el)) return;
      el.classList.add('vg-instant', 'vg-visible');
      setTimeout(function () { el.classList.remove('vg-instant'); }, 50);
    });
  }
  run();
  // Le script .vg-reveal du Body s'arme au DOMContentLoaded (ecouteur
  // enregistre avant celui-ci) : on repasse juste apres lui.
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', run);
  window.addEventListener('pageshow', run);
})();

/* === SECTION 6 : titre de page jamais a moitie sous le header === */
/* Quand on s'arrete de defiler avec le titre de la page (1er h1 du main) */
/* coupe par le bas du header fixe, la page glisse doucement jusqu'a la */
/* position la plus proche ou il est soit entierement visible, soit */
/* entierement cache. Jamais pendant qu'un doigt touche l'ecran. */
(function () {
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var timer = null, touching = false, settling = false;
  function headerBottom() {
    var hd = document.querySelector('.header');
    var b = hd ? hd.getBoundingClientRect().bottom : 0;
    return b > 0 ? b : 0;
  }
  function settle() {
    if (touching || window.__vgTransitioning || document.documentElement.classList.contains('vg-lightbox-open')) return;
    var h = document.querySelector('main h1');
    if (!h) return;
    var r = h.getBoundingClientRect();
    var hb = headerBottom();
    if (!r.height || !(r.top < hb - 1 && r.bottom > hb + 1)) return;
    var up = hb - r.top + 12;     // defilement pour le revoir en entier
    var down = r.bottom - hb + 2; // defilement pour le cacher en entier
    var y = window.scrollY;
    var target = up <= down ? Math.max(0, y - up) : y + down;
    settling = true;
    window.scrollTo({ top: target, behavior: reduceMotion ? 'auto' : 'smooth' });
    setTimeout(function () { settling = false; }, 500);
  }
  window.addEventListener('scroll', function () {
    if (settling) return;
    clearTimeout(timer);
    timer = setTimeout(settle, 180);
  }, { passive: true });
  window.addEventListener('touchstart', function () { touching = true; clearTimeout(timer); }, { passive: true });
  window.addEventListener('touchend', function () { touching = false; clearTimeout(timer); timer = setTimeout(settle, 350); }, { passive: true });
})();
