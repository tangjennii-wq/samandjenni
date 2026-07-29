// mobilenav.js — phones get a home icon and a compact actions popover.
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
  var sourceHome = nav.querySelector('a[href="index.html"]');
  var mobileHome = sourceHome ? sourceHome.cloneNode(true) : document.createElement('a');
  mobileHome.classList.remove('active');
  mobileHome.classList.add('mnav-home');
  mobileHome.setAttribute('href', 'index.html');
  mobileHome.setAttribute('aria-label', 'Home');
  mobileDock.appendChild(mobileHome);
  mobileDock.appendChild(toggle);
  (crest || nav).appendChild(mobileDock);

  // ---- the panel ------------------------------------------------------------
  var panel = document.createElement('div');
  panel.className = 'mnav';
  panel.id = 'mobile-wedding-menu';
  panel.setAttribute('role', 'menu');
  panel.setAttribute('aria-label', 'More wedding actions');
  panel.hidden = true;

  var html = '<div class="mnav-head"><span>Menu</span>' +
    '<button type="button" class="mnav-close" aria-label="Close menu">×</button></div>' +
    '<nav class="mnav-list">';
  links.forEach(function (l) {
    var label = /^faq$/i.test(l.label) ? 'FAQs' : l.label;
    html += '<a role="menuitem" href="' + l.href + '"' + (l.active ? ' class="is-here" aria-current="page"' : '') + '>' + label + '</a>';
  });
  if (who) {
    html += '<a class="mnav-action mnav-action--rsvp" role="menuitem" href="rsvp.html" data-rsvp-open>RSVP</a>';
  } else {
    html += '<a class="mnav-action mnav-action--rsvp" role="menuitem" href="/gate?next=rsvp">Find my invitation</a>';
  }
  html += '<button type="button" class="mnav-action mnav-action--note" role="menuitem" data-note-open>Leave us a note &#9825;</button>';
  html += '</nav>';
  html += '<div class="mnav-foot">';
  if (who) {
    html += '<button type="button" class="mnav-acct" role="menuitem">' +
            '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" ' +
            'stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="8" r="3.6"/>' +
            '<path d="M4.5 20a7.5 7.5 0 0 1 15 0"/></svg>' + (first || 'your details') + '</button>';
  }
  html += '</div>';
  panel.innerHTML = html;
  document.body.appendChild(panel);

  var veil = document.createElement('div');
  veil.className = 'mnav-veil';
  veil.hidden = true;
  document.body.appendChild(veil);

  // Anchor the popover below the More button and keep it inside the viewport.
  function place() {
    var r = toggle.getBoundingClientRect();
    var crestBottom = crest ? crest.getBoundingClientRect().bottom : r.bottom;
    var top = Math.max(8, Math.round(Math.max(r.bottom, crestBottom) + 8));
    panel.style.top = top + 'px';
    panel.style.right = Math.max(12, Math.round(window.innerWidth - r.right)) + 'px';
    veil.style.top = Math.max(0, Math.round(crestBottom)) + 'px';
  }

  function setOpen(on) {
    if (on) place();
    panel.hidden = !on;
    veil.hidden = !on;
    toggle.classList.toggle('is-open', on);
    toggle.setAttribute('aria-expanded', on ? 'true' : 'false');
    document.body.classList.toggle('mnav-open', on);
    if (on) { try { panel.querySelector('[role="menuitem"]').focus({ preventScroll: true }); } catch (e) {} }
  }
  window.addEventListener('resize', function () { if (!panel.hidden) place(); });
  window.addEventListener('orientationchange', function () { if (!panel.hidden) place(); });
  toggle.addEventListener('click', function () { setOpen(panel.hidden); });
  panel.querySelector('.mnav-close').addEventListener('click', function () {
    setOpen(false);
    toggle.focus();
  });
  veil.addEventListener('click', function () { setOpen(false); });
  // iOS can occasionally route the tap around a transparent fixed veil.
  // A document-level guard makes every genuine outside tap close the popover.
  document.addEventListener('click', function (e) {
    if (panel.hidden || panel.contains(e.target) || toggle.contains(e.target)) return;
    setOpen(false);
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && !panel.hidden) { setOpen(false); toggle.focus(); }
  });
  // Anything that opens a drawer or navigates should close this popover first.
  panel.addEventListener('click', function (e) {
    if (e.target.closest('[data-note-open],[data-rsvp-open],.mnav-acct,.mnav-list a')) setOpen(false);
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
