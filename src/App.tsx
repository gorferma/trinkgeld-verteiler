import { useEffect, useMemo, useState } from 'react'

type Staff = { id: string; name: string; share: number }
type Helper = { id: string; name: string; hours: number }

type ResultRow = { id: string; name: string; amount: number; percentOfGroup: number }

type Results = {
  appliedStaffPct: number
  appliedHelperPct: number
  staffRows: ResultRow[]
  helperRows: ResultRow[]
  staffPot: number
  helperPot: number
  explanation: string
}

const uid = () => Math.random().toString(36).slice(2, 9)

const defaultStaff: Staff[] = [
  { id: uid(), name: 'Anna', share: 1.0 },
  { id: uid(), name: 'Ben', share: 0.8 },
  { id: uid(), name: 'Cara', share: 0.5 },
]
const defaultHelpers: Helper[] = [
  { id: uid(), name: 'Dave', hours: 20 },
  { id: uid(), name: 'Eva', hours: 12 },
  { id: uid(), name: 'Finn', hours: 8 },
]

function formatMoney(x: number) {
  return x.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })
}

function toPercentString(x: number, maxDecimals = 2) {
  const s = x.toFixed(maxDecimals)
  // trim trailing zeros and optional dot
  return s.replace(/\.0+$/, '').replace(/(\.\d*?)0+$/, '$1')
}

function roundGroup(values: { id: string; raw: number; name: string }[], groupTotal: number): ResultRow[] {
  // Largest Remainder Method auf 2 Dezimalen
  const withFloor = values.map(v => ({
    ...v,
    floored: Math.floor(v.raw * 100) / 100,
    frac: v.raw - Math.floor(v.raw * 100) / 100,
  }))
  let sumFloored = withFloor.reduce((a, b) => a + b.floored, 0)
  let centsToDistribute = Math.round((groupTotal - sumFloored) * 100)

  // verteile verbleibende Cents an größte Nachkommarest-Fraktionen
  const sorted = [...withFloor].sort((a, b) => b.frac - a.frac)
  for (let i = 0; i < sorted.length && centsToDistribute > 0; i++) {
    sorted[i].floored = Math.round((sorted[i].floored + 0.01) * 100) / 100
    centsToDistribute--
  }
  // zurück in Originalreihenfolge
  const corrected = withFloor.map(v => {
    const s = sorted.find(x => x.id === v.id)!
    return { ...v, floored: s.floored }
  })

  const total = corrected.reduce((a, b) => a + b.floored, 0) || 0.00001 // avoid div by zero in percent
  return corrected.map(v => ({ id: v.id, name: v.name, amount: v.floored, percentOfGroup: v.floored / total }))
}

