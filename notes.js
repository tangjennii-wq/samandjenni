// notes.js — optional "leave us a note" form, embedded from Google Forms so
// responses collect straight into the couple's Google Sheet.
// Renders into <div id="sjnote">.
(function () {
  var el = document.getElementById('sjnote');
  if (!el) return;

  var FORM = 'https://docs.google.com/forms/d/1GpPFsiJyrUl5Mpt1RfRheJqKztJbKsjdSO5HaO-1N-s/viewform?embedded=true';

  el.innerHTML =
    '<div class="note-card note-embed">' +
      '<div class="note-h">Leave us a note</div>' +
      '<p class="note-sub">totally optional — but we’d love these ♡</p>' +
      '<iframe class="note-iframe" src="' + FORM + '" loading="lazy" title="A note for Sam &amp; Jenni">Loading…</iframe>' +
    '</div>';
})();
