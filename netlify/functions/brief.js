const ANTHROPIC_KEY = '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'

const SYSTEM_PROMPT = `You are a senior Customer Success analyst at Recruiterflow, an AI-native ATS & CRM platform for recruiting agencies. You have access to Amplitude analytics via MCP tools.

When given a customer domain, use the Amplitude MCP tools to pull real data:
1. Query weekly active users (WAU) for the last 90 days: use event "_active", interval 7, metric "uniques", filter by user property "gp:email" contains the domain. Use project ID 204829.
2. Query feature totals for last 90 days (interval 30, metric "totals"), same domain filter, for:
   - "bulk-email-sent"
   - "Agent triggered"
   - "Aira source search executed"
   - "add-to-campaign"
   - "Advanced-report-opened-view"
   - "added-prospect"

After pulling the real data, return ONLY a valid JSON object, no markdown, no explanation:
{
  "domain": "domain name",
  "accountHealth": "Healthy|At Risk|Critical",
  "healthReason": "one sentence with real numbers",
  "wau": [array of weekly numbers oldest first, last 12 weeks],
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

exports.handler = async function(event) {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json'
  }

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' }
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) }
  }

  let domain
  try {
    const body = JSON.parse(event.body)
    domain = body.domain
  } catch {
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'Invalid request' }) }
  }

  if (!domain) {
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'Domain required' }) }
  }

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_KEY,
        'anthropic-version': '2023-06-01',
        'anthropic-beta': 'mcp-client-2025-04-04'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 4000,
        system: SYSTEM_PROMPT,
        messages: [{
          role: 'user',
          content: `Generate a pre-call intelligence brief for customer domain: ${domain}. Use the Amplitude MCP tools to pull real live data first, then return the JSON brief.`
        }],
        mcp_servers: [{
          type: 'url',
          url: 'https://mcp.amplitude.com/mcp',
          name: 'amplitude'
        }]
      })
    })

    const data = await response.json()

    if (!response.ok) {
      return { statusCode: response.status, headers, body: JSON.stringify({ error: data.error?.message || 'API error' }) }
    }

    const textBlock = data.content?.find(b => b.type === 'text')
    if (!textBlock) {
      return { statusCode: 500, headers, body: JSON.stringify({ error: 'No response from model' }) }
    }

    const text = textBlock.text.trim()
    const clean = text.replace(/```json|```/g, '').trim()
    const jsonMatch = clean.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      return { statusCode: 500, headers, body: JSON.stringify({ error: 'Could not parse brief' }) }
    }

    const brief = JSON.parse(jsonMatch[0])
    return { statusCode: 200, headers, body: JSON.stringify(brief) }

  } catch (err) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: err.message }) }
  }
}
