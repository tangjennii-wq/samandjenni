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

  // Try to restore a previous submission so guests can edit & resubmit.
  var prev = null;
  try { prev = JSON.parse(localStorage.getItem('sj-rsvp-data')); } catch(e){}
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
    return '<div class="guest-row">' +
      '<div class="guest-fields">' +
        '<div class="note-field"><label class="note-l" for="' + p + 'GN' + i + '">' + whose + ' name</label>' +
          '<input id="' + p + 'GN' + i + '" class="note-f gname" type="text" value="' +
            vName.replace(/"/g,'&quot;') + '"></div>' +
        '<div class="note-field"><label class="note-l" for="' + p + 'GE' + i + '">' + whose + ' email' +
          (i === 0 ? '' : ' <span class="opt">(optional)</span>') + '</label>' +
          '<input id="' + p + 'GE' + i + '" class="note-f gemail" type="email" value="' +
            vEmail.replace(/"/g,'&quot;') + '"></div>' +
        '<div class="note-field span2"><label class="note-l" for="' + p + 'GD' + i + '">dietary / allergies</label>' +
          '<input id="' + p + 'GD' + i + '" class="note-f gdiet" type="text" placeholder="none" value="' +
            vDiet.replace(/"/g,'&quot;') + '"></div>' +
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
        '<div class="rsvp-yn">' +
          '<button type="button" class="yn yes" data-k="' + e.k + '" data-v="yes" aria-label="Accepts">Yes</button>' +
          '<button type="button" class="yn no"  data-k="' + e.k + '" data-v="no" aria-label="Declines">No</button>' +
        '</div></div>';
    }).join('');
  }

  // The whole form, one screen.
  function formHTML(p){
    return '' +
      '<div class="rsvp-head">' +
        '<div class="rsvp-title">R S V P</div>' +
        '<div class="rsvp-sub">kindly reply by January 2027</div>' +
      '</div>' +
      '<div class="rsvp-body">' +

        '<div class="rsvp-sect">' +
          '<div class="rsvp-sect-h">who’s coming</div>' +
          '<div class="rsvp-guests" data-guests></div>' +
          '<div class="plusone">' +
            '<span class="plusone-q">Bringing a +1?</span>' +
            '<div class="plusone-yn">' +
              '<button type="button" class="yn yes p1" data-p1="yes">Yes</button>' +
              '<button type="button" class="yn no p1" data-p1="no">No</button>' +
            '</div>' +
          '</div>' +
          '<input id="' + p + 'Count" type="hidden" value="' + PRE.party + '">' +
        '</div>' +

        '<div class="rsvp-sect">' +
          '<div class="rsvp-sect-h">which events' +
            '<span class="rsvp-sect-n">' + EVENTS.length + '</span></div>' +
          '<div class="rsvp-list">' + eventRows() + '</div>' +
        '</div>' +

        '<div class="rsvp-photo-block">' +
          '<p class="rsvp-photo-note"><b>Send us a photo of you &amp; Sam, you &amp; Jenni, us, etc!</b> ' +
            'Blurry is fine, unflattering is better. <span>(optional)</span></p>' +
          '<div class="rsvp-extra">' +
            '<figure class="photo-eg" aria-hidden="true">' +
              '<img src="img/photo-example.jpg" alt="" loading="lazy" onerror="this.closest(\'.photo-eg\').remove()">' +
              '<figcaption>like this</figcaption>' +
            '</figure>' +
            '<label class="rsvp-photo-btn compact" for="' + p + 'Photo">' +
              '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
                '<rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/></svg>' +
              '<span class="photo-txt">upload a photo</span>' +
            '</label>' +
            '<input id="' + p + 'Photo" class="photo-input" type="file" accept="image/*">' +
          '</div>' +
          '<div class="photo-preview" data-preview hidden></div>' +
        '</div>' +

        '<button class="note-btn rsvp-send" type="button" data-send>Send RSVP</button>' +
      '</div>';
  }

  // Thank-you + inline notes
  function thanksHTML(calHtml){
    return '' +
      '<div class="note-thanks">' +
        '<div class="note-h">Thank you ♡</div>' +
        '<p class="note-sub">your reply is in — we can’t wait.</p>' +
        calHtml +
        '<p class="thanks-ask">while you’re here — leave us a note, submit a song request, or share a favorite memory.</p>' +
        '<div class="rsvp-notes-inline">' +
          '<div class="note-field">' +
            '<label class="note-l" for="rn_Mem">a favorite memory with Sam and/or Jenni</label>' +
            '<textarea id="rn_Mem" class="note-f note-ta"></textarea>' +
          '</div>' +
          '<div class="note-row2">' +
            '<div class="note-field"><label class="note-l" for="rn_WordS">one word that defines Sam</label>' +
              '<input id="rn_WordS" class="note-f" type="text"></div>' +
            '<div class="note-field"><label class="note-l" for="rn_WordJ">one word that defines Jenni</label>' +
              '<input id="rn_WordJ" class="note-f" type="text"></div>' +
          '</div>' +
          '<div class="note-field note-field--song">' +
            '<label class="note-l" for="rn_Song">a song you want to hear</label>' +
            '<input id="rn_Song" class="note-f" type="text" placeholder="artist – title">' +
          '</div>' +
          '<button class="note-btn" type="button" data-send-note>Send note</button>' +
        '</div>' +
        '<button class="thanks-skip" type="button" data-close>skip — all done</button>' +
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

    function saveGuestFields(){
      var rows = [].slice.call(root.querySelectorAll('.guest-row'));
      guestData = rows.map(function(r){
        return { name:r.querySelector('.gname').value, email:r.querySelector('.gemail').value,
                 dietary:r.querySelector('.gdiet').value };
      });
    }

    // Only replaces the guest block, so the event answers rendered elsewhere
    // on the page survive a +1 toggle untouched.
    function renderGuests(){
      var box = root.querySelector('[data-guests]');
      if (!box) return;
      var n = Math.max(1, Math.min(2, parseInt(g('Count').value, 10) || 1));
      var html = ''; for (var i = 0; i < n; i++) html += guestRow(p, i);
      box.innerHTML = html;
      [].forEach.call(box.querySelectorAll('.guest-row'), function(r, i){
        if (!guestData[i]) return;
        r.querySelector('.gname').value  = guestData[i].name;
        r.querySelector('.gemail').value = guestData[i].email;
        r.querySelector('.gdiet').value  = guestData[i].dietary;
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
        });
      });

      uploader = (window.SJUpload ? window.SJUpload.wire(g('Photo'), root.querySelector('[data-preview]')) : null);

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
          showErr('Please pick yes or no for every event.');
          flagMissing();
          return;
        }
        clearErr();
        saveGuestFields();

        var evAnswers = {};
        EVENTS.forEach(function(e){ evAnswers[e.k] = answers[e.k]; });

        var label = btn.textContent;
        btn.disabled = true; btn.textContent = 'Sending…';

        var payload = {
          guest_key: window.SJUpload ? window.SJUpload.guestKey() : '',
          tier: tier,
          party_size: guestData.length,
          events: evAnswers,
          guests: guestData,
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

      var noteBtn = root.querySelector('[data-send-note]');
      if (noteBtn) {
        noteBtn.addEventListener('click', function(){
          var btn = this;
          var val = function(id){ var el = document.getElementById(id); return el ? el.value.trim() : ''; };
          var mem = val('rn_Mem'), wS = val('rn_WordS'), wJ = val('rn_WordJ'), song = val('rn_Song');
          if (!mem && !wS && !wJ && !song) return;  // nothing to send

          var label = btn.textContent;
          btn.disabled = true; btn.textContent = 'Sending…';

          var noteSaving = (window.SJUpload && window.SJUpload.save)
            ? window.SJUpload.save('wedding_notes', {
                guest_key: window.SJUpload.guestKey(),
                memory: mem, word_sam: wS, word_jenni: wJ, song: song,
                from_name: (guestData[0] && guestData[0].name) || PRE.name,
                photo_path: ''
              })
            : Promise.reject(new Error('no uploader'));

          noteSaving.then(function(){
            var wrap = root.querySelector('.rsvp-notes-inline');
            if (wrap) wrap.innerHTML = '<p class="note-sub" style="margin-top:14px">Note sent ♡ thank you!</p>';
          }).catch(function(){
            btn.disabled = false; btn.textContent = label;
          });
        });
      }

      var skip = root.querySelector('[data-close]');
      if (skip && onSent) skip.addEventListener('click', onSent);

      var editBtn = root.querySelector('[data-edit-rsvp]');
      if (editBtn) editBtn.addEventListener('click', renderForm);
    }

    /* ── initial render ──────────────────────────────────────────── */
    var alreadyDone = false;
    try { alreadyDone = localStorage.getItem('sj-rsvp-done') === '1'; } catch(e){}

    if (alreadyDone && prev) renderThanks();
    else renderForm();
  }

  /* ── mount ───────────────────────────────────────────────────────── */
  if (inline) {
    inline.innerHTML = '<div class="note-card">' + formHTML('r') + '</div>';
    wire(inline, 'r');
  }

  if (triggers.length && window.SJDrawer) {
    var d = window.SJDrawer.create({
      label: 'RSVP',
      html: '<div class="note-card note-card--drawer">' + formHTML('q') + '</div>',
      onMount: function (api) { wire(api.body, 'q', api.close); }
    });
    triggers.forEach(function (t) {
      t.addEventListener('click', function (e) { e.preventDefault(); d.open(); });
    });
  }
})();
