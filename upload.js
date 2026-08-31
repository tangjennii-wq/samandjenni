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

    /* Shrink before sending.
       A photo straight off a phone is 3-12MB and 4000px wide. The bucket caps
       at 15MB, so the big ones simply bounced — and the failure said nothing
       useful, because the response was thrown away without reading it.
       Downscaling fixes the cap, makes the upload survive a phone signal, and
       is what we want anyway: nothing here is printed larger than a screen.
       Also converts HEIC to JPEG as a side effect, which is what iPhones hand
       us and what most desktop software would rather not deal with.
       If anything about the canvas path fails we fall back to the original
       file, so this can only ever make the upload more likely to succeed. */
    var MAX_EDGE = 2000, QUALITY = 0.85, SHRINK_OVER = 1200000; // ~1.2MB
    function shrink(f){
      return new Promise(function(resolve){
        if (!window.createImageBitmap || f.size <= SHRINK_OVER) return resolve(f);
        createImageBitmap(f).then(function(bm){
          var scale = Math.min(1, MAX_EDGE / Math.max(bm.width, bm.height));
          if (scale === 1 && f.size <= SHRINK_OVER) { bm.close && bm.close(); return resolve(f); }
          var w = Math.round(bm.width * scale), h = Math.round(bm.height * scale);
          var cv = document.createElement('canvas'); cv.width = w; cv.height = h;
          cv.getContext('2d').drawImage(bm, 0, 0, w, h);
          bm.close && bm.close();
          cv.toBlob(function(blob){
            if (!blob || blob.size >= f.size) return resolve(f);
            blob.name = (f.name || 'photo').replace(/\.[^.]+$/, '') + '.jpg';
            resolve(blob);
          }, 'image/jpeg', QUALITY);
        }).catch(function(){ resolve(f); });
      });
    }

    function send(f){
      // HEIC often arrives with an empty or odd type, so accept by extension too.
      var looksImage = /^image\//.test(f && f.type || '') ||
                       /\.(jpe?g|png|webp|heic|heif|gif)$/i.test(f && f.name || '');
      if (!f || !looksImage) {
        if (f) render('', f.name || 'file', 'that is not an image — try a jpg or png');
        return;
      }
      state.name = f.name;
      var objUrl = window.URL.createObjectURL(f);
      render(objUrl, f.name, 'uploading…');

      shrink(f).then(function(body){
        var name = body.name || f.name;
        var path = Date.now() + '-' + Math.random().toString(36).slice(2, 8) + '-' + slug(name);
        return fetch(URL_BASE + '/storage/v1/object/' + BUCKET + '/' + encodeURIComponent(path), {
          method: 'POST',
          /* No x-upsert. It is the same trap that broke every RSVP submission
             back in July, documented in rsvpform.js: `x-upsert: true` makes
             Storage treat the POST as an INSERT ... ON CONFLICT DO UPDATE, RLS
             then checks the UPDATE arm as well, and this bucket has only an
             INSERT policy — so every upload was refused. `wedding-photos` held
             zero objects; the feature had never once worked.
             Upsert bought nothing anyway: the path is a timestamp plus six
             random characters, so it can never collide. */
          headers: { 'apikey': KEY, 'Authorization': 'Bearer ' + KEY,
                     'Content-Type': body.type || f.type || 'application/octet-stream' },
          body: body
        }).then(function (r) {
          if (r.ok) {
            state.path = path; state.status = 'sent';
            render(objUrl, f.name, 'uploaded ✓');
            if (onState) onState(state);
            return;
          }
          /* Read the body before giving up. Silently discarding it is why this
             failure was undiagnosable: every cause looked identical. */
          return r.text().then(function(txt){
            var why = '';
            if (r.status === 413) why = ' — that photo is too large';
            else if (r.status === 401 || r.status === 403) why = ' — permission was refused';
            else if (r.status) why = ' (error ' + r.status + ')';
            try { console.warn('[sj upload] failed', r.status, txt); } catch(e){}
            state.status = 'failed';
            render(objUrl, f.name, 'upload failed' + why + ' — please attach it to the email');
            if (onState) onState(state);
          });
        });
      }).catch(function (err) {
        try { console.warn('[sj upload] threw', err); } catch(e){}
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

  // Upsert — insert or update if a row with the same onConflict column exists.
  // Used by RSVP to allow guests to edit & resubmit.
  // Upsert. Two things this got wrong before and that any caller needs to know:
  //   1. The onConflict argument was accepted and then ignored — no on_conflict
  //      ever reached PostgREST, so it fell back to the primary key.
  //   2. merge-duplicates runs INSERT ... ON CONFLICT DO UPDATE, and RLS checks
  //      the UPDATE arm as well. A table with only an INSERT policy returns 401.
  // So: pass a column that carries a UNIQUE constraint, and make sure the table
  // has an UPDATE policy for anon. Otherwise use save() and append.
  function upsert(table, row, onConflict){
    if (typeof fetch !== 'function') return Promise.reject(new Error('offline'));
    var url = URL_BASE + '/rest/v1/' + table +
      (onConflict ? '?on_conflict=' + encodeURIComponent(onConflict) : '');
    return fetch(url, {
      method:'POST',
      headers:{ 'apikey':KEY, 'Authorization':'Bearer '+KEY,
                'Content-Type':'application/json',
                'Prefer':'return=minimal,resolution=merge-duplicates' },
      body: JSON.stringify(row)
    }).then(function(r){
      if (!r.ok) throw new Error('upsert failed: ' + r.status);
      return r;
    });
  }

  function guestKey(){
    var m = document.cookie.split('; ').find(function(r){ return r.indexOf('sj_guest=') === 0; });
    return m ? decodeURIComponent(m.split('=').slice(1).join('=')) : '';
  }

  // Call a security-definer Postgres function. Used to ask yes/no questions
  // about a guest's own row without giving the browser read access to the
  // table — wedding_rsvps has an INSERT policy and deliberately no SELECT one,
  // so a guest can reply but can't read anyone's answers, including their own.
  function rpc(fn, key){
    if (typeof fetch !== 'function') return Promise.reject(new Error('offline'));
    return fetch(URL_BASE + '/rest/v1/rpc/' + fn, {
      method:'POST',
      headers:{ 'apikey':KEY, 'Authorization':'Bearer '+KEY, 'Content-Type':'application/json' },
      body: JSON.stringify({ p_key: key })
    }).then(function(r){
      if (!r.ok) throw new Error(fn + ' ' + r.status);
      return r.json();
    });
  }

  window.SJUpload = { wire: wire, save: save, upsert: upsert, guestKey: guestKey, rpc: rpc };
})();
