/* ── FEATURE SWITCHES ───────────────────────────────────────────────────────
   Set overUnder back to true to bring the game back — that is the only edit
   needed. personalize.js loads before mobilenav.js, notes.js and outab.js on
   every page, so all three read this. Nothing has been deleted: over-under.html
   and outab.js are intact, the page still works if you open it directly, and
   scores already in wedding_overunder are untouched.
   Hidden 5 Aug 2026 — bringing it back closer to the weekend.            */
window.SJ_FEATURES = { overUnder: false };

/* ── ?reset — clear this browser's local state ──────────────────────────────
   Wiping the database is only half a reset. Whether a guest sees the RSVP
   form or the thank-you screen, and whether the details panel opens on
   arrival, is decided by localStorage on their machine — so after clearing
   the tables Jenni and Sam still saw the "already replied" state on their own
   laptops and phones.

   samandjenni.com/?reset      clears the local flags and drafts
   samandjenni.com/?reset=all  also signs out, back to the gate

   This lives in personalize.js because it is first in the script order on
   every page: the keys are gone before rsvpform.js or account.js read them.
   The parameter is stripped from the URL afterwards so a refresh doesn't
   re-run it, and so a copied link doesn't quietly reset someone else.

   It only touches keys under the sj- prefix, and it cannot reach the server:
   a guest who has genuinely replied still shows as replied, because that
   answer comes from guest_rsvped(). This is a testing convenience, not a
   delete button.                                                            */
(function () {
  var m = /[?&]reset(?:=([^&]*))?/.exec(location.search);
  if (!m) return;
  try {
    Object.keys(localStorage)
      .filter(function (k) { return k.indexOf('sj-') === 0; })
      .forEach(function (k) { localStorage.removeItem(k); });
  } catch (e) {}
  if (m[1] === 'all') {
    ['sj_guest', 'sj_tier'].forEach(function (c) {
      document.cookie = c + '=; Path=/; Max-Age=0; SameSite=Lax';
    });
    location.replace('/gate');
    return;
  }
  var url = location.pathname + location.search.replace(/([?&])reset(=[^&]*)?/, '$1')
              .replace(/[?&]$/, '').replace(/\?&/, '?') + location.hash;
  try { history.replaceState(null, '', url); } catch (e) {}
})();

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

  // Tier 0 = nobody has signed in yet. The site is public now, so this is the
  // ordinary state for a stranger who found the domain — they should see that a
  // wedding is happening without learning where anyone needs to be and when.
  // Previously an unknown visitor fell through to tier 3, which showed them the
  // Friday party and the Pierre's street address.
  var signedIn = !!guest;
  var tier = !signedIn ? 0
           : (/^[1-5]$/.test(rawTier) ? parseInt(rawTier, 10) : 3);

  // Tiers 1-4 nest: 1 contains 2 contains 3 contains 4. TIER 5 DOES NOT.
  // It is the residency crowd -- Thursday, the welcome party, the wedding and
  // brunch, but NOT the rehearsal dinner, which stays the small wedding-party
  // group. Because 5 sits outside the ordering, every test below is an
  // explicit membership check rather than `tier <= n`. Any new code that
  // reaches for a `<=` comparison on tier will silently invite tier 5 to the
  // rehearsal, or drop them from Friday.
  function sees_(list){ return list.indexOf(tier) > -1; }
  var sees = {
    thursday:  sees_([1, 5]),
    rehearsal: sees_([1, 2]),
    friday:    sees_([1, 2, 3, 5]),   // Friday welcome party
    saturday:  true,                  // the wedding itself is public, minus the details
    sunday:    sees_([1, 5])          // brunch = same group as Thursday
  };

  document.documentElement.setAttribute('data-tier', String(tier));

  // The date line matches what you're actually invited to.
  var DATES = { 0:'March 2027', 1:'March 18–21, 2027', 2:'March 19–20, 2027',
                3:'March 19–20, 2027', 4:'March 20, 2027',
                5:'March 18–21, 2027' };
  var dateEl = document.querySelector('[data-dates]');
  if (dateEl && DATES[tier]) dateEl.textContent = DATES[tier];

  // The crest byline under SAM + JENNI was hard-coded to "3.19.27 – 3.20.27" on
  // every page, so a Saturday-only guest was told the weekend runs the 19th to
  // the 20th — teasing the Friday party they aren't invited to. Same problem the
  // event cards had, in the one place that appears on every single page.
  var SHORT = { 0:'3.20.27', 1:'3.18.27 – 3.21.27', 2:'3.19.27 – 3.20.27',
                3:'3.19.27 – 3.20.27', 4:'3.20.27' };
  document.querySelectorAll('[data-dates-short]').forEach(function (el) {
    if (SHORT[tier]) el.textContent = SHORT[tier];
  });

  // Hide any event the guest isn't invited to.
  // Event elements are tagged data-event="thursday|rehearsal|friday|saturday|sunday".
  document.querySelectorAll('[data-event]').forEach(function (el) {
    var ev = el.getAttribute('data-event');
    if (sees[ev] === false) el.style.display = 'none';
  });

  // Not signed in: the Saturday card stays, but the exact time, the street
  // address and the add-to-calendar link come off it. "The Pierre, New York" is
  // already on the home page — the logistics are what's worth holding back.
  if (!signedIn) {
    document.querySelectorAll('[data-event="saturday"]').forEach(function (card) {
      var when = card.querySelector('.when');
      if (when) when.textContent = 'Saturday, March 20, 2027';
      var where = card.querySelector('.where');
      if (where) where.innerHTML = '<b>The Pierre</b><br>New York City';
      var note = card.querySelector('.enote');
      if (note) note.remove();
      var links = card.querySelector('.links');
      if (links) links.innerHTML =
        '<a href="/gate?next=rsvp" class="ev-find">' +
        '<span class="ev-find-lead">Invited?</span> Find my invitation &rarr;</a>';
    });

    // No banner above the grid: it said the same thing as the link on the card
    // itself, in a wider column, so the page opened with two paragraphs of
    // apology before you saw a single event.
  }

  // Saturday-only guests (tier 4): simplify the ribbon + the date line so the
  // site doesn't tease them with events they aren't part of.
  // `=== 4`, not `>= 4`: tier 5 is a full-weekend guest and must not be given
  // the Saturday-only ribbon.
  if (tier === 4) {
    var ribbon = document.querySelector('.ribbon');
    if (ribbon) {
      ribbon.innerHTML = '<span>3.20.27 &middot; wedding at ' +
        '<a href="https://www.google.com/maps/search/?api=1&query=The+Pierre+Hotel+New+York" target="_blank" rel="noopener">the pierre</a></span>';
    }
    // The crest byline used to be blanked to just "new york, new york" here,
    // which hid the date from Saturday-only guests rather than correcting it.
    // The [data-dates-short] handling above now gives them "3.20.27" — their
    // actual date — so this blunt override is gone.
  }
})();

