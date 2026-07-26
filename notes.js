// notes.js — optional "leave us a note" form. Renders into <div id="sjnote">.
// INTERIM: submits via the guest's email client (mailto) so it works today.
// TODO: once the Google Form exists, swap submit() to POST the form's
// formResponse endpoint with the entry.* field IDs (answers land in the Sheet).
(function () {
  var el = document.getElementById('sjnote');
  if (!el) return;

  el.innerHTML =
    '<div class="note-card">' +
      '<div class="note-h">Leave us a note</div>' +
      '<p class="note-sub">totally optional — but we’d love these ♡</p>' +
      '<label class="note-l" for="nMem">a favorite memory with Sam or Jenni</label>' +
      '<textarea id="nMem" class="note-f" rows="3"></textarea>' +
      '<label class="note-l" for="nWord">one word that describes Sam (or Jenni)</label>' +
      '<input id="nWord" class="note-f" type="text">' +
      '<label class="note-l" for="nSong">a song you want to hear</label>' +
      '<input id="nSong" class="note-f" type="text" placeholder="artist – title">' +
      '<label class="note-l" for="nName">your name (optional)</label>' +
      '<input id="nName" class="note-f" type="text">' +
      '<button id="nSend" class="note-btn" type="button">Send to Sam + Jenni</button>' +
      '<div class="note-done" id="nDone">opening your email — thank you ♡</div>' +
    '</div>';

  function v(id){ return (document.getElementById(id).value || '').trim(); }

  document.getElementById('nSend').addEventListener('click', function () {
    var body =
      'a note for sam + jenni\n\n' +
      'favorite memory:\n' + v('nMem') + '\n\n' +
      'one word: ' + v('nWord') + '\n' +
      'song request: ' + v('nSong') + '\n' +
      'from: ' + v('nName') + '\n';
    window.location.href = 'mailto:tangjennii@gmail.com' +
      '?subject=' + encodeURIComponent('a note for sam + jenni') +
      '&body=' + encodeURIComponent(body);
    document.getElementById('nDone').classList.add('show');
  });
})();
