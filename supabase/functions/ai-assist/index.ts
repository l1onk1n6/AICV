// Secrets required: ANTHROPIC_API_KEY
// JWT enforcement: OFF (manual check below handles auth)

import { createClient } from 'npm:@supabase/supabase-js@2'

const cors = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

/**
 * Prueft den Supabase-JWT des Aufrufers — Signatur eingeschlossen.
 *
 * Vorher wurde hier nur der Payload base64-dekodiert und auf ein vorhandenes
 * "sub" geprueft. Der Kommentar dazu nahm an, das Gateway habe bereits geprueft;
 * fuer diese Function laeuft das Gateway aber mit --no-verify-jwt. Ein
 * selbstgebauter Token ohne gueltige Signatur kam damit durch und liess Claude
 * auf Rechnung des Projekts laufen.
 */
async function verifiedUserId(token: string): Promise<string | null> {
  if (!token) return null
  const admin = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  )
  const { data, error } = await admin.auth.getUser(token)
  if (error || !data?.user) return null
  return data.user.id
}

async function callClaude(prompt: string, maxTokens = 2048): Promise<string> {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key':         Deno.env.get('ANTHROPIC_API_KEY')!,
      'anthropic-version': '2023-06-01',
      'content-type':      'application/json',
    },
    body: JSON.stringify({
      model:      'claude-haiku-4-5-20251001',
      max_tokens: maxTokens,
      messages:   [{ role: 'user', content: prompt }],
    }),
  })
  if (!res.ok) {
    const txt = await res.text()
    throw new Error(`Anthropic ${res.status}: ${txt}`)
  }
  const data = await res.json()
  return data.content[0].text as string
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })

  try {
    // Manual auth: verify the JWT signature against Supabase, not just its payload
    const authHeader = req.headers.get('Authorization') ?? ''
    const token = authHeader.replace(/^Bearer\s+/i, '').trim()
    const userId = await verifiedUserId(token)
    if (!userId) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...cors, 'Content-Type': 'application/json' },
      })
    }

    const body = await req.json()
    const { action } = body

    // ── Generate cover letter ─────────────────────────────
    if (action === 'generate-cover-letter') {
      const { jobTitle, company, jobDescription, summary, experience } = body
      const prompt = `Du bist ein professioneller Bewerbungsberater für den Schweizer Arbeitsmarkt. Schreibe einen überzeugenden Anschreiben-Text (NUR den Haupttextabschnitt, ohne Anrede und ohne Grussformel) für folgende Bewerbung:

Stelle: ${jobTitle || 'nicht angegeben'}
Unternehmen: ${company || 'nicht angegeben'}
${jobDescription ? `Stellenbeschreibung:\n${jobDescription}\n` : ''}
Profil des Bewerbers:
${summary || 'nicht angegeben'}

Berufserfahrung:
${experience || 'nicht angegeben'}

Vorgaben:
- Sprache: Deutsch (Schweizer Konventionen, kein "ß")
- Ton: professionell, authentisch, nicht generisch
- Länge: 3–4 Absätze
- Zeige konkrete Motivation für das Unternehmen
- Gib NUR den Anschreiben-Haupttext zurück, keine Metakommentare`

      const result = await callClaude(prompt, 1500)
      return new Response(JSON.stringify({ result }), { headers: { ...cors, 'Content-Type': 'application/json' } })
    }

    // ── Improve text ──────────────────────────────────────
    if (action === 'improve') {
      const { text, context } = body
      if (!text?.trim()) return new Response(JSON.stringify({ error: 'No text provided' }), { status: 400, headers: cors })
      const prompt = `Verbessere folgenden Bewerbungstext. Halte die Sprache und den Sinn bei, mache ihn aber professioneller, präziser und überzeugender. Keine generischen Floskeln.${context ? `\nKontext: ${context}` : ''}

Originaltext:
${text}

Gib NUR den verbesserten Text zurück, keine Erklärungen oder Kommentare.`

      const result = await callClaude(prompt, 1000)
      return new Response(JSON.stringify({ result }), { headers: { ...cors, 'Content-Type': 'application/json' } })
    }

    // ── Translate ─────────────────────────────────────────
    if (action === 'translate') {
      const { fields, targetLanguage } = body
      if (!fields || !targetLanguage) return new Response(JSON.stringify({ error: 'Missing fields or targetLanguage' }), { status: 400, headers: cors })

      const prompt = `Translate the following resume fields to ${targetLanguage}. Keep a professional tone. Translate only the values, not the keys. Reply ONLY with a valid JSON object using the same keys — no markdown, no code blocks, no explanations.

${JSON.stringify(fields, null, 2)}`

      const raw = await callClaude(prompt, 4096)

      // Strip markdown code fences if Claude wrapped the JSON (e.g. ```json ... ```)
      const cleaned = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/i, '').trim()

      // Validate parseable JSON before returning
      JSON.parse(cleaned)
      return new Response(JSON.stringify({ result: cleaned }), { headers: { ...cors, 'Content-Type': 'application/json' } })
    }

    return new Response(JSON.stringify({ error: 'Unknown action' }), { status: 400, headers: cors })

  } catch (err) {
    console.error('[ai-assist]', err)
    return new Response(JSON.stringify({ error: String(err) }), { status: 500, headers: { ...cors, 'Content-Type': 'application/json' } })
  }
})
