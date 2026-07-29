// outab.js — over/under as a pull-out tab instead of a nav page.
//
// The game didn't earn a top-level nav slot next to events/recs/hotels, but it
// is more fun than a link buried in a footer. So it lives on a fixed tab at the
// edge of the screen and opens in the shared SJDrawer.
//
// The drawer holds an <iframe> of over-under.html?embed=1 rather than a copy of
// the markup. That page owns ~180 lines of scoring/localStorage logic; cloning
// it here would mean two versions to keep in step, and the form is entirely
// self-contained (nothing it does needs to reach the parent page). The page
// also still works on its own if anyone has the URL.
(function () {
  if (!window.SJDrawer) return;

  // don't put a tab on the page it opens
  var here = (location.pathname.split('/').pop() || 'index.html');
  if (here.indexOf('over-under') === 0) return;

  var drawer = null;

  var tab = document.createElement('button');
  tab.type = 'button';
  tab.className = 'ou-tab';
  tab.setAttribute('aria-label', 'Open over/under');
  tab.innerHTML = '<span class="ou-tab-in">over<span class="ou-slash">/</span>under</span>';

  function build(){
    if (drawer) return drawer;
    drawer = window.SJDrawer.create({
      label: 'Over/Under',
      html: '<iframe class="ou-frame" src="over-under.html?embed=1" ' +
            'title="Over/under" loading="lazy"></iframe>'
    });
    return drawer;
  }

  tab.addEventListener('click', function(){ build().open(); });
  document.body.appendChild(tab);

  // let anything else on the page open it too, e.g. a link in the footer
  document.addEventListener('click', function(e){
    var t = e.target.closest('[data-ou-open]');
    if (!t) return;
    e.preventDefault();
    build().open();
  });
})();
