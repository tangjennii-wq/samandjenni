// account.js — the little person in the nav.
// Shows who you're signed in as, lets you correct your name/address, leave a
// note (change of address, "we go by…", anything), or sign out.
// Once the RSVP is in, the title-side action becomes "Leave a note" and a
// small "RSVP ✓" appears so they can go back and change their answers.
(function () {
  /* Reads the cookie itself rather than the module-level `who`. syncStack() is
     called on line 29 but `who` is not assigned until line 45 — var hoisting
     means it would be undefined here, so the key would silently lose its
     namespace and this would read the wrong guest's flag. */
  function guestNs(){
    var m = document.cookie.split('; ').find(function(r){ return r.indexOf('sj_guest=') === 0; });
    var g = m ? decodeURIComponent(m.split('=').slice(1).join('=')).trim().toLowerCase() : '';
    return g ? ':' + g : '';
  }

  function syncStack(){
    var done = false;
    try { done = localStorage.getItem('sj-rsvp-done' + guestNs()) === '1'; } catch (e) {}
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
  var onFile = { email:false, address:false, note:false, name:'' };

  function panelHTML(chained, firstTime){
    var pr = cachedProfile() || {};
    var hasEmail = onFile.email, hasAddr = onFile.address;
    var esc = function(x){ return (x || '').replace(/"/g,'&quot;'); };
    // Prefer the guest list's own record over the cookie: it has their full
    // name where the cookie may only hold a surname.
    var isSurname = who && !isEmail && who.split(/\s+/).length === 1;
    var vName  = onFile.name || pr.person_name || (who && !isEmail && !isSurname ? titleCase(who) : '');
    return '' +
      (chained ? '<div class="thanks-step">Step 3 of 3</div>' : '') +
      '<div class="acct-head">' +
        '<div class="acct-eyebrow">Signed in as</div>' +
        '<div class="acct-who">' + (vName || (who ? (isEmail ? who : titleCase(who)) : 'a guest')) + '</div>' +
      '</div>' +
      (firstTime
        ? '<p class="acct-intro"><b>One quick thing before you look around.</b><br>' +
          'Invitations go out Nov/Dec &mdash; have we got this right?' +
          '<br><span class="acct-onfile">Once you send it we store it securely and ' +
          'never show it back on this page. Need to change something later? ' +
          'Just fill it in again.</span></p>'
        : '<p class="acct-intro">Anything we\u2019ve got wrong? Tell us here.' +
          ((onFile.email || onFile.address)
            ? '<br><span class="acct-onfile">' +
              (onFile.email   ? 'Email on file. ' : '') +
              (onFile.address ? 'Mailing address on file. ' : '') +
              'Only fill these in if something has changed.</span>'
            : '') +
          '</p>') +
      '<div class="note-field"><label class="note-l" for="acName">your name</label>' +
        '<input id="acName" class="note-f" type="text" value="' + esc(vName) +
          '" placeholder="' + (vName ? '' : 'first and last name') + '"></div>' +
      /* Neither the email nor the address is ever written back into the page.
         The panel says what we hold, not what it is, and offers blank fields
         to replace it. Leaving them empty keeps whatever is on file. */
      '<div class="note-field"><label class="note-l" for="acEmail">email</label>' +
        '<input id="acEmail" class="note-f" type="email" placeholder="' +
          (hasEmail ? 'email on file \u2014 leave blank to keep it' : 'so we can reach you') +
          '"></div>' +
      '<div class="note-field"><label class="note-l" for="acAddr">mailing address</label>' +
        '<input id="acAddr" class="note-f" type="text" placeholder="' +
          (hasAddr ? 'address on file \u2014 leave blank to keep it' : 'where the invitation should go') +
          '"></div>' +
      '<div class="note-field"><label class="note-l" for="acNote">anything else</label>' +
        '<textarea id="acNote" class="note-f note-ta" placeholder="new address, a name we spelled wrong, a question\u2026"></textarea></div>' +
      '<p class="acct-msg" hidden></p>' +
      '<div class="note-row3"><button class="note-btn acct-save" type="button">' +
        (firstTime ? 'Looks right' : 'Send it over') + '</button></div>' +
      (firstTime
        ? '<button class="thanks-skip" type="button" data-close>skip for now</button>'
        : '<button class="acct-out" type="button">Sign out</button>');
  }

  var pop = null;   // the live sheet body, while open

  /* ── the one-time confirm ─────────────────────────────────────────────
     First time a guest signs in, this panel opens itself. It is the first
     thing they see, before the RSVP, because it is the only screen that
     collects a mailing address — and 51 of 123 households have none on file,
     which is the single thing blocking the invitations.

     Once. After they send it, never again.

     "Once" is checked twice over. localStorage is the fast path, but it is
     per-device and dies with a cleared browser, so the real answer comes from
     guest_detailed(key) — a security-definer RPC that returns one boolean and
     nothing else, the same shape as guest_rsvped(). Someone who confirms on
     their phone is not asked again on a laptop. */
  /* Namespaced per guest. These were global — 'sj-details-prompted' with no
     owner — so the first person to use a browser spent the prompt for everyone
     after them. Christina Gainey signed in on a laptop that had already asked
     Jenni, and was never asked. A shared laptop, a partner's phone, or one of
     us testing is enough to trigger it. */
  function nskey(base){
    var k = (who || '').trim().toLowerCase().replace(/\s+/g, ' ');
    return base + (k ? ':' + k : '');
  }
  var PROMPT_KEY = nskey('sj-details-prompted');
  var DONE_KEY   = nskey('sj-details-done');

  function flag(k, v){ try { if (v === undefined) return localStorage.getItem(k) === '1';
                             localStorage.setItem(k, '1'); } catch(e){ return false; } }

  /* "Skip for now" means not right now, not never. It first wrote a permanent
     localStorage flag (one tap and we never asked again, while we still need
     an address from most of the list), then sessionStorage — but that is
     per-tab, so opening the site in a second tab asked them straight away.
     It is now a dated snooze in localStorage: quiet for a week, shared across
     tabs, then we ask once more. Saving is what stops it for good, and that
     is recorded server-side so it holds on every device. */
  var SNOOZE_DAYS = 7;
  var SNOOZE_KEY  = nskey('sj-details-snoozed-until');
  function skipped(v){
    try {
      if (v === undefined) {
        var until = parseInt(localStorage.getItem(SNOOZE_KEY) || '0', 10);
        return until > Date.now();
      }
      localStorage.setItem(SNOOZE_KEY, String(Date.now() + SNOOZE_DAYS * 864e5));
    } catch(e){ return false; }
  }

  // Prefill from the profile the RSVP already looked up, so the panel opens
  // with their name and email in place rather than blank.
  function cachedProfile(){
    try {
      var c = JSON.parse(localStorage.getItem('sj-profile'));
      return (c && c.key === who.toLowerCase()) ? c : null;
    } catch(e){ return null; }
  }

  /* Status only. The RPC returns four booleans and a display name — never the
     email, the address or the note — and it is revoked from the browser role
     besides, so this is belt and braces. Off until the gate can sign who is
     asking; the call is kept so it can be switched on in one line. */
  var READ_BACK_STATUS = false;
  function fillSaved(root){
    if (!READ_BACK_STATUS) return;
    if (!root || !who || !(window.SJUpload && window.SJUpload.rpc)) return;
    window.SJUpload.rpc('guest_details_get', who.toLowerCase()).then(function(rows){
      var d = Array.isArray(rows) ? rows[0] : rows;
      if (!d) return;
      onFile = { email: !!d.has_email, address: !!d.has_address,
                 note: !!d.has_note, name: d.preferred_name || '' };
    }).catch(function(){});
  }

  /* Paired with the inline veil in each page's <head>. Lifted the instant the
     sheet is mounted, or immediately if we decide not to show one. The head
     script also lifts it on a 2.5s timeout, so a Supabase outage can never
     leave a guest looking at a blank page. */
  function unveil(){
    try { document.documentElement.classList.remove('sj-veil'); } catch(e){}
  }

  /* The gate already asked. api/login.js calls guest_detailed() before it
     redirects and appends ?details=1 when the answer is no, so we can open on
     the first frame instead of after a round trip. Strip the parameter so a
     refresh or a shared link doesn't re-trigger it. */
  function gateSaysAsk(){
    if (!/[?&]details=1\b/.test(location.search)) return false;
    try {
      var url = location.pathname +
        location.search.replace(/([?&])details=1/, '$1').replace(/[?&]$/, '').replace(/\?&/, '?') +
        location.hash;
      history.replaceState(null, '', url);
    } catch (e) {}
    return true;
  }

  function maybePrompt(){
    if (!who) { unveil(); return; }             // signed out — the gate has them
    var asked = gateSaysAsk();
    if (skipped() || flag(DONE_KEY)) { unveil(); return; }
    if (asked) {                               // no waiting — open now
      setOpen(true, false, true);
      unveil();                                // sheet is up; show the page
      // fill the name/email in behind the open panel if the lookup lands
      if (window.SJUpload && window.SJUpload.rpc) {
        var k0 = who.toLowerCase();
        window.SJUpload.rpc('guest_profile', k0).then(function(rows){
          var pr = Array.isArray(rows) ? rows[0] : rows;
          if (!pr || !pop) return;
          try { localStorage.setItem('sj-profile', JSON.stringify({
            key: k0, person_name: pr.person_name || ''
          })); } catch(e){}
          /* Name only. The email is never written into the panel — the guest
             types a new one if it has changed, and a blank field keeps what
             we already hold. */
          var n = pop.querySelector('#acName');
          if (n && !n.value) n.value = pr.person_name || '';
        }).catch(function(){});
      }
      return;
    }
    if (!(window.SJUpload && window.SJUpload.rpc)) { unveil(); return; }
    window.SJUpload.rpc('guest_detailed', who).then(function(done){
      if (done === true) { flag(DONE_KEY, 1); unveil(); return; }   // did it on another device

      // Fetch the profile ourselves rather than relying on the cache rsvpform.js
      // writes. On a first visit the RSVP never mounts, so that cache is empty
      // and the name field would open blank — which defeats the point of asking
      // them to check it. Best effort: if the lookup fails we open anyway.
      var key = who.toLowerCase();
      return window.SJUpload.rpc('guest_profile', key).then(function(rows){
        var pr = Array.isArray(rows) ? rows[0] : rows;
        if (pr) {
          try { localStorage.setItem('sj-profile', JSON.stringify({
            key: key, person_name: pr.person_name || ''
          })); } catch(e){}
        }
      }).catch(function(){}).then(function(){
        setOpen(true, false, true);
        unveil();
      });
    }).catch(function(){ unveil(); /* offline — ask again next visit rather than never */ });
  }

  function setOpen(on, chained, firstTime){
    btn.setAttribute('aria-expanded', on ? 'true' : 'false');
    if (!on) { pop = null; return; }
    if (!window.SJSheet) return;
    var api = window.SJSheet.open({
      label: 'Your details',
      html: '<div class="acct-card">' + panelHTML(!!chained, !!firstTime) + '</div>',
      onMount: function(a){
        pop = a.body;
        wirePanel(a, !!firstTime);
        fillSaved(a.body);
        /* "skip for now" was inert. notes.js and rsvpform.js each wire their
           own [data-close]; drawer.js only listens for the X, the backdrop and
           Escape. This panel rendered the button and never bound anything, so
           the one screen a guest is forced into had no way out but the X. */
        var skip = a.body.querySelector('[data-close]');
        if (skip) skip.addEventListener('click', function(e){
          e.preventDefault();
          skipped(1);            // this session only — we'll ask again next visit
          a.close();
        });
      }
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

  function wirePanel(api, firstTime){
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
          /* Only send what they actually typed. An empty field means "keep
             what you have", not "erase it" — the panel deliberately never
             shows the stored value, so a blank box is the normal state. */
          name: v('acName') || undefined,
          email: v('acEmail') || undefined,
          address: v('acAddr') || undefined,
          note: v('acNote') || undefined
        })
      : Promise.reject(new Error('no uploader'));
    saving.then(function(){
      /* One outcome, one action. This used to end on two red pills — a dead
         "Sent ♡" and an "RSVP now →" — which asked the guest to reply seven
         months out, and left the confirmation competing with a call to action.
         Now: a tick, a thank you, and one button back to the site. */
      save.remove();
      var skip = api.body.querySelector('[data-close]');
      if (skip) skip.remove();
      var out = api.body.querySelector('.acct-out');
      if (out) out.remove();

      msg.hidden = false; msg.className = 'acct-msg acct-msg--done';
      msg.innerHTML = '<span class="acct-tick" aria-hidden="true">\u2713</span>' +
                      'You\u2019re all set.';

      var row = api.body.querySelector('.note-row3');
      if (row) {
        /* The "what's in here" line goes ABOVE the button, not under it.
           Below, it read as fine print appended to an action already taken --
           by which point the guest has clicked and never learns the site holds
           hotel links or a note form. Above, it is the reason to click. */
        var sub = document.createElement('p');
        sub.className = 'acct-onward';
        sub.textContent = 'Find hotel links, our NYC favorites, early RSVP ' +
                          'access, and leave us a note.';
        row.parentNode.insertBefore(sub, row);

        var go = document.createElement('button');
        go.type = 'button';
        go.className = 'note-btn';
        go.textContent = 'Explore the website \u2192';
        go.addEventListener('click', function(){
          api.close();
          /* One place to change when the onboarding gains an RSVP step: point
             ONWARD at it instead. Today it lands on the home page, and stays
             put if that is already where they are, so nobody gets a pointless
             reload of the film. */
          var ONWARD = '/';
          var here = location.pathname.replace(/index\.html$/, '');
          if (here !== ONWARD) location.href = ONWARD;
        });
        row.appendChild(go);
      }

      // Never ask again — on this device or any other. The local flag is the
      // fast path; guest_detailed() covers a new browser or a second device,
      // and they can still edit any time from the nav icon.
      flag(DONE_KEY, 1);
    }).catch(function(){
      save.disabled = false; save.textContent = firstTime ? 'Looks right' : 'Send it over';
      msg.hidden = false; msg.className = 'acct-msg is-err';
      msg.textContent = 'That didn’t send — try again in a moment.';
    });
  });

  var out = api.body.querySelector('.acct-out');
  if (out) out.addEventListener('click', function(){
    /* Drop this guest's cached profile, drafts and RSVP so the next person on
       the same browser starts clean.
       The RSVP keys are namespaced now, so remove BOTH forms: the namespaced
       ones this guest actually wrote, and the bare ones in case anything on an
       older cached script wrote a global key before the page reloaded.
       Namespaced *prompt* flags are left alone — they belong to their owner,
       not to the device, and re-asking is worse than not asking. */
    try {
      var ns = guestNs();
      ['sj-profile', 'sj-note-draft',
       'sj-rsvp-data',      'sj-rsvp-draft',      'sj-rsvp-done',
       'sj-rsvp-data' + ns, 'sj-rsvp-draft' + ns, 'sj-rsvp-done' + ns
      ].forEach(function(k){ localStorage.removeItem(k); });
    } catch(e){}
    ['sj_guest','sj_tier'].forEach(function(k){
      document.cookie = k + '=; Path=/; Max-Age=0; SameSite=Lax';
    });
    location.href = '/gate';
  });
  }

  /* Deferred to DOMContentLoaded on purpose. account.js is third in the script
     order and upload.js is fifth, so at the moment this IIFE runs neither
     SJUpload (the RPC) nor SJSheet (the sheet) exists yet — calling maybePrompt
     here bailed silently and the panel never opened. All the deferred scripts
     have executed by DOMContentLoaded, so everything it needs is there.
     The test is against 'complete', not 'loading': a deferred script runs while
     readyState is already 'interactive', so a 'loading' check would fall
     through to the immediate call and hit the same missing-SJUpload problem. */
  if (document.readyState === 'complete') {
    maybePrompt();
  } else {
    document.addEventListener('DOMContentLoaded', maybePrompt);
  }
})();
