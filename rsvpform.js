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
        '<div class="rsvp-sub">kindly reply by 2 · 26 · 27</div>' +
      '</div>' +
      '<div class="rsvp-body">' +
        '<div class="rsvp-list">' + rows + '</div>' +
        '<div class="rsvp-fields">' +
          '<div class="note-field"><label class="note-l" for="{p}Name">name(s)</label>' +
            '<input id="{p}Name" class="note-f" type="text"></div>' +
          '<div class="note-field"><label class="note-l" for="{p}Email">email</label>' +
            '<input id="{p}Email" class="note-f" type="email"></div>' +
          '<div class="note-field"><label class="note-l" for="{p}Count">party</label>' +
            '<input id="{p}Count" class="note-f" type="number" min="1" value="1"></div>' +
          '<div class="note-field span2"><label class="note-l" for="{p}Diet">dietary needs / allergies</label>' +
            '<input id="{p}Diet" class="note-f" type="text"></div>' +
          '<div class="note-field"><label class="note-l" for="{p}Note">anything else</label>' +
            '<input id="{p}Note" class="note-f" type="text"></div>' +
        '</div>' +
        '<button class="note-btn rsvp-send" type="button" data-send>Send RSVP</button>' +
      '</div>').replace(/\{p\}/g, p);
  }

  var cache = { Name:'', Email:'', Count:'1', Diet:'', Note:'' };
  var answers = {};

  function wire(root, p, onSent){
    function g(k){ return root.querySelector('#' + p + k); }
    Object.keys(cache).forEach(function(k){
      var n = g(k); if(!n) return;
      n.value = cache[k] || '';
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

      if (GFORM) {
        var fd = new FormData();
        fd.append(GFORM.name, val('Name'));
        fd.append(GFORM.email, val('Email'));
        fd.append(GFORM.events, lines.replace(/\n/g, ' | '));
        fd.append(GFORM.count, val('Count'));
        fd.append(GFORM.diet, val('Diet'));
        fd.append(GFORM.note, val('Note'));
        fetch(GFORM.action, { method:'POST', mode:'no-cors', body:fd }).catch(function(){});
      } else {
        var body =
          'RSVP — sam + jenni, 3.20.27\n\n' + lines + '\n\n' +
          'name(s): ' + val('Name') + '\n' +
          'email: ' + val('Email') + '\n' +
          'party size: ' + val('Count') + '\n' +
          'dietary: ' + val('Diet') + '\n' +
          'notes: ' + val('Note') + '\n';
        window.location.href = 'mailto:tangjennii@gmail.com' +
          '?subject=' + encodeURIComponent('RSVP — ' + (val('Name') || 'sam + jenni wedding')) +
          '&body=' + encodeURIComponent(body);
      }
      var card = root.querySelector('.note-card') || root;
      card.innerHTML = '<div class="note-thanks"><div class="note-h">Thank you ♡</div>' +
        '<p class="note-sub">your reply is in — we can’t wait.</p></div>';
      if (onSent) setTimeout(onSent, 1500);
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
