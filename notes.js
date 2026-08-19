// notes.js — optional "leave us a note" form.
// Opens in the shared drawer from any [data-note-open] trigger (the nav button).
// Also renders inline if a <div id="sjnote"> exists. Values persist across
// open/close. Submit emails today; set GFORM to post into a Google Sheet.
(function () {
  var inline = document.getElementById('sjnote');
  var triggers = document.querySelectorAll('[data-note-open]');
  if (!inline && !triggers.length) return;

  var GFORM = null; // { action, mem, word, song, name }

  /* Who's writing. The "your name (optional)" box is gone — a guest has already
     told us who they are at the gate, so asking again is a redundant field on a
     form we want short.

     One caveat, recorded here because it isn't obvious from the data: sj_guest
     is whatever they signed in WITH. Full name or email pins the household
     exactly. A bare surname does not for the five shared ones — `lee` spans
     three households and `tang` two — so for those, from_name will read "Lee"
     and the household is genuinely ambiguous. guest_key is stored alongside it
     either way, so nothing is lost that we had before; the old field was
     optional and usually blank. */
  function cookie(name){
    var m = document.cookie.split('; ').find(function(r){ return r.indexOf(name + '=') === 0; });
    return m ? decodeURIComponent(m.split('=').slice(1).join('=')) : '';
  }
  function signedInName(){
    var who = cookie('sj_guest').trim();
    if (!who) return '';
    if (who.indexOf('@') > -1) return who;          // email: leave as typed
    return who.toLowerCase().replace(/\b[a-z]/g, function(c){ return c.toUpperCase(); });
  }

  function formHTML(p, intro){
    return ('' +
      // The note sheet was the only one of the three with no heading: the RSVP
      // opens on "R S V P", the details panel on the guest's name, and this one
      // went straight into a sentence. Same .note-h treatment as the thank-you
      // screen already uses, so all three sheets now start the same way.
      '<div class="note-h">A note</div>' +
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
      // Photo above, upload beneath it — the two side by side never sat right.
      '<div class="note-field photo-field">' +
        '<label class="note-l" for="{p}Photo">a photo of you &amp; Sam, you &amp; Jenni, us, etc!</label>' +
        '<div class="photo-stack">' +
          '<figure class="photo-eg" aria-hidden="true">' +
            '<img src="img/photo-example.jpg" alt="" decoding="async" onerror="this.closest(\'.photo-eg\').remove()">' +
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
      // No name field: signedInName() supplies it. Send stands alone.
      '<div class="note-row3">' +
        '<button class="note-btn" type="button" data-send>Send</button>' +
      '</div>').replace(/\{p\}/g, p);
  }

  // Name dropped from the cache along with its field.
  var cache = { Mem:'', WordS:'', WordJ:'', Song:'' };

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
            from_name: signedInName(),
            photo_path: up ? up.getPath() : ''
          })
        : Promise.reject(new Error('no uploader'));

      var label = btn.textContent;
      btn.disabled = true; btn.textContent = 'Sending\u2026';

      saving.then(function () {
      Object.keys(cache).forEach(function(k){ cache[k] = ''; });
      var card = root.querySelector('.note-card') || root;
      card.innerHTML = '<div class="note-thanks">' +
        '<div class="thanks-step">Step 2 of 3</div>' +
        '<div class="note-h">Thank you \u2661</div>' +
        '<p class="note-sub">we\u2019ve got it \u2014 see you in New York.</p>' +
        // Last step: confirm where the paper invitation should go. That is the
        // one thing we cannot work out for them, and the reason this chain
        // exists at all.
        '<p class="thanks-ask">One last thing \u2014 check your details so the ' +
          'invitation reaches the right address.</p>' +
        '<div class="note-row3">' +
          '<button class="note-btn" type="button" data-acct-open>Check my details \u2192</button>' +
        '</div>' +
        '<button class="thanks-skip" type="button" data-close>no thanks, all done</button>' +
        '</div>';
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