// ---- "find my invitation" until we know who you are ------------------------
// The nav's RSVP pill is meaningless to someone the site hasn't recognised —
// they'd click it and hit the finder anyway. Say so up front instead.
(function () {
  function cookie(name) {
    var m = document.cookie.split('; ').find(function (r) { return r.indexOf(name + '=') === 0; });
    return m ? decodeURIComponent(m.split('=').slice(1).join('=')) : '';
  }
  if (cookie('sj_guest').trim()) return;   // recognised — leave everything alone

  // Re-point RSVP at the finder, but DON'T relabel it. The button keeps saying
  // "RSVP" because that's the guest's intent; the finder page then explains that
  // we need a name first. Renaming the nav item made people think RSVP lived
  // somewhere else.
  document.querySelectorAll('[data-rsvp-open]').forEach(function (el) {
    el.removeAttribute('data-rsvp-open');          // don't open the form
    el.setAttribute('href', '/gate?next=rsvp');
  });
  // buttons can't be re-pointed with href — send them to the finder on click
  document.querySelectorAll('button[data-rsvp-open], button.ma-rsvp').forEach(function (b) {
    b.addEventListener('click', function (e) { e.preventDefault(); location.href = '/gate?next=rsvp'; });
  });
  // The account icon has nobody to describe yet, but it shouldn't vanish —
  // someone who skipped the finder needs a way back in. It becomes a sign-in
  // link instead of the details popover.
  var acct = document.querySelector('.nav-acct');
  if (acct) {
    var btn = acct.querySelector('.acct-btn');
    if (btn) {
      var a = document.createElement('a');
      a.className = 'acct-btn acct-btn--signin';
      a.href = '/gate';
      a.setAttribute('aria-label', 'Sign in to see your invitation');
      a.innerHTML = btn.innerHTML;
      btn.replaceWith(a);
    }
  }
})();
