import { Suspense, lazy, memo, useDeferredValue, useMemo, useState, useTransition } from 'react'
import { ErrorBoundary } from '../components/ErrorBoundary'
import Modal from '../components/Modal'
import { useTheme } from '../context/ThemeContext'

// Lazy component to demonstrate code-splitting
const LazyHello = lazy(() => import('./_lazy.tsx'))

const ExpensiveList = memo(function ExpensiveList({ count }: { count: number }) {
  // simulate expensive computation
  const items = useMemo(() => {
    const arr = Array.from({ length: 5000 }, (_, i) => i + count)
    return arr.map((n) => n * Math.sqrt(n)).slice(0, 100)
  }, [count])
  return (
    <ul>
      {items.slice(0, 10).map((n) => (
        <li key={n}>{Math.round(n)}</li>
      ))}
    </ul>
  )
})

function BuggyComponent() {
  throw new Error('Boom! Demonstrating ErrorBoundary')
  // eslint-disable-next-line no-unreachable
  return null
}

export default function Showcase() {
  const { theme, toggle } = useTheme()
  const [open, setOpen] = useState(false)
  const [input, setInput] = useState('')
  const deferred = useDeferredValue(input)
  const [count, setCount] = useState(0)
  const [isPending, startTransition] = useTransition()

  const handleType = (v: string) => {
    setInput(v)
    startTransition(() => setCount((c) => c + 1))
  }

  return (
    <section className="space-y-6">
      <div>
        <h1 className="text-3xl font-extrabold">React Capabilities Showcase</h1>
        <p className="text-slate-600 dark:text-slate-300">Theme: <strong>{theme}</strong></p>
        <button className="mt-2 inline-flex items-center rounded-md border px-3 py-1.5 text-sm hover:border-indigo-500" onClick={toggle}>Toggle Theme</button>
      </div>

  <h3 className="text-xl font-semibold">Suspense + lazy()</h3>
  <Suspense fallback={<p className="text-slate-600 dark:text-slate-300">Loading lazy component…</p>}>
        <LazyHello />
      </Suspense>

  <h3 className="text-xl font-semibold">useTransition for responsive updates</h3>
  <button className="inline-flex items-center rounded-md border px-3 py-1.5 text-sm hover:border-indigo-500" onClick={() => handleType(input + 'x')}>Type (simulated)</button>
  {isPending && <span className="ml-2 text-indigo-500"> Updating…</span>}
      <ExpensiveList count={count} />

      <h3 className="text-xl font-semibold">useDeferredValue</h3>
      <input
        className="rounded-md border px-3 py-2 w-60 bg-white/80 dark:bg-white/5"
        placeholder="Type here"
        value={input}
        onChange={(e) => setInput(e.target.value)}
      />
      <p className="text-slate-600 dark:text-slate-300">Deferred: {deferred}</p>

      <h3 className="text-xl font-semibold">Portals (Modal)</h3>
  <button className="inline-flex items-center rounded-md border px-3 py-1.5 text-sm hover:border-indigo-500" onClick={() => setOpen(true)}>Open Modal</button>
      <Modal open={open} onClose={() => setOpen(false)}>
        <h4>Hello from a Portal</h4>
        <p>This content is rendered outside of the main DOM tree.</p>
  <button className="mt-2 inline-flex items-center rounded-md border px-3 py-1.5 text-sm hover:border-indigo-500" onClick={() => setOpen(false)}>Close</button>
      </Modal>

  <h3 className="text-xl font-semibold">Error Boundaries</h3>
  <ErrorBoundary fallback={(err) => <p className="text-red-600" role="alert">Caught: {err.message}</p>}>
        <BuggyComponent />
      </ErrorBoundary>
    </section>
  )
}