function computeResults(total: number, staff: Staff[], helpers: Helper[]): Results {
  const sumW = staff.reduce((a, s) => a + (isFinite(s.share) ? Math.max(0, s.share) : 0), 0)
  const sumH = helpers.reduce((a, h) => a + (isFinite(h.hours) ? Math.max(0, h.hours) : 0), 0)

  if (total <= 0) {
    return {
      appliedStaffPct: 0.8,
      appliedHelperPct: 0.2,
      staffRows: [],
      helperRows: [],
      staffPot: 0,
      helperPot: 0,
      explanation: 'Bitte einen positiven Gesamttopf eingeben.',
    }
  }

  // Edge cases
  if (sumW === 0 && sumH === 0) {
    return {
      appliedStaffPct: 0,
      appliedHelperPct: 1,
      staffRows: [],
      helperRows: [],
      staffPot: 0,
      helperPot: total,
      explanation: 'Kein Stammpersonal und keine Aushilfen erfasst. Bitte Daten eingeben.',
    }
  }
  if (sumW === 0 && sumH > 0) {
    const helperValues = helpers.map(h => ({ id: h.id, name: h.name || 'Aushilfe', raw: (total * (h.hours / sumH)) }))
    const helperRows = roundGroup(helperValues, total)
    return {
      appliedStaffPct: 0,
      appliedHelperPct: 1,
      staffRows: [],
      helperRows,
      staffPot: 0,
      helperPot: total,
      explanation: 'Kein Stammpersonal vorhanden → 100% an Aushilfen.',
    }
  }
  if (sumH === 0 && sumW > 0) {
    const staffValues = staff.map(s => ({ id: s.id, name: s.name || 'Stamm', raw: (total * (s.share / sumW)) }))
    const staffRows = roundGroup(staffValues, total)
    return {
      appliedStaffPct: 1,
      appliedHelperPct: 0,
      staffRows,
      helperRows: [],
      staffPot: total,
      helperPot: 0,
      explanation: 'Keine Aushilfen vorhanden → 100% an Stammpersonal.',
    }
  }

  // Baseline 80/20 check
  const p0 = 0.8
  const S1_p0 = (p0 * total) / sumW
  const rH = (helpers.length && sumH > 0) ? Math.max(...helpers.map(h => h.hours)) / sumH : 0
  const Amax_p0 = (1 - p0) * total * rH
  const threshold_p0 = 0.5 * S1_p0

  let p = p0
  if (Amax_p0 > threshold_p0) {
    const numerator = 2 * sumW * rH
    const pAdj = numerator / (numerator + 1)
    p = Math.min(1, Math.max(0, pAdj))
  }
  const q = 1 - p

  const staffPot = p * total
  const helperPot = q * total

  // Raw values for rounding
  const staffValues = staff.map(s => ({ id: s.id, name: s.name || 'Stamm', raw: staffPot * (s.share / sumW) }))
  const helperValues = helpers.map(h => ({ id: h.id, name: h.name || 'Aushilfe', raw: helperPot * (h.hours / sumH) }))

  const staffRows = roundGroup(staffValues, staffPot)
  const helperRows = roundGroup(helperValues, helperPot)

  // Build explanation
  let reason = ''
  if (p === p0) {
    reason = `Angewandter Split: ${(p*100).toFixed(1)}% / ${(q*100).toFixed(1)}%. Keine Anpassung nötig: maximale Aushilfe bei 80/20 (${formatMoney(Amax_p0)}) liegt nicht über der Hälfte eines vollen Stamm-Anteils (${formatMoney(threshold_p0)}).`
  } else {
    const violators = helpers
      .map(h => ({
        name: h.name || 'Aushilfe',
        payout80: (1 - p0) * total * (h.hours / sumH),
      }))
      .filter(x => x.payout80 > threshold_p0)
      .sort((a, b) => b.payout80 - a.payout80)

    const who = violators.map(v => `${v.name}: ${formatMoney(v.payout80)} (>${formatMoney(threshold_p0)})`).join('; ')

    const S1_p = (p * total) / sumW
    const Amax_p = (1 - p) * total * rH

    reason = `Angewandter Split: ${(p*100).toFixed(1)}% / ${(q*100).toFixed(1)}% (von 80/20 verschoben). Grund: Bei 80/20 hätte die bestbezahlte Aushilfe mehr als die Hälfte eines vollen Stamm-Anteils erhalten. Überschreitungen bei 80/20: ${who || '—'}. Der Split wurde so gewählt, dass die bestbezahlte Aushilfe nun genau die Hälfte eines vollen Stamm-Anteils erhält: max Aushilfe = ${formatMoney(Amax_p)} = 0,5 × ${formatMoney(S1_p)}.`
  }

  return {
    appliedStaffPct: p,
    appliedHelperPct: q,
    staffRows,
    helperRows,
    staffPot: Math.round(staffRows.reduce((a, r) => a + r.amount, 0) * 100) / 100,
    helperPot: Math.round(helperRows.reduce((a, r) => a + r.amount, 0) * 100) / 100,
    explanation: reason,
  }
}

