// mobilenav.js — phones get a home icon, an RSVP pill and a kebab.
//
// The nav had six links plus three pills plus an account icon competing for
// 390px, and every addition this week made something else worse. A drawer ends
// that: the bar keeps only what you need without thinking (home, RSVP), and
// everything else lives one tap away.
//
// RSVP, the note pill and the account icon all stay OUT of the drawer and in
// the bar: they're actions, not destinations, and the three of them plus a home
// icon and the kebab still leave room at 390px. The drawer is navigation only.
//
// The panel is built FROM the existing nav, so adding a link to .sitenav in the
// HTML automatically puts it in the drawer too — no second list to keep in step.
(function () {
  var nav = document.querySelector('.sitenav');
  if (!nav || document.querySelector('.mnav-toggle')) return;


  // ---- collect the real nav links (skip home — it stays in the bar) --------
  var links = [];
  nav.querySelectorAll('a[href]').forEach(function (a) {
    var href = a.getAttribute('href') || '';
    if (/^index\.html$|^\/$/.test(href)) return;          // home lives in the bar
    if (a.hasAttribute('data-rsvp-open')) return;          // RSVP lives in the bar
    if (a.closest('.nav-cta')) return;                     // desktop-only duplicates
    var label = (a.querySelector('.nav-long') || a).textContent.trim();
    if (!label) return;
    links.push({ href: href, label: label, active: a.classList.contains('active') });
  });

  // ---- the bar --------------------------------------------------------------
  var toggle = document.createElement('button');
  toggle.type = 'button';
  toggle.className = 'mnav-toggle';
  toggle.setAttribute('aria-label', 'Menu');
  toggle.setAttribute('aria-expanded', 'false');
  toggle.innerHTML = '<span></span><span></span><span></span>';
  nav.appendChild(toggle);

  // ---- the panel ------------------------------------------------------------
  var panel = document.createElement('div');
  panel.className = 'mnav';
  panel.setAttribute('role', 'dialog');
  panel.setAttribute('aria-modal', 'true');
  panel.setAttribute('aria-label', 'Menu');
  panel.hidden = true;

  var html = '<nav class="mnav-list">';
  links.forEach(function (l) {
    html += '<a href="' + l.href + '"' + (l.active ? ' class="is-here" aria-current="page"' : '') + '>' + l.label + '</a>';
  });
  html += '<button type="button" class="mnav-ou" data-ou-open>over<span class="ou-slash">/</span>under</button>';
  html += '</nav>';
  panel.innerHTML = html;
  document.body.appendChild(panel);

  var veil = document.createElement('div');
  veil.className = 'mnav-veil';
  veil.hidden = true;
  document.body.appendChild(veil);

  function setOpen(on) {
    panel.hidden = !on;
    veil.hidden = !on;
    toggle.classList.toggle('is-open', on);
    toggle.setAttribute('aria-expanded', on ? 'true' : 'false');
    document.body.classList.toggle('mnav-open', on);
    if (on) { try { panel.querySelector('a,button').focus({ preventScroll: true }); } catch (e) {} }
  }
  toggle.addEventListener('click', function () { setOpen(panel.hidden); });
  veil.addEventListener('click', function () { setOpen(false); });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && !panel.hidden) { setOpen(false); toggle.focus(); }
  });
  // anything that opens a drawer of its own should close this one first
  panel.addEventListener('click', function (e) {
    if (e.target.closest('[data-ou-open]')) setOpen(false);
  });
})();
