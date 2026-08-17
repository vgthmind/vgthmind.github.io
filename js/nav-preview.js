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

  // The horizontal filmstrip mirrors each chapter's own marquee/carousel content.
  var rows = {
    '#ch-2022': ['assets/ch1b/dinan1.jpg', 'assets/ch1b/paris1.jpg', 'assets/ch1b/clipstill.jpg', 'assets/ch1b/paris3.jpg', 'assets/ch1b/dinan2.jpg', 'assets/ch1b/paris2.jpg', 'assets/ch1b/lineup.jpg', 'assets/ch1b/paris_group.jpg'],
    '#ch-2023': ['assets/vgthm23/greenscreen.jpg', 'assets/vgthm23/pv1.jpg', 'assets/vgthm23/pv2.jpg', 'assets/vgthm23/pv3.jpg', 'assets/vgthm23/pv4.jpg', 'assets/vgthm23/odm1.jpg', 'assets/vgthm23/chap2part2_1.jpg', 'assets/vgthm23/vgth_graphic.jpg'],
    '#ch-2025': ['assets/vgtape/arme1.png', 'assets/vgtape/cd_cover.png', 'assets/vgtape/sac_a_dos.png', 'assets/vgtape/cd_disc.png', 'assets/vgtape/arme2.png', 'assets/vgtape/cd_tracklist.png', 'assets/vgtape/arme3.png', 'assets/vgtape/cd_pochettes.png'],
    '#ch-horscollec': ['assets/aerovrac/piece1.png', 'assets/aerovrac/piece4.png', 'assets/aerovrac/piece7.png', 'assets/aerovrac/piece11.png', 'assets/aerovrac/piece15.png', 'assets/aerovrac/piece18.png', 'assets/aerovrac/piece5.png', 'assets/aerovrac/piece9.png'],
    '#ch-mesure': ['assets/mesure/veste2.jpg', 'assets/mesure/veste3.jpg', 'assets/mesure/veste4.jpg', 'assets/mesure/01.jpg', 'assets/mesure/03.jpg'],
    '#ch-petites': ['assets/petites/sacoche1.png', 'assets/petites/sacoche2.png', 'assets/petites/sacoche3.png', 'assets/petites/sacoche4.png', 'assets/petites/sacoche5.png']
  };

  var links = document.querySelectorAll('.rail-chapters a');
  if (!links.length) return;

  // Warm the browser cache for every strip up front, so the first hover on
  // each chapter doesn't wait on a network fetch before it can start scrolling.
  Object.keys(previews).forEach(function (k) { new Image().src = previews[k]; });
  Object.keys(rows).forEach(function (k) { rows[k].forEach(function (src) { new Image().src = src; }); });

  var wrap = document.createElement('div');
  wrap.className = 'nav-preview';
  var scrollZone = document.createElement('div');
  scrollZone.className = 'nav-preview-scroll';
  var img = document.createElement('img');
  img.className = 'nav-preview-strip';
  img.alt = '';
  scrollZone.appendChild(img);
  var row = document.createElement('div');
  row.className = 'nav-preview-row';
  var track = document.createElement('div');
  track.className = 'nav-preview-row-track';
  row.appendChild(track);
  wrap.appendChild(scrollZone);
  wrap.appendChild(row);
  document.body.appendChild(wrap);

  var SCROLL_DURATION = 7; // seconds for a full vertical pass, regardless of chapter length
  var mouseX = 0, mouseY = 0, visible = false;

  function position() {
    var x = Math.min(mouseX + 28, window.innerWidth - 190);
    var y = Math.max(10, Math.min(mouseY - 120, window.innerHeight - wrap.offsetHeight - 20));
    wrap.style.transform = 'translate(' + x + 'px,' + y + 'px)';
  }

  document.addEventListener('mousemove', function (e) {
    mouseX = e.clientX;
    mouseY = e.clientY;
    if (visible) position();
  }, { passive: true });

  function startScroll() {
    var displayW = scrollZone.clientWidth;
    var displayH = scrollZone.clientHeight;
    var scaledH = img.naturalWidth ? displayW * (img.naturalHeight / img.naturalWidth) : displayH;
    var distance = Math.max(0, scaledH - displayH);
    if (distance < 4) {
      wrap.classList.remove('scrolling');
      img.style.transform = 'translateY(0)';
      return;
    }
    wrap.style.setProperty('--scroll-distance', '-' + distance + 'px');
    wrap.style.setProperty('--scroll-duration', SCROLL_DURATION + 's');
    wrap.classList.add('scrolling');
  }

  function buildRow(list) {
    track.innerHTML = '';
    var doubled = list.concat(list);
    doubled.forEach(function (src) {
      var im = document.createElement('img');
      im.src = src;
      im.alt = '';
      track.appendChild(im);
    });
  }

  links.forEach(function (a) {
    var href = a.getAttribute('href');
    var src = previews[href];
    if (!src) return;
    a.addEventListener('mouseenter', function () {
      wrap.classList.remove('scrolling');
      img.style.transform = 'translateY(0)';
      if (img.src.indexOf(src) === -1) img.src = src;

      var rowList = rows[href];
      row.style.display = rowList ? '' : 'none';
      if (rowList) buildRow(rowList);

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
