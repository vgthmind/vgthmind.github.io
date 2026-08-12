function initParallax() {
  positionBleeds();

  if ('ResizeObserver' in window) {
    var main = document.querySelector('main');
    if (main) {
      var ro = new ResizeObserver(function () { positionBleeds(); });
      ro.observe(main);
    }
  }
  // Always also run these, regardless of ResizeObserver support: some environments
  // never fire the observer's initial callback, so don't rely on it alone.
  window.addEventListener('load', positionBleeds);
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(positionBleeds);
  }
  [100, 300, 700, 1500, 3000].forEach(function (ms) {
    setTimeout(positionBleeds, ms);
  });

  var layers = document.querySelectorAll('.parallax-layer');
  if (!layers.length) return;

  var ticking = false;

  function update() {
    layers.forEach(function (el) {
      var speed = parseFloat(el.dataset.speed || '0.15');
      var wrap = el.closest('.parallax-wrap');
      var rect = wrap.getBoundingClientRect();
      var center = rect.top + rect.height / 2 - window.innerHeight / 2;
      el.style.transform = 'translateY(' + (center * speed).toFixed(1) + 'px)';
    });
    ticking = false;
  }

  function onScroll() {
    if (!ticking) {
      requestAnimationFrame(update);
      ticking = true;
    }
  }

  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', function () { positionBleeds(); onScroll(); });
  update();
}

// Stretches .bg-bleed elements to span the full width of <main>, breaking out of
// whatever narrower, centered container they're visually nested inside.
// Guards against a zero-width <main> (e.g. mid-layout) so it never locks in a broken state.
function positionBleeds() {
  var main = document.querySelector('main');
  if (!main) return;
  var mainRect = main.getBoundingClientRect();
  if (mainRect.width < 50) return;
  document.querySelectorAll('.bg-bleed').forEach(function (wrap) {
    var parent = wrap.offsetParent;
    if (!parent) return;
    var parentRect = parent.getBoundingClientRect();
    wrap.style.left = (mainRect.left - parentRect.left) + 'px';
    wrap.style.width = mainRect.width + 'px';
  });
}

// Defensive: if this script executes after DOMContentLoaded already fired
// (possible with certain loading/caching setups), run immediately instead
// of registering a listener for an event that will never come again.
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initParallax);
} else {
  initParallax();
}
