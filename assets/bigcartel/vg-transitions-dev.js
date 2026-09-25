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

    var overlay = document.createElement('div');
    overlay.id = 'vg-transition-out';
    var img = document.createElement('img');
    img.src = opts.icon;
    img.alt = '';
    img.style.width = w + 'px';
    img.style.height = h + 'px';
    img.style.setProperty('--vg-persp', persp + 'px');
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
      document.body.classList.add('vg-aspirate');
      var elapsed = Date.now() - popStart;
      var liveAngle = (elapsed * VG_SPEED / 1000) % 360;
      var payload = { ts: Date.now(), href: href, icon: opts.icon, angle: liveAngle, speed: VG_SPEED, w: w, h: h, axis: axis, persp: persp };
      try { sessionStorage.setItem('vg-transition', JSON.stringify(payload)); } catch (e) {}
      vgLog('flag written', payload);
      setTimeout(function () {
        vgLog('navigating to', href);
        window.location.href = href;
      }, ASPIRATE_MS);
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
