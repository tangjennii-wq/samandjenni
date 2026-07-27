// Gate: passphrase + guest allowlist.
//
// The allowlist lives in Supabase, never in this repo (the repo is public).
// We call a security-definer function that answers a bare true/false — it can
// tell us "yes, that's a guest" without ever handing over the guest list.
//
// sj_pass  = the shared passphrase (HttpOnly) — what middleware.js checks.
// sj_guest = the guest's lowercased email or last name (readable by page JS),
//            used to personalise events and prefill the RSVP.

const SB_URL = 'https://aybkcrmbdvuxenljqkab.supabase.co';
const SB_KEY = 'sb_publishable_RzS1uAPwarXf0b7S-uB-1w_4fHKWgIX';

// key -> is this person on the list?
// Returns true on an infrastructure failure: a Supabase outage should never
// lock every guest out of the site. A clean "false" is still a hard no.
async function rpc(fn, key) {
  const r = await fetch(SB_URL + '/rest/v1/rpc/' + fn, {
    method: 'POST',
    headers: { apikey: SB_KEY, Authorization: 'Bearer ' + SB_KEY,
               'Content-Type': 'application/json' },
    body: JSON.stringify({ p_key: key }),
  });
  if (!r.ok) throw new Error(fn + ' ' + r.status);
  return r.json();
}

// Is this a guest, and which tier are they?
// Returns tier 3 when the lookup succeeds but the key has no tier (an
// ambiguous shared surname) — they see Friday + Saturday and nothing private.
async function lookUp(key) {
  try {
    const [allowed, tier] = await Promise.all([rpc('guest_allowed', key), rpc('guest_tier', key)]);
    return { allowed: allowed === true, tier: Number(tier) || 3, degraded: false };
  } catch (e) {
    // One retry — a single blip shouldn't lock a guest out.
    try {
      const [allowed, tier] = await Promise.all([rpc('guest_allowed', key), rpc('guest_tier', key)]);
      return { allowed: allowed === true, tier: Number(tier) || 3, degraded: false };
    } catch (e2) {
      // Still down: let them in, but at the most restrictive useful tier, so an
      // outage never exposes the private events.
      return { allowed: true, tier: 3, degraded: true };
    }
  }
}

export default async function handler(req, res) {
  const expected = process.env.SITE_PASSWORD || 'shlang';

  let password = '', lastname = '';
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

  if (pw !== String(expected).trim().toLowerCase()) {
    res.writeHead(302, { Location: '/gate?e=pass' });
    return res.end();
  }
  if (!ln) {
    res.writeHead(302, { Location: '/gate?e=name' });
    return res.end();
  }

  // An email may be typed as "First Last <a@b.com>" or with stray punctuation.
  const key = (ln.match(/[^\s<>,;]+@[^\s<>,;]+/) || [ln])[0].replace(/[.,;]+$/, '');
  const { allowed, tier } = await lookUp(key);
  if (!allowed) {
    res.writeHead(302, { Location: '/gate?e=list' });
    return res.end();
  }

  const maxAge = 60 * 60 * 24 * 400;
  res.setHeader('Set-Cookie', [
    `sj_pass=${expected}; Path=/; Max-Age=${maxAge}; SameSite=Lax; HttpOnly; Secure`,
    `sj_guest=${encodeURIComponent(key)}; Path=/; Max-Age=${maxAge}; SameSite=Lax; Secure`,
    `sj_tier=${tier}; Path=/; Max-Age=${maxAge}; SameSite=Lax; Secure`,
  ]);
  res.writeHead(302, { Location: '/' });
  return res.end();
}
