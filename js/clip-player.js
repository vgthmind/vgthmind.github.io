document.addEventListener('DOMContentLoaded', function () {
  document.querySelectorAll('.clip-player').forEach(function (player) {
    var video = player.querySelector('video');
    var tabs = player.querySelectorAll('.clip-tab');
    tabs.forEach(function (tab) {
      tab.addEventListener('click', function () {
        tabs.forEach(function (t) { t.classList.remove('active'); });
        tab.classList.add('active');
        video.src = tab.dataset.src;
        video.play();
      });
    });
  });
});
