// rsvpform.js — tier-aware RSVP. Renders into <div id="sjrsvp">.
// Each guest only sees the events their tier is invited to (same rules as
// personalize.js). Replies email today; set GFORM to post into a Google Sheet.
(function () {
  var el = document.getElementById('sjrsvp');
  if (!el) return;

  // When the RSVP Google Form exists, fill this in from its "Get pre-filled link":
  // { action:'https://docs.google.com/forms/d/e/XXXX/formResponse',
  //   name:'entry.1', email:'entry.2', events:'entry.3', count:'entry.4', diet:'entry.5', note:'entry.6' }
  var GFORM = null;

  var tier = parseInt(document.documentElement.getAttribute('data-tier') || '1', 10) || 1;

  var EVENTS = [
    { k:'thursday',  label:'Thursday · welcome dinner',      when:'Mar 18', show: tier === 1 },
    { k:'rehearsal', label:'Friday · rehearsal',             when:'Mar 19', show: tier <= 2 },
    { k:'friday',    label:'Friday · welcome party',         when:'Mar 19', show: tier <= 3 },
    { k:'saturday',  label:'Saturday · the wedding',         when:'Mar 20', show: true },
    { k:'sunday',    label:'Sunday · farewell brunch',       when:'Mar 21', show: tier === 1 }
  ].filter(function(e){ return e.show; });

  var rows = EVENTS.map(function(e){
    return '<div class="rsvp-ev" data-k="' + e.k + '">' +
availabilityLabel(e) +
      '<div class="rsvp-yn">' +
        '<button type="button" class="yn yes" data-k="' + e.k + '" data-v="yes">Joyfully accepts</button>' +
        '<button type="button" class="yn no"  data-k="' + e.k + '" data-v="no">Regretfully declines</button>' +
      '</div>' +
    '</div>';
  }).join('');

  function availabilityLabel(e){
    return '<div class="rsvp-evname"><b>' + e.label + '</b><span>' + e.when + '</span></div>';
  }

  el.innerHTML =
    '<div class="note-card">' +
      '<div class="note-h">RSVP</div>' +
      '<p class="note-sub">kindly reply by February 26, 2027 ♡</p>' +
      '<div class="rsvp-list">' + rows + '</div>' +
      '<div class="note-row2" style="margin-top:18px">' +
        '<div class="note-field"><label class="note-l" for="rName">your name(s)</label>' +
          '<input id="rName" class="note-f" type="text"></div>' +
        '<div class="note-field"><label class="note-l" for="rEmail">email</label>' +
          '<input id="rEmail" class="note-f" type="email"></div>' +
      '</div>' +
      '<div class="note-row2" style="margin-top:14px">' +
        '<div class="note-field"><label class="note-l" for="rCount">how many in your party</label>' +
          '<input id="rCount" class="note-f" type="number" min="1" value="1"></div>' +
        '<div class="note-field"><label class="note-l" for="rDiet">dietary needs / allergies</label>' +
          '<input id="rDiet" class="note-f" type="text"></div>' +
      '</div>' +
      '<div class="note-row3">' +
        '<div class="note-field"><label class="note-l" for="rNote">anything else we should know</label>' +
          '<input id="rNote" class="note-f" type="text"></div>' +
        '<button id="rSend" class="note-btn" type="button">Send RSVP</button>' +
      '</div>' +
      '<div class="note-done" id="rDone">thank you ♡</div>' +
    '</div>';

  var answers = {};
  el.querySelectorAll('.yn').forEach(function(b){
    b.addEventListener('click', function(){
      var k = b.dataset.k;
      answers[k] = b.dataset.v;
      el.querySelectorAll('.yn[data-k="' + k + '"]').forEach(function(x){ x.classList.remove('on'); });
      b.classList.add('on');
    });
  });

  function v(id){ var n = document.getElementById(id); return n ? (n.value||'').trim() : ''; }
  var done = document.getElementById('rDone');

  document.getElementById('rSend').addEventListener('click', function () {
    var lines = EVENTS.map(function(e){
      return e.label + ': ' + (answers[e.k] ? answers[e.k].toUpperCase() : '—');
    }).join('\n');

    if (GFORM) {
      var fd = new FormData();
      fd.append(GFORM.name, v('rName'));
      fd.append(GFORM.email, v('rEmail'));
      fd.append(GFORM.events, lines.replace(/\n/g, ' | '));
      fd.append(GFORM.count, v('rCount'));
      fd.append(GFORM.diet, v('rDiet'));
      fd.append(GFORM.note, v('rNote'));
      fetch(GFORM.action, { method:'POST', mode:'no-cors', body:fd }).catch(function(){});
      done.textContent = 'rsvp received — thank you ♡';
      done.classList.add('show');
      this.disabled = true;
      return;
    }

    var body =
      'RSVP — sam + jenni, 3.20.27\n\n' +
      lines + '\n\n' +
      'name(s): ' + v('rName') + '\n' +
      'email: ' + v('rEmail') + '\n' +
      'party size: ' + v('rCount') + '\n' +
      'dietary: ' + v('rDiet') + '\n' +
      'notes: ' + v('rNote') + '\n';
    window.location.href = 'mailto:tangjennii@gmail.com' +
      '?subject=' + encodeURIComponent('RSVP — ' + (v('rName') || 'sam + jenni wedding')) +
      '&body=' + encodeURIComponent(body);
    done.textContent = 'opening your email — thank you ♡';
    done.classList.add('show');
  });
})();
