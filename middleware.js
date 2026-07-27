// Server-side gate. Runs on Vercel's Edge before any page is served.
// NOTE: this is a plain Vercel middleware (no Next.js), so `request` is a
// standard Web Request — it has NO `.cookies` helper. We parse the Cookie
// header ourselves. (Using request.cookies is what caused MIDDLEWARE_INVOCATION_FAILED.)

export const config = {
  matcher: ['/((?!gate|api/login|_next|favicon.ico|.*\\.(?:mp4|jpg|jpeg|png|gif|ics|svg|webp|css|js|json|geojson|woff|woff2|ico)).*)'],
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
  const expected = process.env.SITE_PASSWORD || 'shlang';
  const cookies = parseCookies(request.headers.get('cookie'));

  if (cookies.sj_pass === expected) {
    return; // authenticated — let the request through
  }

  const url = new URL(request.url);
  url.pathname = '/gate';
  url.search = '';
  return Response.redirect(url, 307);
}
