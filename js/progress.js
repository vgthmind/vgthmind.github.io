(function () {
  var bar = document.createElement('div');
  bar.className = 'progress-bar';
  document.body.appendChild(bar);

  var ticking = false;
  function update() {
    var scrollTop = window.scrollY || document.documentElement.scrollTop;
    var height = document.documentElement.scrollHeight - window.innerHeight;
    var pct = height > 0 ? Math.min(100, Math.max(0, (scrollTop / height) * 100)) : 0;
    bar.style.width = pct + '%';
    ticking = false;
  }

  window.addEventListener('scroll', function () {
    if (!ticking) {
      requestAnimationFrame(update);
      ticking = true;
    }
  }, { passive: true });
  window.addEventListener('resize', update);
  update();
})();
