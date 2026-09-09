// JWT enforcement: OFF — manual decode
// Secrets: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY (auto-injected)

import { createClient } from 'npm:@supabase/supabase-js@2'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS })
  }

  const admin = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  )

  // Token gegen Supabase pruefen, Signatur eingeschlossen.
  //
  // Vorher wurde der Payload nur base64-dekodiert. Da das Gateway fuer diese
  // Function mit --no-verify-jwt laeuft, konnte jeder mit einem selbstgebauten
  // Token Empfehlungen auf ein beliebiges Konto buchen — und an der Empfehlung
  // haengt eine Gutschrift.
  const token = (req.headers.get('Authorization') ?? '').replace('Bearer ', '').trim()
  const { data: authData } = token
    ? await admin.auth.getUser(token)
    : { data: null }
  const userId = authData?.user?.id
  if (!userId) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401, headers: { ...CORS, 'Content-Type': 'application/json' },
    })
  }

  const { referrer_id } = await req.json().catch(() => ({}))

  // Basic validation
  if (!referrer_id || typeof referrer_id !== 'string' || referrer_id === userId) {
    return new Response(JSON.stringify({ ok: false }), {
      status: 200, headers: { ...CORS, 'Content-Type': 'application/json' },
    })
  }

  // Verify referrer exists
  const { data: referrerData } = await admin.auth.admin.getUserById(referrer_id)
  if (!referrerData?.user) {
    return new Response(JSON.stringify({ ok: false }), {
      status: 200, headers: { ...CORS, 'Content-Type': 'application/json' },
    })
  }

  // Insert referral (ignore if referee already referred by someone)
  const { error } = await admin.from('referrals').upsert(
    { referrer_id, referee_id: userId },
    { onConflict: 'referee_id', ignoreDuplicates: true },
  )

  if (error) console.error('record-referral error:', error)
  else console.log(`✓ Referral recorded: ${referrer_id} → ${userId}`)

  return new Response(JSON.stringify({ ok: true }), {
    status: 200, headers: { ...CORS, 'Content-Type': 'application/json' },
  })
})
