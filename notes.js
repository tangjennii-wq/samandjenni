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
      '<p class="note-top">Share some wild, weird memories, feels, etc. with us \u2661</p>' +
      '<div class="note-thread" aria-hidden="true"></div>' +
      (intro ? '<p class="note-intro">' + intro + '</p>' : '') +
      '<div class="note-field">' +
        '<label class="note-l" for="{p}Mem">a favorite memory with Sam and/or Jenni</label>' +
        '<textarea id="{p}Mem" class="note-f note-ta"></textarea>' +
      '</div>' +
      '<div class="note-row2">' +
        '<div class="note-field"><label class="note-l" for="{p}WordS">one word that defines Sam</label>' +
          '<input id="{p}WordS" class="note-f" type="text"></div>' +
        '<div class="note-field"><label class="note-l" for="{p}WordJ">one word that defines Jenni</label>' +
          '<input id="{p}WordJ" class="note-f" type="text"></div>' +
      '</div>' +
      '<div class="note-field note-field--song">' +
        '<label class="note-l" for="{p}Song">a song you want to hear</label>' +
        '<input id="{p}Song" class="note-f" type="text" placeholder="artist – title">' +
      '</div>' +
      '<div class="note-field photo-field">' +
        '<label class="note-l" for="{p}Photo">a photo of you &amp; Sam, you &amp; Jenni, us, etc!</label>' +
        '<div class="photo-stack">' +
          '<figure class="photo-eg" aria-hidden="true">' +
            '<img src="img/photo-example.jpg" alt="" loading="lazy" onerror="this.closest(\'.photo-eg\').remove()">' +
            '<figcaption>like this</figcaption>' +
          '</figure>' +
        '<label class="photo-drop" for="{p}Photo">' +
          '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
            '<rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/></svg>' +
          '<span class="photo-txt">upload a photo</span>' +
        '</label>' +
        '</div>' +
        '<input id="{p}Photo" class="photo-input" type="file" accept="image/*">' +
        '<div class="photo-preview" data-preview hidden></div>' +
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
      var btn = this;
      var val = function(k){ var el = g(k); return el ? el.value.trim() : ''; };
      var saving = (window.SJUpload && window.SJUpload.save)
        ? window.SJUpload.save('wedding_notes', {
            guest_key: window.SJUpload.guestKey(),
            memory: val('Mem'),
            word_sam: val('WordS'),
            word_jenni: val('WordJ'),
            song: val('Song'),
            from_name: val('Name'),
            photo_path: up ? up.getPath() : ''
          })
        : Promise.reject(new Error('no uploader'));

      var label = btn.textContent;
      btn.disabled = true; btn.textContent = 'Sending\u2026';

      saving.then(function () {
      Object.keys(cache).forEach(function(k){ cache[k] = ''; });
      var card = root.querySelector('.note-card') || root;
      // Feature switch lives in personalize.js. The count in the copy has to
      // follow it — "two more things" above a single button reads as a bug.
      var ou = !!(window.SJ_FEATURES && window.SJ_FEATURES.overUnder);
      card.innerHTML = '<div class="note-thanks"><div class="note-h">Thank you ♡</div>' +
        '<p class="note-sub">we’ve got it — see you in New York.</p>' +
        '<p class="thanks-ask">' + (ou ? 'two more things' : 'one more thing') +
          ', if you have a minute —</p>' +
        '<div class="thanks-pills">' +
          '<button class="thanks-pill pill-rsvp" type="button" data-go-rsvp>RSVP</button>' +
          (ou ? '<button class="thanks-pill pill-ou" type="button" data-ou-open>Over/Under</button>' : '') +
        '</div>' +
        '<button class="thanks-skip" type="button" data-close>no thanks, all done</button>' +
        '</div>';
      var goR = card.querySelector('[data-go-rsvp]');
      if (goR) goR.addEventListener('click', function(){
        var t = document.querySelector('.nav-cta [data-rsvp-open]') || document.querySelector('[data-rsvp-open]');
        if (t) t.click();
      });
      var skipN = card.querySelector('[data-close]');
      if (skipN && onSent) skipN.addEventListener('click', onSent);
      }).catch(function () {
        btn.disabled = false; btn.textContent = label;
        var box = root.querySelector('.form-err');
        if (!box) {
          box = document.createElement('p');
          box.className = 'form-err';
          box.setAttribute('role', 'alert');
          btn.parentNode.insertBefore(box, btn);
        }
        box.textContent = 'That didn\u2019t send \u2014 check your connection and try again.';
      });
      return;
    });
  }

  if (inline) {
    inline.innerHTML = '<div class="note-card">' + formHTML('n', inline.getAttribute('data-intro') || '') + '</div>';
    wire(inline, 'n');
  }

  // Full-screen sheet, same as the RSVP — the side drawer is retired here too.
  //
  // Built fresh on each open rather than once up front, which the drawer did.
  // The typed-so-far values survive that because `cache` above is module-level
  // and wire() reads it back on mount; only the DOM is thrown away.
  //
  // Delegated from document so the phone menu's note button works — mobilenav.js
  // builds that at runtime, and a NodeList captured here can miss it.
  if (triggers.length && window.SJSheet) {
    document.addEventListener('click', function (e) {
      var t = e.target.closest && e.target.closest('[data-note-open]');
      if (!t) return;
      e.preventDefault();
      window.SJSheet.open({
        label: 'Leave a note',
        html: '<div class="note-card note-card--sheet">' + formHTML('d', '') + '</div>',
        onMount: function (api) { wire(api.body, 'd', api.close); }
      });
    });
  }
})();
