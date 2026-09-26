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
    img.style.animationName = 'vg-out-pop, ' + (axis === 'y' ? 'vg-out-spin-y' : 'vg-out-spin-z');
    img.style.animationDuration = popMs + 'ms, ' + period + 's';
    img.style.animationTimingFunction = 'cubic-bezier(.34,1.56,.64,1), linear';
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

/* === SECTION 3 : clic produit/categorie, vraie orbite === */
/* Meme mecanique que pageTransition() (section 2) : l'icone qui tournoie */
/* est ici le vetement clique lui-meme (pas une icone generique), et */
/* l'origine (x, y) est celle de la vignette cliquee au lieu du centre de */
/* l'ecran -- transporte via le flag sessionStorage existant (pageTransition */
/* accepte x/y, voir plus haut) pour que l'arrivee sur la page suivante */
/* reprenne exactement au meme point. */
/* D'autres vetements (autres produits de la categorie pour un clic */
/* categorie, autres photos du produit pour un clic produit) tournent en */
/* vraie orbite circulaire autour du vetement central (au moins un tour */
/* complet, sens et vitesse reguliers, via Web Animations API sur un */
/* wrapper de taille nulle positionne au point clique -- faire tourner ce */
/* wrapper fait mecaniquement orbiter l'enfant positionne a "radius" de */
/* lui), puis sont aspires avec la page vers ce meme point (le rayon */
/* effectif retombe a ~0 en fin d'animation via un scale du wrapper vers 0, */
/* exactement centre sur le point clique). Duree = celle du depart de */
/* pageTransition() (popMs+aspirateMs, ici allongee vs la section 2 pour */
/* laisser le temps a un tour complet), total transition ~1.2-1.6s comme le */
/* header une fois l'arrivee comptee. */
/* [2026-09-26, Jules] Les vraies photos produit hebergees par BigCartel */
/* sont deja detourees (memes fichiers que la reference locale) -- sauf 12 */
/* photos precises (NON_CUTOUT ci-dessous), jamais utilisees en orbite. Pas */
/* de repli mix-blend-mode necessaire pour les autres. Miniatures demandees */
/* en taille reduite (w/h) plutot que la pleine resolution. */
/* REMPLACE ENTIEREMENT l'ancien systeme "swirl" (.vg-swirl-tile / */
/* .vg-center-icon / body.vg-suck-out) : a l'application du lot, supprimer */
/* du Body le script correspondant (spawnSwirl) et de Custom CSS les regles */
/* devenues orphelines -- voir APPLIQUER_LOT_A.md. */
(function () {
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var GROW = 1.15; // "le vetement grossit legerement" (CLAUDE.md section 3)
  var SECTION3_POP_MS = 200;
  var SECTION3_ASPIRATE_MS = 450; // depart total 650ms ; mesure : total ~1.5-1.6s jusqu'a la fin de l'anim d'arrivee (voir AUTOVERIF.md)
  var ORBIT_MS = SECTION3_POP_MS + SECTION3_ASPIRATE_MS;

  // Photos hebergees par BigCartel connues comme non detourees (fond non
  // transparent) parmi les vraies photos produit -- signalees par Jules le
  // 2026-09-26 (memes fichiers qu'en reference locale, chantier/assets-photos/
  // dans le depot prive). Jamais utilisees pour les compagnons en orbite.
  // Index 0-based dans l'ordre reel de products.json (verifie identique).
  // Exception : la pochette VGTAPE (cd-vgtape) est carree par nature, pas
  // de detourage necessaire, jamais dans cette liste.
  var NON_CUTOUT = {
    'custom-hoodie': [2, 3],
    'ja_0001': [2, 3, 4],
    'pantalon-denim-bleu': [3, 4],
    'sacoche': [3, 4],
    'sma_0001': [2, 3, 4]
  };

  // Cache partage /products.json : une seule requete pour tout ce module.
  // Le Body a par ailleurs plusieurs fetch('/products.json') independants
  // (splash, swirl actuel, dots couleur...) deja releves comme source de
  // jank a la section 6 point 1/4 -- a consolider sur window.__vgProducts
  // lors du Lot B, pas fait ici pour rester dans le perimetre de la section 3.
  window.__vgProducts = window.__vgProducts || fetch('/products.json').then(function (r) { return r.json(); }).then(function (data) {
    return Array.isArray(data) ? data : ((data && data.products) || []);
  }).catch(function () { return []; });

  function cutoutUrls(product) {
    var bad = NON_CUTOUT[product.permalink] || [];
    var out = [];
    (product.images || []).forEach(function (im, i) {
      if (bad.indexOf(i) === -1 && im && im.url) out.push(im.url);
    });
    return out;
  }

  // Compare par host+chemin (sans la query ?w=&h=...) apres resolution en
  // URL absolue : l'icone cliquee vient de bestSrc() (une variante srcset
  // precise, ex. ?w=320, et toujours resolue en absolu par le navigateur)
  // alors que products.json donne l'URL "de base" (ex. ?w=1000, parfois
  // relative en test local) -- une comparaison de chaine stricte ne
  // matcherait jamais et laisserait passer un doublon du vetement clique
  // parmi les compagnons.
  function baseUrl(u) {
    try {
      var p = new URL(u, location.href);
      return p.host + p.pathname;
    } catch (e) {
      return (u || '').split('?')[0];
    }
  }

  function imagesForCategory(products, slug, excludeUrl) {
    var urls = [];
    var excludeBase = baseUrl(excludeUrl);
    for (var i = 0; i < products.length; i++) {
      var cats = products[i].categories || [];
      for (var j = 0; j < cats.length; j++) {
        if (cats[j].permalink === slug) {
          var imgs = cutoutUrls(products[i]);
          if (imgs[0] && baseUrl(imgs[0]) !== excludeBase) urls.push(imgs[0]);
          break;
        }
      }
    }
    return urls;
  }

  function otherImagesForProduct(products, slug, excludeUrl) {
    var p = products.filter(function (pr) { return pr.permalink === slug; })[0];
    if (!p) return [];
    var excludeBase = baseUrl(excludeUrl);
    return cutoutUrls(p).filter(function (u) { return baseUrl(u) !== excludeBase; });
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

  // Redimensionne une URL image BigCartel (?...&w=&h=...) a une taille plus
  // adaptee aux miniatures en orbite (demande de Jules : "taille adaptee").
  function resizeUrl(url, size) {
    try {
      var u = new URL(url, location.href);
      if (u.searchParams.has('w')) u.searchParams.set('w', size);
      if (u.searchParams.has('h')) u.searchParams.set('h', size);
      return u.toString();
    } catch (e) { return url; }
  }

  // Vraie orbite : un wrapper de taille nulle place au point clique tourne
  // (Web Animations API, vitesse lineaire = reguliere) ; l'image, positionnee
  // a "radius" de ce wrapper, decrit donc un vrai cercle autour du point
  // clique en tournant avec lui. Le scale du wrapper (1 -> ~0.05 en fin
  // d'animation) ramene le rayon effectif vers 0 exactement sur ce point :
  // c'est l'aspiration avec la page. La rotation propre de l'image (2e
  // animation, meme axe/perspective que le vetement central) donne la
  // "legere perspective coherente" demandee.
  function vgSpawnOrbit(urls, x, y, baseSize, axis, persp) {
    if (reduceMotion || !urls || !urls.length) return;
    var n = Math.min(6, urls.length);
    var dir = 1;
    for (var i = 0; i < n; i++) {
      (function (i) {
        var wrap = document.createElement('div');
        wrap.className = 'vg-orbit-wrap';
        wrap.style.left = x + 'px';
        wrap.style.top = y + 'px';

        var tile = document.createElement('img');
        tile.className = 'vg-orbit-tile';
        tile.src = resizeUrl(urls[i], 240);
        tile.alt = '';
        var size = Math.max(40, Math.round(baseSize * 0.32));
        var radius = baseSize * (0.85 + (i % 3) * 0.18 + Math.random() * 0.08);
        tile.style.width = size + 'px';
        tile.style.height = size + 'px';
        tile.style.left = radius + 'px';
        wrap.appendChild(tile);
        document.documentElement.appendChild(wrap);

        var startAngle = (i / n) * 360 + (Math.random() * 16 - 8);
        var sweep = dir * (368 + Math.random() * 24); // "au moins un tour complet"
        var mid1 = startAngle + sweep * 0.12;
        var mid2 = startAngle + sweep * 0.85;
        var endAngle = startAngle + sweep;

        if (wrap.animate) {
          wrap.animate([
            { transform: 'rotate(' + startAngle + 'deg) scale(0.3)', opacity: 0, offset: 0 },
            { transform: 'rotate(' + mid1 + 'deg) scale(1)', opacity: 1, offset: 0.1 },
            { transform: 'rotate(' + mid2 + 'deg) scale(1)', opacity: 1, offset: 0.85 },
            { transform: 'rotate(' + endAngle + 'deg) scale(0.05)', opacity: 0, offset: 1 }
          ], { duration: ORBIT_MS, easing: 'linear', fill: 'forwards' });

          tile.animate([
            { transform: 'perspective(' + persp + 'px) rotate' + (axis === 'y' ? 'Y' : 'Z') + '(0deg) translateY(-50%)' },
            { transform: 'perspective(' + persp + 'px) rotate' + (axis === 'y' ? 'Y' : 'Z') + '(' + (dir * 130) + 'deg) translateY(-50%)' }
          ], { duration: ORBIT_MS, easing: 'linear', fill: 'forwards' });
        }

        setTimeout(function () { if (wrap.parentNode) wrap.remove(); }, ORBIT_MS + 60);
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

    // Les compagnons doivent etre pretes AVANT le pop pour demarrer leur
    // orbite en meme temps que l'icone centrale (visibles pendant toute
    // l'aspiration, brief CLAUDE.md) -- on attend donc la resolution de
    // /products.json avant d'appeler pageTransition(). window.__vgProducts
    // est lance des le chargement du script, donc deja resolu au moment du
    // clic dans la quasi-totalite des cas (microtask, pas de delai percu) ;
    // si jamais il ne l'est pas encore, la transition demarre simplement
    // des que pret plutot que sans compagnons.
    window.__vgProducts.then(function (products) {
      var orbitUrls = isCategory
        ? imagesForCategory(products, categorySlug(href), iconUrl)
        : otherImagesForProduct(products, productSlug(href), iconUrl);
      orbitUrls = shuffle(orbitUrls.slice());

      window.pageTransition({
        icon: iconUrl, href: href, x: x, y: y, w: w, h: h, axis: 'z', persp: 1000,
        popMs: SECTION3_POP_MS, aspirateMs: SECTION3_ASPIRATE_MS,
        onPop: function () { vgSpawnOrbit(orbitUrls, x, y, baseSize, 'z', 1000); }
      });
    });
  }, true);
})();
