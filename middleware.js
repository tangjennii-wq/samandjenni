// Server-side password gate. Runs on Vercel's Edge before any page is served,
// so the site HTML is never sent to someone who hasn't entered the passphrase.
export const config = {
  // Gate everything EXCEPT: the gate page itself, the login API, and static assets
  // (videos/images still need to be fetchable once you're through the gate).
  matcher: ['/((?!gate|api/login|_next|favicon.ico|.*\\.(?:mp4|jpg|jpeg|png|gif|ics|svg|webp|css|js|woff|woff2|ico)).*)'],
};

export default function middleware(request) {
  const cookie = request.cookies.get('sj_pass');
  const expected = process.env.SITE_PASSWORD || 'shlang';

  if (cookie && cookie.value === expected) {
    return; // authenticated — serve the site
  }

  const url = new URL(request.url);
  url.pathname = '/gate';
  url.search = '';
  return Response.redirect(url, 307);
}
