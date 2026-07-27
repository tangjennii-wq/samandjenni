// Records who the guest is. No password — the only requirement is a name.
// sj_guest = the guest's lowercased email or last name (readable by page JS).
//            personalize.js maps it to a tier to decide which events they see,
//            and rsvpform.js uses it to prefill the RSVP.
//
// The old sj_pass cookie is gone; we actively clear it so returning guests
// aren't carrying a dead cookie around.

export default function handler(req, res) {
  let lastname = '';
  if (req.method === 'POST') {
    const body = req.body || {};
    if (typeof body === 'string') {
      lastname = new URLSearchParams(body).get('lastname') || '';
    } else {
      lastname = body.lastname || '';
    }
  }

  const ln = String(lastname).trim().toLowerCase();

  if (!ln) {
    res.writeHead(302, { Location: '/gate?e=1' });
    return res.end();
  }

  const maxAge = 60 * 60 * 24 * 400;
  res.setHeader('Set-Cookie', [
    `sj_guest=${encodeURIComponent(ln)}; Path=/; Max-Age=${maxAge}; SameSite=Lax; Secure`,
    'sj_pass=; Path=/; Max-Age=0; SameSite=Lax; HttpOnly; Secure',
  ]);
  res.writeHead(302, { Location: '/' });
  return res.end();
}
