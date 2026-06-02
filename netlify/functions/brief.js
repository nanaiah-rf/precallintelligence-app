const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY
const AMP_API_KEY = '4d66f09fc0b48bf4f19182900e3276f5'
const AMP_SECRET = 'e8a3aca485af13d0491fd3ca16a1f4e8'

const SYSTEM_PROMPT = `You are a senior Customer Success analyst at Recruiterflow, an AI-native ATS & CRM platform for recruiting agencies.

You will receive raw Amplitude usage data for a customer domain. Analyse it and return ONLY a valid JSON object, no markdown, no explanation:
{
  "domain": "domain name",
  "accountHealth": "Healthy|At Risk|Critical",
  "healthReason": "one sentence with real numbers from the data",
  "wau": [array of weekly active user numbers oldest first, last 12 weeks],
  "peakWau": number,
  "currentWau": number,
  "trend": "Growing|Stable|Declining",
  "adoptedFeatures": [
    { "name": "Feature name", "usage": "High|Medium|Low", "detail": "detail with real numbers" }
  ],
  "gapFeatures": [
    { "name": "Feature name", "opportunity": "why this matters" }
  ],
  "conversationStarters": ["starter 1", "starter 2", "starter 3"],
  "callAgenda": [
    { "time": "0-2 min", "item": "item" },
    { "time": "2-8 min", "item": "item" },
    { "time": "8-15 min", "item": "item" },
    { "time": "15-20 min", "item": "item" }
  ],
  "upsellOpportunity": "AIRA|Sequences|Reporting|Automation|None",
  "upsellReason": "one sentence"
}`

async function queryAmplitude(event, domain, metric = 'uniques', interval = 7) {
  const auth = Buffer.from(`${AMP_API_KEY}:${AMP_SECRET}`).toString('base64')
  const end = new Date()
  const start = new Date(end - 90 * 24 * 60 * 60 * 1000)
  const fmt = d => d.toISOString().split('T')[0].replace(/-/g, '')

  const e = JSON.stringify({ event_type: event })
  const s = JSON.stringify([{ prop: 'gp:email', op: 'contains', values: [domain] }])
  const url = `https://amplitude.com/api/2/events/segmentation?e=${encodeURIComponent(e)}&start=${fmt(start)}&end=${fmt(end)}&i=${interval}&s=${encodeURIComponent(s)}&m=${metric}`

  const res = await fetch(url, { headers: { 'Authorization': `Basic ${auth}` } })
  if (!res.ok) return null
  const data = await res.json()
  return data.data?.series?.[0] || []
}

exports.handler = async function(event) {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json'
  }

  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers, body: '' }
  if (event.httpMethod !== 'POST') return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) }

  let domain
  try {
    domain = JSON.parse(event.body).domain
  } catch {
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'Invalid request' }) }
  }
  if (!domain) return { statusCode: 400, headers, body: JSON.stringify({ error: 'Domain required' }) }

  try {
    const [wau, emails, agents, aira, sequences, reports, prospects] = await Promise.all([
      queryAmplitude('_active', domain, 'uniques', 7),
      queryAmplitude('bulk-email-sent', domain, 'totals', 30),
      queryAmplitude('Agent triggered', domain, 'totals', 30),
      queryAmplitude('Aira source search executed', domain, 'totals', 30),
      queryAmplitude('add-to-campaign', domain, 'totals', 30),
      queryAmplitude('Advanced-report-opened-view', domain, 'totals', 30),
      queryAmplitude('added-prospect', domain, 'totals', 30),
    ])

    const ampData = {
      wau: wau || [],
      emailsSent: emails ? emails.reduce((a, b) => a + b, 0) : 0,
      agentsTriggered: agents ? agents.reduce((a, b) => a + b, 0) : 0,
      airaSearches: aira ? aira.reduce((a, b) => a + b, 0) : 0,
      sequencesAdded: sequences ? sequences.reduce((a, b) => a + b, 0) : 0,
      reportsOpened: reports ? reports.reduce((a, b) => a + b, 0) : 0,
      prospectsAdded: prospects ? prospects.reduce((a, b) => a + b, 0) : 0,
    }

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 2000,
        system: SYSTEM_PROMPT,
        messages: [{
          role: 'user',
          content: `Generate a pre-call brief for domain: ${domain}\n\nAmplitude data for last 90 days:\n${JSON.stringify(ampData, null, 2)}`
        }]
      })
    })

    const data = await response.json()
    if (!response.ok) return { statusCode: response.status, headers, body: JSON.stringify({ error: data.error?.message || 'API error' }) }

    const text = data.content?.find(b => b.type === 'text')?.text || ''
    const clean = text.replace(/```json|```/g, '').trim()
    const jsonMatch = clean.match(/\{[\s\S]*\}/)
    if (!jsonMatch) return { statusCode: 500, headers, body: JSON.stringify({ error: 'Could not parse brief' }) }

    return { statusCode: 200, headers, body: jsonMatch[0] }

  } catch (err) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: err.message }) }
  }
}
