// Server-side gate. Runs on Vercel's Edge before any page is served.
//
// This used to wall off the ENTIRE site behind a shared passphrase. It no
// longer does. The site is public; only the pages that carry guest-specific
// information are gated, and the key is now "are you on the guest list",
// not "do you know the word shlang".
//
// Public:  home, events (Saturday only, no exact time or address), hotels,
//          recs, over/under, the finder itself.
// Gated:   /rsvp — the reply form, which is per-guest by definition.
//
// Everything else that's guest-specific (Thursday, the rehearsal dinner,
// Saturday's address and start time) is hidden by personalize.js based on the
// sj_tier cookie. That's client-side, so a determined person could read the
// page source — a deliberate trade for keeping the site fast and static, and
// the information involved is a restaurant name, not a secret.
//
// NOTE: this is a plain Vercel middleware (no Next.js), so `request` is a
// standard Web Request — it has NO `.cookies` helper. We parse the Cookie
// header ourselves. (Using request.cookies is what caused MIDDLEWARE_INVOCATION_FAILED.)

export const config = {
  matcher: ['/rsvp', '/rsvp.html'],
};

function parseCookies(header) {
  const out = {};
  (header || '').split(';').forEach((part) => {
    const i = part.indexOf('=');
    if (i > -1) out[part.slice(0, i).trim()] = decodeURIComponent(part.slice(i + 1).trim());
  });
  return out;
}

export default function middleware(request) {
  const cookies = parseCookies(request.headers.get('cookie'));

  // Recognised guests carry sj_guest, set by api/login.js after a successful
  // lookup against the allowlist. No passphrase involved any more.
  if (cookies.sj_guest) return;

  const url = new URL(request.url);
  url.pathname = '/gate';
  url.search = '?next=rsvp';
  return Response.redirect(url, 307);
}
