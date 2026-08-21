// cal.js — shared "add to calendar" popover for the nav button on inner pages.
// The homepage has its own inline popover (anchored to the hero pill); this
// only builds one when the page doesn't already have it.
(function () {
  if (document.getElementById('calPop')) return;      // home handles its own
  var btns = document.querySelectorAll('.nav-cal');
  if (!btns.length) return;

  /* Tier-aware. This was one static link and one static .ics for everyone, so a
     Saturday-only guest who clicked "add to calendar" got a three-day span and
     a description naming the Friday welcome party at Chinese Tuxedo. The rest
     of the site hides that event from them; this quietly handed it over. */
  function tier(){
    var raw = document.documentElement.getAttribute('data-tier') || '';
    return /^[0-4]$/.test(raw) ? parseInt(raw, 10) : 0;
  }
  var seesFriday = tier() >= 1 && tier() <= 3;

  var GCAL = 'https://www.google.com/calendar/render?action=TEMPLATE' +
    '&text=Sam%20%2B%20Jenni%20%C2%B7%20Wedding%20Weekend' +
    (seesFriday ? '&dates=20270319/20270321' : '&dates=20270320/20270321') +
    '&details=' + encodeURIComponent(
      (seesFriday ? 'Friday 3.19 \u2014 Welcome party at Chinese Tuxedo\n' : '') +
      'Saturday 3.20 \u2014 Wedding at The Pierre\n\nhttps://samandjenni.com') +
    '&location=New%20York%2C%20NY';

  var pop = document.createElement('div');
  pop.className = 'cal-pop nav-cal-pop';
  pop.id = 'calPop';
  pop.setAttribute('role', 'menu');
  pop.hidden = true;
  pop.innerHTML =
    '<a role="menuitem" href="' + GCAL + '" target="_blank" rel="noopener noreferrer">Google Calendar</a>' +
    (seesFriday
      ? '<a role="menuitem" href="save-the-date.ics" type="text/calendar">Apple Calendar</a>' +
        '<a role="menuitem" href="save-the-date.ics" download="sam-and-jenni.ics">Outlook / download .ics</a>'
      /* save-the-date.ics is static and names Chinese Tuxedo at 5 Doyers St.
         Saturday-only guests get the Google link, which is built per tier. */
      : '');
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

