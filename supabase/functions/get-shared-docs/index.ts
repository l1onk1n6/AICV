// Edge Function: get-shared-docs
// Aus dem Live-Deployment zurueckgeholt (2026-09-09) — die Function lief in
// Produktion, fehlte aber im Repo. Quelle ist das deployte Bundle, die
// TypeScript-Typannotationen hat der Deploy-Schritt entfernt.
//
// Oeffentlicher Abruf der Anlagen zu einem Share-Token (Service-Role, Token-Match).
// JWT enforcement: OFF   (entspricht dem Live-Zustand verify_jwt=false;
// dieser Marker steuert --no-verify-jwt in supabase-functions.yml)
//
// Returns documents for a shared resume token (no auth required).
// Uses service role to bypass RLS and generate signed storage URLs.
//
// GET ?token=<share_token> → { documents: UploadedDocument[] }
import { createClient } from 'npm:@supabase/supabase-js@2';
const ALLOWED_ORIGIN = 'https://path.pixmatic.ch';
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
const rlMap = new Map();
function checkRate(ip, limit, windowMs) {
  const now = Date.now();
  let entry = rlMap.get(ip);
  if (!entry || now > entry.resetAt) {
    entry = {
      n: 0,
      resetAt: now + windowMs
    };
    rlMap.set(ip, entry);
  }
  entry.n += 1;
  return entry.n <= limit;
}
function getIp(req) {
  return req.headers.get('cf-connecting-ip') ?? req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';
}
Deno.serve(async (req)=>{
  if (req.method === 'OPTIONS') return new Response(null, {
    headers: corsHeaders(req)
  });
  const ch = corsHeaders(req);
  function json(body, status = 200) {
    return new Response(JSON.stringify(body), {
      status,
      headers: ch
    });
  }
  if (req.method !== 'GET') return json({
    error: 'method not allowed'
  }, 405);
  const ip = getIp(req);
  if (!checkRate(ip, 30, 60_000)) return json({
    error: 'rate limit exceeded'
  }, 429);
  const token = new URL(req.url).searchParams.get('token');
  if (!token) return json({
    error: 'token required'
  }, 400);
  const sb = createClient(Deno.env.get('SUPABASE_URL'), Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'));
  try {
    // Resolve token → resume_id via share_links table
    const { data: link } = await sb.from('share_links').select('resume_id').eq('token', token).eq('is_active', true).maybeSingle();
    // Fallback: legacy resumes.share_token
    let resumeId = link?.resume_id ?? null;
    if (!resumeId) {
      const { data: resume } = await sb.from('resumes').select('id').eq('share_token', token).not('share_token', 'is', null).maybeSingle();
      resumeId = resume?.id ?? null;
    }
    // Return 404 instead of empty array — caller shows "not found" page
    if (!resumeId) return json({
      error: 'not found'
    }, 404);
    // Fetch document metadata
    const { data: docs, error } = await sb.from('documents').select('id, name, type, size, category, data_url, storage_path, uploaded_at').eq('resume_id', resumeId).order('uploaded_at');
    if (error) throw error;
    // Generate signed URLs for Supabase Storage files
    const result = await Promise.all((docs ?? []).map(async (doc)=>{
      let dataUrl = doc.data_url ?? '';
      const storagePath = doc.storage_path ?? null;
      if (storagePath) {
        const { data: signed } = await sb.storage.from('documents').createSignedUrl(storagePath, 3600);
        if (signed?.signedUrl) dataUrl = signed.signedUrl;
      }
      return {
        id: doc.id,
        name: doc.name,
        type: doc.type,
        size: doc.size,
        category: doc.category,
        dataUrl,
        storagePath: storagePath ?? undefined,
        uploadedAt: doc.uploaded_at
      };
    }));
    return json({
      documents: result
    });
  } catch (e) {
    console.error('[get-shared-docs]', e);
    // Interna bleiben im Log, nicht in der Antwort.
    return json({
      error: 'Internal error'
    }, 500);
  }
});
