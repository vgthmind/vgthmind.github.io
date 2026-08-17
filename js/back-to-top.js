(function () {
  var btn = document.createElement('button');
  btn.className = 'back-to-top';
  btn.setAttribute('aria-label', 'Retour en haut');
  btn.textContent = '↑';
  document.body.appendChild(btn);

  var ticking = false;
  function update() {
    btn.classList.toggle('visible', window.scrollY > window.innerHeight * 0.8);
    ticking = false;
  }
  window.addEventListener('scroll', function () {
    if (!ticking) {
      requestAnimationFrame(update);
      ticking = true;
    }
  }, { passive: true });

  btn.addEventListener('click', function () {
    var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    window.scrollTo({ top: 0, behavior: reduceMotion ? 'auto' : 'smooth' });
  });

  update();
})();
