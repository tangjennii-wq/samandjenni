// Validates the passphrase, records the guest's last name, and sets cookies.
// sj_pass  = the shared passphrase (HttpOnly) — this is what the middleware checks.
// sj_guest = the guest's lowercased last name (readable by page JS) — used to
//            personalize which events they see (e.g. the Friday welcome party).

export default function handler(req, res) {
  const expected = process.env.SITE_PASSWORD || 'shlang';

  let password = '';
  let lastname = '';
  if (req.method === 'POST') {
    const body = req.body || {};
    if (typeof body === 'string') {
      const p = new URLSearchParams(body);
      password = p.get('password') || '';
      lastname = p.get('lastname') || '';
    } else {
      password = body.password || '';
      lastname = body.lastname || '';
    }
  }

  const pw = String(password).trim().toLowerCase().replace(/\s+/g, '');
  const ln = String(lastname).trim().toLowerCase();

  const ok = pw === String(expected).trim().toLowerCase() && ln.length > 0;

  if (ok) {
    const maxAge = 60 * 60 * 24 * 400;
    res.setHeader('Set-Cookie', [
      `sj_pass=${expected}; Path=/; Max-Age=${maxAge}; SameSite=Lax; HttpOnly; Secure`,
      `sj_guest=${encodeURIComponent(ln)}; Path=/; Max-Age=${maxAge}; SameSite=Lax; Secure`,
    ]);
    res.writeHead(302, { Location: '/' });
    return res.end();
  }

  res.writeHead(302, { Location: '/gate?e=1' });
  return res.end();
}
