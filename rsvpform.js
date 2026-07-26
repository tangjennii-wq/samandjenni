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

  var tier = parseInt(document.documentElement.getAttribute('data-tier') || '1', 10) || 1;

  // What the guest typed at the gate (email or last name) — used to prefill.
  // GUEST_MAP can later map that key to a full household name + party size,
  // generated from the guest spreadsheet alongside personalize.js's TIER_MAP.
  var GUEST_MAP = {}; // e.g. "tangjennii@gmail.com": { name:"Jenni Tang", party:2 }

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

  var EVENTS = [
    { k:'thursday',  label:'Thursday · welcome dinner', when:'Mar 18', show: tier === 1 },
    { k:'rehearsal', label:'Friday · rehearsal',        when:'Mar 19', show: tier <= 2 },
    { k:'friday',    label:'Friday · welcome party',    when:'Mar 19', show: tier <= 3 },
    { k:'saturday',  label:'Saturday · the wedding',    when:'Mar 20', show: true },
    { k:'sunday',    label:'Sunday · farewell brunch',  when:'Mar 21', show: tier === 1 }
  ].filter(function(e){ return e.show; });

  function formHTML(p){
    var rows = EVENTS.map(function(e){
      var parts = e.label.split(' · ');
      return '<div class="rsvp-ev">' +
        '<div class="rsvp-evname"><b>' + (parts[1] || parts[0]) + '</b><span>' + parts[0] + ' · ' + e.when + '</span></div>' +
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
        '<div class="rsvp-party">' +
          '<label class="note-l" for="{p}Count">how many in your party</label>' +
          '<input id="{p}Count" class="note-f" type="number" min="1" max="2" value="' + PRE.party + '">' +
        '</div>' +
        '<div class="rsvp-guests" data-guests></div>' +
        '<button class="note-btn rsvp-send" type="button" data-send>Send RSVP</button>' +
        '<div class="rsvp-photo-block">' +
          '<p class="rsvp-photo-note">add a favorite photo with Sam and/or Jenni <span>(optional)</span></p>' +
          '<div class="rsvp-extra">' +
            '<label class="rsvp-photo-btn compact" for="{p}Photo">' +
              '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
                '<rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/></svg>' +
              '<span class="photo-txt">add a photo</span>' +
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
    var who = i === 0 ? 'you' : 'guest ' + (i + 1);
    return '<div class="guest-row">' +
      '<div class="guest-n">' + who + '</div>' +
      '<div class="guest-fields">' +
        '<div class="note-field"><label class="note-l" for="' + p + 'GN' + i + '">name</label>' +
          '<input id="' + p + 'GN' + i + '" class="note-f gname" type="text" value="' +
            (i === 0 ? PRE.name.replace(/"/g,'&quot;') : '') + '"></div>' +
        '<div class="note-field"><label class="note-l" for="' + p + 'GE' + i + '">email' +
          (i === 0 ? '' : ' <span class="opt">(optional)</span>') + '</label>' +
          '<input id="' + p + 'GE' + i + '" class="note-f gemail" type="email" value="' +
            (i === 0 ? PRE.email.replace(/"/g,'&quot;') : '') + '"></div>' +
        '<div class="note-field span2"><label class="note-l" for="' + p + 'GD' + i + '">dietary needs / allergies</label>' +
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
    g('Count').addEventListener('input', renderGuests);
    g('Count').addEventListener('change', renderGuests);

    var up = (window.SJUpload ? window.SJUpload.wire(g('Photo'), root.querySelector('[data-preview]')) : null);
    Object.keys(cache).forEach(function(k){
      var n = g(k); if(!n) return;
      if (cache[k]) n.value = cache[k];
      n.addEventListener('input', function(){ cache[k] = n.value; });
    });
    root.querySelectorAll('.yn').forEach(function(b){
      if (answers[b.dataset.k] === b.dataset.v) b.classList.add('on');
      b.addEventListener('click', function(){
        var k = b.dataset.k;
        answers[k] = b.dataset.v;
        root.querySelectorAll('.yn[data-k="' + k + '"]').forEach(function(x){ x.classList.remove('on'); });
        b.classList.add('on');
      });
    });
    root.querySelector('[data-send]').addEventListener('click', function () {
      var val = function(k){ var n = g(k); return n ? n.value.trim() : ''; };
      var lines = EVENTS.map(function(e){
        return e.label + ': ' + (answers[e.k] ? answers[e.k].toUpperCase() : '—');
      }).join('\n');
      var guests = [].map.call(root.querySelectorAll('.guest-row'), function(r, i){
        return (i === 0 ? 'you' : 'guest ' + (i + 1)) + ': ' +
          (r.querySelector('.gname').value.trim()  || '—') + ' · ' +
          (r.querySelector('.gemail').value.trim() || 'no email') + ' · diet: ' +
          (r.querySelector('.gdiet').value.trim()  || 'none');
      }).join('\n');

      var guestRows = [].map.call(root.querySelectorAll('.guest-row'), function(r){
        return { name:r.querySelector('.gname').value.trim(),
                 email:r.querySelector('.gemail').value.trim(),
                 dietary:r.querySelector('.gdiet').value.trim() };
      });
      var evAnswers = {};
      EVENTS.forEach(function(e){ evAnswers[e.k] = answers[e.k] || null; });

      if (window.SJUpload) {
        window.SJUpload.save('wedding_rsvps', {
          guest_key: window.SJUpload.guestKey(),
          tier: tier,
          party_size: parseInt(val('Count'), 10) || 1,
          events: evAnswers,
          guests: guestRows,
          photo_path: up ? up.getPath() : ''
        }).catch(function(){});
      }

      var card = root.querySelector('.note-card') || root;
      card.innerHTML = '<div class="note-thanks">' +
        '<div class="note-h">Thank you ♡</div>' +
        '<p class="note-sub">your reply is in — we can’t wait.</p>' +
        '<p class="thanks-ask">while you’re here — leave us a note, submit a song request, share a favorite memory.</p>' +
        '<button class="note-btn thanks-btn" type="button" data-note-open>Leave us a note &rarr;</button>' +
        '<div class="thanks-pills">' +
          '<a class="thanks-pill pill-ou" href="over-under.html">Over/Under &rarr;</a>' +
        '</div>' +
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
