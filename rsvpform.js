// rsvpform.js — tier-aware RSVP.
// Opens in the shared drawer from any [data-rsvp-open] trigger (the nav button),
// and renders inline if a <div id="sjrsvp"> exists (the RSVP page).
// Each guest only sees the events their tier is invited to (same rules as
// personalize.js). Replies email today; set GFORM to post into a Google Sheet.
(function () {
  var inline = document.getElementById('sjrsvp');
  var triggers = document.querySelectorAll('[data-rsvp-open]');
  if (!inline && !triggers.length) return;

  // From the RSVP form's "Get pre-filled link":
  // { action:'…/formResponse', name:'entry.1', email:'entry.2', events:'entry.3',
  //   count:'entry.4', diet:'entry.5', note:'entry.6' }
  var GFORM = null;

  var rawTier = (document.documentElement.getAttribute('data-tier') || '').trim();
  var tier = /^[1-4]$/.test(rawTier) ? parseInt(rawTier, 10) : 3;

  // What the guest typed at the gate (email or last name) — used to prefill.
  // No household lookup table here on purpose: this file is public.
  var GUEST_MAP = {};

  function cookie(name){
    var m = document.cookie.split('; ').find(function(r){ return r.indexOf(name + '=') === 0; });
    return m ? decodeURIComponent(m.split('=').slice(1).join('=')) : '';
  }
  function titleCase(x){ return x.replace(/\b[a-z]/g, function(c){ return c.toUpperCase(); }); }

  var who = cookie('sj_guest').trim().toLowerCase();
  var known = GUEST_MAP[who] || {};
  var PRE = {
    email: known.email || (who.indexOf('@') > -1 ? who : ''),
    name:  known.name  || (who && who.indexOf('@') === -1 ? titleCase(who) : ''),
    party: Math.min(2, known.party || 1)
  };

  var CT  = 'https://www.google.com/maps/search/?api=1&query=Chinese+Tuxedo+5+Doyers+St+New+York';
  var PIE = 'https://www.google.com/maps/search/?api=1&query=The+Pierre+Hotel+2+E+61st+St+New+York';

  // One line per event: name, then (day date, place). Keeps the whole form on
  // a single phone screen.
  // `cal` = Google Calendar dates + the location string used in the invite.
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

  function formHTML(p){
    var rows = EVENTS.map(function(e){
      var loc = e.url
        ? '<a href="' + e.url + '" target="_blank" rel="noopener" class="ev-loc">' + e.where + ' ↗</a>'
        : '<span class="ev-tbd">' + e.where + '</span>';
      return '<div class="rsvp-ev">' +
        '<div class="rsvp-evname"><b>' + e.name + '</b>' +
          '<span class="ev-meta">(' + e.when + ', ' + loc + ')</span></div>' +
        '<div class="rsvp-yn">' +
          '<button type="button" class="yn yes" data-k="' + e.k + '" data-v="yes" aria-label="Accepts">Yes</button>' +
          '<button type="button" class="yn no"  data-k="' + e.k + '" data-v="no" aria-label="Declines">No</button>' +
        '</div></div>';
    }).join('');
    return ('' +
      '<div class="rsvp-head">' +
        '<div class="rsvp-title">R S V P</div>' +
        '<div class="rsvp-sub">kindly reply by January 2027</div>' +
      '</div>' +
      '<div class="rsvp-body">' +
        '<div class="rsvp-list">' + rows + '</div>' +
        '<div class="rsvp-guests" data-guests></div>' +
        '<div class="plusone">' +
          '<span class="plusone-q">Bringing a +1?</span>' +
          '<div class="plusone-yn">' +
            '<button type="button" class="yn yes p1" data-p1="yes">Yes</button>' +
            '<button type="button" class="yn no p1" data-p1="no">No</button>' +
          '</div>' +
        '</div>' +
        '<input id="{p}Count" type="hidden" value="' + PRE.party + '">' +
        '<button class="note-btn rsvp-send" type="button" data-send>Send RSVP</button>' +
        '<div class="rsvp-photo-block">' +
          '<p class="rsvp-photo-note"><b>Send us a photo of you &amp; Sam, you &amp; Jenni, us, etc!</b> ' +
            'Blurry is fine, unflattering is better. <span>(optional)</span></p>' +
          '<div class="rsvp-extra">' +
            '<figure class="photo-eg" aria-hidden="true">' +
              '<img src="img/photo-example.jpg" alt="" loading="lazy" onerror="this.closest(\'.photo-eg\').remove()">' +
              '<figcaption>like this</figcaption>' +
            '</figure>' +
            '<label class="rsvp-photo-btn compact" for="{p}Photo">' +
              '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
                '<rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/></svg>' +
              '<span class="photo-txt">upload a photo</span>' +
            '</label>' +
            '<input id="{p}Photo" class="photo-input" type="file" accept="image/*">' +
          '</div>' +
          '<div class="photo-preview" data-preview hidden></div>' +
        '</div>' +
      '</div>').replace(/\{p\}/g, p);
  }

  var cache = { Count: String(PRE.party) };
  var answers = {};

  function guestRow(p, i){
    var who = i === 0 ? 'your' : '+1';
    return '<div class="guest-row">' +
      '<div class="guest-fields">' +
        '<div class="note-field"><label class="note-l" for="' + p + 'GN' + i + '">' + who + ' name</label>' +
          '<input id="' + p + 'GN' + i + '" class="note-f gname" type="text" value="' +
            (i === 0 ? PRE.name.replace(/"/g,'&quot;') : '') + '"></div>' +
        '<div class="note-field"><label class="note-l" for="' + p + 'GE' + i + '">' + who + ' email' +
          (i === 0 ? '' : ' <span class="opt">(optional)</span>') + '</label>' +
          '<input id="' + p + 'GE' + i + '" class="note-f gemail" type="email" value="' +
            (i === 0 ? PRE.email.replace(/"/g,'&quot;') : '') + '"></div>' +
        '<div class="note-field span2"><label class="note-l" for="' + p + 'GD' + i + '">dietary / allergies</label>' +
          '<input id="' + p + 'GD' + i + '" class="note-f gdiet" type="text" placeholder="none"></div>' +
      '</div></div>';
  }

  function wire(root, p, onSent){
    function g(k){ return root.querySelector('#' + p + k); }

    // Render one block per person; keeps whatever's already typed.
    var box = root.querySelector('[data-guests]');
    function renderGuests(){
      var n = Math.max(1, Math.min(2, parseInt(g('Count').value, 10) || 1));
      var keep = [].map.call(box.querySelectorAll('.guest-row'), function(r){
        return { name:r.querySelector('.gname').value, email:r.querySelector('.gemail').value,
                 diet:r.querySelector('.gdiet').value };
      });
      var html = ''; for (var i = 0; i < n; i++) html += guestRow(p, i);
      box.innerHTML = html;
      [].forEach.call(box.querySelectorAll('.guest-row'), function(r, i){
        if (!keep[i]) return;
        r.querySelector('.gname').value  = keep[i].name;
        r.querySelector('.gemail').value = keep[i].email;
        r.querySelector('.gdiet').value  = keep[i].diet;
      });
    }
    renderGuests();

    // "+1?" replaces the old number field. Yes reveals a second block, No hides it.
    var p1wrap = root.querySelector('.plusone');
    function setPlusOne(v){
      g('Count').value = (v === 'yes') ? '2' : '1';
      root.querySelectorAll('.yn.p1').forEach(function(x){
        x.classList.toggle('on', x.dataset.p1 === v);
      });
      renderGuests();
    }
    if (p1wrap) {
      p1wrap.querySelectorAll('.yn.p1').forEach(function(b){
        b.addEventListener('click', function(){ setPlusOne(b.dataset.p1); });
      });
      setPlusOne(PRE.party > 1 ? 'yes' : 'no');
    }

    var up = (window.SJUpload ? window.SJUpload.wire(g('Photo'), root.querySelector('[data-preview]')) : null);
    Object.keys(cache).forEach(function(k){
      var n = g(k); if(!n) return;
      if (cache[k]) n.value = cache[k];
      n.addEventListener('input', function(){ cache[k] = n.value; });
    });
    root.querySelectorAll('.yn:not(.p1)').forEach(function(b){
      if (answers[b.dataset.k] === b.dataset.v) b.classList.add('on');
      b.addEventListener('click', function(){
        var k = b.dataset.k;
        answers[k] = b.dataset.v;
        root.querySelectorAll('.yn[data-k="' + k + '"]').forEach(function(x){ x.classList.remove('on'); });
        b.classList.add('on');
      });
    });
    // Only the events they said yes to — nobody wants five invites they declined.
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

    function showErr(el, msg){
      var box = el.querySelector('.form-err');
      if (!box) {
        box = document.createElement('p');
        box.className = 'form-err';
        box.setAttribute('role', 'alert');
        var send = el.querySelector('[data-send]');
        send.parentNode.insertBefore(box, send);
      }
      box.textContent = msg;
    }
    function clearErr(el){
      var box = el.querySelector('.form-err');
      if (box) box.remove();
    }

    root.querySelector('[data-send]').addEventListener('click', function () {
      var btn = this;

      // ---- a reply with no answers isn't a reply --------------------------
      var rows = [].slice.call(root.querySelectorAll('.guest-row'));
      var missing = [];
      if (EVENTS.some(function(e){ return !answers[e.k]; })) missing.push('a yes or no for every event');
      if (!rows.length || !rows[0].querySelector('.gname').value.trim()) missing.push('your name');
      var email = rows.length ? rows[0].querySelector('.gemail').value.trim() : '';
      if (!email) missing.push('your email');
      else if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) missing.push('a valid email');
      if (missing.length) { showErr(root, 'We still need ' + missing.join(' and ') + '.'); return; }
      clearErr(root);

      var guestRows = rows.map(function(x){
        return { name:x.querySelector('.gname').value.trim(),
                 email:x.querySelector('.gemail').value.trim(),
                 dietary:x.querySelector('.gdiet').value.trim() };
      });
      var evAnswers = {};
      EVENTS.forEach(function(e){ evAnswers[e.k] = answers[e.k]; });

      var label = btn.textContent;
      btn.disabled = true; btn.textContent = 'Sending…';

      var saving = (window.SJUpload && window.SJUpload.save)
        ? window.SJUpload.save('wedding_rsvps', {
            guest_key: window.SJUpload.guestKey(),
            tier: tier,
            party_size: guestRows.length,
            events: evAnswers,
            guests: guestRows,
            photo_path: up ? up.getPath() : ''
          })
        : Promise.reject(new Error('no uploader'));

      // Only claim success once it has actually saved.
      saving.then(function () {
        var card = root.querySelector('.note-card') || root;
        card.innerHTML = '<div class="note-thanks">' +
          '<div class="note-h">Thank you \u2661</div>' +
          '<p class="note-sub">your reply is in \u2014 we can\u2019t wait.</p>' +
          calBlock() +
          '<p class="thanks-ask">while you\u2019re here \u2014 leave us a note, submit a song request, share a favorite memory.</p>' +
          '<button class="note-btn thanks-btn" type="button" data-note-open>Leave us a note &rarr;</button>' +
          '<button class="thanks-skip" type="button" data-close>no thanks, all done</button>' +
          '</div>';
      // wire the freshly-rendered buttons
      var openNote = card.querySelector('[data-note-open]');
      if (openNote) openNote.addEventListener('click', function(){
        var t = document.querySelector('.nav-cta [data-note-open]');
        if (t) t.click();
      });
      var skip = card.querySelector('[data-close]');
      if (skip && onSent) skip.addEventListener('click', onSent);
      }).catch(function () {
        btn.disabled = false; btn.textContent = label;
        showErr(root, 'That didn\u2019t send \u2014 check your connection and try again. ' +
                      'Still stuck? Text us and we\u2019ll add you by hand.');
      });
    });
  }

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
