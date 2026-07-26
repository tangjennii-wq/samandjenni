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
        '<label class="note-l" for="{p}Mem">a favorite memory with Sam and/or Jenni</label>' +
        '<textarea id="{p}Mem" class="note-f note-ta"></textarea>' +
      '</div>' +
      '<div class="note-field photo-field">' +
        '<label class="note-l" for="{p}Photo">a favorite photo with Sam and/or Jenni</label>' +
        '<label class="photo-drop" for="{p}Photo">' +
          '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
            '<rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/></svg>' +
          '<span class="photo-txt">choose a photo</span>' +
        '</label>' +
        '<input id="{p}Photo" class="photo-input" type="file" accept="image/*">' +
        '<div class="photo-preview" data-preview hidden></div>' +
      '</div>' +
      '<div class="note-row2">' +
        '<div class="note-field"><label class="note-l" for="{p}WordS">one word that defines Sam</label>' +
          '<input id="{p}WordS" class="note-f" type="text"></div>' +
        '<div class="note-field"><label class="note-l" for="{p}WordJ">one word that defines Jenni</label>' +
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

    var up = (window.SJUpload ? window.SJUpload.wire(g('Photo'), root.querySelector('[data-preview]')) : null);
    Object.keys(cache).forEach(function(k){
      var n = g(k); if(!n) return;
      n.value = cache[k] || '';
      n.addEventListener('input', function(){ cache[k] = n.value; });
    });
    root.querySelector('[data-send]').addEventListener('click', function () {
      var val = function(k){ var n = g(k); return n ? n.value.trim() : ''; };
      if (window.SJUpload) {
        window.SJUpload.save('wedding_notes', {
          guest_key: window.SJUpload.guestKey(),
          memory: val('Mem'),
          word_sam: val('WordS'),
          word_jenni: val('WordJ'),
          song: val('Song'),
          from_name: val('Name'),
          photo_path: up ? up.getPath() : ''
        }).catch(function(){});
      }

      Object.keys(cache).forEach(function(k){ cache[k] = ''; });
      var card = root.querySelector('.note-card') || root;
      card.innerHTML = '<div class="note-thanks"><div class="note-h">Thank you ♡</div>' +
        '<p class="note-sub">we’ve got it — see you in New York.</p>' +
        '<p class="thanks-then">now go set your line on <a href="over-under.html">over/under</a> ♡</p></div>';
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
