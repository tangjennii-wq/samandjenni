// mobilenav.js — phones get a kebab and a full-screen menu. The crest's own
// wordmark is the home link, so there is no separate home icon.
//
// The nav had six links plus three pills plus an account icon competing for
// 390px, and every addition this week made something else worse. A drawer ends
// that: the bar keeps only Home and More, and every destination/action lives
// in one predictable, compact popover.
//
// The panel is built FROM the existing nav, so adding a link to .sitenav in the
// HTML automatically puts it in the drawer too — no second list to keep in step.
(function () {
  var nav = document.querySelector('.sitenav');
  if (!nav || document.querySelector('.mnav-toggle')) return;

  function cookie(name) {
    var m = document.cookie.split('; ').find(function (r) { return r.indexOf(name + '=') === 0; });
    return m ? decodeURIComponent(m.split('=').slice(1).join('=')) : '';
  }
  var who = cookie('sj_guest').trim();
  var isEmail = who.indexOf('@') > -1;
  var first = who ? (isEmail ? who.split('@')[0].split(/[._]/)[0] : who.split(/\s+/)[0]) : '';
  first = first.replace(/^[a-z]/, function (c) { return c.toUpperCase(); });


  // ---- collect the real nav links (skip home — it stays in the bar) --------
  var links = [];
  nav.querySelectorAll('a[href]').forEach(function (a) {
    var href = a.getAttribute('href') || '';
    if (/^index\.html$|^\/$/.test(href)) return;          // home lives in the bar
    if (a.hasAttribute('data-rsvp-open')) return;          // added once below
    if (a.closest('.nav-actions, .nav-cta')) return;       // desktop-only duplicates
    var label = (a.querySelector('.nav-long') || a).textContent.trim();
    if (!label) return;
    links.push({ href: href, label: label, active: a.classList.contains('active') });
  });

  // ---- the bar --------------------------------------------------------------
  var toggle = document.createElement('button');
  toggle.type = 'button';
  toggle.className = 'mnav-toggle';
  toggle.setAttribute('aria-label', 'More wedding actions');
  toggle.setAttribute('aria-expanded', 'false');
  toggle.setAttribute('aria-controls', 'mobile-wedding-menu');
  toggle.innerHTML = '<span aria-hidden="true"></span><span aria-hidden="true"></span><span aria-hidden="true"></span>';
  var crest = document.querySelector('.crest');
  var mobileDock = document.createElement('div');
  mobileDock.className = 'crest-mobile-nav';
  // No home icon: "SAM + JENNI" is itself a link to the home page, and now that
  // the crest is left-aligned the icon sat right on top of it doing the same job.
  mobileDock.appendChild(toggle);
  (crest || nav).appendChild(mobileDock);

  // ---- the panel ------------------------------------------------------------
  var panel = document.createElement('div');
  panel.className = 'mnav';
  panel.id = 'mobile-wedding-menu';
  panel.setAttribute('aria-label', 'More wedding actions');
  panel.hidden = true;

  var html = '<div class="mnav-top">' +
      '<a class="mnav-brand" href="index.html">Sam <span>+</span> Jenni</a>' +
      '<button type="button" class="mnav-close" aria-label="Close menu">' +
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" ' +
      'stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg></button>' +
    '</div>' +
    '<nav class="mnav-list">';
  links.forEach(function (l) {
    var label = /^faq$/i.test(l.label) ? 'FAQs' : l.label;
    html += '<a href="' + l.href + '"' + (l.active ? ' class="is-here" aria-current="page"' : '') + '>' + label + '</a>';
  });
  // Always "RSVP" — that's what the guest wants to do. If we don't know who they
  // are yet the link goes to the finder, which explains itself when they land.
  // Labelling the nav "Find my invitation" made people wonder whether RSVPing
  // was somewhere else entirely.
  html += who
    ? '<a class="mnav-action mnav-action--rsvp" href="rsvp.html" data-rsvp-open>RSVP</a>'
    : '<a class="mnav-action mnav-action--rsvp" href="/gate?next=rsvp">RSVP</a>';
  html += '<button type="button" class="mnav-action mnav-action--note" data-note-open>Leave us a note &#9825;</button>';
  html += '<button type="button" class="mnav-action mnav-action--ou" data-ou-open>Over<span class="ou-slash">/</span>under</button>';
  html += '</nav>';
  // The foot is the account row either way. Signed in it's your name and opens
  // your details; not signed in it's "sign in", because someone who browsed past
  // the finder has no other way back to it — the RSVP link is the only other
  // door and that reads as a different errand.
  var PERSON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" ' +
    'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
    '<circle cx="12" cy="8" r="3.6"/><path d="M4.5 20a7.5 7.5 0 0 1 15 0"/></svg>';
  html += '<div class="mnav-foot">';
  html += who
    ? '<button type="button" class="mnav-acct">' + PERSON + (first || 'your details') + '</button>'
    : '<a class="mnav-acct mnav-acct--signin" href="/gate">' + PERSON + 'Sign in</a>';
  html += '</div>';
  panel.innerHTML = html;
  document.body.appendChild(panel);

  var veil = document.createElement('div');
  veil.className = 'mnav-veil';
  veil.hidden = true;
  document.body.appendChild(veil);

  // The sheet is full-screen now, so there is nothing to anchor — the ✕ is
  // placed by CSS to land on the kebab's own coordinates.
  function place() {}

  function setOpen(on) {
    var wasOpen = !panel.hidden;
    if (on) place();
    panel.hidden = !on;
    veil.hidden = !on;
    toggle.classList.toggle('is-open', on);
    toggle.setAttribute('aria-expanded', on ? 'true' : 'false');
    document.body.classList.toggle('mnav-open', on);
    if (on) {
      try { panel.querySelector('a, button:not(.mnav-close)').focus({ preventScroll: true }); } catch (e) {}
    } else if (wasOpen && panel.contains(document.activeElement)) {
      // never leave focus orphaned inside a panel that's gone
      try { toggle.focus({ preventScroll: true }); } catch (e) { toggle.focus(); }
    }
  }
  window.addEventListener('resize', function () { if (!panel.hidden) place(); });
  window.addEventListener('orientationchange', function () { if (!panel.hidden) place(); });
  // Closing, rebuilt. The previous version listened for `click` on document,
  // and iOS Safari does not reliably fire click on non-interactive elements —
  // so taps on the page behind the sheet went nowhere and the menu felt stuck.
  // pointerdown fires for touch, pen and mouse alike, and fires before any
  // scroll or focus handling, so an outside tap always registers.
  toggle.addEventListener('click', function (e) {
    e.preventDefault();
    e.stopPropagation();
    setOpen(panel.hidden);
  });

  panel.querySelector('.mnav-close').addEventListener('click', function (e) {
    e.preventDefault();
    setOpen(false);
    toggle.focus();
  });

  function outside(e) {
    if (panel.hidden) return;
    if (panel.contains(e.target) || toggle.contains(e.target)) return;
    setOpen(false);
  }
  document.addEventListener('pointerdown', outside, true);
  document.addEventListener('touchstart', outside, { passive: true, capture: true });
  veil.addEventListener('pointerdown', function () { setOpen(false); });

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && !panel.hidden) { setOpen(false); toggle.focus(); }
  });
  // Anything that navigates or opens a drawer of its own closes this first.
  panel.addEventListener('click', function (e) {
    if (e.target.closest('[data-note-open],[data-rsvp-open],[data-ou-open],.mnav-acct,.mnav-list a')) setOpen(false);
  });
  // a back gesture or hardware back shouldn't leave it hanging open
  window.addEventListener('pagehide', function () { setOpen(false); });

  // the account row drives the real icon rather than duplicating its sheet, so
  // there's only ever one implementation of the account popover
  var acct = panel.querySelector('.mnav-acct');
  if (acct) acct.addEventListener('click', function () {
    var real = document.querySelector('.acct-btn');
    if (real) setTimeout(function () { real.click(); }, 60);
  });

})();
