document.addEventListener('DOMContentLoaded', function () {

  function enableDragScroll(track) {
    var isDown = false, startX = 0, startScroll = 0, moved = false;

    track.querySelectorAll('img').forEach(function (img) { img.draggable = false; });

    track.addEventListener('pointerdown', function (e) {
      if (e.target.closest('button')) return;
      isDown = true;
      moved = false;
      startX = e.clientX;
      startScroll = track.scrollLeft;
      track.classList.add('grabbing');
      try { track.setPointerCapture(e.pointerId); } catch (err) {}
    });

    track.addEventListener('pointermove', function (e) {
      if (!isDown) return;
      var dx = e.clientX - startX;
      if (Math.abs(dx) > 8) moved = true;
      track.scrollLeft = startScroll - dx;
    });

    function release(e) {
      isDown = false;
      track.classList.remove('grabbing');
      // setPointerCapture (needed so a drag keeps tracking outside the track's
      // bounds) also retargets the native click that follows pointerup to the
      // track itself, so it never reaches the tapped image's own click
      // listener. For a genuine (non-drag) tap, fire a click on the actual
      // element under the pointer so per-image listeners (lightbox open) work.
      if (e && e.type === 'pointerup' && !moved) {
        var real = document.elementFromPoint(e.clientX, e.clientY);
        if (real && !real.closest('button')) {
          real.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
        }
      }
    }
    track.addEventListener('pointerup', release);
    track.addEventListener('pointercancel', release);
    track.addEventListener('pointerleave', release);
    track.addEventListener('click', function (e) {
      if (moved) { e.preventDefault(); e.stopPropagation(); }
    }, true);
  }

  document.querySelectorAll('.carousel-track').forEach(enableDragScroll);

  document.querySelectorAll('.carousel').forEach(function (carousel) {
    var track = carousel.querySelector('.carousel-track');
    var prev = carousel.querySelector('.carousel-prev');
    var next = carousel.querySelector('.carousel-next');
    if (!track) return;

    function step(dir) {
      var item = track.querySelector('.carousel-item');
      if (!item) return;
      var gap = parseFloat(getComputedStyle(track).gap) || 0;
      var amount = item.getBoundingClientRect().width + gap;
      track.scrollBy({ left: dir * amount, behavior: 'smooth' });
    }

    if (prev) prev.addEventListener('click', function () { step(-1); });
    if (next) next.addEventListener('click', function () { step(1); });
  });

  document.querySelectorAll('.carousel-frame').forEach(function (frame) {
    var track = frame.querySelector('.carousel-track');
    var items = frame.querySelectorAll('.carousel-item');
    var dotsWrap = frame.querySelector('.carousel-dots');
    if (!track || !items.length) return;

    var dots = [];
    if (dotsWrap) {
      items.forEach(function (_, i) {
        var dot = document.createElement('button');
        dot.className = 'carousel-dot' + (i === 0 ? ' active' : '');
        dot.setAttribute('aria-label', 'Photo ' + (i + 1));
        dot.addEventListener('click', function () { goTo(i); });
        dotsWrap.appendChild(dot);
        dots.push(dot);
      });
    }

    function goTo(i) {
      track.scrollTo({ left: track.clientWidth * i, behavior: 'smooth' });
    }
    function step(dir) {
      var current = Math.round(track.scrollLeft / track.clientWidth);
      goTo(Math.max(0, Math.min(items.length - 1, current + dir)));
    }

    var prev = frame.querySelector('.carousel-prev');
    var next = frame.querySelector('.carousel-next');
    if (prev) prev.addEventListener('click', function () { step(-1); });
    if (next) next.addEventListener('click', function () { step(1); });

    var scrollTimer;
    track.addEventListener('scroll', function () {
      clearTimeout(scrollTimer);
      scrollTimer = setTimeout(function () {
        var current = Math.round(track.scrollLeft / track.clientWidth);
        dots.forEach(function (d, i) { d.classList.toggle('active', i === current); });
      }, 80);
    });
  });
});
