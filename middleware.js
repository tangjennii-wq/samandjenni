// Server-side gate. Runs on Vercel's Edge before any page is served.
//
// Third arrangement this has had, so the history is worth keeping straight:
//   1. whole site behind a shared passphrase ("shlang")
//   2. whole site public, only /rsvp gated
//   3. (now) only the home page public, every other page gated
//
// Public:  /  (the film, the date, the city — the invitation's front door)
//          /gate, /api/login  — the door itself, or nothing could open it
//          every static asset — css, js, images, video, fonts, og-image
// Gated:   events, recs, hotels, FAQ, rsvp, over/under, stay
//
// Deny by default: the allow-list below is explicit and everything not on it
// needs a cookie. A new page added to the repo is therefore private until
// someone deliberately makes it public, which is the right way round.
//
// This is a real server-side gate, unlike the tier hiding in personalize.js —
// an unsigned visitor gets a 307 to /gate and never receives the page body.
//
// NOTE: plain Vercel middleware (no Next.js), so `request` is a standard Web
// Request — it has NO `.cookies` helper. We parse the Cookie header ourselves.
// (Using request.cookies is what caused MIDDLEWARE_INVOCATION_FAILED.)

export const config = {
  // Match everything; the allow-list is in code where it can be read and tested.
  matcher: ['/((?!_next/static|_vercel).*)'],
};

const PUBLIC_PATHS = new Set([
  '/', '/index.html',
  '/gate', '/gate.html',
]);

// Where a guest may be sent after signing in. An allow-list, not a pattern:
// `next` arrives from the query string, and reflecting an arbitrary value into
// a redirect is how you end up with an open redirect pointing at someone
// else's site.
export const NEXT_ALLOWED = new Set([
  'index', 'weekend', 'recommendations', 'travel', 'faq', 'rsvp',
  'over-under', 'stay',
]);

function parseCookies(header) {
  const out = {};
  (header || '').split(';').forEach((part) => {
    const i = part.indexOf('=');
    if (i > -1) out[part.slice(0, i).trim()] = decodeURIComponent(part.slice(i + 1).trim());
  });
  return out;
}

export default function middleware(request) {
  const url = new URL(request.url);
  const path = url.pathname;

  // The login endpoint has to stay reachable while signed out.
  if (path.startsWith('/api/')) return;

  // Static assets: any path with a file extension other than .html. Keeps the
  // css, the film and og-image.jpg fetchable, which also matters for link
  // previews — a crawler unfurling samandjenni.com has no cookie.
  const dot = path.lastIndexOf('.');
  const ext = dot > -1 ? path.slice(dot).toLowerCase() : '';
  if (ext && ext !== '.html') return;

  if (PUBLIC_PATHS.has(path)) return;

  // Recognised guests carry sj_guest, set by api/login.js after a successful
  // lookup against the allowlist.
  const cookies = parseCookies(request.headers.get('cookie'));
  if (cookies.sj_guest) return;

  // Remember where they were heading so login can put them back there.
  const wanted = path.replace(/^\//, '').replace(/\.html$/, '');
  const gate = new URL(request.url);
  gate.pathname = '/gate';
  gate.search = NEXT_ALLOWED.has(wanted) ? '?next=' + encodeURIComponent(wanted) : '';
  return Response.redirect(gate, 307);
}
