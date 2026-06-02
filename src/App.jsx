import React, { useState } from 'react'

async function generateBrief(domain) {
  const response = await fetch('/.netlify/functions/brief', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ domain })
  })
  const data = await response.json()
  if (!response.ok) throw new Error(data.error || 'Failed to generate brief')
  return data
}

const healthColors = {
  'Healthy': { bg: '#D1FAE5', text: '#065F46', dot: '#10B981' },
  'At Risk': { bg: '#FEF3C7', text: '#92400E', dot: '#F59E0B' },
  'Critical': { bg: '#FEE2E2', text: '#991B1B', dot: '#EF4444' }
}
const trendColors = { 'Growing': '#10B981', 'Stable': '#4AA1FF', 'Declining': '#EF4444' }
const usageColors = { 'High': '#D1FAE5', 'Medium': '#FEF3C7', 'Low': '#FEE2E2' }
const usageText = { 'High': '#065F46', 'Medium': '#92400E', 'Low': '#991B1B' }

const LOADING_MESSAGES = [
  'Connecting to Amplitude...',
  'Pulling WAU trends...',
  'Analysing feature adoption...',
  'Checking AI & sequence usage...',
  'Generating brief...',
]

function MiniChart({ data }) {
  if (!data || data.length === 0) return null
  const max = Math.max(...data, 1)
  const w = 300, h = 56
  const pts = data.map((v, i) => `${(i / (data.length - 1)) * w},${h - (v / max) * h * 0.85 - 4}`)
  return (
    <svg viewBox={`0 0 ${w} ${h}`} style={{ width: '100%', height: 56 }}>
      <polyline points={pts.join(' ')} fill="none" stroke="#4AA1FF" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      {data.map((v, i) => (
        <circle key={i} cx={(i / (data.length - 1)) * w} cy={h - (v / max) * h * 0.85 - 4} r="3.5" fill="#fff" stroke="#4AA1FF" strokeWidth="2" />
      ))}
    </svg>
  )
}

