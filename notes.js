// notes.js — optional "leave us a note" form.
// Renders inline into <div id="sjnote">, and/or into an accessible drawer
// opened by any [data-note-open] trigger (right-side on desktop, bottom sheet
// on mobile). Values persist if the drawer is closed. Submit emails today;
// set GFORM to post silently into a Google Sheet.
(function () {
  var inline = document.getElementById('sjnote');
  var triggers = document.querySelectorAll('[data-note-open]');
  if (!inline && !triggers.length) return;

  var GFORM = null; // { action, mem, word, song, name }

  function formHTML(intro){
    return '' +
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
      '</div>' +
      '<div class="note-done" data-done>thank you ♡</div>';
  }

  // Keeps typed values alive across open/close.
  var cache = { mem:'', wordS:'', wordJ:'', song:'', name:'' };

  function wire(root, p){
    function g(k){ return root.querySelector('#' + p + k); }
    var map = { Mem:'mem', WordS:'wordS', WordJ:'wordJ', Song:'song', Name:'name' };
    // restore + track
    Object.keys(map).forEach(function(k){
      var n = g(k); if(!n) return;
      n.value = cache[map[k]] || '';
      n.addEventListener('input', function(){ cache[map[k]] = n.value; });
    });
    var done = root.querySelector('[data-done]');
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
      // thank-you state replaces the form
      var card = root.querySelector('.note-card') || root;
      card.innerHTML = '<div class="note-thanks"><div class="note-h">Thank you ♡</div>' +
        '<p class="note-sub">we’ve got it — see you in New York.</p></div>';
      cache = { mem:'', wordS:'', wordJ:'', song:'', name:'' };
      if (drawer && drawer.classList.contains('open')) setTimeout(closeDrawer, 1400);
      if (done) done.classList.add('show');
    });
  }

  // ---- inline instance (rsvp page) ----
  if (inline) {
    inline.innerHTML = '<div class="note-card">' + formHTML(inline.getAttribute('data-intro') || '').replace(/\{p\}/g, 'n') + '</div>';
    wire(inline, 'n');
  }

  // ---- drawer instance ----
  var drawer = null, backdrop = null, lastFocus = null;
  if (triggers.length) {
    backdrop = document.createElement('div');
    backdrop.className = 'note-backdrop';
    drawer = document.createElement('div');
    drawer.className = 'note-drawer';
    drawer.setAttribute('role', 'dialog');
    drawer.setAttribute('aria-modal', 'true');
    drawer.setAttribute('aria-label', 'Leave us a note');
    drawer.innerHTML =
      '<button class="note-x" type="button" aria-label="Close">×</button>' +
      '<div class="note-card note-card--drawer">' + formHTML('').replace(/\{p\}/g, 'd') + '</div>';
    document.body.appendChild(backdrop);
    document.body.appendChild(drawer);
    wire(drawer, 'd');

    drawer.querySelector('.note-x').addEventListener('click', closeDrawer);
    backdrop.addEventListener('click', closeDrawer);
    document.addEventListener('keydown', function (e) {
      if (!drawer.classList.contains('open')) return;
      if (e.key === 'Escape') { closeDrawer(); return; }
      if (e.key === 'Tab') trapFocus(e);
    });
    triggers.forEach(function (t) {
      t.addEventListener('click', function (e) { e.preventDefault(); openDrawer(); });
    });
  }

  function focusables(){
    return drawer.querySelectorAll('button, input, textarea, a[href]');
  }
  function trapFocus(e){
    var f = focusables(); if(!f.length) return;
    var first = f[0], last = f[f.length - 1];
    if (e.shiftKey && document.activeElement === first){ e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last){ e.preventDefault(); first.focus(); }
  }
  function openDrawer(){
    lastFocus = document.activeElement;
    drawer.classList.add('open');
    backdrop.classList.add('open');
    document.body.style.overflow = 'hidden';
    var f = focusables(); if (f.length) f[1] ? f[1].focus() : f[0].focus();
  }
  function closeDrawer(){
    drawer.classList.remove('open');
    backdrop.classList.remove('open');
    document.body.style.overflow = '';
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  }
})();
