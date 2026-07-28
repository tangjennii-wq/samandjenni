// personalize.js — shows each guest only the events they're invited to.
// Reads the email / last name captured at the gate (sj_guest cookie), maps it
// to a tier, and hides/swaps content accordingly.
//
// Tiers (nested — a lower number includes everything a higher number gets):
//   1  Inner circle : Thursday + Rehearsal + Friday welcome + Saturday + Sunday brunch (everything)
//   2  Close        : Rehearsal + Friday welcome + Saturday
//   3  Weekend      : Friday welcome + Saturday
//   4  Wedding only : Saturday
//   0  Not invited  : (excluded — shouldn't reach the site)
//
// The tier comes from Supabase at sign-in (api/login.js sets the sj_tier
// cookie). It is deliberately NOT a lookup table in this file: this script is
// public, so a table of every household's names and emails would publish the
// guest list.
(function () {
  // The tier is decided server-side at sign-in and handed over in a cookie.
  // Deliberately NOT a lookup table here: this file is public, and a table of
  // 124 households' names and emails would publish the guest list.

  function cookie(name) {
    var m = document.cookie.split('; ').find(function (r) { return r.indexOf(name + '=') === 0; });
    return m ? decodeURIComponent(m.split('=').slice(1).join('=')) : '';
  }

  var guest = cookie('sj_guest').trim().toLowerCase();
  // strict: only a bare 1-4 counts, so "1abc" can't slip through parseInt
  var rawTier = cookie('sj_tier').trim();
  var tier = /^[1-4]$/.test(rawTier) ? parseInt(rawTier, 10) : 3;

  var sees = {
    thursday:  tier === 1,
    rehearsal: tier <= 2,
    friday:    tier <= 3,   // Friday welcome party
    saturday:  true,        // everyone invited (tiers 1–4)
    sunday:    tier === 1   // brunch = same close group as Thursday
  };

  document.documentElement.setAttribute('data-tier', String(tier));

  // The date line matches what you're actually invited to.
  var DATES = { 1:'March 18–21, 2027', 2:'March 19–20, 2027',
                3:'March 19–20, 2027', 4:'March 20, 2027' };
  var dateEl = document.querySelector('[data-dates]');
  if (dateEl && DATES[tier]) dateEl.textContent = DATES[tier];

  // Hide any event the guest isn't invited to.
  // Event elements are tagged data-event="thursday|rehearsal|friday|saturday|sunday".
  document.querySelectorAll('[data-event]').forEach(function (el) {
    var ev = el.getAttribute('data-event');
    if (sees[ev] === false) el.style.display = 'none';
  });

  // Saturday-only guests (tier 4): simplify the ribbon + the date line so the
  // site doesn't tease them with events they aren't part of.
  if (tier >= 4) {
    var ribbon = document.querySelector('.ribbon');
    if (ribbon) {
      ribbon.innerHTML = '<span>3.20.27 &middot; wedding at ' +
        '<a href="https://www.google.com/maps/search/?api=1&query=The+Pierre+Hotel+New+York" target="_blank" rel="noopener">the pierre</a></span>';
    }
    // Only touch the crest line that holds the date (home page) — leave "new york or nowhere" alone.
    var crest = document.querySelector('.crest-tag');
    if (crest && /\d/.test(crest.textContent)) crest.textContent = 'new york, new york';
  }
})();
