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
// TIER_MAP is generated from guest-tiers-TO-FILL.xlsx once Sam & Jenni finish
// assigning tiers. Keys are lowercase EMAIL (precise) AND lowercase last name
// (friendly fallback) — both point to the household's tier.
(function () {
  var TIER_MAP = {
    // "nancy@brcap.com": 1, "zimmerman": 1, "shleifer": 1, ...
  };

  function cookie(name) {
    var m = document.cookie.split('; ').find(function (r) { return r.indexOf(name + '=') === 0; });
    return m ? decodeURIComponent(m.split('=').slice(1).join('=')) : '';
  }

  var guest = cookie('sj_guest').trim().toLowerCase();
  // Fail open: if we don't recognize the guest, show everything (tier 1).
  var tier = TIER_MAP[guest] || 1;

  var sees = {
    thursday:  tier === 1,
    rehearsal: tier <= 2,
    friday:    tier <= 3,   // Friday welcome party
    saturday:  true,        // everyone invited (tiers 1–4)
    sunday:    tier === 1   // brunch = same close group as Thursday
  };

  document.documentElement.setAttribute('data-tier', String(tier));

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
