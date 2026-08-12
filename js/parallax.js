document.addEventListener('DOMContentLoaded', function () {
  positionBleeds();

  if ('ResizeObserver' in window) {
    var main = document.querySelector('main');
    if (main) {
      var ro = new ResizeObserver(function () { positionBleeds(); });
      ro.observe(main);
    }
  } else {
    // Fallback for browsers without ResizeObserver
    window.addEventListener('load', positionBleeds);
    setTimeout(positionBleeds, 300);
    setTimeout(positionBleeds, 1000);
  }

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
});

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
