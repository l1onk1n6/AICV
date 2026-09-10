// Edge Function: track-view
// Aus dem Live-Deployment zurueckgeholt (2026-09-09) — die Function lief in
// Produktion, fehlte aber im Repo. Quelle ist das deployte Bundle, die
// TypeScript-Typannotationen hat der Deploy-Schritt entfernt.
//
// Oeffentliches View-Tracking fuer geteilte Mappen.
// JWT enforcement: OFF   (entspricht dem Live-Zustand verify_jwt=false;
// dieser Marker steuert --no-verify-jwt in supabase-functions.yml)
//

// Called by SharedResumePage on load (POST) and on unload via sendBeacon (PATCH).
// JWT enforcement: OFF — public endpoint
//
// POST  { token: string }              → logs a new view, returns { view_id }
// PATCH { view_id: string, duration_s: number } → updates duration of existing view
import { createClient } from 'npm:@supabase/supabase-js@2';
// Configurable via APP_ORIGIN secret; falls back to production domain.
const ALLOWED_ORIGIN = Deno.env.get('APP_ORIGIN') ?? 'https://path.pixmatic.ch';
// Only allow requests from the app origin; server-to-server (no Origin header) always allowed.
function corsHeaders(req) {
  const origin = req.headers.get('origin') ?? '';
  const h = {
    'Content-Type': 'application/json',
    'Vary': 'Origin'
  };
  if (!origin || origin === ALLOWED_ORIGIN) {
    h['Access-Control-Allow-Origin'] = ALLOWED_ORIGIN;
    h['Access-Control-Allow-Headers'] = 'content-type';
  }
  return h;
}
// ── Rate limiting ──────────────────────────────────────────────
// Module-level map persists across requests within the same isolate.
const rlMap = new Map();
function checkRate(ip, key, limit, windowMs) {
  const now = Date.now();
  const k = `${ip}:${key}`;
  let entry = rlMap.get(k);
  if (!entry || now > entry.resetAt) {
    entry = {
      n: 0,
      resetAt: now + windowMs
    };
    rlMap.set(k, entry);
  }
  entry.n += 1;
  return entry.n <= limit;
}
function getIp(req) {
  return req.headers.get('cf-connecting-ip') ?? req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';
}
function parseDevice(ua) {
  if (/mobile/i.test(ua)) return 'mobile';
  if (/tablet|ipad/i.test(ua)) return 'tablet';
  return 'desktop';
}
function parseBrowser(ua) {
  if (/edg\//i.test(ua)) return 'Edge';
  if (/opr\//i.test(ua)) return 'Opera';
  if (/chrome/i.test(ua)) return 'Chrome';
  if (/safari/i.test(ua)) return 'Safari';
  if (/firefox/i.test(ua)) return 'Firefox';
  return 'Other';
}
Deno.serve(async (req)=>{
  if (req.method === 'OPTIONS') return new Response(null, {
    headers: corsHeaders(req)
  });
  const ip = getIp(req);
  const ch = corsHeaders(req);
  const sb = createClient(Deno.env.get('SUPABASE_URL'), Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'));
  function json(body, status = 200) {
    return new Response(JSON.stringify(body), {
      status,
      headers: ch
    });
  }
  try {
    // sendBeacon always uses POST; it passes ?method=PATCH to signal a duration update
    const methodOverride = new URL(req.url).searchParams.get('method')?.toUpperCase();
    const method = methodOverride ?? req.method;
    // ── PATCH: update duration of an existing view ─────────
    if (method === 'PATCH') {
      if (!checkRate(ip, 'patch', 30, 60_000)) return json({
        error: 'rate limit exceeded'
      }, 429);
      const { view_id, duration_s } = await req.json();
      if (!view_id || typeof duration_s !== 'number') return json({
        error: 'bad request'
      }, 400);
      await sb.from('resume_views').update({
        duration_s
      }).eq('id', view_id);
      return json({
        ok: true
      });
    }
    // ── POST: log new view ─────────────────────────────────
    if (method !== 'POST') return json({
      error: 'method not allowed'
    }, 405);
    if (!checkRate(ip, 'post', 15, 60_000)) return json({
      error: 'rate limit exceeded'
    }, 429);
    const { token } = await req.json();
    if (!token) return json({
      error: 'token required'
    }, 400);
    // Resolve share link
    const { data: link } = await sb.from('share_links').select('id').eq('token', token).eq('is_active', true).maybeSingle();
    if (!link) return json({
      error: 'not found'
    }, 404);
    // Geo: ausschliesslich der Cloudflare-Header. Der fruehere Fallback auf
    // ip-api.com ist ersatzlos entfallen — er hat die Besucher-IP unverschlues-
    // selt (http, HTTPS nur im Bezahltarif) an einen Dritten geschickt.
    // Ohne brauchbaren Header gilt der Standardwert; Stadt wird nicht mehr
    // ermittelt.
    const DEFAULT_COUNTRY_CODE = 'DE';
    const cfCountry = req.headers.get('cf-ipcountry');
    const countryCode = cfCountry && cfCountry !== 'XX' ? cfCountry : DEFAULT_COUNTRY_CODE;
    const ua = req.headers.get('user-agent') ?? '';
    const referrer = req.headers.get('referer') ?? undefined;
    const { data: view } = await sb.from('resume_views').insert({
      share_link_id: link.id,
      country: null,
      country_code: countryCode,
      city: null,
      device: parseDevice(ua),
      browser: parseBrowser(ua),
      referrer: referrer ?? null
    }).select('id').single();
    return json({
      view_id: view?.id
    });
  } catch (e) {
    console.error('[track-view]', e);
    // Interna bleiben im Log, nicht in der Antwort.
    return json({
      error: 'Internal error'
    }, 500);
  }
});
