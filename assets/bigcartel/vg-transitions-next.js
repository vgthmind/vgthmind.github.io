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
    img.style.animationName = 'vg-out-pop, ' + (axis === 'y' ? 'vg-out-spin-y' : 'vg-out-spin-z');
    img.style.animationDuration = POP_MS + 'ms, ' + period + 's';
    img.style.animationTimingFunction = 'cubic-bezier(.34,1.56,.64,1), linear';
    img.style.animationIterationCount = '1, infinite';
    img.style.animationFillMode = 'forwards, none';
    overlay.appendChild(img);
    document.documentElement.appendChild(overlay);

    vgLog('pop start', opts);

    setTimeout(function () {
      vgLog('aspirate start');
      document.documentElement.style.setProperty('--vg-persp', persp + 'px');
      if (hasOrigin) document.body.style.setProperty('--vg-origin', opts.x + 'px ' + opts.y + 'px');
      document.body.classList.add('vg-aspirate');
      var elapsed = Date.now() - popStart;
      var liveAngle = (elapsed * VG_SPEED / 1000) % 360;
      var payload = { ts: Date.now(), href: href, icon: opts.icon, angle: liveAngle, speed: VG_SPEED, w: w, h: h, axis: axis, persp: persp };
      if (hasOrigin) { payload.x = opts.x; payload.y = opts.y; }
      try { sessionStorage.setItem('vg-transition', JSON.stringify(payload)); } catch (e) {}
      vgLog('flag written', payload);
      if (opts.passive) {
        setTimeout(function () {
          if (document.body.classList.contains('vg-aspirate')) {
            vgLog('passive submit did not navigate, reverting');
            document.body.classList.remove('vg-aspirate');
            if (overlay.parentNode) overlay.remove();
            try { sessionStorage.removeItem('vg-transition'); } catch (e) {}
            window.__vgTransitioning = false;
          }
        }, ASPIRATE_MS + 900);
      } else {
        setTimeout(function () {
          vgLog('navigating to', href);
          window.location.href = href;
        }, ASPIRATE_MS);
      }
    }, POP_MS);
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

