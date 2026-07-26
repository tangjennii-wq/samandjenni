// notes.js — optional "leave us a note" form. Renders into <div id="sjnote">.
// On-brand native fields. Submit currently opens the guest's email (works today).
// SWAP-IN: once we have the form's entry.* field IDs (from its "Get pre-filled
// link"), set GFORM below to POST answers straight into the Google Sheet.
(function () {
  var el = document.getElementById('sjnote');
  if (!el) return;

  // When ready: { action:'https://docs.google.com/forms/d/e/XXXX/formResponse',
  //   mem:'entry.111', word:'entry.222', song:'entry.333', name:'entry.444' }
  var GFORM = null;

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
      '<div class="note-done" id="nDone">thank you ♡</div>' +
    '</div>';

  function v(id){ return (document.getElementById(id).value || '').trim(); }
  var done = document.getElementById('nDone');

  document.getElementById('nSend').addEventListener('click', function () {
    if (GFORM) {
      // Post silently into the Google Form (answers land in the Sheet).
      var fd = new FormData();
      fd.append(GFORM.mem, v('nMem'));
      fd.append(GFORM.word, v('nWord'));
      fd.append(GFORM.song, v('nSong'));
      fd.append(GFORM.name, v('nName'));
      fetch(GFORM.action, { method:'POST', mode:'no-cors', body:fd }).catch(function(){});
      done.textContent = 'thank you ♡';
      done.classList.add('show');
      document.getElementById('nSend').disabled = true;
      return;
    }
    // Interim: open the guest's email client.
    var body =
      'a note for sam + jenni\n\n' +
      'favorite memory:\n' + v('nMem') + '\n\n' +
      'one word: ' + v('nWord') + '\n' +
      'song request: ' + v('nSong') + '\n' +
      'from: ' + v('nName') + '\n';
    window.location.href = 'mailto:tangjennii@gmail.com' +
      '?subject=' + encodeURIComponent('a note for sam + jenni') +
      '&body=' + encodeURIComponent(body);
    done.textContent = 'opening your email — thank you ♡';
    done.classList.add('show');
  });
})();
