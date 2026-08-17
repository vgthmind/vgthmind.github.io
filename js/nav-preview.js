(function () {
  if (!window.matchMedia || !window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  var previews = {
    '#ch-2022': 'assets/navpreview/ch-2022.jpg',
    '#ch-2023': 'assets/navpreview/ch-2023.jpg',
    '#ch-2025': 'assets/navpreview/ch-2025.jpg',
    '#ch-horscollec': 'assets/navpreview/ch-horscollec.jpg',
    '#ch-mesure': 'assets/navpreview/ch-mesure.jpg',
    '#ch-petites': 'assets/navpreview/ch-petites.jpg'
  };

  var links = document.querySelectorAll('.rail-chapters a');
  if (!links.length) return;

  var wrap = document.createElement('div');
  wrap.className = 'nav-preview';
  var img = document.createElement('img');
  img.className = 'nav-preview-strip';
  img.alt = '';
  wrap.appendChild(img);
  document.body.appendChild(wrap);

  var PX_PER_SEC = 26;
  var mouseX = 0, mouseY = 0, visible = false;

  function position() {
    var x = Math.min(mouseX + 28, window.innerWidth - 190);
    var y = Math.max(10, Math.min(mouseY - 120, window.innerHeight - 250));
    wrap.style.transform = 'translate(' + x + 'px,' + y + 'px)';
  }

  document.addEventListener('mousemove', function (e) {
    mouseX = e.clientX;
    mouseY = e.clientY;
    if (visible) position();
  }, { passive: true });

  function startScroll() {
    var displayW = wrap.clientWidth;
    var displayH = wrap.clientHeight;
    var scaledH = img.naturalWidth ? displayW * (img.naturalHeight / img.naturalWidth) : displayH;
    var distance = Math.max(0, scaledH - displayH);
    if (distance < 4) {
      wrap.classList.remove('scrolling');
      img.style.transform = 'translateY(0)';
      return;
    }
    wrap.style.setProperty('--scroll-distance', '-' + distance + 'px');
    wrap.style.setProperty('--scroll-duration', (distance / PX_PER_SEC) + 's');
    wrap.classList.add('scrolling');
  }

  links.forEach(function (a) {
    var src = previews[a.getAttribute('href')];
    if (!src) return;
    a.addEventListener('mouseenter', function () {
      wrap.classList.remove('scrolling');
      img.style.transform = 'translateY(0)';
      if (img.src.indexOf(src) === -1) {
        img.src = src;
      }
      wrap.classList.add('visible');
      visible = true;
      position();
      if (img.complete && img.naturalWidth) {
        startScroll();
      } else {
        img.onload = startScroll;
      }
    });
    a.addEventListener('mouseleave', function () {
      wrap.classList.remove('visible');
      visible = false;
    });
  });
})();
