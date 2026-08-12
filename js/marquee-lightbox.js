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

  function showCurrent() {
    var src = currentList[currentIndex];
    main.src = src;
    bg.src = src;
  }

  function openAt(list, index) {
    currentList = list;
    currentIndex = index;
    showCurrent();
    lightbox.classList.add('open');
    document.body.style.overflow = 'hidden';
  }

  function close() {
    lightbox.classList.remove('open');
    document.body.style.overflow = '';
  }

  function next() {
    currentIndex = (currentIndex + 1) % currentList.length;
    showCurrent();
  }

  function prev() {
    currentIndex = (currentIndex - 1 + currentList.length) % currentList.length;
    showCurrent();
  }

  closeBtn.addEventListener('click', close);
  backdrop.addEventListener('click', close);
  nextBtn.addEventListener('click', next);
  prevBtn.addEventListener('click', prev);

  document.addEventListener('keydown', function (e) {
    if (!lightbox.classList.contains('open')) return;
    if (e.key === 'Escape') close();
    if (e.key === 'ArrowRight') next();
    if (e.key === 'ArrowLeft') prev();
  });

  document.querySelectorAll('.marquee-wrap').forEach(function (wrap) {
    var seen = {};
    var uniqueSrcs = [];
    wrap.querySelectorAll('.marquee-item').forEach(function (btn) {
      var src = btn.dataset.src;
      if (!seen[src]) {
        seen[src] = true;
        uniqueSrcs.push(src);
      }
    });

    wrap.querySelectorAll('.marquee-item').forEach(function (btn) {
      var track = btn.closest('.marquee-track');
      btn.addEventListener('mouseenter', function () { track.classList.add('paused'); });
      btn.addEventListener('mouseleave', function () { track.classList.remove('paused'); });
      btn.addEventListener('click', function () {
        openAt(uniqueSrcs, uniqueSrcs.indexOf(btn.dataset.src));
      });
    });
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initMarqueeLightbox);
} else {
  initMarqueeLightbox();
}
