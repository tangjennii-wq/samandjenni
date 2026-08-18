// account.js — the little person in the nav.
// Shows who you're signed in as, lets you correct your name/address, leave a
// note (change of address, "we go by…", anything), or sign out.
// Once the RSVP is in, the title-side action becomes "Leave a note" and a
// small "RSVP ✓" appears so they can go back and change their answers.
(function () {
  function syncStack(){
    var done = false;
    try { done = localStorage.getItem('sj-rsvp-done') === '1'; } catch (e) {}
    document.querySelectorAll('.titlestack').forEach(function (st) {
      var rsvp = st.querySelector('.ts-rsvp'),
          note = st.querySelector('.ts-note'),
          chip = st.querySelector('.ts-done');
      if (rsvp) rsvp.hidden = done;
      if (note) note.hidden = !done;
      if (chip) chip.hidden = !done;
    });
    // The mobile nav shows BOTH pills at all times. It used to swap RSVP → Note
    // once you'd replied, but that hid the note from everyone who hadn't RSVPed
    // yet — which is most people, most of the time, and leaving a note doesn't
    // depend on having replied. The RSVP pill just goes quiet once you're done.
    document.querySelectorAll('.nav-actions').forEach(function (st) {
      var rsvp = st.querySelector('.nav-act--rsvp'),
          note = st.querySelector('.nav-act--note');
      if (rsvp) { rsvp.hidden = false; rsvp.classList.toggle('is-done', done); }
      if (note) note.hidden = false;
    });
  }
  syncStack();
  document.addEventListener('sj:rsvped', syncStack);
})();

