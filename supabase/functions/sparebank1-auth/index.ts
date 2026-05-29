import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const CLIENT_ID     = Deno.env.get('SPAREBANK1_CLIENT_ID')!
const CLIENT_SECRET = Deno.env.get('SPAREBANK1_CLIENT_SECRET')!
const REDIRECT_URI  = 'https://midyjdjkqorcxhdnjanh.supabase.co/functions/v1/sparebank1-auth'
const DASHBOARD_URL = Deno.env.get('DASHBOARD_URL') || 'http://localhost'
const TOKEN_URL     = 'https://api.sparebank1.no/oauth/token'

serve(async (req: Request) => {
  const url   = new URL(req.url)
  const code  = url.searchParams.get('code')
  const error = url.searchParams.get('error')

  if (error) {
    return Response.redirect(
      `${DASHBOARD_URL}/finance.html?bank_error=${encodeURIComponent(error)}`
    )
  }

  if (!code) {
    return new Response('Missing authorization code', { status: 400 })
  }

  // Exchange authorization code for access + refresh tokens
  const body = new URLSearchParams({
    grant_type:   'authorization_code',
    code,
    redirect_uri: REDIRECT_URI,
    client_id:    CLIENT_ID,
    client_secret: CLIENT_SECRET,
  })

  const tokenRes = await fetch(TOKEN_URL, {
    method:  'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body:    body.toString(),
  })

  if (!tokenRes.ok) {
    console.error('Token exchange failed:', await tokenRes.text())
    return Response.redirect(
      `${DASHBOARD_URL}/finance.html?bank_error=token_exchange_failed`
    )
  }

  const { access_token, refresh_token, expires_in = 3600 } = await tokenRes.json()

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )

  const { error: dbErr } = await supabase
    .from('app_state')
    .upsert(
      {
        key:        'sparebank1_tokens',
        data:       { access_token, refresh_token, expires_at: Date.now() + expires_in * 1000 },
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'key' }
    )

  if (dbErr) {
    console.error('DB write failed:', dbErr)
    return Response.redirect(
      `${DASHBOARD_URL}/finance.html?bank_error=db_write_failed`
    )
  }

  return Response.redirect(`${DASHBOARD_URL}/finance.html?bank_connected=1`)
})
