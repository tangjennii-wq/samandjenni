// Validates the passphrase server-side and sets the cookie that unlocks the site.
export default function handler(req, res) {
  const expected = process.env.SITE_PASSWORD || 'shlang';

  let submitted = '';
  if (req.method === 'POST') {
    const body = req.body || {};
    submitted = (typeof body === 'string' ? new URLSearchParams(body).get('password') : body.password) || '';
  } else {
    submitted = (req.query && req.query.password) || '';
  }

  const clean = String(submitted).trim().toLowerCase().replace(/\s+/g, '');

  if (clean === String(expected).trim().toLowerCase()) {
    res.setHeader('Set-Cookie', [
      `sj_pass=${expected}; Path=/; Max-Age=${60 * 60 * 24 * 400}; SameSite=Lax; HttpOnly; Secure`,
    ]);
    res.writeHead(302, { Location: '/' });
    return res.end();
  }

  res.writeHead(302, { Location: '/gate?e=1' });
  return res.end();
}
