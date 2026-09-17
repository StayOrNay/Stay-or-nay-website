// Cloudflare Pages middleware — "Coming soon" gate for the whole site.
//
// Every request (pages, assets and /api) gets the coming-soon page instead,
// except when the visitor has the preview cookie.
//
// Get past it yourself: open  https://stayornayy.com/?preview=vVZf5W9JRHE7
// once — it sets a cookie for 30 days on that browser.
//
// To open the site to everyone: set LAUNCHED to true (or delete this file)
// and push.

const LAUNCHED = false;
const PREVIEW_KEY = "vVZf5W9JRHE7";
const COOKIE = "son_preview";
const ALWAYS_ALLOWED = ["/favicon.svg", "/icons.svg"];

export async function onRequest(context) {
  const { request, next } = context;
  if (LAUNCHED) return next();

  const url = new URL(request.url);
  if (ALWAYS_ALLOWED.includes(url.pathname)) return next();

  // Unlock via ?preview=KEY, then redirect to a clean URL.
  if (url.searchParams.get("preview") === PREVIEW_KEY) {
    url.searchParams.delete("preview");
    return new Response(null, {
      status: 302,
      headers: {
        Location: url.pathname + url.search,
        "Set-Cookie": `${COOKIE}=${PREVIEW_KEY}; Path=/; Max-Age=2592000; HttpOnly; Secure; SameSite=Lax`,
      },
    });
  }

  const cookies = request.headers.get("Cookie") || "";
  if (cookies.split(/;\s*/).includes(`${COOKIE}=${PREVIEW_KEY}`)) return next();

  return new Response(PAGE, {
    status: 503,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Retry-After": "86400",
      "Cache-Control": "no-store",
      "X-Robots-Tag": "noindex",
    },
  });
}

const PAGE = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>StayOrNay — coming soon</title>
<meta name="robots" content="noindex" />
<meta name="theme-color" content="#14875A" />
<link rel="icon" type="image/svg+xml" href="/favicon.svg" />
<style>
  :root { --green:#14875A; --cream:#FBF8F1; --ink:#1B2B24; --muted:#5E6B64; }
  * { box-sizing:border-box; margin:0; padding:0; }
  html,body { height:100%; }
  body {
    background:var(--cream); color:var(--ink);
    font-family:ui-sans-serif,system-ui,-apple-system,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;
    display:flex; align-items:center; justify-content:center; padding:24px;
    -webkit-font-smoothing:antialiased;
  }
  main { max-width:520px; text-align:center; }
  svg { width:64px; height:64px; margin-bottom:28px; }
  .tag { display:inline-block; font-size:12px; font-weight:600; letter-spacing:.12em; text-transform:uppercase;
    color:var(--green); background:rgba(20,135,90,.1); padding:6px 12px; border-radius:999px; margin-bottom:20px; }
  h1 { font-size:clamp(34px,7vw,52px); line-height:1.05; letter-spacing:-.02em; margin-bottom:16px; }
  h1 span { color:var(--green); }
  p { font-size:17px; line-height:1.55; color:var(--muted); }
</style>
</head>
<body>
<main>
  <svg viewBox="0 0 64 64" fill="none" aria-hidden="true">
    <path d="M32 4C19.85 4 10 13.4 10 25c0 14.5 18.6 32.2 20.6 34.1a2 2 0 0 0 2.8 0C35.4 57.2 54 39.5 54 25 54 13.4 44.15 4 32 4Z" fill="#14875A"/>
    <circle cx="32" cy="25" r="13" fill="#FBF8F1"/>
    <path d="M25.5 25.6l4.3 4.3 9-9.6" stroke="#14875A" stroke-width="4.2" stroke-linecap="round" stroke-linejoin="round"/>
  </svg>
  <div class="tag">Coming soon</div>
  <h1>Stay<span>Or</span>Nay</h1>
  <p>Honest villa verdicts from people who actually stayed. We're putting the finishing touches on it. Check back soon.</p>
</main>
</body>
</html>`;
