import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const NVIDIA_API_KEY = Deno.env.get('NVIDIA_API_KEY')!
const NVIDIA_URL     = 'https://integrate.api.nvidia.com/v1/chat/completions'

const CORS = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Headers': 'content-type',
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: CORS })

  const { text } = await req.json()
  if (!text || typeof text !== 'string') {
    return new Response(JSON.stringify({ error: 'missing text' }), {
      status: 400, headers: { ...CORS, 'Content-Type': 'application/json' },
    })
  }

  const res = await fetch(NVIDIA_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${NVIDIA_API_KEY}`,
    },
    body: JSON.stringify({
      model: 'meta/llama-3.1-8b-instruct',
      max_tokens: 120,
      messages: [{
        role: 'user',
        content:
          'Rewrite this single goal so it is concrete, action-oriented, and under 60 characters. ' +
          'Return ONLY a JSON array with exactly one string, no preamble, no code fences.\n\nGoal: ' + text,
      }],
    }),
  })

  const data = await res.json()
  const content: string = data?.choices?.[0]?.message?.content ?? ''

  let polished: string
  try {
    const arr = JSON.parse(content)
    if (!Array.isArray(arr) || typeof arr[0] !== 'string') throw new Error()
    polished = arr[0].trim()
  } catch {
    return new Response(JSON.stringify({ error: 'unexpected model response', raw: content }), {
      status: 502, headers: { ...CORS, 'Content-Type': 'application/json' },
    })
  }

  return new Response(JSON.stringify({ polished }), {
    headers: { ...CORS, 'Content-Type': 'application/json' },
  })
})
