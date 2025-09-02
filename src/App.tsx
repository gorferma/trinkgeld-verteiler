import { useEffect, useMemo, useRef, useState } from 'react'

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

// Dark mode toggle with persistence
function getInitialTheme(): 'light' | 'dark' {
  const saved = typeof localStorage !== 'undefined' ? localStorage.getItem('tg_theme') : null
  if (saved === 'light' || saved === 'dark') return saved
  if (typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) return 'dark'
  return 'light'
}

function applyThemeClass(theme: 'light' | 'dark') {
  const root = document.documentElement
  if (theme === 'dark') root.classList.add('dark')
  else root.classList.remove('dark')
}

function DarkModeToggle() {
  const [theme, setTheme] = useState<'light' | 'dark'>(() => getInitialTheme())
  useEffect(() => {
    applyThemeClass(theme)
    localStorage.setItem('tg_theme', theme)
  }, [theme])
  // Sync with existing class on first mount (in case inline script already set it)
  useEffect(() => {
    const root = document.documentElement
    const hasDark = root.classList.contains('dark')
    if (hasDark && theme !== 'dark') setTheme('dark')
    if (!hasDark && theme !== 'light') setTheme('light')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  const isDark = theme === 'dark'
  return (
    <button
      type="button"
      className={`inline-flex items-center gap-2 px-2 py-1 rounded-md border text-xs bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-50 hover:dark:bg-gray-800 focus-ring`}
      aria-pressed={isDark}
      title="Dark Mode umschalten"
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
    >
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4">
        {isDark ? (
          <path d="M21.64 13a9 9 0 11-10.63-10.6 1 1 0 01.89 1.45A7 7 0 1019.9 12.1a1 1 0 011.45.9c0 .01 0 .01 0 0z"/>
        ) : (
          <path d="M6.76 4.84l-1.8-1.79-1.41 1.41 1.79 1.8 1.42-1.42zm10.45 0l1.79-1.79 1.41 1.41-1.79 1.8-1.41-1.42zM12 4a1 1 0 011-1h0a1 1 0 010 2 1 1 0 01-1-1zm0 16a1 1 0 011-1h0a1 1 0 010 2 1 1 0 01-1-1zM4 13a1 1 0 110-2 1 1 0 010 2zm16 0a1 1 0 110-2 1 1 0 010 2zM6.76 19.16l-1.42 1.42-1.79-1.8 1.41-1.41 1.8 1.79zm11.31 0l1.42 1.42 1.79-1.8-1.41-1.41-1.8 1.79zM12 8a4 4 0 100 8 4 4 0 000-8z"/>
        )}
      </svg>
      <span>{isDark ? 'Dunkel' : 'Hell'}</span>
    </button>
  )
}

// Shareable link helpers (base64url-encoded compact JSON)
function b64urlEncode(str: string) {
  const utf8 = encodeURIComponent(str).replace(/%([0-9A-F]{2})/g, (_, p) => String.fromCharCode(Number('0x' + p)))
  return btoa(utf8).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/,'')
}
function b64urlDecode(b64: string) {
  const pad = b64 + '==='.slice((b64.length + 3) % 4)
  const bin = atob(pad.replace(/-/g, '+').replace(/_/g, '/'))
  const percentEncoded = Array.from(bin, c => '%' + c.charCodeAt(0).toString(16).padStart(2, '0')).join('')
  return decodeURIComponent(percentEncoded)
}

type ShareState = {
  t: number
  w: { n: string; s: number }[]
  h: { n: string; u: number }[]
}

// Reusable hold-to-delete button: long-press to confirm on touch, confirm() fallback on click
function HoldToDeleteButton({ onConfirm, title = 'Zum Löschen gedrückt halten' }: { onConfirm: () => void; title?: string }) {
  const timerRef = useRef<number | null>(null)
  const [holding, setHolding] = useState(false)

  const clearTimer = () => {
    if (timerRef.current != null) {
      window.clearTimeout(timerRef.current)
      timerRef.current = null
    }
    setHolding(false)
  }

  const startHold = () => {
    if (timerRef.current != null) return
    setHolding(true)
    timerRef.current = window.setTimeout(() => {
      timerRef.current = null
      setHolding(false)
      onConfirm()
    }, 600)
  }

  return (
    <button
      type="button"
      aria-label="Entfernen"
      title={title}
      onPointerDown={startHold}
      onPointerUp={clearTimer}
      onPointerLeave={clearTimer}
      onPointerCancel={clearTimer}
      onClick={(e) => {
        // Desktop quick click: show confirm dialog
        if (!('ontouchstart' in window)) {
          e.preventDefault()
          if (window.confirm('Eintrag wirklich löschen?')) onConfirm()
        }
      }}
      className={`inline-flex items-center justify-center h-11 w-11 rounded border ${holding ? 'border-red-400 bg-red-50' : 'border-transparent'} text-red-600 hover:border-red-300`}
    >
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5">
        <path d="M9 3a1 1 0 00-1 1v1H5a1 1 0 000 2h14a1 1 0 100-2h-3V4a1 1 0 00-1-1H9zm9 6H6l1 11a2 2 0 002 2h6a2 2 0 002-2l1-11z"/>
      </svg>
    </button>
  )
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

  // Load state from URL (?s=...) once on mount
  useEffect(() => {
    try {
      const url = new URL(window.location.href)
      const s = url.searchParams.get('s')
      if (s) {
        const json = b64urlDecode(s)
        const data: ShareState = JSON.parse(json)
        if (typeof data.t === 'number' && Array.isArray(data.w) && Array.isArray(data.h)) {
          // apply total
          setTotal(Math.max(0, Number.isFinite(data.t) ? data.t : 0))
          setTotalInput((Math.max(0, Number.isFinite(data.t) ? data.t : 0)).toLocaleString('de-DE', { useGrouping: false, maximumFractionDigits: 2 }))
          // map staff (new ids)
          const mappedStaff: Staff[] = data.w.map(x => ({ id: uid(), name: x.n || '', share: Math.max(0, Math.min(1, Number.isFinite(x.s) ? x.s : 0)) }))
          setStaff(mappedStaff)
          setStaffShareInput(Object.fromEntries(mappedStaff.map(s => [s.id, toPercentString(s.share * 100)])))
          // map helpers
          const mappedHelpers: Helper[] = data.h.map(x => ({ id: uid(), name: x.n || '', hours: Math.max(0, Number.isFinite(x.u) ? x.u : 0) }))
          setHelpers(mappedHelpers)
          setHelperHoursInput(Object.fromEntries(mappedHelpers.map(h => [h.id, h.hours.toLocaleString('de-DE', { useGrouping: false, maximumFractionDigits: 2 })])))
        }
      }
    } catch (_) {
      // ignore invalid share params
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function buildShareUrl(): string {
    const state: ShareState = {
      t: total,
      w: staff.map(s => ({ n: s.name || '', s: Math.max(0, Math.min(1, isFinite(s.share) ? s.share : 0)) })),
      h: helpers.map(h => ({ n: h.name || '', u: Math.max(0, isFinite(h.hours) ? h.hours : 0) })),
    }
    const encoded = b64urlEncode(JSON.stringify(state))
    const url = new URL(window.location.href)
    url.searchParams.set('s', encoded)
    return url.toString()
  }

  async function copyShareLink() {
    const link = buildShareUrl()
    // Prefer native share if available
    if (navigator.share) {
      try {
        await navigator.share({ title: 'Trinkgeld-Verteiler', url: link })
        return
      } catch {
        // fall back to clipboard if user cancels or share fails
      }
    }
    try {
      await navigator.clipboard.writeText(link)
      setShareCopied(true)
      window.setTimeout(() => setShareCopied(false), 1500)
    } catch {
      window.prompt('Link kopieren:', link)
    }
    try { window.history.replaceState({}, '', link) } catch {}
  }

  const [shareCopied, setShareCopied] = useState(false)
  // Info tooltip toggles (mobile tap support)
  const [splitInfoOpen, setSplitInfoOpen] = useState(false)
  const [fractionalInfoOpen, setFractionalInfoOpen] = useState(false)

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

  // Mobile summary sheet removed
  // Collapsible info box state
  const [infoOpen, setInfoOpen] = useState(false)
  // One-time fractional hours hint dismissal (persisted)
  const [fractionalHintDismissed, setFractionalHintDismissed] = useState<boolean>(() => localStorage.getItem('tg_fractional_hint_dismissed') === '1')

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
  <div className="mx-auto max-w-6xl p-4 pb-28 md:pb-10 md:p-8">
      <div className="flex items-center justify-between mb-2">
        <h1 className="text-2xl md:text-3xl font-semibold">Trinkgeld-Verteiler</h1>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={copyShareLink}
            className="inline-flex items-center gap-1 rounded-md border px-2.5 py-1.5 text-sm bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-50 hover:dark:bg-gray-800 focus-ring"
            title="Link mit aktuellem Zustand kopieren"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4">
              <path d="M3 12a5 5 0 015-5h3a1 1 0 110 2H8a3 3 0 000 6h3a1 1 0 110 2H8a5 5 0 01-5-5zm8-1a1 1 0 011-1h4a5 5 0 010 10h-4a1 1 0 110-2h4a3 3 0 100-6h-4a1 1 0 01-1-1z"/>
            </svg>
            <span>Link teilen</span>
          </button>
          {shareCopied && <span className="text-xs text-green-600">Kopiert</span>}
          <DarkModeToggle />
        </div>
      </div>
      <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">Verteilt Trinkgeld zwischen Stammpersonal (proportional zu Anteilen) und Aushilfen (proportional zu Stunden). Automatische Anpassung des Splits, falls Aushilfen über 0,5× eines vollen Stamm-Anteils kämen.</p>

  <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
        {/* Left column – Inputs */}
        <div className="space-y-5">
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow p-4 border border-gray-200/70 dark:border-gray-800">
            <div className="flex items-center gap-2 mb-1">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4 text-gray-600"><path d="M12 3a9 9 0 100 18 1 1 0 110 2 11 11 0 110-22 1 1 0 010 2zm-5 8a1 1 0 100 2h6a3 3 0 010 6H8a1 1 0 110-2h5a1 1 0 100-2H7a3 3 0 010-6h6a1 1 0 110 2H7z"/></svg>
              <h2 className="text-lg font-medium">Gesamttopf</h2>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">EUR, Dezimal erlaubt</p>
            <label className="block text-sm font-medium mb-1" htmlFor="total">Betrag (EUR)</label>
            <div className="relative">
              <span aria-hidden className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-gray-500">€</span>
              <input id="total" type="text" inputMode="decimal" value={totalInput}
                aria-invalid={Number(total) === 0}
                aria-describedby={Number(total) === 0 ? 'total-hint' : undefined}
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
  className={`w-full h-11 rounded-lg border pl-7 pr-3 bg-white dark:bg-gray-900 focus-ring ${Number(total) === 0 ? 'border-red-300 focus:ring-red-400' : 'border-gray-300 dark:border-gray-700'}`} />
            </div>
            {Number(total) === 0 && (
              <p id="total-hint" className="mt-1 text-xs text-red-600">Bitte Betrag &gt; 0 eingeben.</p>
            )}
          </div>

      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow p-4 border border-gray-200/70 dark:border-gray-800">
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4 text-gray-600"><path d="M7 7a3 3 0 116 0 3 3 0 01-6 0zm8-1a2 2 0 114 0 2 2 0 01-4 0zM5 14a4 4 0 118 0v1H5v-1zm10-1h4a3 3 0 013 3v1h-7v-1a4 4 0 00-3-3z"/></svg>
                <h2 className="text-lg font-medium">Stammpersonal</h2>
              </div>
              <button onClick={addStaff} className="inline-flex items-center justify-center h-11 px-3 rounded-lg bg-emerald-600 text-white">+ Hinzufügen</button>
            </div>
      <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">Anteile in %, 0–100 je Person (Summe beliebig)</p>
            <div className="space-y-2">
              {staff.map(s => (
                <div key={s.id} className="grid grid-cols-12 gap-2 items-center">
                  <input aria-label="Name" placeholder="Name" value={s.name}
                    onChange={e => setStaff(prev => prev.map(x => x.id===s.id? {...x, name: e.target.value}: x))}
        className="col-span-6 h-11 rounded-lg border px-3 bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-700 focus-ring" />
                  <div className="col-span-4 relative group">
                    {(() => {
                      const shareStr = staffShareInput[s.id] ?? toPercentString(s.share * 100)
                      const shareVal = Number((shareStr === '' || shareStr === '.' || shareStr === ',') ? '0' : shareStr.replace(',', '.'))
                      const tooHigh = shareVal > 100
                      return (
                        <>
                          <input aria-label="Anteil (%)" placeholder="0" type="text" inputMode="decimal" value={shareStr}
                            aria-invalid={tooHigh}
                            aria-describedby={tooHigh ? `share-hint-${s.id}` : undefined}
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
              className={`w-full h-11 rounded-lg border pl-3 pr-12 md:pr-20 bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-700 focus-ring ${tooHigh ? 'border-red-300 focus:outline-none focus:ring-2 focus:ring-red-400' : ''}`} />
                          {tooHigh && (
                            <p id={`share-hint-${s.id}`} className="mt-1 text-[11px] text-red-600">Max. 100 %</p>
                          )}
                        </>
                      )
                    })()}
                    <span aria-hidden className="pointer-events-none absolute right-3 md:right-10 top-1/2 -translate-y-1/2 text-gray-600">%</span>
                    <div className="absolute right-2 top-1/2 -translate-y-1/2 z-10 hidden md:grid grid-rows-2 gap-0.5 md:opacity-0 md:group-hover:opacity-100 md:group-focus-within:opacity-100 transition">
                      <button type="button" aria-label="+1%" title="+1%"
            className="h-11 w-11 md:h-5 md:w-5 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 leading-none hover:bg-gray-50 hover:dark:bg-gray-700 text-base md:text-xs shadow-sm md:shadow-none"
                        onClick={() => {
                          const curStr = staffShareInput[s.id] ?? toPercentString(s.share * 100)
                          const cur = Number((curStr === '' || curStr === '.' || curStr === ',') ? '0' : curStr.replace(',', '.'))
                          const next = Math.min(100, Math.max(0, Math.round((cur + 1) * 100) / 100))
                          const out = next.toLocaleString('de-DE', { useGrouping: false, maximumFractionDigits: 2 })
                          setStaffShareInput(m => ({ ...m, [s.id]: out }))
                          setStaff(prev => prev.map(x => x.id===s.id? { ...x, share: Math.max(0, Math.min(1, next/100)) } : x))
                        }}>+</button>
                      <button type="button" aria-label="-1%" title="-1%"
                        className="h-11 w-11 md:h-5 md:w-5 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 leading-none hover:bg-gray-50 hover:dark:bg-gray-700 text-base md:text-xs shadow-sm md:shadow-none"
                        onClick={() => {
                          const curStr = staffShareInput[s.id] ?? toPercentString(s.share * 100)
                          const cur = Number((curStr === '' || curStr === '.' || curStr === ',') ? '0' : curStr.replace(',', '.'))
                          const next = Math.min(100, Math.max(0, Math.round((cur - 1) * 100) / 100))
                          const out = next.toLocaleString('de-DE', { useGrouping: false, maximumFractionDigits: 2 })
                          setStaffShareInput(m => ({ ...m, [s.id]: out }))
                          setStaff(prev => prev.map(x => x.id===s.id? { ...x, share: Math.max(0, Math.min(1, next/100)) } : x))
                        }}>−</button>
                    </div>
                  </div>
                  <div className="col-span-2 flex justify-end ml-2">
                    <HoldToDeleteButton onConfirm={() => removeStaff(s.id)} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow p-4 border border-gray-200/70 dark:border-gray-800">
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4 text-gray-600"><path d="M12 6a3 3 0 110 6 3 3 0 010-6zm6 10a4 4 0 00-8 0v1h8v-1zM6 10a2 2 0 110-4 2 2 0 010 4zM3 17a3 3 0 013-3h1a5 5 0 00-2 4v1H3v-2z"/></svg>
                <h2 className="text-lg font-medium">Aushilfen</h2>
              </div>
              <button onClick={addHelper} className="inline-flex items-center justify-center h-10 md:h-11 px-3 rounded-lg bg-emerald-600 text-white text-sm md:text-base">+ Hinzufügen</button>
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400 mb-2 flex items-center gap-2">
              <span>Stunden (Dezimal erlaubt)</span>
              <button
                type="button"
                className="relative inline-flex items-center group"
                aria-label="Info zu Bruchteilstunden"
                aria-expanded={fractionalInfoOpen}
                onClick={() => setFractionalInfoOpen(v => !v)}
                onBlur={() => setFractionalInfoOpen(false)}
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4 text-gray-500">
                  <path d="M12 2a10 10 0 100 20 10 10 0 000-20zm.75 5.5a.75.75 0 11-1.5 0 .75.75 0 011.5 0zM11 10h1a1 1 0 011 1v5a1 1 0 11-2 0v-4h-.25a1 1 0 110-2H11z"/>
                </svg>
                <span className={`${fractionalInfoOpen ? 'opacity-100' : 'opacity-0'} absolute bottom-full mb-1 left-1/2 -translate-x-1/2 whitespace-nowrap rounded bg-gray-800 text-white text-[10px] px-2 py-1 group-hover:opacity-100 pointer-events-none shadow`}>
                  Bruchteilstunden erlaubt (z. B. 3,25). Verteilung proportional; Rundung auf Cent.
                </span>
              </button>
            </div>
            <div className="space-y-2">
              {helpers.map(h => (
                <div key={h.id} className="grid grid-cols-12 gap-2 items-center">
                  <input aria-label="Name" placeholder="Name" value={h.name}
                    onChange={e => setHelpers(prev => prev.map(x => x.id===h.id? {...x, name: e.target.value}: x))}
                    className="col-span-6 h-11 rounded-lg border px-3 bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-700 focus-ring" />
                  <div className="col-span-4 relative group">
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
                      className="w-full h-11 rounded-lg border pl-3 pr-12 md:pr-24 bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-700 focus-ring" />
                    <span aria-hidden className="pointer-events-none absolute right-3 md:right-12 top-1/2 -translate-y-1/2 text-gray-600">std.</span>
                    <div className="absolute right-2 top-1/2 -translate-y-1/2 z-10 hidden md:grid grid-rows-2 gap-0.5 md:opacity-0 md:group-hover:opacity-100 md:group-focus-within:opacity-100 transition">
                      <button type="button" aria-label="+0,25 h" title="+0,25 h"
                        className="h-11 w-11 md:h-5 md:w-5 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 leading-none hover:bg-gray-50 hover:dark:bg-gray-700 text-base md:text-xs"
                        onClick={() => {
                          const curStr = helperHoursInput[h.id] ?? String(h.hours)
                          const cur = Number((curStr === '' || curStr === '.' || curStr === ',') ? '0' : curStr.replace(',', '.'))
                          const next = Math.max(0, Math.round((cur + 0.25) * 100) / 100)
                          const out = next.toLocaleString('de-DE', { useGrouping: false, maximumFractionDigits: 2 })
                          setHelperHoursInput(m => ({ ...m, [h.id]: out }))
                          setHelpers(prev => prev.map(x => x.id===h.id? { ...x, hours: next } : x))
                        }}>+</button>
                      <button type="button" aria-label="-0,25 h" title="-0,25 h"
                        className="h-11 w-11 md:h-5 md:w-5 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 leading-none hover:bg-gray-50 hover:dark:bg-gray-700 text-base md:text-xs"
                        onClick={() => {
                          const curStr = helperHoursInput[h.id] ?? String(h.hours)
                          const cur = Number((curStr === '' || curStr === '.' || curStr === ',') ? '0' : curStr.replace(',', '.'))
                          const next = Math.max(0, Math.round((cur - 0.25) * 100) / 100)
                          const out = next.toLocaleString('de-DE', { useGrouping: false, maximumFractionDigits: 2 })
                          setHelperHoursInput(m => ({ ...m, [h.id]: out }))
                          setHelpers(prev => prev.map(x => x.id===h.id? { ...x, hours: next } : x))
                        }}>−</button>
                    </div>
                  </div>
                  <div className="col-span-2 flex justify-end ml-2">
                    <HoldToDeleteButton onConfirm={() => removeHelper(h.id)} />
                  </div>
                </div>
              ))}
              {helpers.some(h => Number.isFinite(h.hours) && Math.floor(h.hours) !== h.hours) && !fractionalHintDismissed && (
                <div className="mt-1 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-md p-2 flex items-start justify-between gap-2">
                  <span>Hinweis: Bruchteilstunden erkannt. Verteilung proportional; Rundung auf Cent.</span>
                  <button
                    type="button"
                    aria-label="Hinweis ausblenden"
                    className="text-amber-700/70 hover:text-amber-800"
                    onClick={() => { setFractionalHintDismissed(true); localStorage.setItem('tg_fractional_hint_dismissed', '1') }}
                  >
                    ×
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right column – Summary (sticky) + explanation + results */}
  <div className="space-y-6 md:pl-6 md:border-l md:border-gray-200 dark:md:border-gray-800">
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow p-4 sticky top-4 self-start border border-gray-200/70 dark:border-gray-800">
            <h3 className="text-lg font-medium mb-2">Zusammenfassung</h3>
            <div className="text-2xl font-semibold flex items-center gap-2">
              <span>{(results.appliedStaffPct*100).toFixed(1)}% Stamm / {(results.appliedHelperPct*100).toFixed(1)}% Aushilfen</span>
              <button
                type="button"
                className="relative inline-flex items-center group align-middle"
                aria-label="Info zum Split"
                aria-expanded={splitInfoOpen}
                onClick={() => setSplitInfoOpen(v => !v)}
                onBlur={() => setSplitInfoOpen(false)}
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5 text-gray-500">
                  <path d="M12 2a10 10 0 100 20 10 10 0 000-20zm.75 5.5a.75.75 0 11-1.5 0 .75.75 0 011.5 0zM11 10h1a1 1 0 011 1v5a1 1 0 11-2 0v-4h-.25a1 1 0 110-2H11z"/>
                </svg>
                <span className={`${splitInfoOpen ? 'opacity-100' : 'opacity-0'} absolute bottom-full mb-1 left-1/2 -translate-x-1/2 whitespace-nowrap rounded bg-gray-800 text-white text-[10px] px-2 py-1 group-hover:opacity-100 pointer-events-none shadow max-w-[18rem] text-center`}>
                  Schutzregel: Die bestbezahlte Aushilfe darf höchstens die Hälfte eines vollen Stamm‑Anteils erhalten.
                </span>
              </button>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-300 mt-2">Gesamt: <strong>{formatMoney(total)}</strong><br/>Stamm-Topf: <strong>{formatMoney(results.staffPot)}</strong> · Aushilfen-Topf: <strong>{formatMoney(results.helperPot)}</strong></p>
          </div>

          <div className="grid sm:grid-cols-2 gap-6">
            <div className="bg-white dark:bg-gray-900 rounded-2xl shadow p-4 border border-gray-200/70 dark:border-gray-800">
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
            <div className="bg-white dark:bg-gray-900 rounded-2xl shadow p-4 border border-gray-200/70 dark:border-gray-800">
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

          <footer className="text-xs text-gray-500 dark:text-gray-400">
            Hinweis: Referenz „voller Stamm‑Anteil (1,0)“ ist ggf. hypothetisch.
          </footer>

          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow p-4 border border-gray-200/70 dark:border-gray-800">
            <h3 className="text-lg font-medium mb-2">Begründung</h3>
            <p className="text-sm whitespace-pre-wrap">{results.explanation}</p>
          </div>

          {/* Collapsible info box at very bottom */}
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow border border-gray-200 dark:border-gray-800">
            <button
              className="w-full flex items-center justify-between px-4 py-3 text-left"
              onClick={() => setInfoOpen(v => !v)}
              aria-expanded={infoOpen}
              aria-controls="info-content"
            >
              <span className="text-lg font-medium">So funktioniert’s</span>
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={`h-5 w-5 transition-transform ${infoOpen ? 'rotate-180' : ''}`}>
                <path d="M12 15l-7-7h14z"/>
              </svg>
            </button>
            <div id="info-content" className={`${infoOpen ? 'block' : 'hidden'} px-4 pb-4`}>
              <div className="text-sm space-y-2">
                <p><strong>So verteilen wir das Trinkgeld</strong></p>
                <p>
                  <strong>Grundaufteilung:</strong><br/>
                  Wir starten immer mit 80 % für das Stammpersonal und 20 % für die Aushilfen.
                </p>
                <p><strong>Verteilung innerhalb der Gruppen:</strong></p>
                <p>
                  <em>Stammpersonal:</em> Das Geld wird nach Anteilen verteilt. Wer z. B. 1,0 Anteil hat, bekommt doppelt so viel wie jemand mit 0,5 Anteil.
                </p>
                <p>
                  <em>Aushilfen:</em> Das Geld wird nach geleisteten Stunden verteilt. Mehr Stunden = größerer Anteil.
                </p>
                <p>
                  <strong>Fairness-Check (Schutzregel):</strong><br/>
                  Niemand von den Aushilfen soll mehr als die Hälfte von dem bekommen, was ein Stammpersonal-Mitglied mit vollem Anteil (1,0) erhält.
                </p>
                <p>
                  Falls das bei der 80/20-Verteilung passieren würde, schieben wir den Split (nur zwischen den Gruppen!) zugunsten des Stammpersonals, bis die bestbezahlte Aushilfe genau die Hälfte dessen bekommt, was ein „voller Anteil“ im Stamm wert ist.
                </p>
                <p><strong>Wichtig:</strong> Die Verhältnisse innerhalb der Gruppen bleiben gleich (Stamm weiter nach Anteilen, Aushilfen weiter nach Stunden).</p>
                <p><strong>Sonderfälle:</strong></p>
                <ul className="list-disc pl-5 space-y-1">
                  <li>Keine Aushilfen erfasst? Dann gehen 100 % an das Stammpersonal.</li>
                  <li>Kein Stammpersonal erfasst? Dann gehen 100 % an die Aushilfen.</li>
                </ul>
                <p>
                  <strong>Rundung:</strong><br/>
                  Alle Beträge werden auf Cent gerundet. Dabei achten wir darauf, dass die Summe exakt dem Topf entspricht (faire Cent-Verteilung).
                </p>
                <p>
                  <strong>Transparenz in der App:</strong><br/>
                  Wir zeigen immer den angewandten Split (z. B. „86,4 % / 13,6 %“) und – falls angepasst – wer den Schutz ausgelöst hat (Name der Aushilfe), wieviel drüber es bei 80/20 gewesen wäre und warum wir verschoben haben.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
