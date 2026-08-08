'use client'

import { useState } from 'react'

function aggregateSalesRecords(records: any[], period: 'weekly' | 'monthly' | 'allTime', selectedMonth?: string) {
  if (records.length === 0) return null

  let filtered = records
  let periodLabel = 'All-Time'

  if (period === 'weekly') {
    const now = new Date()
    const weekAgo = new Date(now)
    weekAgo.setDate(weekAgo.getDate() - 7)
    filtered = records.filter(r => new Date(r.sale_date) >= weekAgo)
    periodLabel = `Last 7 Days (${weekAgo.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${now.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })})`
  } else if (period === 'monthly' && selectedMonth) {
    filtered = records.filter(r => r.sale_date.slice(0, 7) === selectedMonth)
    const [year, month] = selectedMonth.split('-')
    periodLabel = new Date(parseInt(year), parseInt(month) - 1, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
  }

  const carrierMap: Record<string, { totalAP: number; count: number }> = {}
  const agentMap: Record<string, { totalAP: number; carriers: Set<string>; count: number }> = {}

  filtered.forEach(r => {
    const c = r.carrier
    if (!carrierMap[c]) carrierMap[c] = { totalAP: 0, count: 0 }
    carrierMap[c].totalAP += Number(r.amount)
    carrierMap[c].count += 1

    const a = r.agent_name
    if (!agentMap[a]) agentMap[a] = { totalAP: 0, carriers: new Set(), count: 0 }
    agentMap[a].totalAP += Number(r.amount)
    agentMap[a].carriers.add(c)
    agentMap[a].count += 1
  })

  const byCarrier = Object.entries(carrierMap).map(([carrier, d]) => ({ carrier, totalAP: Math.round(d.totalAP * 100) / 100, count: d.count })).sort((a, b) => b.totalAP - a.totalAP)
  const byAgent = Object.entries(agentMap).map(([agent, d]) => ({ agent, totalAP: Math.round(d.totalAP * 100) / 100, carriers: Array.from(d.carriers), count: d.count })).sort((a, b) => b.totalAP - a.totalAP)
  const totalAP = byCarrier.reduce((sum, c) => sum + c.totalAP, 0)
  const totalSales = byCarrier.reduce((sum, c) => sum + c.count, 0)

  return {
    totalAP: Math.round(totalAP * 100) / 100,
    totalSales,
    byCarrier,
    byAgent,
    periodLabel
  }
}

function getAvailableMonths(records: any[]): string[] {
  const months = new Set<string>()
  records.forEach(r => months.add(r.sale_date.slice(0, 7)))
  return Array.from(months).sort().reverse()
}

export default function SalesTab({ salesRecords }: { salesRecords: any[] }) {
  const [salesPeriod, setSalesPeriod] = useState<'weekly' | 'monthly' | 'allTime'>('weekly')
  const [selectedMonth, setSelectedMonth] = useState<string>(() => {
    return salesRecords.length > 0 ? salesRecords[0].sale_date.slice(0, 7) : ''
  })

  return (
    <div>
      <style>{`
        @keyframes xfgPulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.35; } }
        @keyframes xfgFloat { 0%, 100% { transform: translateY(0px); } 50% { transform: translateY(-6px); } }
        @keyframes xfgHolo { 0% { background-position: 0% 50%; } 50% { background-position: 100% 50%; } 100% { background-position: 0% 50%; } }
        .xfg-hud-num { font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; font-variant-numeric: tabular-nums; }
        .xfg-hero-num {
          background: linear-gradient(110deg, #FFFFFF 20%, #C9A96E 35%, #00E5A8 50%, #C9A96E 65%, #FFFFFF 80%);
          background-size: 250% auto;
          -webkit-background-clip: text;
          background-clip: text;
          color: transparent;
          animation: xfgFloat 4s ease-in-out infinite, xfgHolo 6s linear infinite;
          display: inline-block;
          transition: filter 0.3s ease;
          cursor: default;
        }
        .xfg-hero-num:hover { filter: brightness(1.25) drop-shadow(0 0 20px rgba(0,229,168,0.5)); }
        .xfg-substat-num {
          display: inline-block;
          animation: xfgFloat 4s ease-in-out infinite;
          transition: transform 0.25s ease, color 0.25s ease;
        }
        .xfg-substat-num:hover { transform: translateY(-8px) scale(1.05); color: #00E5A8 !important; }
      `}</style>
      {salesRecords.length === 0 ? (
        <div style={{ backgroundColor: '#0A0A0C', borderRadius: '16px', border: '1px solid #232328', padding: '48px 24px', textAlign: 'center' }}>
          <p style={{ fontSize: '13px', color: '#6B6B76', fontFamily: 'ui-monospace, monospace' }}>NO DATA STREAM — awaiting first sync from #daily-sales</p>
        </div>
      ) : (() => {
        const availableMonths = getAvailableMonths(salesRecords)
        const data = aggregateSalesRecords(salesRecords, salesPeriod, selectedMonth)
        if (!data) return null

        const periods = [{ key: 'weekly', label: 'WEEKLY' }, { key: 'monthly', label: 'MONTHLY' }, { key: 'allTime', label: 'ALL-TIME' }]
        const activeIndex = periods.findIndex(p => p.key === salesPeriod)

        return (
          <>
            {/* Segmented control */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '24px', flexWrap: 'wrap' }}>
              <div style={{ position: 'relative', display: 'inline-flex', backgroundColor: '#131316', border: '1px solid #232328', borderRadius: '10px', padding: '4px' }}>
                <div style={{
                  position: 'absolute', top: '4px', bottom: '4px', left: `calc(4px + ${activeIndex} * 88px)`,
                  width: '84px', backgroundColor: '#C9A96E', borderRadius: '7px',
                  transition: 'left 0.25s cubic-bezier(0.4, 0, 0.2, 1)', boxShadow: '0 0 16px rgba(201,169,110,0.5)'
                }} />
                {periods.map(p => (
                  <button
                    key={p.key}
                    onClick={() => setSalesPeriod(p.key as 'weekly' | 'monthly' | 'allTime')}
                    style={{
                      position: 'relative', width: '84px', padding: '9px 0', border: 'none', background: 'transparent',
                      fontSize: '11px', fontWeight: '700', letterSpacing: '0.08em', cursor: 'pointer', fontFamily: 'ui-monospace, monospace',
                      color: salesPeriod === p.key ? '#0A0A0C' : '#6B6B76', transition: 'color 0.25s ease', zIndex: 1
                    }}
                  >
                    {p.label}
                  </button>
                ))}
              </div>

              {salesPeriod === 'monthly' && (
                <select
                  value={selectedMonth}
                  onChange={e => setSelectedMonth(e.target.value)}
                  style={{
                    padding: '9px 16px', borderRadius: '10px', border: '1px solid #232328', fontSize: '12px', fontWeight: '700',
                    color: '#C9A96E', backgroundColor: '#131316', cursor: 'pointer', fontFamily: 'ui-monospace, monospace', letterSpacing: '0.04em'
                  }}
                >
                  {availableMonths.map(m => {
                    const [year, month] = m.split('-')
                    const label = new Date(parseInt(year), parseInt(month) - 1, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
                    return <option key={m} value={m}>{label.toUpperCase()}</option>
                  })}
                </select>
              )}

              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginLeft: 'auto' }}>
                <div style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#00E5A8', animation: 'xfgPulse 2s ease-in-out infinite' }} />
                <span style={{ fontSize: '10px', color: '#6B6B76', fontFamily: 'ui-monospace, monospace', letterSpacing: '0.1em' }}>LIVE · SYNCS MON 8AM CST</span>
              </div>
            </div>

            {/* Hero HUD panel */}
            <div style={{
              position: 'relative', background: '#0A0A0C', borderRadius: '20px', padding: '36px 40px', marginBottom: '24px',
              border: '1px solid #232328', overflow: 'hidden',
              backgroundImage: 'repeating-linear-gradient(115deg, rgba(201,169,110,0.03) 0px, rgba(201,169,110,0.03) 1px, transparent 1px, transparent 40px)'
            }}>
              {/* corner brackets */}
              {[
                { top: 14, left: 14, borderTop: '2px solid #C9A96E', borderLeft: '2px solid #C9A96E' },
                { top: 14, right: 14, borderTop: '2px solid #C9A96E', borderRight: '2px solid #C9A96E' },
                { bottom: 14, left: 14, borderBottom: '2px solid #C9A96E', borderLeft: '2px solid #C9A96E' },
                { bottom: 14, right: 14, borderBottom: '2px solid #C9A96E', borderRight: '2px solid #C9A96E' },
              ].map((pos, i) => (
                <div key={i} style={{ position: 'absolute', width: '18px', height: '18px', ...pos }} />
              ))}

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                <span style={{ width: '4px', height: '4px', borderRadius: '50%', backgroundColor: '#00E5A8' }} />
                <p style={{ fontSize: '11px', fontWeight: '700', color: '#00E5A8', margin: 0, textTransform: 'uppercase', letterSpacing: '0.16em', fontFamily: 'ui-monospace, monospace' }}>{data.periodLabel}</p>
              </div>

              <div style={{ display: 'flex', alignItems: 'flex-end', gap: '56px', flexWrap: 'wrap', marginTop: '14px' }}>
                <div style={{ position: 'relative' }}>
                  <p className="xfg-hud-num xfg-hero-num" style={{ fontSize: '52px', fontWeight: '700', margin: 0, letterSpacing: '-0.01em' }}>
                    ${data.totalAP.toLocaleString()}
                  </p>
                  <p style={{ fontSize: '11px', color: '#6B6B76', margin: '4px 0 0 0', textTransform: 'uppercase', letterSpacing: '0.14em', fontFamily: 'ui-monospace, monospace' }}>Total Annual Premium</p>
                </div>
                <div style={{ borderLeft: '1px solid #232328', paddingLeft: '32px' }}>
                  <p className="xfg-hud-num xfg-substat-num" style={{ fontSize: '30px', fontWeight: '700', color: '#C9A96E', margin: 0, animationDelay: '0.3s' }}>{data.totalSales}</p>
                  <p style={{ fontSize: '11px', color: '#6B6B76', margin: '4px 0 0 0', textTransform: 'uppercase', letterSpacing: '0.14em', fontFamily: 'ui-monospace, monospace' }}>Policies Sold</p>
                </div>
                <div style={{ borderLeft: '1px solid #232328', paddingLeft: '32px' }}>
                  <p className="xfg-hud-num xfg-substat-num" style={{ fontSize: '30px', fontWeight: '700', color: '#C9A96E', margin: 0, animationDelay: '0.6s' }}>${data.totalSales > 0 ? Math.round(data.totalAP / data.totalSales).toLocaleString() : 0}</p>
                  <p style={{ fontSize: '11px', color: '#6B6B76', margin: '4px 0 0 0', textTransform: 'uppercase', letterSpacing: '0.14em', fontFamily: 'ui-monospace, monospace' }}>Avg AP / Sale</p>
                </div>
              </div>
            </div>

            {/* By Carrier / By Agent */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div style={{ backgroundColor: '#0A0A0C', borderRadius: '16px', border: '1px solid #232328', overflow: 'hidden' }}>
                <div style={{ padding: '14px 22px', borderBottom: '1px solid #232328', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ width: '4px', height: '4px', borderRadius: '50%', backgroundColor: '#C9A96E' }} />
                  <p style={{ fontSize: '11px', fontWeight: '700', color: '#C9A96E', margin: 0, textTransform: 'uppercase', letterSpacing: '0.14em', fontFamily: 'ui-monospace, monospace' }}>By Carrier</p>
                </div>
                <div style={{ padding: '4px 22px' }}>
                  {data.byCarrier.map((c: any, i: number) => (
                    <div key={c.carrier} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '13px 0', borderTop: i > 0 ? '1px solid #1A1A1E' : 'none' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span className="xfg-hud-num" style={{ fontSize: '10px', color: '#3A3A40', width: '16px' }}>{String(i + 1).padStart(2, '0')}</span>
                        <span style={{ fontSize: '13px', color: '#E5E5E5', fontWeight: '600' }}>{c.carrier}</span>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <p className="xfg-hud-num" style={{ fontSize: '14px', fontWeight: '700', color: '#00E5A8', margin: 0 }}>${c.totalAP.toLocaleString()}</p>
                        <p style={{ fontSize: '10px', color: '#6B6B76', margin: 0, fontFamily: 'ui-monospace, monospace' }}>{c.count} sale{c.count !== 1 ? 's' : ''}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div style={{ backgroundColor: '#0A0A0C', borderRadius: '16px', border: '1px solid #232328', overflow: 'hidden' }}>
                <div style={{ padding: '14px 22px', borderBottom: '1px solid #232328', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ width: '4px', height: '4px', borderRadius: '50%', backgroundColor: '#C9A96E' }} />
                  <p style={{ fontSize: '11px', fontWeight: '700', color: '#C9A96E', margin: 0, textTransform: 'uppercase', letterSpacing: '0.14em', fontFamily: 'ui-monospace, monospace' }}>By Agent</p>
                </div>
                <div style={{ padding: '4px 22px' }}>
                  {data.byAgent.map((a: any, i: number) => (
                    <div key={a.agent} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '13px 0', borderTop: i > 0 ? '1px solid #1A1A1E' : 'none' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span className="xfg-hud-num" style={{ fontSize: '10px', color: '#3A3A40', width: '16px' }}>{String(i + 1).padStart(2, '0')}</span>
                        <div>
                          <p style={{ fontSize: '13px', color: '#E5E5E5', fontWeight: '600', margin: 0 }}>{a.agent}</p>
                          <p style={{ fontSize: '10px', color: '#6B6B76', margin: 0, fontFamily: 'ui-monospace, monospace' }}>{a.carriers.join(', ')} · {a.count} polic{a.count !== 1 ? 'ies' : 'y'}</p>
                        </div>
                      </div>
                      <p className="xfg-hud-num" style={{ fontSize: '14px', fontWeight: '700', color: '#00E5A8', margin: 0 }}>${a.totalAP.toLocaleString()}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </>
        )
      })()}
    </div>
  )
}
