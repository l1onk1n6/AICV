// Secrets required: STRIPE_SECRET_KEY

import Stripe from 'npm:stripe@14'
import { createClient } from 'npm:@supabase/supabase-js@2'

const APP_URL = 'https://path.pixmatic.ch'

const cors = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })

  try {
    const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!)

    const authHeader = req.headers.get('Authorization') ?? ''
    const token = authHeader.replace('Bearer ', '').trim()
    if (!token) return new Response('Unauthorized', { status: 401, headers: cors })

    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    // Der Token wird gegen Supabase geprueft, Signatur eingeschlossen.
    //
    // Vorher wurde hier nur der Payload base64-dekodiert, mit dem Kommentar
    // "already verified by gateway". Das Gateway laeuft fuer diese Function aber
    // mit --no-verify-jwt. Ein selbstgebauter Token mit fremdem "sub" haette
    // damit eine Stripe-Billing-Portal-Sitzung fuer dessen Kunden geoeffnet:
    // Abo, Rechnungen, Zahlungsmittel, Kuendigung.
    const { data: authData, error: authErr } = await admin.auth.getUser(token)
    const userId = authData?.user?.id
    if (authErr || !userId) return new Response('Unauthorized', { status: 401, headers: cors })

    const { data } = await admin
      .from('stripe_customers')
      .select('stripe_customer_id')
      .eq('user_id', userId)
      .single()

    if (!data?.stripe_customer_id) {
      return new Response(
        JSON.stringify({ error: 'Kein Stripe-Konto gefunden.' }),
        { status: 404, headers: { ...cors, 'Content-Type': 'application/json' } },
      )
    }

    const session = await stripe.billingPortal.sessions.create({
      customer:      data.stripe_customer_id,
      configuration: 'bpc_1TJknbFR6KM5Wltx1mbN16JP',
      return_url:    `${APP_URL}/#/account`,
    })

    return new Response(JSON.stringify({ url: session.url }), {
      headers: { ...cors, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error(err)
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...cors, 'Content-Type': 'application/json' },
    })
  }
})
