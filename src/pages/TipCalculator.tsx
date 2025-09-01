import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'

type Helper = { id: string; name: string; hours: number }
type Staff = { id: string; name: string; percent: number }

export default function TipCalculator() {
  const [totalTipInput, setTotalTipInput] = useState<string>('')
  const [helpers, setHelpers] = useState<Helper[]>([
    { id: crypto.randomUUID(), name: 'Anna', hours: 5 },
    { id: crypto.randomUUID(), name: 'Ben', hours: 3 },
  ])
  const [staff, setStaff] = useState<Staff[]>([
    { id: crypto.randomUUID(), name: 'Max', percent: 100 },
    { id: crypto.randomUUID(), name: 'Eva', percent: 50 },
  ])

  const totalTip = parseLocaleNumber(totalTipInput)

  const result = useMemo(() => computePayout(totalTip, helpers, staff), [totalTip, helpers, staff])

  return (
    <section className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl sm:text-3xl font-extrabold">Trinkgeld-Rechner</h1>
        <Link to="/" className="text-sm underline">Zurück</Link>
      </div>

      <div className="grid gap-6 md:grid-cols-4">
        <div className="rounded-xl border p-4 md:col-span-1">
          <label className="block text-sm font-medium mb-1" htmlFor="total">Trinkgeld gesamt (EUR)</label>
          <input
            id="total"
            className="w-full rounded-md border px-3 py-2 bg-white/80 dark:bg-white/5"
            inputMode="decimal"
            placeholder="z.B. 250,00"
            value={totalTipInput}
            onChange={(e) => setTotalTipInput(e.target.value)}
          />

          <div className="mt-4 text-sm text-slate-600 dark:text-slate-300">
            <div>Stammpersonal (50%): <strong>{fmtCurrency(result.staffAmount)}</strong></div>
            <div>Aushilfen gesamt (50%): <strong>{fmtCurrency(result.helpersTotal)}</strong></div>
            <div className="text-xs mt-1">Stunden gesamt: {result.totalHours}</div>
          </div>
        </div>

        <div className="rounded-xl border p-4 md:col-span-1">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold">Stammpersonal</h2>
            <button
              className="inline-flex items-center rounded-md border px-3 py-1.5 text-sm hover:border-indigo-500"
              onClick={() => setStaff((s) => [...s, { id: crypto.randomUUID(), name: '', percent: 0 }])}
            >+ Hinzufügen</button>
          </div>

          <div className="grid grid-cols-12 gap-2 text-sm font-medium text-slate-500 dark:text-slate-400">
            <div className="col-span-5">Name</div>
            <div className="col-span-3">Prozent</div>
            <div className="col-span-3">Auszahlung</div>
            <div className="col-span-1"></div>
          </div>
          <div className="divide-y">
            {staff.map((s) => (
              <div key={s.id} className="grid grid-cols-12 items-center gap-2 py-2">
                <input
                  className="col-span-5 rounded-md border px-3 py-2 bg-white/80 dark:bg-white/5"
                  placeholder="Name"
                  value={s.name}
                  onChange={(e) => setStaff((arr) => arr.map((x) => x.id === s.id ? { ...x, name: e.target.value } : x))}
                />
                <input
                  className="col-span-3 rounded-md border px-3 py-2 bg-white/80 dark:bg-white/5"
                  type="number"
                  step="0.1"
                  min="0"
                  value={Number.isFinite(s.percent) ? s.percent : ''}
                  onChange={(e) => setStaff((arr) => arr.map((x) => x.id === s.id ? { ...x, percent: clampNonNegative(parseFloat(e.target.value)) } : x))}
                />
                <div className="col-span-3 text-sm">{fmtCurrency(result.perStaff[s.id] ?? 0)}</div>
                <button
                  aria-label="Entfernen"
                  className="col-span-1 inline-flex items-center justify-center rounded-md border px-2 py-2 text-sm hover:border-red-500"
                  onClick={() => setStaff((arr) => arr.filter((x) => x.id !== s.id))}
                >✕</button>
              </div>
            ))}
          </div>

          {staff.length === 0 && (
            <div className="text-sm text-slate-500 mt-2">Füge Stammpersonal hinzu oder lasse die Liste leer.</div>
          )}
        </div>

        <div className="rounded-xl border p-4 md:col-span-2">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold">Aushilfen</h2>
            <button
              className="inline-flex items-center rounded-md border px-3 py-1.5 text-sm hover:border-indigo-500"
              onClick={() => setHelpers((h) => [...h, { id: crypto.randomUUID(), name: '', hours: 0 }])}
            >+ Hinzufügen</button>
          </div>

          <div className="grid grid-cols-12 gap-2 text-sm font-medium text-slate-500 dark:text-slate-400">
            <div className="col-span-5">Name</div>
            <div className="col-span-3">Stunden</div>
            <div className="col-span-3">Auszahlung</div>
            <div className="col-span-1"></div>
          </div>
          <div className="divide-y">
            {helpers.map((h, idx) => (
              <div key={h.id} className="grid grid-cols-12 items-center gap-2 py-2">
                <input
                  className="col-span-5 rounded-md border px-3 py-2 bg-white/80 dark:bg-white/5"
                  placeholder={`Name #${idx + 1}`}
                  value={h.name}
                  onChange={(e) => setHelpers((arr) => arr.map((x) => x.id === h.id ? { ...x, name: e.target.value } : x))}
                />
                <input
                  className="col-span-3 rounded-md border px-3 py-2 bg-white/80 dark:bg-white/5"
                  type="number"
                  step="0.25"
                  min="0"
                  value={Number.isFinite(h.hours) ? h.hours : ''}
                  onChange={(e) => setHelpers((arr) => arr.map((x) => x.id === h.id ? { ...x, hours: clampNonNegative(parseFloat(e.target.value)) } : x))}
                />
                <div className="col-span-3 text-sm">{fmtCurrency(result.perHelper[h.id] ?? 0)}</div>
                <button
                  aria-label="Entfernen"
                  className="col-span-1 inline-flex items-center justify-center rounded-md border px-2 py-2 text-sm hover:border-red-500"
                  onClick={() => setHelpers((arr) => arr.filter((x) => x.id !== h.id))}
                >✕</button>
              </div>
            ))}
          </div>

          {helpers.length === 0 && (
            <div className="text-sm text-slate-500 mt-2">Füge Aushilfen hinzu, um die Auszahlung zu berechnen.</div>
          )}
        </div>
      </div>

      <div className="rounded-xl border p-4">
        <h2 className="font-semibold mb-2">Ergebnis</h2>
        <div className="grid gap-3 md:grid-cols-2">
          <div className="rounded-lg border p-3 bg-white/60 dark:bg-white/5">
            <div className="text-sm text-slate-500">Stammpersonal</div>
            <div className="text-2xl font-extrabold">{fmtCurrency(result.staffAmount)}</div>
          </div>
          <div className="rounded-lg border p-3 bg-white/60 dark:bg-white/5">
            <div className="text-sm text-slate-500">Aushilfen gesamt</div>
            <div className="text-2xl font-extrabold">{fmtCurrency(result.helpersTotal)}</div>
          </div>
        </div>

        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left text-slate-500">
                  <th className="py-1 pr-3">Stamm: Name</th>
                  <th className="py-1 pr-3">Prozent</th>
                  <th className="py-1 pr-3">Anteil</th>
                </tr>
              </thead>
              <tbody>
                {staff.map((s) => (
                  <tr key={s.id} className="border-t">
                    <td className="py-1 pr-3">{s.name || '—'}</td>
                    <td className="py-1 pr-3">{Number.isFinite(s.percent) ? s.percent : 0}%</td>
                    <td className="py-1 pr-3">{fmtCurrency(result.perStaff[s.id] ?? 0)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left text-slate-500">
                  <th className="py-1 pr-3">Aushilfe: Name</th>
                  <th className="py-1 pr-3">Stunden</th>
                  <th className="py-1 pr-3">Anteil</th>
                </tr>
              </thead>
              <tbody>
                {helpers.map((h) => (
                  <tr key={h.id} className="border-t">
                    <td className="py-1 pr-3">{h.name || '—'}</td>
                    <td className="py-1 pr-3">{Number.isFinite(h.hours) ? h.hours : 0}</td>
                    <td className="py-1 pr-3">{fmtCurrency(result.perHelper[h.id] ?? 0)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="mt-2 text-xs text-slate-500">
          Hinweis: 50% gehen an das Stammpersonal und werden nach Prozent-Anteilen (100% = 1 Anteil) verteilt. Die restlichen 50% gehen proportional nach Stunden an die Aushilfen. Alle Beträge werden rundungsgenau verteilt.
        </div>
      </div>
    </section>
  )
}

function parseLocaleNumber(v: string): number {
  if (!v) return 0
  // Allow inputs like "250,50" or "250.50"
  const normalized = v.replace(/\./g, '').replace(/,/g, '.')
  const n = parseFloat(normalized)
  return Number.isFinite(n) ? n : 0
}

function clampNonNegative(n: number) {
  if (!Number.isFinite(n) || n < 0) return 0
  return n
}

function computePayout(totalTip: number, helpers: Helper[], staff: Staff[]) {
  const total = Math.max(0, totalTip)
  const staffAmount = round2(total * 0.5)
  const helpersPool = round2(total * 0.5)

  const clean = helpers.map((h) => ({ ...h, hours: Math.max(0, Number(h.hours) || 0) }))
  const totalHours = clean.reduce((s, h) => s + h.hours, 0)

  const perHelper: Record<string, number> = {}
  const perStaff: Record<string, number> = {}

  // Staff distribution by percentage shares (100% = 1 share)
  const staffCents = Math.round(staffAmount * 100)
  const cleanStaff = staff.map((s) => ({ ...s, percent: Math.max(0, Number(s.percent) || 0) }))
  const shareWeights = cleanStaff.map((s) => ({ id: s.id, weight: s.percent / 100 }))
  const shareSum = shareWeights.reduce((sum, w) => sum + w.weight, 0)
  if (staffCents === 0 || shareSum === 0) {
    cleanStaff.forEach((s) => { perStaff[s.id] = 0 })
  } else {
    const provisional = shareWeights.map((w) => {
      const exact = (w.weight / shareSum) * staffCents
      const base = Math.floor(exact)
      const frac = exact - base
      return { id: w.id, base, frac }
    })
    const baseSum = provisional.reduce((s, x) => s + x.base, 0)
    let remainder = staffCents - baseSum
    provisional.sort((a, b) => b.frac - a.frac)
    for (let i = 0; i < provisional.length && remainder > 0; i++, remainder--) {
      provisional[i].base += 1
    }
    provisional.forEach((p) => { perStaff[p.id] = p.base / 100 })
  }
  if (helpersPool === 0 || totalHours === 0) {
    clean.forEach((h) => { perHelper[h.id] = 0 })
    return { staffAmount, helpersTotal: helpersPool, totalHours, perHelper, perStaff }
  }

  // Work in cents for precise fair rounding
  const poolCents = Math.round(helpersPool * 100)
  const weights = clean.map((h) => ({ id: h.id, weight: h.hours }))
  const weightSum = weights.reduce((s, w) => s + w.weight, 0)

  const provisional = weights.map((w) => {
    const exact = (w.weight / weightSum) * poolCents
    const base = Math.floor(exact)
    const frac = exact - base
    return { id: w.id, base, frac }
  })
  const baseSum = provisional.reduce((s, x) => s + x.base, 0)
  let remainder = poolCents - baseSum
  provisional.sort((a, b) => b.frac - a.frac)
  for (let i = 0; i < provisional.length && remainder > 0; i++, remainder--) {
    provisional[i].base += 1
  }
  provisional.forEach((p) => { perHelper[p.id] = p.base / 100 })

  return { staffAmount, helpersTotal: helpersPool, totalHours, perHelper, perStaff }
}

function round2(n: number) {
  return Math.round(n * 100) / 100
}

function fmtCurrency(n: number) {
  return new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(n || 0)
}
