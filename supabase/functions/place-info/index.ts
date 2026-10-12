// Returns tour-guide notes and a suggested visit length for a place, generating them with OpenAI
// the first time and serving the stored copy afterwards. Only approved users may call it.
import { createClient } from 'jsr:@supabase/supabase-js@2'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } })
}

const instructions = `You are a knowledgeable local tour guide writing a short note about one place for a traveller's itinerary.

Write "guide": 90 to 140 words of plain prose, no headings or lists. Say what the place is, the history that makes it worth seeing (who built it, when, why it matters), and one concrete thing to look for on a visit.

Accuracy matters more than colour. State only facts you are confident are well established. Do not invent dates, names, anecdotes or prices. If the place is a restaurant, shop, hotel or somewhere you do not recognise, write two or three sentences on what kind of place it is and the neighbourhood it sits in, and say nothing specific that you cannot know.

Set "suggested_minutes" to a realistic visit length for a first-time visitor, between 10 and 480, rounded to 5.`

const schema = {
  name: 'place_info',
  strict: true,
  schema: {
    type: 'object',
    properties: { guide: { type: 'string' }, suggested_minutes: { type: 'integer' } },
    required: ['guide', 'suggested_minutes'],
    additionalProperties: false,
  },
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405)

  // The service role bypasses row-level security, so the caller is checked by hand below.
  const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)

  const token = req.headers.get('Authorization')?.replace(/^Bearer /, '')
  const { data: auth } = token ? await admin.auth.getUser(token) : { data: { user: null } }
  if (!auth.user) return json({ error: 'Not signed in' }, 401)

  const { data: profile, error: profileError } = await admin
    .from('profiles')
    .select('approved')
    .eq('id', auth.user.id)
    .maybeSingle()
  // A failed lookup is a server fault, not a verdict on the account.
  if (profileError) {
    console.error('Could not read profile', profileError.message)
    return json({ error: 'Could not check the account' }, 500)
  }
  if (!profile?.approved) return json({ error: 'Account not approved' }, 403)

  const { place_id } = await req.json().catch(() => ({}))
  if (typeof place_id !== 'string') return json({ error: 'place_id is required' }, 400)

  const { data: place, error: placeError } = await admin.from('places').select('*').eq('place_id', place_id).maybeSingle()
  if (placeError) {
    console.error('Could not read place', placeError.message)
    return json({ error: 'Could not read the place' }, 500)
  }
  if (!place) return json({ error: 'Unknown place' }, 404)
  if (place.guide && place.suggested_minutes) {
    return json({ guide: place.guide, suggested_minutes: place.suggested_minutes })
  }

  const apiKey = Deno.env.get('OPENAI_API_KEY')
  if (!apiKey) return json({ error: 'OPENAI_API_KEY is not set on the server' }, 500)

  const completion = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: Deno.env.get('OPENAI_MODEL') ?? 'gpt-4o-mini',
      messages: [
        { role: 'system', content: instructions },
        {
          role: 'user',
          content: JSON.stringify({ name: place.name, address: place.address, categories: place.types }),
        },
      ],
      response_format: { type: 'json_schema', json_schema: schema },
    }),
  })
  if (!completion.ok) {
    console.error('OpenAI error', completion.status, await completion.text())
    return json({ error: `OpenAI request failed (${completion.status})` }, 502)
  }

  let info: { guide: string; suggested_minutes: number }
  try {
    info = JSON.parse((await completion.json()).choices[0].message.content)
  } catch {
    return json({ error: 'OpenAI returned an unreadable answer' }, 502)
  }
  const suggested = Math.min(480, Math.max(10, Math.round(info.suggested_minutes / 5) * 5))

  const { error } = await admin
    .from('places')
    .update({ guide: info.guide, suggested_minutes: suggested })
    .eq('place_id', place_id)
  if (error) console.error('Could not store place info', error.message)

  return json({ guide: info.guide, suggested_minutes: suggested })
})
