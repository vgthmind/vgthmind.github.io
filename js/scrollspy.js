document.addEventListener('DOMContentLoaded', function () {
  if (!('IntersectionObserver' in window)) return;

  var sections = [].slice.call(document.querySelectorAll('main section[id], footer[id]'));
  var navLinks = [].slice.call(document.querySelectorAll('.rail-chapters a, .mnav-panel a'));
  if (!sections.length || !navLinks.length) return;

  var linksByHash = {};
  navLinks.forEach(function (a) {
    var hash = a.getAttribute('href');
    if (!linksByHash[hash]) linksByHash[hash] = [];
    linksByHash[hash].push(a);
  });

  function setActive(hash) {
    if (!linksByHash[hash]) return;
    navLinks.forEach(function (a) { a.classList.remove('active'); });
    linksByHash[hash].forEach(function (a) { a.classList.add('active'); });
  }

  // Trigger band is a thin horizontal strip a bit above viewport center —
  // whichever section is crossing it is "the one you're reading".
  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (entry.isIntersecting) setActive('#' + entry.target.id);
    });
  }, { rootMargin: '-40% 0px -55% 0px', threshold: 0 });

  sections.forEach(function (s) { io.observe(s); });
});