(function () {
  var wrap = document.querySelector('.nav-acct');
  if (!wrap) return;
  var btn = wrap.querySelector('.acct-btn');
  if (!btn) return;

  function cookie(name){
    var m = document.cookie.split('; ').find(function(r){ return r.indexOf(name + '=') === 0; });
    return m ? decodeURIComponent(m.split('=').slice(1).join('=')) : '';
  }
  function titleCase(x){ return x.replace(/\b[a-z]/g, function(c){ return c.toUpperCase(); }); }

  var who   = cookie('sj_guest').trim();
  var isEmail = who.indexOf('@') > -1;
  var tier  = (cookie('sj_tier') || '').trim();
  var TIERNAME = { '1':'every event', '2':'rehearsal, Friday & Saturday',
                   '3':'Friday & Saturday', '4':'the wedding' };

  // The icon alone was ambiguous — it doesn't say whose account it is, or that
  // there is one. On desktop it now carries the guest's first name; phones keep
  // the glyph alone because the nav has no room to spare.
  if (who) {
    var label = document.createElement('span');
    label.className = 'acct-name';
    label.textContent = isEmail ? who.split('@')[0].split(/[._]/)[0] : who.split(/\s+/)[0];
    label.textContent = label.textContent.replace(/^[a-z]/, function(c){ return c.toUpperCase(); });
    btn.appendChild(label);
  }

  /* The account panel now uses the same full-screen sheet as the RSVP and the
     note form, at every width. It used to be a popover anchored under the nav
     icon on desktop and a bottom sheet on phones — two presentations, its own
     veil, its own outside-click and Escape handling, and a red header band that
     nothing else on the site has any more.

     SJSheet (drawer.js) brings the focus trap, focus restore, scroll lock and
     Escape with it, so all of that machinery goes. */
  function panelHTML(chained){
    return '' +
      (chained ? '<div class="thanks-step">Step 3 of 3</div>' : '') +
      '<div class="acct-head">' +
        '<div class="acct-eyebrow">Signed in as</div>' +
        '<div class="acct-who">' + (who ? (isEmail ? who : titleCase(who)) : 'a guest') + '</div>' +
        (TIERNAME[tier] ? '<div class="acct-tier">You\u2019re invited to ' + TIERNAME[tier] + '</div>' : '') +
      '</div>' +
      '<p class="acct-intro">Anything we\u2019ve got wrong? Tell us here.</p>' +
      '<div class="note-field"><label class="note-l" for="acName">your name</label>' +
        '<input id="acName" class="note-f" type="text" value="' +
          (who && !isEmail ? titleCase(who).replace(/"/g,'&quot;') : '') + '"></div>' +
      '<div class="note-field"><label class="note-l" for="acEmail">email</label>' +
        '<input id="acEmail" class="note-f" type="email" value="' +
          (isEmail ? who.replace(/"/g,'&quot;') : '') + '" placeholder="so we can reach you"></div>' +
      '<div class="note-field"><label class="note-l" for="acAddr">mailing address</label>' +
        '<input id="acAddr" class="note-f" type="text" placeholder="where the invitation should go"></div>' +
      '<div class="note-field"><label class="note-l" for="acNote">anything else</label>' +
        '<textarea id="acNote" class="note-f note-ta" placeholder="new address, a name we spelled wrong, a question\u2026"></textarea></div>' +
      '<p class="acct-msg" hidden></p>' +
      '<div class="note-row3"><button class="note-btn acct-save" type="button">Send it over</button></div>' +
      '<button class="acct-out" type="button">Sign out</button>';
  }

  var pop = null;   // the live sheet body, while open

  function setOpen(on, chained){
    btn.setAttribute('aria-expanded', on ? 'true' : 'false');
    if (!on) { pop = null; return; }
    if (!window.SJSheet) return;
    var api = window.SJSheet.open({
      label: 'Your details',
      html: '<div class="acct-card">' + panelHTML(!!chained) + '</div>',
      onMount: function(a){ pop = a.body; wirePanel(a); }
    });
    return api;
  }
  btn.addEventListener('click', function(e){
    e.preventDefault(); e.stopPropagation();
    setOpen(true);
  });
  // Delegated so anything can hand off to this panel — the note form's
  // thank-you ends the RSVP chain by opening it with [data-acct-open].
  document.addEventListener('click', function(e){
    var t = e.target.closest && e.target.closest('[data-acct-open]');
    if (!t) return;
    e.preventDefault();
    setOpen(true, true);   // reached through the RSVP chain — number the step
  });

  function wirePanel(api){
  var save = api.body.querySelector('.acct-save');
  var msg  = api.body.querySelector('.acct-msg');
  save.addEventListener('click', function(){
    var v = function(id){ var el = pop.querySelector('#' + id); return el ? el.value.trim() : ''; };
    if (!v('acName') && !v('acEmail') && !v('acAddr') && !v('acNote')) {
      msg.hidden = false; msg.className = 'acct-msg is-err';
      msg.textContent = 'Fill in something first.'; return;
    }
    save.disabled = true; save.textContent = 'Sending…';
    var saving = (window.SJUpload && window.SJUpload.save)
      ? window.SJUpload.save('wedding_guest_details', {
          guest_key: window.SJUpload.guestKey(),
          name: v('acName'), email: v('acEmail'),
          address: v('acAddr'), note: v('acNote')
        })
      : Promise.reject(new Error('no uploader'));
    saving.then(function(){
      save.textContent = 'Sent ♡'; save.disabled = true;
      msg.hidden = false; msg.className = 'acct-msg';
      msg.textContent = 'Got it — thank you. That\u2019s everything ♡';
      var done = api.body.querySelector('.acct-out');
      if (done) done.textContent = 'All done';
    }).catch(function(){
      save.disabled = false; save.textContent = 'Send it over';
      msg.hidden = false; msg.className = 'acct-msg is-err';
      msg.textContent = 'That didn’t send — try again in a moment.';
    });
  });

  api.body.querySelector('.acct-out').addEventListener('click', function(){
    ['sj_guest','sj_tier'].forEach(function(k){
      document.cookie = k + '=; Path=/; Max-Age=0; SameSite=Lax';
    });
    location.href = '/gate';
  });
  }
})();
