(function () {
  if (!window.matchMedia || !window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  var previews = {
    '#ch-2022': 'assets/ch1/t1.jpg',
    '#ch-2023': 'assets/vgthm23/t1.jpg',
    '#ch-2025': 'assets/vgtape2/tenue1.jpg',
    '#ch-horscollec': 'assets/horscollection/collab1.jpg',
    '#ch-mesure': 'assets/mesure/veste1.jpg',
    '#ch-petites': 'assets/petites/bonnet.jpg'
  };

  var links = document.querySelectorAll('.rail-chapters a');
  if (!links.length) return;

  var img = document.createElement('img');
  img.className = 'nav-preview';
  img.alt = '';
  document.body.appendChild(img);

  var mouseX = 0, mouseY = 0, visible = false;

  function position() {
    var x = Math.min(mouseX + 28, window.innerWidth - 190);
    var y = Math.max(10, Math.min(mouseY - 120, window.innerHeight - 250));
    img.style.transform = 'translate(' + x + 'px,' + y + 'px)';
  }

  document.addEventListener('mousemove', function (e) {
    mouseX = e.clientX;
    mouseY = e.clientY;
    if (visible) position();
  }, { passive: true });

  links.forEach(function (a) {
    var src = previews[a.getAttribute('href')];
    if (!src) return;
    a.addEventListener('mouseenter', function () {
      img.src = src;
      img.classList.add('visible');
      visible = true;
      position();
    });
    a.addEventListener('mouseleave', function () {
      img.classList.remove('visible');
      visible = false;
    });
  });
})();