export default function App() {
  const [total, setTotal] = useState<number>(() => {
    const saved = localStorage.getItem('tg_total')
    return saved ? Number(saved) : 1000
  })
  const [totalInput, setTotalInput] = useState<string>(() => {
    const saved = localStorage.getItem('tg_total')
    return saved ? String(Number(saved)) : '1000'
  })
  const [staff, setStaff] = useState<Staff[]>(() => {
    const saved = localStorage.getItem('tg_staff')
    return saved ? JSON.parse(saved) : defaultStaff
  })
  const [helpers, setHelpers] = useState<Helper[]>(() => {
    const saved = localStorage.getItem('tg_helpers')
    return saved ? JSON.parse(saved) : defaultHelpers
  })

  useEffect(() => { localStorage.setItem('tg_total', String(total)) }, [total])
  useEffect(() => { localStorage.setItem('tg_staff', JSON.stringify(staff)) }, [staff])
  useEffect(() => { localStorage.setItem('tg_helpers', JSON.stringify(helpers)) }, [helpers])

  const results = useMemo(() => computeResults(total, staff, helpers), [total, staff, helpers])

  // string inputs for shares/hours to control formatting (strip leading zeros)
  const [staffShareInput, setStaffShareInput] = useState<Record<string, string>>(() =>
    Object.fromEntries(
      (localStorage.getItem('tg_staff') ? JSON.parse(localStorage.getItem('tg_staff')!) : defaultStaff)
        .map((s: Staff) => [s.id, toPercentString((Number.isFinite(s.share) ? Math.max(0, s.share) : 0) * 100)])
    )
  )
  const [helperHoursInput, setHelperHoursInput] = useState<Record<string, string>>(() =>
    Object.fromEntries((localStorage.getItem('tg_helpers') ? JSON.parse(localStorage.getItem('tg_helpers')!) : defaultHelpers).map((h: Helper) => [h.id, String(h.hours)]))
  )

  // Mobile summary sheet state
  const [mobileSummaryOpen, setMobileSummaryOpen] = useState(false)

  function sanitizeNumericString(
    v: string,
    {
      allowDecimal = true,
      clampMin = 0,
      clampMax = Infinity,
      maxDecimals,
      mode = 'typing',
    }: { allowDecimal?: boolean; clampMin?: number; clampMax?: number; maxDecimals?: number; mode?: 'typing' | 'commit' } = {}
  ) {
    // Drop illegal characters; in typing mode allow either ',' or '.' as separator
    let s = v
    const allowedSep = allowDecimal ? '[.,]' : ''
    const re = new RegExp(`[^0-9${allowedSep}]`, 'g')
    s = s.replace(re, '')
    if (!allowDecimal) s = s.replace(/[.,]/g, '')

    // ensure only a single separator (keep first occurrence of either '.' or ',')
    if (allowDecimal) {
      const firstSepIdx = Math.min(...[s.indexOf(','), s.indexOf('.')].filter(i => i !== -1))
      if (firstSepIdx !== Infinity && firstSepIdx !== -1) {
        const head = s.slice(0, firstSepIdx + 1)
        const tail = s.slice(firstSepIdx + 1).replace(/[.,]/g, '')
        s = head + tail
      }
    }

    if (mode === 'typing') {
      // allow empty while typing
      if (s === '') return ''
      // if starts with separator, prefix 0
      if (s.startsWith('.') || s.startsWith(',')) s = '0' + s
      // normalize integer leading zeros (allow a single 0)
      s = s.replace(/^0+(?=\d)/, '0')
      // soft limit decimal places
      if (maxDecimals != null && /[.,]/.test(s)) {
        const sep = s.includes(',') ? ',' : '.'
        const [i, d] = s.split(sep)
        s = i + sep + (d ?? '').slice(0, maxDecimals)
      }
      return s
    }

    // commit mode: clamp and normalize strictly
    if (s === '' || s === '.' || s === ',') s = '0'
    if (s.startsWith('.') || s.startsWith(',')) s = '0' + s
    let num = Number(s.replace(',', '.'))
    if (!Number.isFinite(num)) num = 0
    num = Math.min(clampMax, Math.max(clampMin, num))
    if (maxDecimals != null) {
      const factor = Math.pow(10, maxDecimals)
      num = Math.round(num * factor) / factor
    }
    // render using German decimal (no grouping)
    const out = num.toLocaleString('de-DE', { useGrouping: false, maximumFractionDigits: maxDecimals ?? 20 })
    return out
  }

  const addStaff = () => {
    const id = uid()
    setStaff(s => [...s, { id, name: '', share: 1 }])
    setStaffShareInput(m => ({ ...m, [id]: '100' }))
  }
  const addHelper = () => setHelpers(h => [...h, { id: uid(), name: '', hours: 1 }])
  const removeStaff = (id: string) => {
    setStaff(s => s.filter(x => x.id !== id))
    setStaffShareInput(m => { const { [id]: _omit, ...rest } = m; return rest })
  }
  const removeHelper = (id: string) => setHelpers(h => h.filter(x => x.id !== id))

  return (
    <div className="mx-auto max-w-6xl p-4 pb-24 md:p-8">
      <h1 className="text-2xl md:text-3xl font-semibold mb-4">Trinkgeld-Verteiler</h1>
      <p className="text-sm text-gray-600 mb-4">Verteilt Trinkgeld zwischen Stammpersonal (proportional zu Anteilen) und Aushilfen (proportional zu Stunden). Automatische Anpassung des Splits, falls Aushilfen über 0,5× eines vollen Stamm-Anteils kämen.</p>

  <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
        {/* Left column – Inputs */}
        <div className="space-y-5">
          <div className="bg-white rounded-2xl shadow p-4">
            <div className="flex items-center gap-2 mb-1">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4 text-gray-600"><path d="M12 3a9 9 0 100 18 1 1 0 110 2 11 11 0 110-22 1 1 0 010 2zm-5 8a1 1 0 100 2h6a3 3 0 010 6H8a1 1 0 110-2h5a1 1 0 100-2H7a3 3 0 010-6h6a1 1 0 110 2H7z"/></svg>
              <h2 className="text-lg font-medium">Gesamttopf</h2>
            </div>
            <p className="text-xs text-gray-500 mb-2">EUR, Dezimal erlaubt</p>
            <label className="block text-sm font-medium mb-1" htmlFor="total">Betrag (EUR)</label>
            <input id="total" type="text" inputMode="decimal" value={totalInput}
              onChange={e => {
                const s = sanitizeNumericString(e.target.value, { allowDecimal: true, maxDecimals: 2, mode: 'typing' })
                setTotalInput(s)
                const n = Number((s === '' || s === '.' || s === ',') ? '0' : s.replace(',', '.'))
                setTotal(Number.isFinite(n) ? n : 0)
              }}
              onBlur={e => {
                const s = sanitizeNumericString(e.target.value, { allowDecimal: true, clampMin: 0, maxDecimals: 2, mode: 'commit' })
                setTotalInput(s)
                const n = Number(s.replace(',', '.'))
                setTotal(Number.isFinite(n) ? n : 0)
              }}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
          </div>

          <div className="bg-white rounded-2xl shadow p-4">
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4 text-gray-600"><path d="M7 7a3 3 0 116 0 3 3 0 01-6 0zm8-1a2 2 0 114 0 2 2 0 01-4 0zM5 14a4 4 0 118 0v1H5v-1zm10-1h4a3 3 0 013 3v1h-7v-1a4 4 0 00-3-3z"/></svg>
                <h2 className="text-lg font-medium">Stammpersonal</h2>
              </div>
              <button onClick={addStaff} className="px-3 py-1 rounded-lg bg-indigo-600 text-white">+ Hinzufügen</button>
            </div>
            <p className="text-xs text-gray-500 mb-2">Anteile in %, 0–100 je Person (Summe beliebig)</p>
            <div className="space-y-2">
              {staff.map(s => (
                <div key={s.id} className="grid grid-cols-12 gap-2 items-center">
                  <input aria-label="Name" placeholder="Name" value={s.name}
                    onChange={e => setStaff(prev => prev.map(x => x.id===s.id? {...x, name: e.target.value}: x))}
                    className="col-span-6 rounded-lg border px-3 py-2" />
                  <div className="col-span-4 flex items-center">
                    <input aria-label="Anteil (%)" placeholder="0" type="text" inputMode="decimal" value={staffShareInput[s.id] ?? toPercentString(s.share * 100)}
                      onChange={e => {
                        const raw = e.target.value
                        const sanitized = sanitizeNumericString(raw, { allowDecimal: true, maxDecimals: 2, mode: 'typing' })
                        setStaffShareInput(m => ({ ...m, [s.id]: sanitized }))
                        const num = Number((sanitized === '' || sanitized === '.' || sanitized === ',') ? '0' : sanitized.replace(',', '.'))
                        setStaff(prev => prev.map(x => x.id===s.id? { ...x, share: Math.max(0, Math.min(1, Number.isFinite(num) ? num/100 : 0)) } : x))
                      }}
                      onBlur={e => {
                        const committed = sanitizeNumericString(e.target.value, { allowDecimal: true, clampMin: 0, clampMax: 100, maxDecimals: 2, mode: 'commit' })
                        setStaffShareInput(m => ({ ...m, [s.id]: committed }))
                        const num = Number((committed || '0').replace(',', '.'))
                        setStaff(prev => prev.map(x => x.id===s.id? { ...x, share: Math.max(0, Math.min(1, Number.isFinite(num) ? num/100 : 0)) } : x))
                      }}
                      className="w-full rounded-lg border px-3 py-2" />
                    <span className="ml-1 text-gray-600">%</span>
                  </div>
                  <button onClick={() => removeStaff(s.id)} aria-label="Entfernen" className="col-span-2 text-red-600">Entf.</button>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow p-4">
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4 text-gray-600"><path d="M12 6a3 3 0 110 6 3 3 0 010-6zm6 10a4 4 0 00-8 0v1h8v-1zM6 10a2 2 0 110-4 2 2 0 010 4zM3 17a3 3 0 013-3h1a5 5 0 00-2 4v1H3v-2z"/></svg>
                <h2 className="text-lg font-medium">Aushilfen</h2>
              </div>
              <button onClick={addHelper} className="px-3 py-1 rounded-lg bg-indigo-600 text-white">+ Hinzufügen</button>
            </div>
            <p className="text-xs text-gray-500 mb-2">Stunden, Dezimal erlaubt</p>
            <div className="space-y-2">
              {helpers.map(h => (
                <div key={h.id} className="grid grid-cols-12 gap-2 items-center">
                  <input aria-label="Name" placeholder="Name" value={h.name}
                    onChange={e => setHelpers(prev => prev.map(x => x.id===h.id? {...x, name: e.target.value}: x))}
                    className="col-span-6 rounded-lg border px-3 py-2" />
                  <input aria-label="Stunden" type="text" inputMode="decimal" value={helperHoursInput[h.id] ?? String(h.hours)}
                    onChange={e => {
                      const raw = e.target.value
                      const sanitized = sanitizeNumericString(raw, { allowDecimal: true, maxDecimals: 2, mode: 'typing' })
                      setHelperHoursInput(m => ({ ...m, [h.id]: sanitized }))
                      const num = Number((sanitized === '' || sanitized === '.' || sanitized === ',') ? '0' : sanitized.replace(',', '.'))
                      setHelpers(prev => prev.map(x => x.id===h.id? { ...x, hours: Math.max(0, Number.isFinite(num) ? num : 0) } : x))
                    }}
                    onBlur={e => {
                      const committed = sanitizeNumericString(e.target.value, { allowDecimal: true, clampMin: 0, maxDecimals: 2, mode: 'commit' })
                      setHelperHoursInput(m => ({ ...m, [h.id]: committed }))
                      const num = Number((committed || '0').replace(',', '.'))
                      setHelpers(prev => prev.map(x => x.id===h.id? { ...x, hours: Math.max(0, Number.isFinite(num) ? num : 0) } : x))
                    }}
                    className="col-span-4 rounded-lg border px-3 py-2" />
                  <button onClick={() => removeHelper(h.id)} aria-label="Entfernen" className="col-span-2 text-red-600">Entf.</button>
                </div>
              ))}
              {helpers.some(h => Number.isFinite(h.hours) && Math.floor(h.hours) !== h.hours) && (
                <div className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-md p-2">
                  Hinweis: Bruchteilstunden erkannt bei&nbsp;
                  {helpers
                    .filter(h => Number.isFinite(h.hours) && Math.floor(h.hours) !== h.hours)
                    .map(h => `${h.name || 'Aushilfe'} (${h.hours.toLocaleString('de-DE', { maximumFractionDigits: 2 })} h)`) 
                    .join(', ')}. Verteilung erfolgt proportional; Rundung auf Cent innerhalb der Gruppe.
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right column – Summary (sticky) + explanation + results */}
  <div className="space-y-6 md:pl-6 md:border-l md:border-gray-200">
          <div className="bg-white rounded-2xl shadow p-4 sticky top-4 self-start">
            <h3 className="text-lg font-medium mb-2">Zusammenfassung</h3>
            <p className="text-2xl font-semibold">{(results.appliedStaffPct*100).toFixed(1)}% Stamm / {(results.appliedHelperPct*100).toFixed(1)}% Aushilfen</p>
            <p className="text-sm text-gray-600 mt-2">Gesamt: <strong>{formatMoney(total)}</strong><br/>Stamm-Topf: <strong>{formatMoney(results.staffPot)}</strong> · Aushilfen-Topf: <strong>{formatMoney(results.helperPot)}</strong></p>
          </div>

          <div className="bg-white rounded-2xl shadow p-4">
            <h3 className="text-lg font-medium mb-2">Begründung</h3>
            <p className="text-sm whitespace-pre-wrap">{results.explanation}</p>
          </div>

          <div className="grid sm:grid-cols-2 gap-6">
            <div className="bg-white rounded-2xl shadow p-4">
              <h3 className="text-lg font-medium mb-3">Stammpersonal – Auszahlungen</h3>
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-gray-600">
                    <th className="py-1">Name</th>
                    <th className="py-1">Betrag</th>
                    <th className="py-1">% Gruppe</th>
                  </tr>
                </thead>
                <tbody>
                  {results.staffRows.map(r => (
                    <tr key={r.id} className="border-t">
                      <td className="py-1">{r.name || '—'}</td>
                      <td className="py-1">{formatMoney(r.amount)}</td>
                      <td className="py-1">{(r.percentOfGroup*100).toFixed(1)}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="bg-white rounded-2xl shadow p-4">
              <h3 className="text-lg font-medium mb-3">Aushilfen – Auszahlungen</h3>
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-gray-600">
                    <th className="py-1">Name</th>
                    <th className="py-1">Betrag</th>
                    <th className="py-1">% Gruppe</th>
                  </tr>
                </thead>
                <tbody>
                  {results.helperRows.map(r => (
                    <tr key={r.id} className="border-t">
                      <td className="py-1">{r.name || '—'}</td>
                      <td className="py-1">{formatMoney(r.amount)}</td>
                      <td className="py-1">{(r.percentOfGroup*100).toFixed(1)}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <footer className="text-xs text-gray-500">Hinweis: Referenz „voller Stamm‑Anteil (1,0)“ ist ggf. hypothetisch, falls niemand exakt 1,0 hat.</footer>
        </div>
      </div>

      {/* Mobile sticky summary sheet */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-40">
        <div className="mx-auto max-w-6xl">
          <div className="m-3 rounded-xl shadow-lg border border-gray-200 bg-white">
            <button
              className="w-full flex items-center justify-between px-4 py-3 text-left"
              onClick={() => setMobileSummaryOpen(v => !v)}
              aria-expanded={mobileSummaryOpen}
              aria-controls="mobile-summary-content"
            >
              <span className="font-medium">Zusammenfassung</span>
              <span className="text-sm text-gray-600">{(results.appliedStaffPct*100).toFixed(0)}% / {(results.appliedHelperPct*100).toFixed(0)}%</span>
            </button>
            <div id="mobile-summary-content" className={`${mobileSummaryOpen ? 'block' : 'hidden'} px-4 pb-4`}> 
              <div className="text-sm text-gray-700">
                <div className="flex justify-between py-1"><span>Gesamt</span><strong>{formatMoney(total)}</strong></div>
                <div className="flex justify-between py-1"><span>Stamm-Topf</span><strong>{formatMoney(results.staffPot)}</strong></div>
                <div className="flex justify-between py-1"><span>Aushilfen-Topf</span><strong>{formatMoney(results.helperPot)}</strong></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
