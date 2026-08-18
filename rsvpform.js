// rsvpform.js — tier-aware single-page RSVP.
//
// One screen: who's coming (name / email / dietary, plus an optional +1), then
// yes-or-no for each event this tier can see, then Send. A second screen thanks
// them, offers calendar links and an inline note form.
//
// This was a three-step wizard until 30 Jul 2026. The form is short — a tier-4
// guest answers one event, a tier-1 guest answers five — so paging it hid how
// small the ask was and cost an extra tap for everyone. One screen shows the
// whole thing, and it removes step state, the back button, and split validation.
//
// Opens in the shared drawer from any [data-rsvp-open] trigger (the nav button),
// and renders inline if a <div id="sjrsvp"> exists (the RSVP page).
(function () {
  var inline = document.getElementById('sjrsvp');
  var triggers = document.querySelectorAll('[data-rsvp-open]');
  if (!inline && !triggers.length) return;

  /* ── tier + prefill ──────────────────────────────────────────────── */
  var rawTier = (document.documentElement.getAttribute('data-tier') || '').trim();
  var tier = /^[1-4]$/.test(rawTier) ? parseInt(rawTier, 10) : 3;

  function cookie(name){
    var m = document.cookie.split('; ').find(function(r){ return r.indexOf(name + '=') === 0; });
    return m ? decodeURIComponent(m.split('=').slice(1).join('=')) : '';
  }
  function titleCase(x){ return x.replace(/\b[a-z]/g, function(c){ return c.toUpperCase(); }); }

  var who = cookie('sj_guest').trim().toLowerCase();
  var PRE = {
    email: who.indexOf('@') > -1 ? who : '',
    name:  who && who.indexOf('@') === -1 ? titleCase(who) : '',
    party: 1
  };

  /* ── who is this, really? ─────────────────────────────────────────────
     The cookie is whatever the guest typed at the gate, so it filled in ONE
     field: an email login gave us an email and no name, a name login gave us a
     name and no email. Everyone else retyped what we already had on the list.

     guest_profile(key) closes that gap. It returns at most one row — the person
     holding that key, and the address we have for them — so an email login now
     fills the name too, and vice versa.

     Two things it deliberately will not do:
       · Surname keys ("lee", "tang") have no profile row at all. Several
         households share those keys, so prefilling would hand one family
         another family's name and address.
       · An address we could not confidently attribute inside a shared
         household returns no name rather than a guess.

     Cached in localStorage because it never changes for a given key, and
     because the cache means the fields are already filled on the second open
     instead of arriving a beat late. The network call is best-effort: if it
     fails, the form behaves exactly as it did before. */
  var PROFILE_KEY = 'sj-profile';
  var profileTried = false;

  function cachedProfile(){
    try {
      var c = JSON.parse(localStorage.getItem(PROFILE_KEY));
      return (c && c.key === who) ? c : null;
    } catch(e){ return null; }
  }

  function applyProfile(pr){
    if (!pr) return false;
    var moved = false;
    if (pr.person_name && !PRE.name)  { PRE.name  = pr.person_name; moved = true; }
    if (pr.email       && !PRE.email) { PRE.email = pr.email;       moved = true; }
    return moved;
  }

  applyProfile(cachedProfile());

  // Fills any field the guest hasn't already typed into. Never overwrites.
  function fillBlanks(root){
    var row = root.querySelector('.guest-row[data-guest="0"]');
    if (!row) return;
    var n = row.querySelector('.gname'), e = row.querySelector('.gemail');
    if (n && !n.value && PRE.name)  n.value = PRE.name;
    if (e && !e.value && PRE.email) e.value = PRE.email;
  }

  function loadProfile(root){
    if (profileTried || !who) return;
    profileTried = true;
    if (cachedProfile()) return;                 // already applied above
    if (!(window.SJUpload && window.SJUpload.rpc)) return;
    window.SJUpload.rpc('guest_profile', who).then(function(rows){
      var pr = Array.isArray(rows) ? rows[0] : rows;
      if (!pr) return;
      try { localStorage.setItem(PROFILE_KEY, JSON.stringify({
        key: who, person_name: pr.person_name || '', email: pr.email || ''
      })); } catch(e){}
      if (applyProfile(pr)) fillBlanks(root);
    }).catch(function(){ /* offline, or nothing on file — type it as before */ });
  }

  // Try to restore a previous submission so guests can edit & resubmit.
  var prev = null;
  try { prev = JSON.parse(localStorage.getItem('sj-rsvp-data')); } catch(e){}

  /* ── in-progress draft ───────────────────────────────────────────────
     Nothing was saved until Send, so closing the drawer by accident — a tap
     on the backdrop, a swipe, the back button — threw away everything typed.
     The drawer makes that easy to do, which is exactly why it needs this.
     Written on every keystroke and every yes/no, cleared once a reply is
     actually recorded. Separate from 'sj-rsvp-data', which is the submitted
     answer and drives edit mode. */
  var DRAFT_KEY = 'sj-rsvp-draft';
  function loadDraft(){
    try { return JSON.parse(localStorage.getItem(DRAFT_KEY)); } catch(e){ return null; }
  }
  function clearDraft(){
    try { localStorage.removeItem(DRAFT_KEY); } catch(e){}
  }
  if (prev) {
    if (prev.guests && prev.guests[0]) {
      PRE.name  = prev.guests[0].name  || PRE.name;
      PRE.email = prev.guests[0].email || PRE.email;
    }
    PRE.party = prev.party_size || 1;
  }

  /* ── events ──────────────────────────────────────────────────────── */
  var CT  = 'https://www.google.com/maps/search/?api=1&query=Chinese+Tuxedo+5+Doyers+St+New+York';
  var PIE = 'https://www.google.com/maps/search/?api=1&query=The+Pierre+Hotel+2+E+61st+St+New+York';
  var CT_ADDR  = 'Chinese Tuxedo, 5 Doyers St, New York, NY 10013';
  var PIE_ADDR = 'The Pierre, 2 E 61st St, New York, NY 10065';
  var EVENTS = [
    { k:'thursday',  name:'welcome dinner',   when:'Thu Mar 18', where:'TBD',            show: tier === 1,
      cal:'20270318/20270319', at:'New York, NY' },
    { k:'rehearsal', name:'rehearsal dinner', when:'Fri Mar 19', where:'Chinese Tuxedo', url:CT,  show: tier <= 2,
      cal:'20270319T220000Z/20270320T000000Z', at:CT_ADDR },
    { k:'friday',    name:'welcome party',    when:'Fri Mar 19', where:'Chinese Tuxedo', url:CT,  show: tier <= 3,
      cal:'20270320T000000Z/20270320T040000Z', at:CT_ADDR },
    { k:'saturday',  name:'the wedding',      when:'Sat Mar 20', where:'The Pierre',     url:PIE, show: true,
      cal:'20270320T210000Z/20270321T034500Z', at:PIE_ADDR },
    { k:'sunday',    name:'farewell brunch',  when:'Sun Mar 21', where:'TBD',            show: tier === 1,
      cal:'20270321/20270322', at:'New York, NY' }
  ].filter(function(e){ return e.show; });

  function calLink(e){
    return 'https://www.google.com/calendar/render?action=TEMPLATE' +
      '&text=' + encodeURIComponent('Sam + Jenni · ' + e.name) +
      '&dates=' + e.cal +
      '&location=' + encodeURIComponent(e.at) +
      '&details=' + encodeURIComponent('samandjenni.com');
  }

  /* ── HTML generators ─────────────────────────────────────────────── */

  function guestRow(p, i){
    var whose = i === 0 ? 'your' : '+1’s';
    var prevGuest = prev && prev.guests && prev.guests[i];
    var vName  = prevGuest ? prevGuest.name  : (i === 0 ? PRE.name  : '');
    var vEmail = prevGuest ? prevGuest.email : (i === 0 ? PRE.email : '');
    var vDiet  = prevGuest ? prevGuest.dietary : '';
    // Placeholders rather than labels above every field. Three 8.5px uppercase
    // captions per guest was ~39px of vertical space each and was most of what
    // made the block read as heavy — the labels restate what the fields
    // obviously are. Real <label>s stay for screen readers.
    var lab = function(id, text){
      return '<label class="sr-only" for="' + id + '">' + text + '</label>';
    };
    var nId = p + 'GN' + i, eId = p + 'GE' + i, dId = p + 'GD' + i;
    return '<div class="guest-row" data-guest="' + i + '">' +
      '<div class="guest-fields">' +
        '<div class="note-field">' + lab(nId, whose + ' name') +
          '<input id="' + nId + '" class="note-f gname" type="text" ' +
            'placeholder="' + whose + ' name" value="' + vName.replace(/"/g,'&quot;') + '"></div>' +
        '<div class="note-field">' + lab(eId, whose + ' email') +
          '<input id="' + eId + '" class="note-f gemail" type="email" ' +
            // No "(optional)" here — at 390px it clipped mid-word.
            'placeholder="' + whose + ' email" value="' +
            vEmail.replace(/"/g,'&quot;') + '"></div>' +
        '<div class="note-field span2">' + lab(dId, 'dietary or allergies') +
          '<input id="' + dId + '" class="note-f gdiet" type="text" ' +
            'placeholder="dietary / allergies" value="' + vDiet.replace(/"/g,'&quot;') + '"></div>' +
      '</div></div>';
  }

  function eventRows(){
    return EVENTS.map(function(e){
      var loc = e.url
        ? '<a href="' + e.url + '" target="_blank" rel="noopener" class="ev-loc">' + e.where + ' ↗</a>'
        : '<span class="ev-tbd">' + e.where + '</span>';
      return '<div class="rsvp-ev" data-ev="' + e.k + '">' +
        '<div class="rsvp-evname"><b>' + e.name + '</b>' +
          '<span class="ev-meta">(' + e.when + ', ' + loc + ')</span></div>' +
        // Three answers, not two. "Maybe" is a real reply — it stops guests who
        // aren't sure yet from either guessing "yes" (and inflating a count we
        // have to buy food against) or abandoning the form entirely. It is
        // stored like the others and simply never counts as attending.
        '<div class="rsvp-yn">' +
          '<button type="button" class="yn yes" data-k="' + e.k + '" data-v="yes" aria-label="Accepts">Yes</button>' +
          '<button type="button" class="yn maybe" data-k="' + e.k + '" data-v="maybe" aria-label="Not sure yet">Maybe</button>' +
          '<button type="button" class="yn no"  data-k="' + e.k + '" data-v="no" aria-label="Declines">No</button>' +
        '</div></div>';
    }).join('');
  }

  // The whole form, one screen.
  function formHTML(p){
    return '' +
      '<div class="rsvp-head">' +
        '<div class="rsvp-title">R S V P</div>' +
        '<div class="rsvp-sub">reply by January 2027</div>' +
      '</div>' +
      '<div class="rsvp-body">' +

        '<div class="rsvp-sect">' +
          '<div class="rsvp-sect-h">who’s coming</div>' +
          // Two containers with the toggle between them, deliberately. With one
          // container the +1's fields appeared ABOVE the "Bringing a +1?"
          // control that summons them, so answering yes made a block open
          // upwards, behind your thumb on a phone.
          '<div class="rsvp-guests" data-guests></div>' +
          '<div class="plusone">' +
            '<span class="plusone-q">Bringing a +1?</span>' +
            '<div class="plusone-yn">' +
              '<button type="button" class="yn yes p1" data-p1="yes">Yes</button>' +
              '<button type="button" class="yn no p1" data-p1="no">No</button>' +
            '</div>' +
          '</div>' +
          '<div class="rsvp-guests rsvp-guests--plus" data-guests-plus></div>' +
          '<input id="' + p + 'Count" type="hidden" value="' + PRE.party + '">' +
        '</div>' +

        '<div class="rsvp-sect">' +
          '<div class="rsvp-sect-h">which events' +
            '<span class="rsvp-sect-n">' + EVENTS.length + '</span></div>' +
          '<div class="rsvp-list">' + eventRows() + '</div>' +
        '</div>' +

        // The photo prompt used to live here. It was optional and it was the
        // second tallest thing on the form, so it now waits until after the
        // reply is safely in and asks on the thank-you screen instead.
        '<button class="note-btn rsvp-send" type="button" data-send>Send RSVP</button>' +
      '</div>';
  }

  // Thank-you + inline notes
  /* Step 1 of 3. The reply is in; now hand them on to the note, and the note
     hands them on to their details so the mailing address is confirmed.

     The whole note form used to be inlined here, duplicating notes.js. It isn't
     any more — this button carries data-note-open, which notes.js already
     listens for on document, and SJSheet replaces whatever sheet is live. So the
     hand-off costs one attribute rather than a second copy of the form. */
  function thanksHTML(calHtml){
    return '' +
      '<div class="note-thanks">' +
        '<div class="thanks-step">Step 1 of 3</div>' +
        '<div class="note-h">Thank you \u2661</div>' +
        '<p class="note-sub">your reply is in \u2014 we can\u2019t wait.</p>' +
        calHtml +
        // Was two sentences of explanation above a full-width red slab. The
        // button says what it does, so the paragraph only has to say how long
        // it takes \u2014 and the pill is the same size as every other pill.
        '<p class="thanks-ask">Two quick things while you\u2019re here.</p>' +
        '<div class="note-row3">' +
          '<button class="note-btn" type="button" data-note-open>Leave a note \u2192</button>' +
        '</div>' +
        '<button class="thanks-skip" type="button" data-close>skip \u2014 all done</button>' +
        '<p class="rsvp-edit-hint">Changed your mind? <button type="button" class="rsvp-edit-link" data-edit-rsvp>Edit your RSVP</button></p>' +
      '</div>';
  }

  /* ── wiring ──────────────────────────────────────────────────────── */

  function wire(root, p, onSent){
    var answers = {};
    var guestData = [];
    var plusOneVal = PRE.party > 1 ? 'yes' : 'no';
    var uploader = null;
    var card = root.querySelector('.note-card') || root;

    // Restore previous answers for edit mode
    if (prev && prev.events) answers = Object.assign({}, prev.events);

    function g(k){ return root.querySelector('#' + p + k); }

    // Merges into guestData; never shrinks it.
    //
    // This used to be a straight `guestData = rows.map(...)`, which quietly
    // deleted the +1 whenever it ran while only one row was on screen — and
    // setPlusOne calls it BEFORE renderGuests, so that was every toggle.
    // Answering "yes", typing the +1's name, tapping "no" and "yes" again lost
    // the name. It also broke draft restore, since setPlusOne runs during the
    // first render and truncated the restored array before it was ever drawn.
    // Extra entries are trimmed at send time from the row count instead.
    function saveGuestFields(){
      var rows = [].slice.call(root.querySelectorAll('.guest-row'));
      if (!rows.length) return;
      rows.forEach(function(r){
        // Indexed by data-guest, not DOM position — the two rows now live in
        // separate containers with the +1 toggle between them.
        guestData[Number(r.getAttribute('data-guest'))] = {
          name:r.querySelector('.gname').value,
          email:r.querySelector('.gemail').value,
          dietary:r.querySelector('.gdiet').value };
      });
    }

    // The guests actually being reported for: as many as there are rows.
    function activeGuests(){
      return guestData.slice(0, root.querySelectorAll('.guest-row').length);
    }

    // Reads the DOM first so it can't persist a stale copy of the fields.
    function saveDraft(){
      if (!root.querySelector('[data-send]')) return;   // thank-you screen, nothing to draft
      saveGuestFields();
      try {
        localStorage.setItem(DRAFT_KEY, JSON.stringify({
          guests: guestData, events: answers, plusOne: plusOneVal
        }));
      } catch(e){}   // private mode / quota — a lost draft must never break Send
    }

    // Only replaces the guest block, so the event answers rendered elsewhere
    // on the page survive a +1 toggle untouched.
    function renderGuests(){
      var box  = root.querySelector('[data-guests]');
      var plus = root.querySelector('[data-guests-plus]');
      if (!box) return;
      var n = Math.max(1, Math.min(2, parseInt(g('Count').value, 10) || 1));
      box.innerHTML = guestRow(p, 0);
      if (plus) plus.innerHTML = n > 1 ? guestRow(p, 1) : '';

      [].forEach.call(root.querySelectorAll('.guest-row'), function(r){
        var i = Number(r.getAttribute('data-guest'));
        if (guestData[i]) {
          r.querySelector('.gname').value  = guestData[i].name;
          r.querySelector('.gemail').value = guestData[i].email;
          r.querySelector('.gdiet').value  = guestData[i].dietary;
        }
        // Rows are rebuilt whenever the +1 toggles, so the listeners go on here
        // rather than once in renderForm.
        r.addEventListener('input', saveDraft);
      });
    }

    function setPlusOne(v){
      plusOneVal = v;
      var countEl = g('Count');
      if (countEl) countEl.value = (v === 'yes') ? '2' : '1';
      root.querySelectorAll('.yn.p1').forEach(function(x){
        x.classList.toggle('on', x.dataset.p1 === v);
      });
      saveGuestFields();
      renderGuests();
      saveDraft();
    }

    function showErr(msg){
      var box = root.querySelector('.form-err');
      if (!box) {
        box = document.createElement('p');
        box.className = 'form-err';
        box.setAttribute('role', 'alert');
        var send = root.querySelector('[data-send]');
        if (send) send.parentNode.insertBefore(box, send);
      }
      box.textContent = msg;
    }
    function clearErr(){ var box = root.querySelector('.form-err'); if (box) box.remove(); }

    // On one long screen an error message above Send isn't enough — mark the
    // rows that still need an answer and scroll the first one into view.
    function flagMissing(){
      var first = null;
      root.querySelectorAll('.rsvp-ev').forEach(function(row){
        var need = !answers[row.dataset.ev];
        row.classList.toggle('miss', need);
        if (need && !first) first = row;
      });
      if (first && first.scrollIntoView) {
        try { first.scrollIntoView({ behavior:'smooth', block:'center' }); }
        catch(e){ first.scrollIntoView(); }
      }
    }

    function calBlock(){
      var yes = EVENTS.filter(function(e){ return answers[e.k] === 'yes'; });
      if (!yes.length) return '';
      return '<div class="thanks-cal">' +
        '<p class="thanks-cal-h">Add ' + (yes.length > 1 ? 'these' : 'it') + ' to your calendar</p>' +
        yes.map(function(e){
          return '<a class="cal-chip" href="' + calLink(e) + '" target="_blank" rel="noopener">' +
            '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" ' +
            'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
            '<rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/>' +
            '<line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>' +
            e.name + '</a>';
        }).join('') +
      '</div>';
    }

    /* ── the form ────────────────────────────────────────────────── */
    function renderForm(){
      card.innerHTML = formHTML(p);
      clearErr();

      renderGuests();

      var p1wrap = root.querySelector('.plusone');
      if (p1wrap) {
        p1wrap.querySelectorAll('.yn.p1').forEach(function(b){
          b.addEventListener('click', function(){ setPlusOne(b.dataset.p1); });
        });
        setPlusOne(plusOneVal);
      }

      root.querySelectorAll('.yn:not(.p1)').forEach(function(b){
        if (answers[b.dataset.k] === b.dataset.v) b.classList.add('on');
        b.addEventListener('click', function(){
          var k = b.dataset.k;
          answers[k] = b.dataset.v;
          root.querySelectorAll('.yn[data-k="' + k + '"]').forEach(function(x){ x.classList.remove('on'); });
          b.classList.add('on');
          var row = b.closest('.rsvp-ev');
          if (row) row.classList.remove('miss');
          saveDraft();
        });
      });

      root.querySelector('[data-send]').addEventListener('click', function(){
        var btn = this;

        var rows = [].slice.call(root.querySelectorAll('.guest-row'));
        var missing = [];
        if (!rows.length || !rows[0].querySelector('.gname').value.trim()) missing.push('your name');
        var email = rows.length ? rows[0].querySelector('.gemail').value.trim() : '';
        if (!email) missing.push('your email');
        else if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) missing.push('a valid email');
        if (missing.length) { showErr('We still need ' + missing.join(' and ') + '.'); return; }

        if (EVENTS.some(function(e){ return !answers[e.k]; })){
          showErr('Please pick an answer for every event.');
          flagMissing();
          return;
        }
        clearErr();
        saveGuestFields();

        var evAnswers = {};
        EVENTS.forEach(function(e){ evAnswers[e.k] = answers[e.k]; });

        var label = btn.textContent;
        btn.disabled = true; btn.textContent = 'Sending…';

        var guests = activeGuests();
        var payload = {
          guest_key: window.SJUpload ? window.SJUpload.guestKey() : '',
          tier: tier,
          party_size: guests.length,
          events: evAnswers,
          guests: guests,
          photo_path: uploader ? uploader.getPath() : ''
        };

        // Plain INSERT, deliberately — every submission is a new row.
        //
        // This used to upsert on guest_key and it failed for EVERY guest:
        // `resolution=merge-duplicates` makes Postgres run INSERT ON CONFLICT
        // DO UPDATE, RLS checks the UPDATE arm too, and this table only has an
        // INSERT policy. Result: a 401 and "that didn't send" on every reply.
        //
        // Appending rather than updating is also the safer shape here. guest_key
        // is the sj_guest cookie, and shared surnames ("lee", "tang") are one key
        // across several households — an upsert would let one family silently
        // overwrite another's answers. Reading the newest row per guest_key gives
        // the current reply and keeps every earlier version.
        var saving = (window.SJUpload && window.SJUpload.save)
          ? window.SJUpload.save('wedding_rsvps', payload)
          : Promise.reject(new Error('no uploader'));

        saving.then(function(){
          // Only once the row is actually recorded. Clearing on click would
          // lose the draft on a failed send, which is when it matters most.
          clearDraft();
          try {
            localStorage.setItem('sj-rsvp-done', '1');
            localStorage.setItem('sj-rsvp-data', JSON.stringify(payload));
          } catch(e){}
          document.dispatchEvent(new CustomEvent('sj:rsvped'));
          prev = payload;
          renderThanks();
        }).catch(function(){
          btn.disabled = false; btn.textContent = label;
          showErr('That didn’t send — check your connection and try again. ' +
                  'Still stuck? Text us and we’ll add you by hand.');
        });
      });

      if (card.scrollIntoView) {
        try { card.scrollIntoView({ behavior:'smooth', block:'start' }); }
        catch(e){ card.scrollIntoView(true); }
      }
    }

    /* ── the thank-you ───────────────────────────────────────────── */
    function renderThanks(){
      card.innerHTML = thanksHTML(calBlock());

      // No inline note form to wire any more — the button above opens the
      // note sheet, which notes.js owns.
      var skip = root.querySelector('[data-close]');
      if (skip && onSent) skip.addEventListener('click', onSent);

      var editBtn = root.querySelector('[data-edit-rsvp]');
      if (editBtn) editBtn.addEventListener('click', renderForm);
    }

    /* ── initial render ──────────────────────────────────────────── */
    var alreadyDone = false;
    try { alreadyDone = localStorage.getItem('sj-rsvp-done') === '1'; } catch(e){}

    if (alreadyDone && prev) {
      renderThanks();
    } else {
      // Pick up anything typed before the drawer was closed. Seeding guestData
      // is enough for the fields — renderGuests writes it back over the markup.
      var draft = loadDraft();
      if (draft) {
        if (draft.guests && draft.guests.length) guestData = draft.guests;
        if (draft.events) answers = Object.assign(answers, draft.events);
        if (draft.plusOne) plusOneVal = draft.plusOne;
      }
      renderForm();
      // After the first paint, so an empty name/email field is filled the moment
      // the lookup lands rather than the form waiting on the network to appear.
      loadProfile(root);
    }
  }

  /* ── mount ───────────────────────────────────────────────────────────
     The drawer and the page are both wanted — the drawer so a guest can reply
     without losing their place, the page so the reply has a URL to put in a
     reminder email. What was wrong is that rsvp.html mounted BOTH: the inline
     form, plus a second live copy in the drawer stacked over it, each with its
     own fields and its own Send. Two drafts, two submissions, one guest.

     So: where the form is already on the page, the nav button scrolls to it.
     Everywhere else, the drawer. Never both.

     Delegated from document because mobilenav.js builds its RSVP link at
     runtime — a NodeList captured here can miss it depending on script order. */
  function firstEmptyField(scope){
    var f = [].slice.call(scope.querySelectorAll('.note-f'));
    for (var i = 0; i < f.length; i++) if (!f[i].value.trim()) return f[i];
    return f[0] || null;
  }

  if (inline) {
    inline.innerHTML = '<div class="note-card">' + formHTML('r') + '</div>';
    wire(inline, 'r');

    document.addEventListener('click', function (e) {
      var t = e.target.closest && e.target.closest('[data-rsvp-open]');
      if (!t || inline.contains(t)) return;
      e.preventDefault();
      try { inline.scrollIntoView({ behavior:'smooth', block:'start' }); }
      catch(err){ inline.scrollIntoView(true); }
      var f = firstEmptyField(inline);
      // Deliberately not focused on touch: it throws up the keyboard and hides
      // the form the tap was meant to reveal.
      if (f && !window.matchMedia('(hover:none)').matches) {
        setTimeout(function(){ f.focus({ preventScroll:true }); }, 400);
      }
    });
  }

  /* ── the sheet ─────────────────────────────────────────────────────────
     A full-screen presentation built in the same language as the phone menu:
     flat, no card, wordmark top-left, ✕ top-right. Used for the one-time
     prompt on a guest's first visit. Styling lives under .sjsheet in site.css,
     including the red skin — flip SHEET_RED to try it.                    */
  var SHEET_RED = false;

  // The sheet itself now lives in drawer.js, shared with the note form — it
  // gained a focus trap, focus restore and a scroll lock that this one-off
  // version never had.
  function openSheet(){
    if (!window.SJSheet) return;
    return window.SJSheet.open({
      label: 'RSVP',
      className: SHEET_RED ? 'sjsheet--red' : '',
      // no html: wire() renders into the body itself, as it does inline
      onMount: function(api){ wire(api.body, 's', api.close); }
    }).close;
  }

  /* ── one-time prompt ───────────────────────────────────────────────────
     Opens the sheet once, on a signed-in guest's first visit, and never
     nags again. Deliberately NOT a wall: the ✕ is the first thing your eye
     lands on, and the reply-by date is January 2027 — most guests genuinely
     cannot answer yet, and a forced answer now is a worse number than a
     blank one.

     Whether they've already replied is asked of the database, not just
     localStorage: localStorage is per-device, so a guest who replied on a
     laptop would otherwise be prompted again on their phone. The RPC is
     security-definer and answers a bare true/false, so it reveals nothing
     about anyone else. localStorage still short-circuits it, so the common
     case costs no request.

     To make this a hard block nearer the date, gate the ✕ and skip the
     dismissed check — the plumbing is already here.                       */
  var PROMPT_KEY = 'sj-rsvp-prompted';

  function alreadyReplied(){
    var done = false;
    try { done = localStorage.getItem('sj-rsvp-done') === '1'; } catch(e){}
    if (done) return Promise.resolve(true);
    if (!window.SJUpload || !window.SJUpload.rpc) return Promise.resolve(false);
    return window.SJUpload.rpc('guest_rsvped', window.SJUpload.guestKey())
      .then(function(yes){
        // Cache a true so later pages skip the round trip.
        if (yes) { try { localStorage.setItem('sj-rsvp-done','1'); } catch(e){} }
        return !!yes;
      })
      .catch(function(){ return true; });   // never prompt on an error
  }

  function maybePrompt(){
    if (!who) return;                       // signed out — the gate has them
    if (inline) return;                     // already looking at the form
    var seen = true;
    try { seen = localStorage.getItem(PROMPT_KEY) === '1'; } catch(e){ return; }
    if (seen) return;
    alreadyReplied().then(function(replied){
      if (replied) return;
      try { localStorage.setItem(PROMPT_KEY, '1'); } catch(e){}
      openSheet();
    });
  }

  // expose for the nav / console: SJRsvp.sheet() opens it on demand
  window.SJRsvp = { sheet: openSheet, red: function(v){ SHEET_RED = v !== false; } };

  // Every RSVP now opens the sheet — the nav button, the phone menu, the pill
  // on the note thank-you, and the one-time prompt. One presentation at one
  // width, rather than a side drawer on the button and a sheet on the prompt.
  //
  // The side drawer is no longer created for the RSVP at all. That also retires
  // the duplicate-form problem by construction: there is only ever one RSVP in
  // the document, because openSheet() refuses to build a second.
  //
  // SJDrawer is still used by the note form — untouched.
  //
  // The `!inline` guard stays: on rsvp.html the form is already on the page, so
  // the button scrolls to it instead of opening anything.
  if (!inline && triggers.length) {
    document.addEventListener('click', function (e) {
      var t = e.target.closest && e.target.closest('[data-rsvp-open]');
      if (!t) return;
      e.preventDefault();
      openSheet();
    });
  }

  // Last, so nothing else is half-built when the sheet goes up.
  maybePrompt();
})();
