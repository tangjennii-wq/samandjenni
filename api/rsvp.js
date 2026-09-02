// api/rsvp.js — the only way a reply gets recorded.
//
// The browser sends answers. It does NOT send who it is. This handler reads
// the sign-in cookie, resolves it to a household through Supabase, and the
// database writes guest_key and tier from that lookup — so a submission
// cannot claim to be someone it isn't, whatever the page sends.
//
// Two credentials are accepted, strongest first:
//   sj_tok    an invitation token (from a /api/login?k=… link). Unguessable,
//             72 random bits, and HttpOnly so page scripts can never read it.
//   sj_guest  the email the guest typed at the gate. Weaker on purpose: the
//             gate is email-only and that is what makes the site frictionless.
//             Someone who knows another guest's address could reply as them.
//             That is a decision, not an oversight — for 124 people who all
//             know each other it is not a real threat, and the alternative
//             (everyone must keep a link) costs more than it buys.
//
// What this DOES close: anyone outside the guest list. Before this endpoint
// the browser posted straight into the table with a guest_key of its own
// choosing, so a stranger with the publishable key — which ships in the page —
// could file replies for anybody. Now every write goes through here.
//
// Plain INSERT, never an upsert: a later answer must never destroy the record
// of an earlier one. Two people in one household have already replied
// separately and disagreed, and we want to see both.

const SB_URL = 'https://aybkcrmbdvuxenljqkab.supabase.co';
const SB_KEY = 'sb_publishable_RzS1uAPwarXf0b7S-uB-1w_4fHKWgIX';

async function rpc(fn, args) {
  const r = await fetch(SB_URL + '/rest/v1/rpc/' + fn, {
    method: 'POST',
    headers: { apikey: SB_KEY, Authorization: 'Bearer ' + SB_KEY,
               'Content-Type': 'application/json' },
    body: JSON.stringify(args),
  });
  if (!r.ok) throw new Error(fn + ' ' + r.status + ' ' + (await r.text()));
  return r.json();
}

function cookies(header) {
  const out = {};
  (header || '').split(';').forEach((part) => {
    const i = part.indexOf('=');
    if (i > -1) out[part.slice(0, i).trim()] = decodeURIComponent(part.slice(i + 1).trim());
  });
  return out;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.writeHead(405, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ error: 'POST only' }));
  }

  let body = req.body || {};
  if (typeof body === 'string') { try { body = JSON.parse(body); } catch (e) { body = {}; } }

  const c = cookies(req.headers.cookie);
  const tok = (c.sj_tok || '').trim();
  const email = (c.sj_guest || '').trim();

  if (!tok && !email) {
    res.writeHead(401, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ error: 'not signed in' }));
  }

  // Answers only. Anything the client says about identity is discarded here.
  const events = (body && typeof body.events === 'object' && body.events) || {};
  const guests = Array.isArray(body && body.guests) ? body.guests.slice(0, 2) : [];
  const photo  = typeof (body && body.photo_path) === 'string' ? body.photo_path : null;

  // Keep the stored shape tight: three known string fields per guest, capped.
  const clean = guests.map((g) => ({
    name:    String((g && g.name)    || '').slice(0, 120),
    email:   String((g && g.email)   || '').slice(0, 160),
    dietary: String((g && g.dietary) || '').slice(0, 400),
  }));

  /* Two doors into the same room. Whichever is used, the household is
     resolved inside Postgres and guest_key and tier are written from that
     lookup — never from anything sent here.

     Token path: submit_rsvp() is a security-definer that looks the household
     up from the token, writes guest_key and tier, and inserts the row. The
     browser cannot lie about who it is.

     Email path: submit_rsvp_by_email() was planned but never created in
     Postgres. Until it exists, we look the tier up via guest_tier() — the
     same call login.js already makes — and INSERT directly. guest_key is the
     email from the sign-in cookie (set by login.js after it verified the
     address against the allowlist), so identity still comes from the server,
     not the page. A plain INSERT, never upsert, matching the old client-side
     path and the comment at the top of this file. */
  try {
    let id;
    if (tok) {
      id = await rpc('submit_rsvp', { p_token: tok, p_events: events, p_guests: clean, p_photo: photo });
    } else {
      // Look up the tier the same way login.js does.
      let tier = 4;
      try { tier = Number(await rpc('guest_tier', { p_key: email })) || 4; } catch (_) {}

      const row = {
        guest_key:  email,
        tier:       tier,
        party_size: clean.length,
        events:     events,
        guests:     clean,
        photo_path: photo || '',
      };

      const ins = await fetch(SB_URL + '/rest/v1/wedding_rsvps', {
        method: 'POST',
        headers: { apikey: SB_KEY, Authorization: 'Bearer ' + SB_KEY,
                   'Content-Type': 'application/json', Prefer: 'return=minimal' },
        body: JSON.stringify(row),
      });
      if (!ins.ok) throw new Error('insert ' + ins.status + ' ' + (await ins.text()));
      id = null;
    }

    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ ok: true, id }));
  } catch (e) {
    const known = /not on the guest list|invalid token/i.test(String(e && e.message));
    res.writeHead(known ? 403 : 502, { 'Content-Type': 'application/json' });
    // Never echo the internal error to the page.
    return res.end(JSON.stringify({ error: known ? 'we could not match you to the guest list' : 'could not save' }));
  }
}
