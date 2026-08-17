// drawer.js — shared accessible drawer (right side on desktop, bottom sheet on
// mobile). Used by the RSVP and "leave us a note" forms.
// window.SJDrawer.create({ label, html, onMount }) -> { open, close, root }
(function () {
  var backdrop = null;

  function ensureBackdrop(){
    if (backdrop) return backdrop;
    backdrop = document.createElement('div');
    backdrop.className = 'note-backdrop';
    document.body.appendChild(backdrop);
    return backdrop;
  }

  function create(opts){
    var bd = ensureBackdrop();
    var el = document.createElement('div');
    el.className = 'note-drawer';
    el.setAttribute('role', 'dialog');
    el.setAttribute('aria-modal', 'true');
    el.setAttribute('aria-hidden', 'true');   // closed until opened
    el.inert = true;
    el.setAttribute('aria-label', opts.label || 'Dialog');
    // focus target on open — the dialog itself, never a form control
    el.setAttribute('tabindex', '-1');
    el.innerHTML =
      '<div class="drawer-bar">' +
        '<span class="drawer-title">' + (opts.label || '') + '</span>' +
        '<button class="note-x" type="button" aria-label="Close">×</button>' +
      '</div>' +
      '<div class="drawer-body"></div>';
    el.querySelector('.drawer-body').innerHTML = opts.html || '';
    document.body.appendChild(el);

    var lastFocus = null;
    function focusables(){ return el.querySelectorAll('button, input, textarea, select, a[href]'); }

    function open(){
      // close any other open drawer first
      document.querySelectorAll('.note-drawer.open').forEach(function(d){
        if (d !== el) d.classList.remove('open');
      });
      lastFocus = document.activeElement;
      el.removeAttribute('aria-hidden');
      el.inert = false;
      el.classList.add('open');
      bd.classList.add('open');
      document.body.style.overflow = 'hidden';
      // always start at the top of the form, with the × in view
      var body = el.querySelector('.drawer-body');
      if (body) body.scrollTop = 0;
      // Land keyboard/screen-reader users inside the dialog WITHOUT painting a
      // focus ring on a form control (this used to focus the first "Yes").
      try { el.focus({ preventScroll: true }); } catch (err) { el.focus(); }
    }
    function close(){
      if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
      el.classList.remove('open');
      el.setAttribute('aria-hidden', 'true');
      el.inert = true;
      if (!document.querySelector('.note-drawer.open')) {
        bd.classList.remove('open');
        document.body.style.overflow = '';
      }
      if (lastFocus && lastFocus.focus) lastFocus.focus();
    }

    el.querySelector('.note-x').addEventListener('click', close);
    bd.addEventListener('click', close);
    document.addEventListener('keydown', function (e) {
      if (!el.classList.contains('open')) return;
      if (e.key === 'Escape') { close(); return; }
      if (e.key === 'Tab') {
        var f = focusables(); if (!f.length) return;
        var first = f[0], last = f[f.length - 1];
        if (e.shiftKey && document.activeElement === first){ e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last){ e.preventDefault(); first.focus(); }
      }
    });

    var api = { open: open, close: close, root: el, body: el.querySelector('.drawer-body') };
    if (opts.onMount) opts.onMount(api);
    return api;
  }

  window.SJDrawer = { create: create };

  /* ── SJSheet ────────────────────────────────────────────────────────────
     Full-screen presentation in the phone menu's language: flat ground,
     wordmark top-left, ✕ top-right, content centred. Used by the RSVP and by
     "leave a note".

     Lives here rather than in either form because both need it, and because
     the drawer above already worked out the fiddly parts — focus trap, focus
     restore, scroll lock, Escape. The RSVP's first version of this was a
     one-off in rsvpform.js and had none of them.

     Built on open and removed on close, so a reopened form starts clean.
     window.SJSheet.open({ label, html, onMount }) -> { close, body, root }  */
  function openSheet(opts){
    // one at a time
    var live = document.querySelector('.sjsheet');
    if (live) live.remove();

    var el = document.createElement('div');
    el.className = 'sjsheet' + (opts.className ? ' ' + opts.className : '');
    el.setAttribute('role', 'dialog');
    el.setAttribute('aria-modal', 'true');
    el.setAttribute('aria-label', opts.label || 'Dialog');
    el.setAttribute('tabindex', '-1');
    el.innerHTML =
      '<div class="sjsheet-top">' +
        '<a class="sjsheet-brand" href="index.html">Sam <span>+</span> Jenni</a>' +
        '<button type="button" class="sjsheet-x" aria-label="Close">' +
          '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" ' +
          'stroke-linecap="round"><line x1="5" y1="5" x2="19" y2="19"/>' +
          '<line x1="19" y1="5" x2="5" y2="19"/></svg>' +
        '</button>' +
      '</div>' +
      '<div class="sjsheet-body"><div class="sjsheet-in"></div></div>';
    el.querySelector('.sjsheet-in').innerHTML = opts.html || '';
    document.body.appendChild(el);
    document.body.classList.add('sjsheet-open');

    var lastFocus = document.activeElement;
    function focusables(){ return el.querySelectorAll('button, input, textarea, select, a[href]'); }

    function close(){
      if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
      document.removeEventListener('keydown', onKey);
      el.remove();
      document.body.classList.remove('sjsheet-open');
      if (lastFocus && lastFocus.focus) { try { lastFocus.focus(); } catch(e){} }
    }
    function onKey(e){
      if (!el.isConnected) return;
      if (e.key === 'Escape') { close(); return; }
      if (e.key === 'Tab') {
        var f = focusables(); if (!f.length) return;
        var first = f[0], last = f[f.length - 1];
        if (e.shiftKey && document.activeElement === first){ e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last){ e.preventDefault(); first.focus(); }
      }
    }
    document.addEventListener('keydown', onKey);
    el.querySelector('.sjsheet-x').addEventListener('click', close);
    // Land keyboard users in the dialog without painting a ring on a field.
    try { el.focus({ preventScroll:true }); } catch(e){ el.focus(); }

    var api = { close: close, root: el, body: el.querySelector('.sjsheet-in') };
    if (opts.onMount) opts.onMount(api);
    return api;
  }

  window.SJSheet = { open: openSheet };
})();
