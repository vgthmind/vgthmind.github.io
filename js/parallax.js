document.addEventListener('DOMContentLoaded', function () {
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
  window.addEventListener('resize', onScroll);
  update();
});
