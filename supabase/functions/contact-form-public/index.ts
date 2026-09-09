// Edge Function: contact-form-public
// Aus dem Live-Deployment zurueckgeholt (2026-09-09) — die Function lief in
// Produktion, fehlte aber im Repo. Quelle ist das deployte Bundle, die
// TypeScript-Typannotationen hat der Deploy-Schritt entfernt.
//
// Oeffentliches Landingpage-Formular: Honeypot + Cloudflare Turnstile + IP-Ratelimit
// statt JWT.
// JWT enforcement: OFF   (entspricht dem Live-Zustand verify_jwt=false;
// dieser Marker steuert --no-verify-jwt in supabase-functions.yml)
//
// For unauthenticated landing-page visitors — no JWT required.
//
// Security layers:
//   1. Honeypot field      — bots filling hidden field rejected silently (200)
//   2. Cloudflare Turnstile — token verified against Cloudflare API (403)
//   3. Rate limiting       — max 3 messages per IP per 24 h (429)
//
// Required Supabase secrets (shared with contact-form):
//   ZAMMAD_URL             Base URL of your Zammad instance
//   ZAMMAD_TOKEN           Zammad API token (ticket.agent permission)
//   TURNSTILE_SECRET_KEY   Cloudflare Turnstile secret key
//   SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM  for auto-reply
import { createClient } from 'npm:@supabase/supabase-js@2';
import nodemailer from 'npm:nodemailer@6';
const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, content-type',
  'Access-Control-Max-Age': '86400'
};
// Zammad nimmt den Artikel als text/html entgegen. Vorher war nur `message`
// maskiert — Name und Betreff gingen roh hinein und konnten Markup in das
// Ticketsystem schreiben, das die Agenten selbst lesen.
function esc(value) {
  return String(value ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
const ZAMMAD_GROUP = 'Kunden';
const RATE_LIMIT = 3;
const RATE_WINDOW_H = 24;
function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...CORS,
      'Content-Type': 'application/json'
    }
  });
}
/** SHA-256 hex of a string — used to hash IPs before storing */ async function sha256(text) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return Array.from(new Uint8Array(buf)).map((b)=>b.toString(16).padStart(2, '0')).join('');
}
Deno.serve(async (req)=>{
  if (req.method === 'OPTIONS') return new Response('ok', {
    headers: CORS
  });
  if (req.method !== 'POST') return json({
    error: 'Method not allowed'
  }, 405);
  let _step = 'init';
  try {
    const admin = createClient(Deno.env.get('SUPABASE_URL'), Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'));
    // ── Parse body ───────────────────────────────────────────────────────────────
    _step = 'parse';
    let body;
    try {
      body = await req.json();
    } catch  {
      return json({
        error: 'Ungültige Anfrage.',
        step: 'parse'
      }, 400);
    }
    const { name, email, subject, message, token: turnstileToken, _hp } = body;
    // ── 1. Honeypot ──────────────────────────────────────────────────────────────
    if (_hp) return json({
      ok: true
    });
    // ── Basic input validation ───────────────────────────────────────────────────
    if (!name?.trim() || !message?.trim()) {
      return json({
        error: 'Name und Nachricht sind erforderlich.',
        step: 'validation'
      }, 400);
    }
    if (!email?.trim()) {
      return json({
        error: 'E-Mail-Adresse ist erforderlich.',
        step: 'validation'
      }, 400);
    }
    // ── 2. Cloudflare Turnstile verification ─────────────────────────────────────
    _step = 'turnstile';
    const turnstileSecret = Deno.env.get('TURNSTILE_SECRET_KEY');
    if (!turnstileSecret) {
      console.warn('TURNSTILE_SECRET_KEY not set — skipping verification');
    } else {
      if (!turnstileToken) {
        return json({
          error: 'Sicherheitsprüfung nicht abgeschlossen.',
          step: 'turnstile'
        }, 403);
      }
      let verifyData;
      try {
        const verifyRes = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
          },
          body: new URLSearchParams({
            secret: turnstileSecret,
            response: turnstileToken
          })
        });
        verifyData = await verifyRes.json();
      } catch (turnstileErr) {
        console.error('Turnstile verification request failed:', turnstileErr);
        return json({
          error: 'Sicherheitsprüfung konnte nicht abgeschlossen werden. Bitte später erneut versuchen.',
          step: 'turnstile'
        }, 503);
      }
      if (!verifyData.success) {
        return json({
          error: 'Sicherheitsprüfung fehlgeschlagen. Bitte Seite neu laden und erneut versuchen.',
          step: 'turnstile'
        }, 403);
      }
    }
    // ── 3. Rate limiting by IP ────────────────────────────────────────────────────
    _step = 'ratelimit';
    const rawIp = req.headers.get('cf-connecting-ip') ?? req.headers.get('x-forwarded-for') ?? 'unknown';
    const ipHash = await sha256(rawIp);
    const since = new Date(Date.now() - RATE_WINDOW_H * 60 * 60 * 1000).toISOString();
    const { count, error: countErr } = await admin.from('contact_log_public').select('id', {
      count: 'exact',
      head: true
    }).eq('ip_hash', ipHash).gte('sent_at', since);
    if (countErr) {
      console.error('rate-limit check failed:', countErr);
      return json({
        error: 'Interner Fehler. Bitte später erneut versuchen.',
        step: 'ratelimit'
      }, 500);
    }
    if ((count ?? 0) >= RATE_LIMIT) {
      return json({
        error: `Du hast in den letzten ${RATE_WINDOW_H} Stunden bereits ${RATE_LIMIT} Nachrichten gesendet. Bitte warte etwas.`,
        step: 'ratelimit'
      }, 429);
    }
    // ── 4. Create Zammad ticket via API ──────────────────────────────────────────
    _step = 'zammad';
    const zammadUrl = Deno.env.get('ZAMMAD_URL')?.replace(/\/$/, '');
    const zammadToken = Deno.env.get('ZAMMAD_TOKEN');
    if (!zammadUrl || !zammadToken) {
      console.error('Zammad secrets not configured');
      return json({
        error: 'Ticket-System nicht konfiguriert. Bitte direkt an info@pixmatic.ch schreiben.',
        step: 'zammad'
      }, 500);
    }
    const customerEmail = email.trim();
    const ticketTitle = `${subject?.trim() || 'Kontaktanfrage'} – ${name.trim()}`;
    const articleBody = [
      `<b>Name:</b> ${esc(name.trim())}`,
      `<b>E-Mail:</b> ${esc(customerEmail)}`,
      `<b>Betreff:</b> ${esc(subject?.trim() || '—')}`,
      '<br>',
      message.trim().replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\n/g, '<br>')
    ].join('<br>');
    let zammadRes;
    try {
      zammadRes = await fetch(`${zammadUrl}/api/v1/tickets`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Token token=${zammadToken}`
        },
        body: JSON.stringify({
          title: ticketTitle,
          group: ZAMMAD_GROUP,
          customer: customerEmail,
          article: {
            subject: ticketTitle,
            body: articleBody,
            type: 'note',
            internal: false,
            content_type: 'text/html'
          },
          tags: 'PATH,Landingpage'
        })
      });
    } catch (fetchErr) {
      console.error('Zammad fetch error:', fetchErr);
      return json({
        error: `Zammad nicht erreichbar: ${String(fetchErr)}`,
        step: 'zammad'
      }, 500);
    }
    if (!zammadRes.ok) {
      const errText = await zammadRes.text().catch(()=>'');
      console.error('Zammad API error:', zammadRes.status, errText);
      return json({
        error: `Ticket konnte nicht erstellt werden (${zammadRes.status}).`,
        step: 'zammad'
      }, 500);
    }
    // ── 5. Auto-reply to sender via SMTP (best-effort) ───────────────────────────
    _step = 'smtp';
    try {
      const smtpHost = Deno.env.get('SMTP_HOST');
      const smtpUser = Deno.env.get('SMTP_USER');
      const smtpPass = Deno.env.get('SMTP_PASS');
      const smtpFrom = Deno.env.get('SMTP_FROM');
      if (smtpHost && smtpUser && smtpPass && smtpFrom) {
        const transporter = nodemailer.createTransport({
          host: smtpHost,
          port: parseInt(Deno.env.get('SMTP_PORT') ?? '587'),
          secure: Deno.env.get('SMTP_PORT') === '465',
          auth: {
            user: smtpUser,
            pass: smtpPass
          }
        });
        const safeMessage = message.trim().replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\n/g, '<br>');
        const safeName = name.trim().replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
        await transporter.sendMail({
          from: smtpFrom,
          to: customerEmail,
          subject: 'Wir haben deine Nachricht erhalten – PATH',
          text: [
            `Hallo ${name.trim()},`,
            '',
            'vielen Dank für deine Nachricht! Wir haben sie erhalten und melden uns in der Regel innerhalb von 24 Stunden.',
            '',
            'Deine Nachricht:',
            `"${message.trim()}"`,
            '',
            'Liebe Grüsse',
            'Das PATH-Team',
            'info@pixmatic.ch'
          ].join('\n'),
          html: `<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Nachricht erhalten – PATH</title>
</head>
<body style="margin:0;padding:0;background:#0a0a0a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">

  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#0a0a0a;padding:48px 16px;">
    <tr>
      <td align="center">
        <table width="540" cellpadding="0" cellspacing="0" border="0" style="max-width:540px;width:100%;">

          <!-- Logo -->
          <tr>
            <td align="center" style="padding-bottom:28px;">
              <table cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="padding-right:10px;vertical-align:middle;">
                    <svg width="36" height="36" viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <defs>
                        <linearGradient id="em-bg" x1="0" y1="0" x2="36" y2="36" gradientUnits="userSpaceOnUse">
                          <stop offset="0%" stop-color="#34C759"/>
                          <stop offset="100%" stop-color="#00C7BE"/>
                        </linearGradient>
                        <linearGradient id="em-shine" x1="18" y1="0" x2="18" y2="20" gradientUnits="userSpaceOnUse">
                          <stop offset="0%" stop-color="#ffffff" stop-opacity="0.35"/>
                          <stop offset="100%" stop-color="#ffffff" stop-opacity="0"/>
                        </linearGradient>
                        <clipPath id="em-clip">
                          <rect width="36" height="36" rx="9"/>
                        </clipPath>
                      </defs>
                      <rect width="36" height="36" rx="9" fill="url(#em-bg)"/>
                      <rect width="36" height="36" rx="9" fill="none" stroke="rgba(0,0,0,0.12)" stroke-width="0.8"/>
                      <rect width="36" height="22" rx="9" fill="url(#em-shine)" clip-path="url(#em-clip)"/>
                      <path d="M10.5 26L25.5 11" stroke="white" stroke-width="2.8" stroke-linecap="round"/>
                      <path d="M16 11H25.5V20.5" stroke="white" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round"/>
                    </svg>
                  </td>
                  <td style="vertical-align:middle;">
                    <div style="font-size:17px;font-weight:800;color:#ffffff;letter-spacing:-0.4px;line-height:1;">Path</div>
                    <div style="font-size:10px;color:rgba(255,255,255,0.38);margin-top:2px;letter-spacing:0.02em;">by pixmatic</div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Card -->
          <tr>
            <td style="background:#161616;border:1px solid #2a2a2a;border-radius:16px;padding:40px 44px 36px;">

              <!-- Icon -->
              <div align="center" style="margin-bottom:24px;">
                <div style="display:inline-block;width:60px;height:60px;border-radius:50%;background:#1a2a1a;border:1px solid #2d4a2d;text-align:center;line-height:58px;font-size:26px;">✉️</div>
              </div>

              <!-- Title -->
              <h1 style="margin:0 0 8px;font-size:22px;font-weight:700;color:#ffffff;text-align:center;letter-spacing:-0.3px;">
                Nachricht erhalten
              </h1>
              <p style="margin:0 0 28px;font-size:14px;color:#666;text-align:center;">
                Wir melden uns innerhalb von 24 Stunden
              </p>

              <!-- Divider -->
              <div style="border-top:1px solid #222;margin-bottom:28px;"></div>

              <!-- Body -->
              <p style="margin:0 0 14px;font-size:15px;color:#aaa;line-height:1.65;">
                Hallo ${safeName},
              </p>
              <p style="margin:0 0 24px;font-size:15px;color:#aaa;line-height:1.65;">
                vielen Dank für deine Nachricht! Wir haben sie erhalten und melden uns in der Regel innerhalb von <strong style="color:#e0e0e0;">24 Stunden</strong> bei dir.
              </p>

              <!-- Message badge -->
              <div style="background:#1e1e1e;border:1px solid #2a2a2a;border-radius:8px;padding:12px 16px;margin-bottom:24px;">
                <span style="font-size:12px;font-weight:600;color:#555;letter-spacing:0.06em;text-transform:uppercase;">💬 &nbsp;Deine Nachricht</span>
                <p style="margin:8px 0 0;font-size:14px;color:#e0e0e0;line-height:1.6;">${safeMessage}</p>
              </div>

              <!-- CTA -->
              <div align="center">
                <a href="https://path.pixmatic.ch"
                   style="display:inline-block;background:#34C759;color:#000000;font-size:15px;font-weight:700;padding:14px 36px;border-radius:10px;text-decoration:none;letter-spacing:0.01em;">
                  PATH öffnen &rarr;
                </a>
              </div>

            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:20px 0 0;text-align:center;">
              <p style="margin:0 0 4px;font-size:12px;color:#444;">
                PATH &mdash; Dein professioneller Bewerbungsmanager
              </p>
              <p style="margin:0;font-size:12px;color:#333;">
                <a href="https://path.pixmatic.ch" style="color:#444;text-decoration:none;">path.pixmatic.ch</a>
                &nbsp;&middot;&nbsp;
                <a href="mailto:info@pixmatic.ch" style="color:#444;text-decoration:none;">info@pixmatic.ch</a>
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>

</body>
</html>`
        }).catch((e)=>{
          console.error('auto-reply failed:', e);
        });
      }
    } catch (smtpErr) {
      console.error('SMTP block error:', smtpErr);
    }
    // ── 6. Log submission for rate limiting ──────────────────────────────────────
    _step = 'log';
    const { error: logErr } = await admin.from('contact_log_public').insert({
      ip_hash: ipHash
    });
    if (logErr) console.error('contact_log_public insert failed:', logErr);
    return json({
      ok: true
    });
  } catch (err) {
    console.error(`Unhandled error in contact-form-public at step=${_step}:`, err);
    return json({
      error: 'Interner Fehler. Bitte direkt an info@pixmatic.ch schreiben.',
      step: _step
    }, 500);
  }
});
