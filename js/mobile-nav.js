document.addEventListener('DOMContentLoaded', function () {
  var toggle = document.querySelector('.mnav-toggle');
  var panel = document.querySelector('.mnav-panel');
  var backdrop = document.querySelector('.mnav-backdrop');
  if (!toggle || !panel || !backdrop) return;

  function open() {
    toggle.classList.add('open');
    panel.classList.add('open');
    backdrop.classList.add('open');
    toggle.setAttribute('aria-expanded', 'true');
  }
  function close() {
    toggle.classList.remove('open');
    panel.classList.remove('open');
    backdrop.classList.remove('open');
    toggle.setAttribute('aria-expanded', 'false');
  }

  toggle.addEventListener('click', function () {
    if (panel.classList.contains('open')) close(); else open();
  });
  backdrop.addEventListener('click', close);
  panel.querySelectorAll('a').forEach(function (a) {
    a.addEventListener('click', close);
  });
});
