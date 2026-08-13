function initMarqueeLightbox() {
  var lightbox = document.getElementById('lightbox');
  if (!lightbox) return;

  var bg = lightbox.querySelector('.lightbox-bg-blur');
  var main = lightbox.querySelector('.lightbox-main');
  var closeBtn = lightbox.querySelector('.lightbox-close');
  var prevBtn = lightbox.querySelector('.lightbox-prev');
  var nextBtn = lightbox.querySelector('.lightbox-next');
  var backdrop = lightbox.querySelector('.lightbox-backdrop');

  var currentList = [];
  var currentIndex = 0;
  var currentTrack = null;
  var closeTimer = null;
  var pinned = false; // true once opened by click/tap: only closes via explicit close

  function isCutout(item) {
    return item.contain && /\.png($|\?)/i.test(item.src);
  }

  function showCurrent() {
    var item = currentList[currentIndex];
    main.src = item.src;
    bg.src = item.src;
    lightbox.classList.toggle('cutout-mode', isCutout(item));
  }

  function open(list, index, track) {
    clearTimeout(closeTimer);
    currentList = list;
    currentIndex = index;
    currentTrack = track;
    showCurrent();
    lightbox.classList.add('open');
    document.body.style.overflow = 'hidden';
    if (track) track.classList.add('paused');
  }

  function close() {
    clearTimeout(closeTimer);
    lightbox.classList.remove('open');
    document.body.style.overflow = '';
    if (currentTrack) currentTrack.classList.remove('paused');
    currentTrack = null;
    pinned = false;
  }

  function scheduleClose() {
    if (pinned) return;
    clearTimeout(closeTimer);
    closeTimer = setTimeout(close, 180);
  }

  function cancelScheduledClose() {
    clearTimeout(closeTimer);
  }

  function next() {
    currentIndex = (currentIndex + 1) % currentList.length;
    showCurrent();
  }

  function prev() {
    currentIndex = (currentIndex - 1 + currentList.length) % currentList.length;
    showCurrent();
  }

  function indexOfSrc(list, src) {
    for (var i = 0; i < list.length; i++) {
      if (list[i].src === src) return i;
    }
    return -1;
  }

  closeBtn.addEventListener('click', close);
  backdrop.addEventListener('click', close);
  nextBtn.addEventListener('click', next);
  prevBtn.addEventListener('click', prev);
  lightbox.addEventListener('mouseenter', cancelScheduledClose);
  lightbox.addEventListener('mouseleave', scheduleClose);

  document.addEventListener('keydown', function (e) {
    if (!lightbox.classList.contains('open')) return;
    if (e.key === 'Escape') close();
    if (e.key === 'ArrowRight') next();
    if (e.key === 'ArrowLeft') prev();
  });

  var canHover = window.matchMedia && window.matchMedia('(hover: hover)').matches;

  document.querySelectorAll('.marquee-wrap').forEach(function (wrap) {
    var seen = {};
    var uniqueItems = [];
    wrap.querySelectorAll('.marquee-item').forEach(function (btn) {
      var src = btn.dataset.src;
      if (!seen[src]) {
        seen[src] = true;
        uniqueItems.push({ src: src, contain: btn.classList.contains('contain') });
      }
    });

    wrap.querySelectorAll('.marquee-item').forEach(function (btn) {
      var track = btn.closest('.marquee-track');

      if (canHover) {
        btn.addEventListener('mouseenter', function () {
          pinned = false;
          open(uniqueItems, indexOfSrc(uniqueItems, btn.dataset.src), track);
        });
        btn.addEventListener('mouseleave', scheduleClose);
      }

      btn.addEventListener('click', function () {
        open(uniqueItems, indexOfSrc(uniqueItems, btn.dataset.src), track);
        pinned = true;
      });
    });
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initMarqueeLightbox);
} else {
  initMarqueeLightbox();
}
