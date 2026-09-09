
// Edge Function: upsert-deadline-reminders
// Aus dem Live-Deployment zurueckgeholt (2026-09-09) — der Repo-Stand war aelter.
// Quelle ist das deployte Bundle, die Typannotationen hat der Deploy-Schritt entfernt.
//
// JWT enforcement: OFF — der Bearer-Token wird in dieser Function geprueft.
import { createClient } from 'npm:@supabase/supabase-js@2';
const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
};
// Grobe Formatpruefung: genau ein @, kein Whitespace, ein Punkt in der Domain.
// Haelt Header-Injection und offensichtlichen Unsinn aus dem Empfaengerfeld.
function isValidEmail(value) {
  return typeof value === 'string' && /^[^\s@]+@[^\s@.]+\.[^\s@]+$/.test(value.trim()) && value.trim().length <= 254;
}
Deno.serve(async (req)=>{
  if (req.method === 'OPTIONS') return new Response('ok', {
    headers: cors
  });
  try {
    const authHeader = req.headers.get('Authorization') ?? '';
    const token = authHeader.replace('Bearer ', '').trim();
    if (!token) return new Response('Unauthorized', {
      status: 401,
      headers: cors
    });
    const admin = createClient(Deno.env.get('SUPABASE_URL'), Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'));
    // Token gegen Supabase pruefen, Signatur eingeschlossen.
    //
    // Vorher wurde der Payload nur base64-dekodiert. Da das Gateway fuer diese
    // Function mit --no-verify-jwt laeuft, konnte jeder ohne Konto Erinnerungen
    // mit frei gewaehltem Empfaenger anlegen — send-deadline-reminders hat sie
    // dann von noreply@pixmatic.ch aus zugestellt. Ein offenes Mail-Relay auf
    // der eigenen Domain.
    const { data: authData, error: authErr } = await admin.auth.getUser(token);
    const userId = authData?.user?.id;
    const email = authData?.user?.email;
    if (authErr || !userId) return new Response('Unauthorized', {
      status: 401,
      headers: cors
    });
    const { resume_id, deadline, reminder_days, resume_name, recipient_email } = await req.json();
    // Empfaengeradresse: die des Ansprechpartners, wenn sie formal gueltig ist,
    // sonst die des angemeldeten Kontos.
    const wanted = typeof recipient_email === 'string' ? recipient_email.trim() : '';
    if (wanted && !isValidEmail(wanted)) return new Response('Invalid recipient address', {
      status: 422,
      headers: cors
    });
    const targetEmail = wanted || email;
    if (!targetEmail) return new Response('No email address available', {
      status: 422,
      headers: cors
    });
    // Delete all existing unsent reminders for this resume
    await admin.from('deadline_reminders').delete().eq('user_id', userId).eq('resume_id', resume_id).eq('sent', false);
    // Nothing to create if no deadline or no reminder days
    if (!deadline || !reminder_days?.length) {
      return new Response(JSON.stringify({
        created: 0
      }), {
        headers: {
          ...cors,
          'Content-Type': 'application/json'
        }
      });
    }
    const deadlineDate = new Date(deadline + 'T23:59:00Z');
    const now = new Date();
    const rows = reminder_days.map((days)=>{
      const remindAt = new Date(deadlineDate.getTime() - days * 86400000);
      return remindAt > now ? {
        user_id: userId,
        resume_id,
        resume_name: typeof resume_name === 'string' ? resume_name.slice(0, 120) : '',
        deadline,
        remind_at: remindAt.toISOString(),
        email: targetEmail,
        sent: false
      } : null;
    }).filter(Boolean);
    if (rows.length > 0) {
      await admin.from('deadline_reminders').insert(rows);
    }
    return new Response(JSON.stringify({
      created: rows.length
    }), {
      headers: {
        ...cors,
        'Content-Type': 'application/json'
      }
    });
  } catch (err) {
    console.error(err);
    return new Response(JSON.stringify({
      error: 'Internal error'
    }), {
      status: 500,
      headers: {
        ...cors,
        'Content-Type': 'application/json'
      }
    });
  }
});