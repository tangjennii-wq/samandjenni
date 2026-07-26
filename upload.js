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
    });

    function render(src, name, note){
      if (!preview) return;
      preview.innerHTML = '<img src="' + src + '" alt=""><span>' + name +
        '<br><i>' + note + '</i></span>';
      preview.hidden = false;
    }
    function hide(){ if (preview) { preview.hidden = true; preview.innerHTML = ''; } state = { name:'', path:'', status:'' }; }

    return {
      getRef: function(){
        if (state.status === 'sent') return '\n[photo uploaded: ' + state.name + ']\n';
        if (state.name) return '\n[photo: ' + state.name + ' — please attach it to this email ♡]\n';
        return '';
      },
      reset: hide
    };
  }

  window.SJUpload = { wire: wire };
})();
