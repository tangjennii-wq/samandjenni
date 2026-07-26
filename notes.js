// notes.js — optional "leave us a note" form.
// Opens in the shared drawer from any [data-note-open] trigger (the nav button).
// Also renders inline if a <div id="sjnote"> exists. Values persist across
// open/close. Submit emails today; set GFORM to post into a Google Sheet.
(function () {
  var inline = document.getElementById('sjnote');
  var triggers = document.querySelectorAll('[data-note-open]');
  if (!inline && !triggers.length) return;

  var GFORM = null; // { action, mem, word, song, name }

  function formHTML(p, intro){
    return ('' +
      '<div class="note-h">Leave us a note</div>' +
      '<p class="note-sub">totally optional — but we’d love these ♡</p>' +
      (intro ? '<p class="note-intro">' + intro + '</p>' : '') +
      '<div class="note-field">' +
        '<label class="note-l" for="{p}Mem">a favorite memory with Sam or Jenni</label>' +
        '<textarea id="{p}Mem" class="note-f note-ta"></textarea>' +
      '</div>' +
      '<div class="note-row2">' +
        '<div class="note-field"><label class="note-l" for="{p}WordS">one word for Sam</label>' +
          '<input id="{p}WordS" class="note-f" type="text"></div>' +
        '<div class="note-field"><label class="note-l" for="{p}WordJ">one word for Jenni</label>' +
          '<input id="{p}WordJ" class="note-f" type="text"></div>' +
      '</div>' +
      '<div class="note-field" style="margin-top:14px">' +
        '<label class="note-l" for="{p}Song">a song you want to hear</label>' +
        '<input id="{p}Song" class="note-f" type="text" placeholder="artist – title">' +
      '</div>' +
      '<div class="note-row3">' +
        '<div class="note-field"><label class="note-l" for="{p}Name">your name (optional)</label>' +
          '<input id="{p}Name" class="note-f" type="text"></div>' +
        '<button class="note-btn" type="button" data-send>Send</button>' +
      '</div>').replace(/\{p\}/g, p);
  }

  var cache = { Mem:'', WordS:'', WordJ:'', Song:'', Name:'' };

  function wire(root, p, onSent){
    function g(k){ return root.querySelector('#' + p + k); }
    Object.keys(cache).forEach(function(k){
      var n = g(k); if(!n) return;
      n.value = cache[k] || '';
      n.addEventListener('input', function(){ cache[k] = n.value; });
    });
    root.querySelector('[data-send]').addEventListener('click', function () {
      var val = function(k){ var n = g(k); return n ? n.value.trim() : ''; };
      if (GFORM) {
        var fd = new FormData();
        fd.append(GFORM.mem, val('Mem'));
        fd.append(GFORM.word, 'Sam: ' + val('WordS') + ' | Jenni: ' + val('WordJ'));
        fd.append(GFORM.song, val('Song'));
        fd.append(GFORM.name, val('Name'));
        fetch(GFORM.action, { method:'POST', mode:'no-cors', body:fd }).catch(function(){});
      } else {
        var body =
          'a note for sam + jenni\n\n' +
          'favorite memory:\n' + val('Mem') + '\n\n' +
          'one word for sam: ' + val('WordS') + '\n' +
          'one word for jenni: ' + val('WordJ') + '\n' +
          'song request: ' + val('Song') + '\n' +
          'from: ' + val('Name') + '\n';
        window.location.href = 'mailto:tangjennii@gmail.com' +
          '?subject=' + encodeURIComponent('a note for sam + jenni') +
          '&body=' + encodeURIComponent(body);
      }
      Object.keys(cache).forEach(function(k){ cache[k] = ''; });
      var card = root.querySelector('.note-card') || root;
      card.innerHTML = '<div class="note-thanks"><div class="note-h">Thank you ♡</div>' +
        '<p class="note-sub">we’ve got it — see you in New York.</p></div>';
      if (onSent) setTimeout(onSent, 1500);
    });
  }

  if (inline) {
    inline.innerHTML = '<div class="note-card">' + formHTML('n', inline.getAttribute('data-intro') || '') + '</div>';
    wire(inline, 'n');
  }

  if (triggers.length && window.SJDrawer) {
    var d = window.SJDrawer.create({
      label: 'Leave us a note',
      html: '<div class="note-card note-card--drawer">' + formHTML('d', '') + '</div>',
      onMount: function (api) { wire(api.body, 'd', api.close); }
    });
    triggers.forEach(function (t) {
      t.addEventListener('click', function (e) { e.preventDefault(); d.open(); });
    });
  }
})();
