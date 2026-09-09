// Edge Function: send-deadline-reminders
// Aus dem Live-Deployment zurueckgeholt (2026-09-09) — der Repo-Stand war aelter
// (altes Mail-Template, andere Abfragelogik). Quelle ist das deployte Bundle,
// die Typannotationen hat der Deploy-Schritt entfernt.
//
// JWT enforcement: OFF
//
// Required Supabase secrets:
//   SMTP_HOST     e.g. smtp.hostinger.com
//   SMTP_PORT     e.g. 587
//   SMTP_USER     e.g. noreply@pixmatic.ch
//   SMTP_PASS     SMTP password
//   SMTP_FROM     e.g. "PATH by pixmatic <noreply@pixmatic.ch>"
import { createClient } from 'npm:@supabase/supabase-js@2';
import nodemailer from 'npm:nodemailer@6';
const APP_URL = 'https://path.pixmatic.ch';
// resume_name kommt aus einem Freitextfeld des Nutzers und landet in Betreff und
// HTML-Koerper. Ohne Maskierung liesse sich darueber Markup in fremde Postfaecher
// schreiben; im Betreff wuerden Zeilenumbrueche zur Header-Injection einladen.
function escapeHtml(value) {
  return String(value ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
function singleLine(value) {
  return String(value ?? '').replace(/[\r\n]+/g, ' ').trim().slice(0, 120);
}
Deno.serve(async (_req)=>{
  try {
    const admin = createClient(Deno.env.get('SUPABASE_URL'), Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'));
    // Fetch all unsent reminders that are due
    const { data: reminders, error } = await admin.from('deadline_reminders').select('*').lte('remind_at', new Date().toISOString()).eq('sent', false);
    if (error) throw error;
    if (!reminders?.length) {
      return new Response(JSON.stringify({
        sent: 0
      }), {
        status: 200
      });
    }
    // Setup SMTP transporter
    const transporter = nodemailer.createTransport({
      host: Deno.env.get('SMTP_HOST'),
      port: parseInt(Deno.env.get('SMTP_PORT') ?? '587'),
      secure: Deno.env.get('SMTP_PORT') === '465',
      auth: {
        user: Deno.env.get('SMTP_USER'),
        pass: Deno.env.get('SMTP_PASS')
      }
    });
    let sent = 0;
    const ids = [];
    for (const r of reminders){
      const deadlineDate = new Date(r.deadline + 'T00:00:00');
      const daysDiff = Math.ceil((deadlineDate.getTime() - Date.now()) / 86400000);
      const daysText = daysDiff <= 0 ? 'heute' : daysDiff === 1 ? 'morgen' : `in ${daysDiff} Tagen`;
      const urgencyColor = daysDiff <= 1 ? '#FF3B30' : daysDiff <= 3 ? '#FF9F0A' : '#30D158';
      const urgencyBg = daysDiff <= 1 ? 'rgba(255,59,48,0.15)' : daysDiff <= 3 ? 'rgba(255,159,10,0.15)' : 'rgba(48,209,88,0.15)';
      const safeName = singleLine(r.resume_name);
      const subject = `⏰ Bewerbungsfrist ${daysText}: ${safeName}`;
      const deadlineFormatted = new Date(r.deadline).toLocaleDateString('de-CH', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric'
      });
      const html = `<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapeHtml(subject)}</title>
</head>
<body style="margin:0;padding:0;background:#09090f;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#09090f;padding:40px 16px;">
    <tr><td align="center">
      <table width="100%" style="max-width:480px;" cellpadding="0" cellspacing="0">

        <!-- Logo / header -->
        <tr><td style="padding-bottom:32px;text-align:center;">
          <div style="display:inline-block;width:48px;height:48px;border-radius:13px;background:linear-gradient(135deg,#34C759,#007AFF);line-height:48px;font-size:24px;text-align:center;vertical-align:middle;">📋</div>
          <div style="margin-top:10px;font-size:13px;font-weight:600;color:rgba(255,255,255,0.35);letter-spacing:1.5px;text-transform:uppercase;">PATH · Bewerbungsmanager</div>
        </td></tr>

        <!-- Card -->
        <tr><td style="background:#13131f;border:1px solid rgba(255,255,255,0.09);border-radius:20px;overflow:hidden;">

          <!-- Urgency banner -->
          <div style="background:${urgencyBg};border-bottom:1px solid ${urgencyColor}33;padding:14px 24px;text-align:center;">
            <span style="font-size:13px;font-weight:700;color:${urgencyColor};letter-spacing:0.3px;">
              ⏰&nbsp; Bewerbungsfrist ${daysText.toUpperCase()}
            </span>
          </div>

          <!-- Body -->
          <div style="padding:28px 28px 24px;">
            <p style="margin:0 0 6px;font-size:12px;color:rgba(255,255,255,0.4);text-transform:uppercase;letter-spacing:1px;">Bewerbungsmappe</p>
            <h1 style="margin:0 0 24px;font-size:22px;font-weight:700;color:#ffffff;line-height:1.25;">${escapeHtml(safeName)}</h1>

            <!-- Deadline pill -->
            <table cellpadding="0" cellspacing="0" style="width:100%;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.1);border-radius:12px;overflow:hidden;">
              <tr>
                <td style="padding:16px 20px;border-right:1px solid rgba(255,255,255,0.08);width:50%;">
                  <div style="font-size:11px;color:rgba(255,255,255,0.4);margin-bottom:5px;text-transform:uppercase;letter-spacing:0.8px;">Deadline</div>
                  <div style="font-size:14px;font-weight:600;color:#fff;">${deadlineFormatted}</div>
                </td>
                <td style="padding:16px 20px;width:50%;text-align:center;">
                  <div style="display:inline-block;padding:6px 16px;border-radius:20px;background:${urgencyBg};border:1px solid ${urgencyColor}55;">
                    <span style="font-size:15px;font-weight:800;color:${urgencyColor};">${daysText}</span>
                  </div>
                </td>
              </tr>
            </table>

            <!-- CTA button -->
            <div style="margin-top:24px;text-align:center;">
              <a href="${APP_URL}"
                style="display:inline-block;padding:14px 36px;background:linear-gradient(135deg,#007AFF,#5856D6);color:#fff;text-decoration:none;border-radius:12px;font-size:15px;font-weight:700;letter-spacing:0.2px;">
                Jetzt in PATH öffnen →
              </a>
            </div>
          </div>

          <!-- Footer inside card -->
          <div style="background:rgba(0,0,0,0.2);border-top:1px solid rgba(255,255,255,0.07);padding:14px 24px;text-align:center;">
            <p style="margin:0;font-size:11px;color:rgba(255,255,255,0.22);">
              Du erhältst diese E-Mail weil du in PATH einen Deadline-Reminder gesetzt hast.<br/>
              <a href="${APP_URL}" style="color:rgba(255,255,255,0.35);text-decoration:none;">PATH by pixmatic</a>
            </p>
          </div>

        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
      try {
        await transporter.sendMail({
          from: Deno.env.get('SMTP_FROM') ?? Deno.env.get('SMTP_USER'),
          to: r.email,
          subject,
          html
        });
        ids.push(r.id);
        sent++;
      } catch (mailErr) {
        console.error(`Failed to send reminder ${r.id}:`, mailErr);
      }
    }
    // Mark sent reminders
    if (ids.length > 0) {
      await admin.from('deadline_reminders').update({
        sent: true
      }).in('id', ids);
    }
    return new Response(JSON.stringify({
      sent
    }), {
      status: 200
    });
  } catch (err) {
    console.error(err);
    return new Response(JSON.stringify({
      error: String(err)
    }), {
      status: 500
    });
  }
});