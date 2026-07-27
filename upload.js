// upload.js — direct-to-storage photo uploads. No guest sign-in required.
// Files land in a private bucket; only Sam & Jenni can read them.
// window.SJUpload.wire(fileInput, previewEl, onState) -> { getRef, reset }
(function () {
  var URL_BASE = 'https://aybkcrmbdvuxenljqkab.supabase.co';
  var KEY = 'sb_publishable_RzS1uAPwarXf0b7S-uB-1w_4fHKWgIX';
  var BUCKET = 'wedding-photos';

  function slug(s){
    return (s || 'photo').toLowerCase().replace(/[^a-z0-9.]+/g, '-').replace(/^-+|-+$/g, '').slice(-60);
  }

  function wire(input, preview, onState){
    var state = { name:'', path:'', status:'' };
    if (!input) return { getRef:function(){ return ''; }, reset:function(){} };

    input.addEventListener('change', function () {
      var f = input.files && input.files[0];
      if (!f) { hide(); return; }
      send(f);
    });

    function send(f){
      if (!f || !/^image\//.test(f.type || '')) {
        if (f) render('', f.name || 'file', 'that is not an image — try a jpg or png');
        return;
      }
      state.name = f.name;
      var objUrl = window.URL.createObjectURL(f);
      render(objUrl, f.name, 'uploading…');

      var path = Date.now() + '-' + Math.random().toString(36).slice(2, 8) + '-' + slug(f.name);
      fetch(URL_BASE + '/storage/v1/object/' + BUCKET + '/' + encodeURIComponent(path), {
        method: 'POST',
        headers: { 'apikey': KEY, 'Authorization': 'Bearer ' + KEY, 'x-upsert': 'true',
                   'Content-Type': f.type || 'application/octet-stream' },
        body: f
      }).then(function (r) {
        if (r.ok) { state.path = path; state.status = 'sent'; render(objUrl, f.name, 'uploaded ✓'); }
        else { state.status = 'failed'; render(objUrl, f.name, 'upload failed — please attach it to the email'); }
        if (onState) onState(state);
      }).catch(function () {
        state.status = 'failed';
        render(objUrl, f.name, 'upload failed — please attach it to the email');
        if (onState) onState(state);
      });
    }

    // ---- drag & drop ------------------------------------------------------
    // The <label for="…"> that already fronts the file input doubles as the
    // drop zone, so the affordance and the target are the same thing.
    // Two labels can point at the same input (a text label and the button).
    // Bind to the button, not the caption.
    var zone = null;
    if (input.id) {
      var esc = input.id.replace(/"/g, '\\"');
      zone = document.querySelector('label.photo-drop[for="' + esc + '"], label.rsvp-photo-btn[for="' + esc + '"]');
      if (!zone) zone = input.parentNode && input.parentNode.querySelector('label[for="' + esc + '"]');
    }
    if (zone && window.FileReader) {
      var depth = 0;   // dragenter/leave fire for children too — count them
      var stop = function(e){ e.preventDefault(); e.stopPropagation(); };
      ['dragenter','dragover','dragleave','drop'].forEach(function(t){
        zone.addEventListener(t, stop);
      });
      zone.addEventListener('dragenter', function(){ depth++; zone.classList.add('is-drop'); });
      zone.addEventListener('dragleave', function(){ if(--depth <= 0){ depth = 0; zone.classList.remove('is-drop'); } });
      zone.addEventListener('drop', function(e){
        depth = 0; zone.classList.remove('is-drop');
        var dt = e.dataTransfer; if (!dt) return;
        var f = dt.files && dt.files[0];
        if (f) send(f);
      });
      // stop a stray miss from navigating the page away to the image
      window.addEventListener('dragover', function(e){ e.preventDefault(); });
      window.addEventListener('drop', function(e){ e.preventDefault(); });
    }

    function render(src, name, note){
      if (!preview) return;
      preview.innerHTML = (src ? '<img src="' + src + '" alt="">' : '') + '<span>' + name +
        '<br><i>' + note + '</i></span>';
      preview.hidden = false;
    }
    function hide(){ if (preview) { preview.hidden = true; preview.innerHTML = ''; } state = { name:'', path:'', status:'' }; }

    return {
      getPath: function(){ return state.path || ''; },
      getRef: function(){
        if (state.status === 'sent') return '\n[photo uploaded: ' + state.name + ']\n';
        if (state.name) return '\n[photo: ' + state.name + ' — please attach it to this email ♡]\n';
        return '';
      },
      reset: hide
    };
  }

  // Save a row to a table (insert-only for guests).
  // Rejects on a non-2xx response so callers can tell the guest it failed.
  function save(table, row){
    if (typeof fetch !== 'function') return Promise.reject(new Error('offline'));
    return fetch(URL_BASE + '/rest/v1/' + table, {
      method:'POST',
      headers:{ 'apikey':KEY, 'Authorization':'Bearer '+KEY,
                'Content-Type':'application/json', 'Prefer':'return=minimal' },
      body: JSON.stringify(row)
    }).then(function(r){
      if (!r.ok) throw new Error('save failed: ' + r.status);
      return r;
    });
  }

  function guestKey(){
    var m = document.cookie.split('; ').find(function(r){ return r.indexOf('sj_guest=') === 0; });
    return m ? decodeURIComponent(m.split('=').slice(1).join('=')) : '';
  }

  window.SJUpload = { wire: wire, save: save, guestKey: guestKey };
})();