/* === SECTION 3 : clic produit/categorie === */
/* Meme mecanique que pageTransition() (section 2) : l'icone qui tournoie */
/* est ici le vetement clique lui-meme (pas une icone generique), et */
/* l'origine (x, y) est celle de la vignette cliquee au lieu du centre de */
/* l'ecran -- transporte via le flag sessionStorage existant (pageTransition */
/* accepte deja x/y, voir plus haut) pour que l'arrivee sur la page suivante */
/* reprenne exactement au meme point (continuite geree par le script du */
/* <head>, deja capable de positionner l'icone via t.x/t.y). */
/* En plus : d'autres vetements (autres produits de la categorie pour un */
/* clic categorie, autres photos du produit pour un clic produit) pop et */
/* tournoient autour du vetement central pendant l'aspiration */
/* (vgSpawnOrbit ci-dessous). */
/* REMPLACE ENTIEREMENT l'ancien systeme "swirl" (.vg-swirl-tile / */
/* .vg-center-icon / body.vg-suck-out) : a l'application du lot, supprimer */
/* du Body le script correspondant (celui qui definit spawnSwirl()) et de */
/* Custom CSS les regles .vg-swirl-tile/.vg-center-icon/vg-suck-out/ */
/* vg-burst-in/.vg-cart-grow/.vg-logo-grow (orphelines une fois ce script */
/* retire) -- voir APPLIQUER_LOT_A.md. */
(function () {
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var GROW = 1.15; // "le vetement grossit legerement" (CLAUDE.md section 3)

  // Cache partage /products.json : une seule requete pour tout ce module.
  // Le Body a par ailleurs plusieurs fetch('/products.json') independants
  // (splash, swirl actuel, dots couleur...) deja releves comme source de
  // jank a la section 6 point 1/4 -- a consolider sur window.__vgProducts
  // lors du Lot B, pas fait ici pour rester dans le perimetre de la section 3.
  window.__vgProducts = window.__vgProducts || fetch('/products.json').then(function (r) { return r.json(); }).then(function (data) {
    return Array.isArray(data) ? data : ((data && data.products) || []);
  }).catch(function () { return []; });

  function imagesForCategory(products, slug, excludeUrl) {
    var urls = [];
    for (var i = 0; i < products.length; i++) {
      var cats = products[i].categories || [];
      for (var j = 0; j < cats.length; j++) {
        if (cats[j].permalink === slug) {
          var imgs = products[i].images;
          if (imgs && imgs[0] && imgs[0].url !== excludeUrl) urls.push(imgs[0].url);
          break;
        }
      }
    }
    return urls;
  }

  function otherImagesForProduct(products, slug, excludeUrl) {
    var p = products.filter(function (pr) { return pr.permalink === slug; })[0];
    if (!p || !p.images) return [];
    return p.images.map(function (im) { return im.url; }).filter(function (u) { return u !== excludeUrl; });
  }

  function shuffle(arr) {
    for (var i = arr.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = arr[i]; arr[i] = arr[j]; arr[j] = t;
    }
    return arr;
  }

  // Image nette la plus proche disponible sur un <img> lazysize (evite de
  // partir du placeholder blur-up ?w=20 si data-srcset offre mieux).
  function bestSrc(img) {
    if (!img) return null;
    var cur = img.currentSrc || img.src || '';
    if (cur && cur.indexOf('w=20') === -1) return cur;
    var srcset = img.getAttribute('data-srcset') || img.getAttribute('srcset');
    if (srcset) {
      var entries = srcset.split(',').map(function (s) { return s.trim(); }).filter(Boolean);
      if (entries.length) {
        var last = entries[entries.length - 1].split(/\s+/)[0];
        if (last) return last;
      }
    }
    return cur || null;
  }

  function vgSpawnOrbit(urls, x, y, baseSize) {
    if (reduceMotion || !urls || !urls.length) return;
    // "En attendant le detourage" (CLAUDE.md section 3) : window.__vgCutoutReady
    // sera pose a true une fois les vraies photos produit remplacees par des
    // versions detourees (voir chantier/lot_A/plan_photos_publiques.md) --
    // jusque-la, repli mix-blend-mode:multiply sur fond beige.
    var cutoutReady = window.__vgCutoutReady === true;
    var n = Math.min(6, urls.length);
    for (var i = 0; i < n; i++) {
      (function (i) {
        var tile = document.createElement('img');
        tile.className = 'vg-orbit-tile' + (cutoutReady ? '' : ' vg-orbit-fallback');
        tile.src = urls[i];
        tile.alt = '';
        var size = Math.max(46, Math.round(baseSize * 0.32));
        tile.style.width = size + 'px';
        tile.style.height = size + 'px';
        tile.style.left = x + 'px';
        tile.style.top = y + 'px';
        var angle = (i / n) * Math.PI * 2 + (Math.random() * 0.6 - 0.3);
        var dist = baseSize * 0.9 + Math.random() * baseSize * 0.5;
        tile.style.setProperty('--vg-ox', (Math.cos(angle) * dist).toFixed(0) + 'px');
        tile.style.setProperty('--vg-oy', (Math.sin(angle) * dist).toFixed(0) + 'px');
        tile.style.setProperty('--vg-orot', (180 + Math.random() * 140).toFixed(0) + 'deg');
        tile.style.setProperty('--vg-orbit-dur', (450 + i * 40) + 'ms');
        tile.style.animationDelay = (i * 25) + 'ms';
        document.documentElement.appendChild(tile);
        setTimeout(function () { if (tile.parentNode) tile.remove(); }, 700 + i * 40);
      })(i);
    }
  }

  function vgClearSelection() {
    try { window.getSelection().removeAllRanges(); } catch (e) {}
  }

  function categorySlug(href) { var m = href.match(/\/category\/([^\/?#]+)/); return m ? m[1] : null; }
  function productSlug(href) { var m = href.match(/\/product\/([^\/?#]+)/); return m ? m[1] : null; }

  var prefetchedPages = {};
  document.addEventListener('mouseover', function (e) {
    var link = e.target.closest ? e.target.closest('.product-list-link, .vg-category-tile') : null;
    if (!link) return;
    var href = link.getAttribute('href');
    if (!href || prefetchedPages[href]) return;
    prefetchedPages[href] = true;
    var l = document.createElement('link');
    l.rel = 'prefetch';
    l.href = href;
    document.head.appendChild(l);
  }, true);

  document.addEventListener('click', function (e) {
    var link = e.target.closest ? e.target.closest('.product-list-link, .vg-category-tile') : null;
    if (!link) return;
    var href = link.getAttribute('href');
    if (!href || href.charAt(0) === '#' || link.target === '_blank') return;
    if (window.__vgTransitioning) { e.preventDefault(); return; }

    var isCategory = link.classList.contains('vg-category-tile');
    var iconUrl = null;
    if (isCategory) {
      var bgEl = link.querySelector('.vg-category-tile-img');
      if (bgEl) {
        var bg = getComputedStyle(bgEl).backgroundImage;
        var m = bg && bg.match(/url\(["']?(.*?)["']?\)/);
        iconUrl = m ? m[1] : null;
      }
    } else {
      iconUrl = bestSrc(link.querySelector('img.product-list-image, img'));
    }
    // Pas d'icone trouvee (structure inattendue) -> navigation normale,
    // pas de transition plutot qu'un effet casse.
    if (!iconUrl) return;

    e.preventDefault();
    vgClearSelection();

    var rect = link.getBoundingClientRect();
    var x = rect.left + rect.width / 2;
    var y = rect.top + rect.height / 2;
    var baseSize = Math.max(rect.width, rect.height);
    var w = Math.round(rect.width * GROW);
    var h = Math.round(rect.height * GROW);

    // Le pop + l'aspiration + la navigation partent immediatement (icone
    // connue de facon synchrone) ; les vetements compagnons de l'orbite
    // arrivent au mieux (best-effort) sans jamais retarder la transition
    // elle-meme -- si /products.json n'a pas fini de charger a temps, on a
    // simplement moins/pas de compagnons pour ce clic, jamais un delai.
    window.pageTransition({ icon: iconUrl, href: href, x: x, y: y, w: w, h: h, axis: 'z', persp: 1000 });

    window.__vgProducts.then(function (products) {
      var orbitUrls = isCategory
        ? imagesForCategory(products, categorySlug(href), iconUrl)
        : otherImagesForProduct(products, productSlug(href), iconUrl);
      vgSpawnOrbit(shuffle(orbitUrls.slice()), x, y, baseSize);
    });
  }, true);
})();
