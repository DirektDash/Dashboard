import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const CLIENT_ID     = Deno.env.get('SPAREBANK1_CLIENT_ID')!
const CLIENT_SECRET = Deno.env.get('SPAREBANK1_CLIENT_SECRET')!
const TOKEN_URL     = 'https://api.sparebank1.no/oauth/token'

// Verify these paths against developer.sparebank1.no once you have API access confirmed
const ACCOUNTS_URL      = 'https://api.sparebank1.no/open/account/accounts'
const TRANSACTIONS_BASE = 'https://api.sparebank1.no/open/account/transactions'

const CORS = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  })
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: CORS })

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )

  // Load stored tokens
  const { data: row } = await supabase
    .from('app_state')
    .select('data')
    .eq('key', 'sparebank1_tokens')
    .maybeSingle()

  if (!row?.data?.access_token) {
    return json({ error: 'not_connected' }, 401)
  }

  let { access_token, refresh_token, expires_at } = row.data

  // Refresh if expired or expiring within 60 s
  if (Date.now() > expires_at - 60_000) {
    const body = new URLSearchParams({
      grant_type:    'refresh_token',
      refresh_token,
      client_id:     CLIENT_ID,
      client_secret: CLIENT_SECRET,
    })
    const r = await fetch(TOKEN_URL, {
      method:  'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body:    body.toString(),
    })
    if (r.ok) {
      const refreshed = await r.json()
      access_token  = refreshed.access_token
      refresh_token = refreshed.refresh_token ?? refresh_token
      expires_at    = Date.now() + (refreshed.expires_in ?? 3600) * 1000
      await supabase.from('app_state').upsert(
        { key: 'sparebank1_tokens', data: { access_token, refresh_token, expires_at }, updated_at: new Date().toISOString() },
        { onConflict: 'key' }
      )
    }
  }

  const authHeaders = {
    Authorization: `Bearer ${access_token}`,
    Accept: 'application/vnd.sparebank1.v1+json; charset=utf-8',
  }

  // Fetch accounts
  const accountsRes = await fetch(ACCOUNTS_URL, { headers: authHeaders })
  if (!accountsRes.ok) {
    console.error('Accounts fetch failed:', await accountsRes.text())
    return json({ error: 'accounts_fetch_failed' }, accountsRes.status)
  }

  const accountsBody = await accountsRes.json()
  // Sparebank 1 wraps accounts in { accounts: [...] }; fall back to bare array
  const accounts: any[] = accountsBody.accounts ?? accountsBody ?? []

  // Fetch 30-day transactions for each account (cap at 6 accounts)
  const fromDate = new Date(Date.now() - 30 * 86_400_000).toISOString().slice(0, 10)
  const transactions: any[] = []

  for (const acc of accounts.slice(0, 6)) {
    const key = acc.accountKey ?? acc.accountNumber ?? ''
    if (!key) continue
    const txRes = await fetch(
      `${TRANSACTIONS_BASE}?accountKey=${encodeURIComponent(key)}&fromDate=${fromDate}`,
      { headers: authHeaders }
    )
    if (txRes.ok) {
      const txBody = await txRes.json()
      const list: any[] = txBody.transactions ?? txBody ?? []
      transactions.push(...list.map((t: any) => ({
        ...t,
        _accountName: acc.name ?? acc.ownerCustomerName ?? acc.accountNumber,
      })))
    }
  }

  return json({ accounts, transactions })
})
