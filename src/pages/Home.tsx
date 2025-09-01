export default function Home() {
  return (
    <section>
      <div className="py-10">
        <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight mb-2">React Capabilities Showcase</h1>
        <p className="text-slate-600 dark:text-slate-300 mb-4">Explore themes, Suspense, transitions, portals, and more.</p>
        <div className="flex flex-wrap gap-3">
          <a className="inline-flex items-center justify-center rounded-md border border-transparent bg-indigo-600 text-white px-3 py-2 text-sm font-semibold shadow-sm hover:bg-indigo-500" href="/showcase">Open Showcase</a>
          <a className="inline-flex items-center justify-center rounded-md border px-3 py-2 text-sm hover:border-indigo-500" href="/about">Learn more</a>
        </div>
      </div>

      <div className="grid gap-4 grid-cols-[repeat(auto-fit,minmax(220px,1fr))]">
        <div className="rounded-xl border p-4 bg-white/60 dark:bg-white/5">
          <h3 className="font-semibold">Fast by default</h3>
          <p className="text-slate-600 dark:text-slate-300">Vite + React + TS with HMR for instant feedback.</p>
        </div>
        <div className="rounded-xl border p-4 bg-white/60 dark:bg-white/5">
          <h3 className="font-semibold">Modern React</h3>
          <p className="text-slate-600 dark:text-slate-300">Suspense, lazy, transitions and deferred values.</p>
        </div>
        <div className="rounded-xl border p-4 bg-white/60 dark:bg-white/5">
          <h3 className="font-semibold">Accessible</h3>
          <p className="text-slate-600 dark:text-slate-300">Keyboard-focus styles and semantic landmarks.</p>
        </div>
      </div>
    </section>
  );
}
