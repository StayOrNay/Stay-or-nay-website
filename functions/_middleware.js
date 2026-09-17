// Cloudflare Pages middleware — "Coming soon" overlay for the whole site.
//
// Visitors see the real site (spinning globe and all) blurred behind a
// "Coming soon" card, and can't click, scroll, type or tab into anything.
//
// Get past it yourself: open  https://stayornayy.com/?preview=vVZf5W9JRHE7
// once — it sets a cookie for 30 days on that browser.
//
// To open the site to everyone: set LAUNCHED to true (or delete this file)
// and push.

const LAUNCHED = false;
const PREVIEW_KEY = "vVZf5W9JRHE7";
const COOKIE = "son_preview";

export async function onRequest(context) {
  const { request, next } = context;
  if (LAUNCHED) return next();

  const url = new URL(request.url);

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

  const res = await next();
  const type = res.headers.get("Content-Type") || "";
  if (!type.includes("text/html")) return res; // assets, API etc. pass through so the site renders behind the blur

  const out = new HTMLRewriter()
    .on("head", { element(el) { el.append(HEAD, { html: true }); } })
    .on("body", { element(el) { el.append(OVERLAY, { html: true }); } })
    .transform(res);
  const headers = new Headers(out.headers);
  headers.set("Cache-Control", "no-store");
  headers.set("X-Robots-Tag", "noindex");
  return new Response(out.body, { status: out.status, headers });
}

const HEAD = `
<meta name="robots" content="noindex" />
<style>
  html, body { overflow: hidden !important; overscroll-behavior: none; }
  #son-soon {
    position: fixed; inset: 0; z-index: 2147483647;
    display: flex; align-items: center; justify-content: center; padding: 24px;
    background: rgba(8, 14, 12, 0.18);
    -webkit-backdrop-filter: blur(6px);
    backdrop-filter: blur(6px);
    touch-action: none; cursor: default; user-select: none; -webkit-user-select: none;
    font-family: ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    -webkit-font-smoothing: antialiased;
  }
  #son-soon .card {
    text-align: center; max-width: 440px; width: 100%;
    background: rgba(251, 248, 241, 0.94); color: #1B2B24;
    border: 1px solid rgba(20, 135, 90, 0.18); border-radius: 24px;
    padding: 36px 32px 32px; box-shadow: 0 20px 60px rgba(15, 40, 30, 0.18);
  }
  #son-soon svg { width: 52px; height: 52px; margin: 0 auto 18px; display: block; }
  #son-soon h1 { margin: 0 0 10px; font-size: clamp(30px, 7vw, 42px); line-height: 1.05; letter-spacing: -0.02em; font-weight: 800; }
  #son-soon p { margin: 0; font-size: 16px; line-height: 1.5; color: #5E6B64; }
</style>`;

const OVERLAY = `
<div id="son-soon" role="dialog" aria-modal="true" aria-label="Coming soon">
  <div class="card">
    <svg viewBox="0 0 64 64" fill="none" aria-hidden="true">
      <path d="M32 4C19.85 4 10 13.4 10 25c0 14.5 18.6 32.2 20.6 34.1a2 2 0 0 0 2.8 0C35.4 57.2 54 39.5 54 25 54 13.4 44.15 4 32 4Z" fill="#14875A"/>
      <circle cx="32" cy="25" r="13" fill="#FBF8F1"/>
      <path d="M25.5 25.6l4.3 4.3 9-9.6" stroke="#14875A" stroke-width="4.2" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>
    <h1>Coming soon</h1>
    <p>StayOrNay is almost ready. Check back soon.</p>
  </div>
</div>
<script>
(function () {
  var root = document.getElementById("root");
  if (root) { root.setAttribute("inert", ""); root.setAttribute("aria-hidden", "true"); }
  var stop = function (e) { e.preventDefault(); e.stopPropagation(); };
  ["keydown", "keypress", "keyup", "wheel", "touchmove"].forEach(function (t) {
    window.addEventListener(t, stop, { capture: true, passive: false });
  });
  if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
})();
</script>`;
