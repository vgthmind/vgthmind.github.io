document.addEventListener('DOMContentLoaded', function () {
  document.querySelectorAll('.clip-player').forEach(function (player) {
    var wrap = player.querySelector('.clip-video-wrap');
    var video = player.querySelector('video');
    var tabs = player.querySelectorAll('.clip-tab');

    function clearLoading() { wrap.classList.remove('loading'); }
    video.addEventListener('playing', clearLoading);
    video.addEventListener('error', clearLoading);

    tabs.forEach(function (tab) {
      tab.addEventListener('click', function () {
        tabs.forEach(function (t) { t.classList.remove('active'); });
        tab.classList.add('active');
        wrap.classList.add('loading');
        video.src = tab.dataset.src;
        video.play();
      });
    });
  });
});