export default function App() {
  const [domain, setDomain] = useState('')
  const [loading, setLoading] = useState(false)
  const [loadingStep, setLoadingStep] = useState(0)
  const [brief, setBrief] = useState(null)
  const [error, setError] = useState('')

  const handleGenerate = async () => {
    if (!domain.trim()) return
    setLoading(true)
    setError('')
    setBrief(null)
    setLoadingStep(0)
    const interval = setInterval(() => setLoadingStep(s => s < LOADING_MESSAGES.length - 1 ? s + 1 : s), 4000)
    try {
      const result = await generateBrief(domain.trim())
      setBrief(result)
    } catch (e) {
      setError(e.message)
    } finally {
      clearInterval(interval)
      setLoading(false)
    }
  }

  const hc = brief ? (healthColors[brief.accountHealth] || healthColors['Healthy']) : null

  return (
    <div style={{ minHeight: '100vh', background: '#F7F9FC' }}>
      <div style={{ background: '#fff', borderBottom: '1px solid #E2E8F0', padding: '0 32px', height: 60, display: 'flex', alignItems: 'center', position: 'sticky', top: 0, zIndex: 10, boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 34, height: 34, borderRadius: 9, background: '#0F2557', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>🧠</div>
          <div>
            <div style={{ fontSize: 15, fontWeight: 700, letterSpacing: '-0.02em' }}>PreCall <span style={{ color: '#4AA1FF' }}>Intelligence</span></div>
            <div style={{ fontSize: 11, color: '#94A3B8', marginTop: -2 }}>Recruiterflow CS · Live Amplitude Data</div>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 920, margin: '40px auto', padding: '0 24px 60px' }}>
        <div style={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: 16, padding: '20px 24px', marginBottom: 32, boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
          <div style={{ fontSize: 13, color: '#475569', fontWeight: 500, marginBottom: 12 }}>Enter a customer domain to generate their pre-call brief</div>
          <div style={{ display: 'flex', gap: 12 }}>
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 8, background: '#F7F9FC', border: '1px solid #E2E8F0', borderRadius: 10, padding: '10px 16px' }}>
              <span style={{ color: '#94A3B8', fontSize: 16 }}>@</span>
              <input value={domain} onChange={e => setDomain(e.target.value)} onKeyDown={e => e.key === 'Enter' && !loading && handleGenerate()} placeholder="scmexecutives.com" style={{ flex: 1, border: 'none', background: 'none', fontSize: 15, outline: 'none', color: '#0F172A' }} />
              {domain && <button onClick={() => { setDomain(''); setBrief(null); setError('') }} style={{ background: 'none', border: 'none', color: '#94A3B8', fontSize: 20, cursor: 'pointer', padding: 0 }}>×</button>}
            </div>
            <button onClick={handleGenerate} disabled={loading || !domain.trim()} style={{ padding: '10px 24px', background: loading ? '#94A3B8' : '#4AA1FF', color: '#fff', border: 'none', borderRadius: 10, fontWeight: 600, fontSize: 14, cursor: loading ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: 8, whiteSpace: 'nowrap' }}>
              {loading ? (<><span style={{ width: 16, height: 16, border: '2px solid rgba(255,255,255,0.3)', borderTop: '2px solid #fff', borderRadius: '50%', display: 'inline-block', animation: 'spin 0.7s linear infinite' }}></span>{LOADING_MESSAGES[loadingStep]}</>) : '⚡ Generate Brief'}
            </button>
          </div>
          <div style={{ fontSize: 12, color: '#94A3B8', marginTop: 10 }}>Try: scmexecutives.com · impact-recruitment.eu · recruiter-base.com</div>
        </div>

        {error && <div style={{ background: '#FEE2E2', border: '1px solid #FECACA', borderRadius: 12, padding: '14px 18px', marginBottom: 24, color: '#991B1B', fontSize: 13 }}>⚠ {error}</div>}

        {brief && (
          <div style={{ animation: 'fadeIn 0.4s ease' }}>
            <div style={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: 16, padding: '24px 28px', marginBottom: 20, boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20 }}>
                <div>
                  <div style={{ fontSize: 24, fontWeight: 800, letterSpacing: '-0.03em', marginBottom: 4 }}>{brief.domain}</div>
                  <div style={{ fontSize: 13, color: '#475569' }}>{brief.healthReason}</div>
                </div>
                <div style={{ display: 'flex', gap: 10, flexShrink: 0 }}>
                  <div style={{ background: hc.bg, color: hc.text, padding: '6px 16px', borderRadius: 20, fontSize: 13, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: hc.dot, display: 'inline-block' }}></span>{brief.accountHealth}
                  </div>
                  <div style={{ background: '#F1F5F9', color: trendColors[brief.trend] || '#4AA1FF', padding: '6px 16px', borderRadius: 20, fontSize: 13, fontWeight: 600 }}>
                    {brief.trend === 'Growing' ? '↑' : brief.trend === 'Declining' ? '↓' : '→'} {brief.trend}
                  </div>
                </div>
              </div>
              {brief.wau && brief.wau.length > 0 && (
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                    <span style={{ fontSize: 12, color: '#94A3B8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Weekly Active Users — Last 90 days</span>
                    <div style={{ display: 'flex', gap: 16 }}>
                      <span style={{ fontSize: 12, color: '#475569' }}>Peak: <strong>{brief.peakWau || Math.max(...brief.wau)}</strong></span>
                      <span style={{ fontSize: 12, color: '#475569' }}>Now: <strong>{brief.currentWau || brief.wau[brief.wau.length - 1]}</strong></span>
                    </div>
                  </div>
                  <MiniChart data={brief.wau} />
                </div>
              )}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 20 }}>
              <div style={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: 16, padding: '20px 24px', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
                <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 16 }}>✅ Adopted Features</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {brief.adoptedFeatures?.length > 0 ? brief.adoptedFeatures.map((f, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                      <span style={{ background: usageColors[f.usage] || '#F1F5F9', color: usageText[f.usage] || '#475569', padding: '2px 8px', borderRadius: 5, fontSize: 11, fontWeight: 600, flexShrink: 0, marginTop: 2 }}>{f.usage}</span>
                      <div><div style={{ fontSize: 13, fontWeight: 500 }}>{f.name}</div><div style={{ fontSize: 12, color: '#475569', lineHeight: 1.5 }}>{f.detail}</div></div>
                    </div>
                  )) : <div style={{ fontSize: 13, color: '#94A3B8' }}>No significant adoption detected</div>}
                </div>
              </div>
              <div style={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: 16, padding: '20px 24px', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
                <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 16 }}>🎯 Opportunity Gaps</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {brief.gapFeatures?.map((f, i) => (
                    <div key={i} style={{ borderLeft: '3px solid #4AA1FF', paddingLeft: 12 }}>
                      <div style={{ fontSize: 13, fontWeight: 500 }}>{f.name}</div>
                      <div style={{ fontSize: 12, color: '#475569', lineHeight: 1.5 }}>{f.opportunity}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
              <div style={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: 16, padding: '20px 24px', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
                <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 16 }}>💬 Conversation Starters</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {brief.conversationStarters?.map((s, i) => (
                    <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                      <span style={{ width: 22, height: 22, borderRadius: '50%', background: '#EBF4FF', color: '#2563EB', fontSize: 11, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1 }}>{i + 1}</span>
                      <div style={{ fontSize: 13, color: '#334155', lineHeight: 1.5 }}>{s}</div>
                    </div>
                  ))}
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                <div style={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: 16, padding: '20px 24px', boxShadow: '0 2px 8px rgba(0,0,0,0.04)', flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 16 }}>📋 Call Agenda</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {brief.callAgenda?.map((a, i) => (
                      <div key={i} style={{ display: 'flex', gap: 12 }}>
                        <span style={{ fontSize: 11, color: '#94A3B8', fontWeight: 600, whiteSpace: 'nowrap', minWidth: 70, marginTop: 2 }}>{a.time}</span>
                        <span style={{ fontSize: 13, color: '#334155', lineHeight: 1.5 }}>{a.item}</span>
                      </div>
                    ))}
                  </div>
                </div>
                {brief.upsellOpportunity && brief.upsellOpportunity !== 'None' && (
                  <div style={{ background: '#EBF4FF', border: '1px solid #BFDBFE', borderRadius: 16, padding: '16px 20px' }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: '#1D4ED8', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>💡 Upsell — {brief.upsellOpportunity}</div>
                    <div style={{ fontSize: 13, color: '#1E40AF', lineHeight: 1.5 }}>{brief.upsellReason}</div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {!brief && !loading && !error && (
          <div style={{ textAlign: 'center', padding: '60px 24px', color: '#94A3B8' }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>🧠</div>
            <div style={{ fontSize: 16, fontWeight: 500, marginBottom: 8, color: '#475569' }}>Enter a domain above to get started</div>
            <div style={{ fontSize: 13 }}>Pulls live Amplitude data · Generates full brief in ~20 seconds</div>
          </div>
        )}
      </div>
      <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}@keyframes fadeIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}`}</style>
    </div>
  )
}
