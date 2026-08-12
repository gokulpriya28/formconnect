// @ts-ignore: Deno runtime import
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

declare const Deno: {
  env: {
    get(name: string): string | undefined
  }
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed. Use POST.' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 405 },
    )
  }

  try {
    const body = await req.json()
    const amount = Number(body?.amount)
    const currency = body?.currency || 'INR'
    const receipt = body?.receipt

    if (!amount || Number.isNaN(amount) || amount <= 0) {
      throw new Error('Invalid amount. Provide a positive numeric amount.')
    }
    if (!receipt || typeof receipt !== 'string') {
      throw new Error('Missing receipt identifier.')
    }

    const keyId = Deno.env.get('RAZORPAY_KEY_ID')
    const keySecret = Deno.env.get('RAZORPAY_KEY_SECRET')
    if (!keyId || !keySecret) {
      throw new Error('Razorpay credentials are not configured in environment variables.')
    }

    const authHeader = `Basic ${btoa(`${keyId}:${keySecret}`)}`
    const payload = {
      amount: Math.round(amount * 100),
      currency,
      receipt,
      payment_capture: 1,
    }

    const razorpayResponse = await fetch('https://api.razorpay.com/v1/orders', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: authHeader,
      },
      body: JSON.stringify(payload),
    })

    const order = await razorpayResponse.json()
    if (!razorpayResponse.ok) {
      const message = order?.error?.description || order?.error || 'Razorpay order creation failed.'
      throw new Error(message)
    }

    return new Response(JSON.stringify(order), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return new Response(
      JSON.stringify({ error: message || 'Unknown error' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 },
    )
  }
})
