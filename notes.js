// notes.js — optional "leave us a note" form. Renders into <div id="sjnote">.
// Optional compact intro via data-intro on the container.
// Submit opens the guest's email (works today). SWAP-IN: set GFORM (entry.* IDs
// from the form's "Get pre-filled link") to POST silently into the Google Sheet.
(function () {
  var el = document.getElementById('sjnote');
  if (!el) return;
  var intro = el.getAttribute('data-intro') || '';

  var GFORM = null; // { action, mem, word, song, name }

  el.innerHTML =
    '<div class="note-card">' +
      '<div class="note-h">Leave us a note</div>' +
      '<p class="note-sub">totally optional — but we’d love these ♡</p>' +
      (intro ? '<p class="note-intro">' + intro + '</p>' : '') +
      '<div class="note-field">' +
        '<label class="note-l" for="nMem">a favorite memory with Sam or Jenni</label>' +
        '<textarea id="nMem" class="note-f note-ta"></textarea>' +
      '</div>' +
      '<div class="note-row2">' +
        '<div class="note-field"><label class="note-l" for="nWord">one word for Sam (or Jenni)</label>' +
          '<input id="nWord" class="note-f" type="text"></div>' +
        '<div class="note-field"><label class="note-l" for="nSong">a song you want to hear</label>' +
          '<input id="nSong" class="note-f" type="text" placeholder="artist – title"></div>' +
      '</div>' +
      '<div class="note-row3">' +
        '<div class="note-field"><label class="note-l" for="nName">your name (optional)</label>' +
          '<input id="nName" class="note-f" type="text"></div>' +
        '<button id="nSend" class="note-btn" type="button">Send</button>' +
      '</div>' +
      '<div class="note-done" id="nDone">thank you ♡</div>' +
    '</div>';

  function v(id){ return (document.getElementById(id).value || '').trim(); }
  var done = document.getElementById('nDone');

  document.getElementById('nSend').addEventListener('click', function () {
    if (GFORM) {
      var fd = new FormData();
      fd.append(GFORM.mem, v('nMem'));
      fd.append(GFORM.word, v('nWord'));
      fd.append(GFORM.song, v('nSong'));
      fd.append(GFORM.name, v('nName'));
      fetch(GFORM.action, { method:'POST', mode:'no-cors', body:fd }).catch(function(){});
      done.textContent = 'thank you ♡';
      done.classList.add('show');
      this.disabled = true;
      return;
    }
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
