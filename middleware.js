// Server-side gate. Runs on Vercel's Edge before anything is served.
//
// Fourth arrangement, so the history is worth keeping straight:
//   1. whole site behind a shared passphrase ("shlang")
//   2. whole site public, only /rsvp gated
//   3. only the home page public, every other page gated
//   4. (now) the whole site private — nothing but the gate itself
//
// Public, and nothing else:
//   /gate            the door
//   /api/*           login has to be callable while signed out
//   hero.mp4         the gate's own background film
//   poster.jpg       its poster frame
//   og-image.jpg     link previews — whatever unfurls a text has no cookie
//   favicon.ico      browser tab
//
// Everything else needs sj_guest: every page including the home page, and
// every stylesheet, script, image and video.
//
// Gating .css and .js is deliberate, not overreach. gate.html carries its own
// styles and script inline, so it needs none of them — and map.js holds the
// full recommendations and hotel data plus the Friday and Saturday venues.
// Leaving it public would have meant anyone guessing /map.js could read
// "Chinese Tuxedo" and "The Pierre" out of a site that is otherwise sealed.
//
// Deny by default: the allow-list is explicit, so anything added to the repo
// later is private until someone deliberately opens it.
//
// NOTE: plain Vercel middleware (no Next.js), so `request` is a standard Web
// Request — it has NO `.cookies` helper. We parse the Cookie header ourselves.
// (Using request.cookies is what caused MIDDLEWARE_INVOCATION_FAILED.)

export const config = {
  matcher: ['/((?!_next/static|_vercel).*)'],
};

const PUBLIC_PATHS = new Set([
  '/gate', '/gate.html',
  // the gate renders these three; without them the door itself is broken
  '/hero.mp4', '/poster.jpg', '/favicon.ico',
  // and this one is fetched by link-preview crawlers, which never have a cookie
  '/og-image.jpg',
]);

// Where a guest may be sent after signing in. An allow-list, not a pattern:
// `next` arrives from the query string, and reflecting an arbitrary value into
// a redirect is how you end up with an open redirect pointing somewhere else.
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

  if (path.startsWith('/api/')) return;
  if (PUBLIC_PATHS.has(path)) return;

  // Recognised guests carry sj_guest, set by api/login.js after a successful
  // lookup against the allowlist.
  const cookies = parseCookies(request.headers.get('cookie'));
  if (cookies.sj_guest) return;

  // Remember where they were heading so login can put them back there. Only
  // page requests are worth remembering — a redirected stylesheet should send
  // them to the gate plainly, not set next=site.
  const wanted = path.replace(/^\//, '').replace(/\.html$/, '');
  const gate = new URL(request.url);
  gate.pathname = '/gate';
  gate.search = NEXT_ALLOWED.has(wanted) ? '?next=' + encodeURIComponent(wanted) : '';
  return Response.redirect(gate, 307);
}
