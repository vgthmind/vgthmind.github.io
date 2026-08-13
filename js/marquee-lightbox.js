function initMarqueeLightbox() {
  var lightbox = document.getElementById('lightbox');
  if (!lightbox) return;

  var stage = lightbox.querySelector('.lightbox-stage');
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
  var openTimer = null;
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
    clearTimeout(openTimer);
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
    clearTimeout(openTimer);
    lightbox.classList.remove('open');
    document.body.style.overflow = '';
    if (currentTrack) currentTrack.classList.remove('paused');
    currentTrack = null;
    pinned = false;
  }

  function scheduleOpen(list, index, track) {
    clearTimeout(openTimer);
    openTimer = setTimeout(function () {
      open(list, index, track);
    }, 260);
  }

  function cancelScheduledOpen() {
    clearTimeout(openTimer);
  }

  function scheduleClose() {
    cancelScheduledOpen();
    if (pinned) return;
    clearTimeout(closeTimer);
    closeTimer = setTimeout(close, 160);
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
  // Hover-tracking is scoped to the stage (image + arrows), not the full-screen
  // lightbox wrapper — otherwise "leaving via mouse" would require leaving the
  // whole browser window instead of just moving off the photo.
  stage.addEventListener('mouseenter', cancelScheduledClose);
  stage.addEventListener('mouseleave', scheduleClose);

  document.addEventListener('keydown', function (e) {
    if (!lightbox.classList.contains('open')) return;
    if (e.key === 'Escape') close();
    if (e.key === 'ArrowRight') next();
    if (e.key === 'ArrowLeft') prev();
  });

  var canHover = window.matchMedia && window.matchMedia('(hover: hover)').matches;

  // Wires a group of trigger elements to the lightbox, sharing one prev/next list
  // built from all of them (deduped by src). getSrc/getContain read each trigger;
  // getTrack (optional) resolves the marquee-track to pause while that trigger is open.
  // hoverEnabled controls whether desktop hover-intent opens it too (vs. click/tap only).
  function wireGroup(triggers, getSrc, getContain, getTrack, hoverEnabled) {
    var seen = {};
    var uniqueItems = [];
    triggers.forEach(function (el) {
      var src = getSrc(el);
      if (!seen[src]) {
        seen[src] = true;
        uniqueItems.push({ src: src, contain: getContain(el) });
      }
    });

    triggers.forEach(function (el) {
      var track = getTrack ? getTrack(el) : null;

      if (canHover && hoverEnabled) {
        el.addEventListener('mouseenter', function () {
          pinned = false;
          scheduleOpen(uniqueItems, indexOfSrc(uniqueItems, getSrc(el)), track);
        });
        el.addEventListener('mouseleave', scheduleClose);
      }

      el.addEventListener('click', function () {
        cancelScheduledOpen();
        open(uniqueItems, indexOfSrc(uniqueItems, getSrc(el)), track);
        pinned = true;
      });
    });
  }

  var byDataSrc = function (el) { return el.dataset.src; };
  var byContainClass = function (el) { return el.classList.contains('contain'); };

  document.querySelectorAll('.marquee-wrap').forEach(function (wrap) {
    var triggers = wrap.querySelectorAll('.marquee-item');
    wireGroup(triggers, byDataSrc, byContainClass, function (el) { return el.closest('.marquee-track'); }, true);
  });

  // Every photo in a content grid: click (and hover on desktop) to zoom in,
  // with prev/next cycling through the other photos of that same grid.
  document.querySelectorAll('.grid').forEach(function (grid) {
    var imgs = grid.querySelectorAll(':scope > figure > img');
    if (!imgs.length) return;
    imgs.forEach(function (img) { img.classList.add('zoomable-photo'); });
    wireGroup(imgs, function (im) { return im.getAttribute('src'); }, function () { return false; }, null, true);
  });

  // Sacoches (and any future single-frame product carousel): click to zoom,
  // cycling through that carousel's own items.
  document.querySelectorAll('.carousel-frame').forEach(function (frame) {
    var imgs = frame.querySelectorAll('.carousel-item img');
    if (!imgs.length) return;
    wireGroup(imgs, function (im) { return im.getAttribute('src'); }, function (im) { return im.closest('.carousel-item').classList.contains('contain'); }, null, false);
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initMarqueeLightbox);
} else {
  initMarqueeLightbox();
}
