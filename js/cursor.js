(function () {
  if (!window.matchMedia || !window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  document.documentElement.classList.add('has-custom-cursor');

  var dot = document.createElement('div');
  dot.className = 'cursor-dot';
  var ring = document.createElement('div');
  ring.className = 'cursor-ring';
  var logo = document.createElement('img');
  logo.className = 'cursor-ring-logo';
  logo.src = 'assets/brand/logo.png';
  logo.alt = '';
  ring.appendChild(logo);
  document.body.appendChild(dot);
  document.body.appendChild(ring);

  var mouseX = -100, mouseY = -100, ringX = -100, ringY = -100, started = false;

  window.addEventListener('mousemove', function (e) {
    mouseX = e.clientX;
    mouseY = e.clientY;
    dot.style.transform = 'translate(' + mouseX + 'px,' + mouseY + 'px) translate(-50%,-50%)';
    if (!started) {
      started = true;
      ringX = mouseX;
      ringY = mouseY;
      document.documentElement.classList.add('cursor-active');
    }
  }, { passive: true });

  function raf() {
    ringX += (mouseX - ringX) * 0.18;
    ringY += (mouseY - ringY) * 0.18;
    ring.style.transform = 'translate(' + ringX + 'px,' + ringY + 'px) translate(-50%,-50%)';
    requestAnimationFrame(raf);
  }
  requestAnimationFrame(raf);

  var hoverSelector = 'a, button, .zoomable-photo, .marquee-item, .carousel-item, .carousel-btn, .carousel-arrow, .carousel-dot, .clip-tab, .mnav-toggle';

  // Chapter nav links get their own photo preview (js/nav-preview.js) instead —
  // showing the logo stamp there too would compete with it for attention.
  var navLinksSelector = '.rail-chapters a, .mnav-panel a';

  document.addEventListener('mouseover', function (e) {
    if (e.target.closest(navLinksSelector)) return;
    if (e.target.closest(hoverSelector)) {
      dot.classList.add('hover');
      ring.classList.add('hover');
    }
  });
  document.addEventListener('mouseout', function (e) {
    if (e.target.closest(navLinksSelector)) return;
    if (e.target.closest(hoverSelector)) {
      dot.classList.remove('hover');
      ring.classList.remove('hover');
    }
  });

  document.documentElement.addEventListener('mouseleave', function () {
    document.documentElement.classList.remove('cursor-active');
  });
  document.documentElement.addEventListener('mouseenter', function () {
    document.documentElement.classList.add('cursor-active');
  });
})();
