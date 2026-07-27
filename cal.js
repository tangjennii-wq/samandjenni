// cal.js — shared "add to calendar" popover for the nav button on inner pages.
// The homepage has its own inline popover (anchored to the hero pill); this
// only builds one when the page doesn't already have it.
(function () {
  if (document.getElementById('calPop')) return;      // home handles its own
  var btns = document.querySelectorAll('.nav-cal');
  if (!btns.length) return;

  var GCAL = 'https://www.google.com/calendar/render?action=TEMPLATE' +
    '&text=Sam%20%2B%20Jenni%20%C2%B7%20Wedding%20Weekend' +
    '&dates=20270319/20270321' +
    '&details=Friday%203.19%20%E2%80%94%20Welcome%20party%20at%20Chinese%20Tuxedo%0ASaturday%203.20%20%E2%80%94%20Wedding%20at%20The%20Pierre%0A%0Ahttps%3A%2F%2Fsamandjenni.com' +
    '&location=New%20York%2C%20NY';

  var pop = document.createElement('div');
  pop.className = 'cal-pop nav-cal-pop';
  pop.id = 'calPop';
  pop.setAttribute('role', 'menu');
  pop.hidden = true;
  pop.innerHTML =
    '<a role="menuitem" href="' + GCAL + '" target="_blank" rel="noopener noreferrer">Google Calendar</a>' +
    '<a role="menuitem" href="save-the-date.ics" type="text/calendar">Apple Calendar</a>' +
    '<a role="menuitem" href="save-the-date.ics" download="sam-and-jenni.ics">Outlook / download .ics</a>';
  document.body.appendChild(pop);

  function place(btn){
    var r = btn.getBoundingClientRect();
    pop.style.position = 'fixed';
    if (window.innerWidth <= 760) { pop.style.left = '12px'; pop.style.right = '12px'; }
    else { pop.style.left = 'auto'; pop.style.right = Math.max(12, window.innerWidth - r.right) + 'px'; }
    // .cal-end sits just above the footer, so "below the button" usually runs off
    // the bottom of a phone. Flip above when it doesn't fit, then clamp.
    var h = pop.offsetHeight || 0;
    var top = r.bottom + 8;
    if (top + h > window.innerHeight - 8) {
      top = (r.top - 8 - h >= 8) ? (r.top - 8 - h)
                                 : Math.max(8, window.innerHeight - 8 - h);
    }
    pop.style.top = Math.round(top) + 'px';
  }
  function open(btn){ pop.hidden = false; btn.setAttribute('aria-expanded','true'); place(btn); }
  function close(){
    pop.hidden = true;
    btns.forEach(function(b){ b.setAttribute('aria-expanded','false'); });
  }

  btns.forEach(function (b) {
    b.setAttribute('aria-haspopup', 'true');
    b.setAttribute('aria-expanded', 'false');
    b.addEventListener('click', function (e) {
      e.preventDefault(); e.stopPropagation();
      pop.hidden ? open(b) : close();
    });
  });
  document.addEventListener('click', function (e) {
    if (!pop.hidden && !pop.contains(e.target)) close();
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && !pop.hidden) close();
  });
  window.addEventListener('resize', function(){ if (!pop.hidden) close(); });
})();

// Nav "RSVP + Note" menu (mobile). Kept here so every page picks it up.
(function () {
  var wrap = document.querySelector('.nav-actions');
  if (!wrap) return;
  var btn = wrap.querySelector('.nav-act');
  var menu = wrap.querySelector('.nav-act-menu');
  if (!btn || !menu) return;

  // The menu is position:fixed (the nav scrolls horizontally and clips
  // absolutely positioned children), so anchor it to the button by hand.
  function placeMenu() {
    var r = btn.getBoundingClientRect();
    menu.style.top = Math.round(r.bottom + 7) + 'px';
    // clamp: the pill can sit off the right edge of the scrolling nav
    menu.style.right = Math.round(Math.max(8, window.innerWidth - r.right)) + 'px';
  }
  function setOpen(on) {
    if (on) { menu.hidden = false; placeMenu(); }
    else { menu.hidden = true; }
    btn.setAttribute('aria-expanded', on ? 'true' : 'false');
  }
  wrap.parentNode.addEventListener('scroll', function () { if (!menu.hidden) placeMenu(); });
  window.addEventListener('resize', function () { if (!menu.hidden) setOpen(false); });
  window.addEventListener('scroll', function () { if (!menu.hidden) placeMenu(); }, { passive: true });
  btn.addEventListener('click', function (e) {
    e.preventDefault(); e.stopPropagation();
    setOpen(menu.hidden);
  });
  // picking either action opens its drawer, so close up behind it
  menu.addEventListener('click', function () { setOpen(false); });
  document.addEventListener('click', function (e) {
    if (!menu.hidden && !wrap.contains(e.target)) setOpen(false);
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && !menu.hidden) { setOpen(false); btn.focus(); }
  });
})();
