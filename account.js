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
    // the mobile nav carries the same pair — RSVP until you've replied, then Note
    document.querySelectorAll('.nav-actions').forEach(function (st) {
      var rsvp = st.querySelector('.nav-act--rsvp'),
          note = st.querySelector('.nav-act--note');
      if (rsvp) rsvp.hidden = done;
      if (note) note.hidden = !done;
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

  var pop = document.createElement('div');
  pop.className = 'acct-pop';
  pop.hidden = true;
  pop.innerHTML =
    '<div class="acct-head">' +
      '<span class="acct-eyebrow">Signed in as</span>' +
      '<b class="acct-who">' + (who ? (isEmail ? who : titleCase(who)) : 'a guest') + '</b>' +
      (TIERNAME[tier] ? '<span class="acct-tier">You’re invited to ' + TIERNAME[tier] + '</span>' : '') +
    '</div>' +
    '<div class="acct-body">' +
      '<p class="acct-intro">Anything we’ve got wrong? Tell us here.</p>' +
      '<div class="note-field"><label class="note-l" for="acName">your name</label>' +
        '<input id="acName" class="note-f" type="text" value="' +
          (who && !isEmail ? titleCase(who).replace(/"/g,'&quot;') : '') + '"></div>' +
      '<div class="note-field"><label class="note-l" for="acEmail">email</label>' +
        '<input id="acEmail" class="note-f" type="email" value="' +
          (isEmail ? who.replace(/"/g,'&quot;') : '') + '" placeholder="so we can reach you"></div>' +
      '<div class="note-field"><label class="note-l" for="acAddr">mailing address</label>' +
        '<input id="acAddr" class="note-f" type="text" placeholder="where the invitation should go"></div>' +
      '<div class="note-field"><label class="note-l" for="acNote">anything else</label>' +
        '<textarea id="acNote" class="note-f note-ta" placeholder="new address, a name we spelled wrong, a question…"></textarea></div>' +
      '<button class="note-btn acct-save" type="button">Send it over</button>' +
      '<p class="acct-msg" hidden></p>' +
      '<button class="acct-out" type="button">Sign out</button>' +
    '</div>';
  // Appended to <body>, NOT to the nav: .sitenav is position:sticky with
  // overflow-x:auto, which can trap a fixed-position child on iOS Safari.
  document.body.appendChild(pop);

  // a tap-catcher behind the sheet on phones
  var veil = document.createElement('div');
  veil.className = 'acct-veil';
  veil.hidden = true;
  document.body.appendChild(veil);

  function setOpen(on){
    pop.hidden = !on;
    veil.hidden = !on;
    btn.setAttribute('aria-expanded', on ? 'true' : 'false');
    document.body.classList.toggle('acct-open', on);
    if (on) {
      // anchor under the icon on desktop; the CSS pins it as a sheet on mobile
      var r = btn.getBoundingClientRect();
      pop.style.top = (r.bottom + 10) + 'px';
      pop.style.right = Math.max(12, window.innerWidth - r.right) + 'px';
    }
  }
  btn.addEventListener('click', function(e){ e.preventDefault(); e.stopPropagation(); setOpen(pop.hidden); });
  veil.addEventListener('click', function(){ setOpen(false); });
  document.addEventListener('click', function(e){
    if (!pop.hidden && !pop.contains(e.target) && !wrap.contains(e.target)) setOpen(false);
  });
  document.addEventListener('keydown', function(e){ if (e.key === 'Escape' && !pop.hidden) { setOpen(false); btn.focus(); } });
  pop.addEventListener('click', function(e){ e.stopPropagation(); });

  var save = pop.querySelector('.acct-save');
  var msg  = pop.querySelector('.acct-msg');
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
      save.textContent = 'Sent ♡'; msg.hidden = false;
      msg.className = 'acct-msg'; msg.textContent = 'Got it — thank you.';
    }).catch(function(){
      save.disabled = false; save.textContent = 'Send it over';
      msg.hidden = false; msg.className = 'acct-msg is-err';
      msg.textContent = 'That didn’t send — try again in a moment.';
    });
  });

  pop.querySelector('.acct-out').addEventListener('click', function(){
    ['sj_guest','sj_tier'].forEach(function(k){
      document.cookie = k + '=; Path=/; Max-Age=0; SameSite=Lax';
    });
    location.href = '/gate';
  });
})();
