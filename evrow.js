// evrow.js — keep the weekend's event cards on a single row.
//
// The grid was a fixed 3-up, so a tier-1 guest with five events got three on
// one row and two orphaned below, and had to scroll to see their own weekend.
// How many cards are visible depends on the guest's tier, and personalize.js
// decides that at runtime with display:none — which CSS can't count. So we
// count here and hand the number to CSS as data-count.
//
// Loaded BEFORE personalize.js but listens for its work: both are `defer`, so
// this file's listener is registered first and the observer catches the hiding
// whenever it happens.
(function () {
  var grid = document.querySelector('.evgrid');
  if (!grid) return;

  function visibleCards() {
    return [].slice.call(grid.querySelectorAll('.evcard')).filter(function (c) {
      // personalize.js REMOVES cards the guest shouldn't see, so most of the
      // counting is done for us by the time we re-run. Keep the display/hidden
      // checks anyway: the hidden attribute is used elsewhere on the site.
      return c.style.display !== 'none' && !c.hidden;
    }).length;
  }

  function sync() {
    var n = visibleCards();
    if (n) grid.setAttribute('data-count', String(n));
  }

  sync();

  // personalize.js runs after this file and removes cards by tier — re-count
  // when it does, rather than guessing at a timeout.
  //
  // childList is the one that matters: personalize.js calls el.remove(), which
  // fires a childList mutation, NOT an attribute mutation. Watching only
  // attributes meant the observer never fired and the grid kept the count it
  // was born with — a tier-4 guest saw one card in a five-column grid.
  if (window.MutationObserver) {
    var mo = new MutationObserver(sync);
    mo.observe(grid, { childList: true, attributes: true,
                       attributeFilter: ['style', 'hidden'], subtree: true });
    // stop watching once the page has settled; nothing hides events later
    window.addEventListener('load', function () { setTimeout(function () { mo.disconnect(); sync(); }, 400); });
  } else {
    window.addEventListener('load', sync);
  }
})();
