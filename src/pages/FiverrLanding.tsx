import { Link } from 'react-router-dom'
import { type ReactNode } from 'react'

export default function FiverrLanding() {
  return (
    <div>
      {/* Hero */}
      <section className="relative">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:py-20">
          <div className="flex flex-col items-start gap-6 sm:gap-8">
            <span className="inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium text-slate-600 dark:text-slate-300">
              React + TypeScript • Tailwind • Vite • Router • DX focused
            </span>
            <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight">
              I build fast, modern React apps that convert.
            </h1>
            <p className="max-w-2xl text-base sm:text-lg text-slate-600 dark:text-slate-300">
              Get a polished landing page or full SPA with blazing performance, solid UX, and clean code. Built with React 19, TypeScript, Tailwind, and best practices.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link to="/contact" className="inline-flex items-center rounded-md border border-transparent bg-indigo-600 px-4 py-2 text-white hover:bg-indigo-500">
                Get a quote
              </Link>
              <Link to="/showcase" className="inline-flex items-center rounded-md border px-4 py-2 hover:border-indigo-500">
                See live demo
              </Link>
            </div>
            <div className="mt-4 flex flex-wrap gap-2 text-xs text-slate-500 dark:text-slate-400">
              <Badge>Performance</Badge>
              <Badge>SEO-ready</Badge>
              <Badge>Responsive</Badge>
              <Badge>Accessible</Badge>
              <Badge>Maintainable</Badge>
            </div>
          </div>
        </div>
      </section>

      {/* Services */}
      <section className="mx-auto max-w-6xl px-4 py-12 sm:py-16">
        <h2 className="text-2xl sm:text-3xl font-bold mb-6">What I deliver</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Feature title="Landing pages that convert" desc="Hero sections, CTAs, social proof, and analytics-ready." />
          <Feature title="Design systems with Tailwind" desc="Consistent, responsive UI with dark mode out of the box." />
          <Feature title="React Router apps" desc="Clean routing, nested layouts, and code-splitting." />
          <Feature title="API integrations" desc="REST/GraphQL, auth flows, forms, and validation." />
          <Feature title="Quality and performance" desc="Lighthouse-friendly, a11y-first, and testable code." />
          <Feature title="Deployments" desc="Vercel/Netlify/Static builds with CI-ready configs." />
        </div>
      </section>

      {/* Process */}
      <section className="bg-black/5 dark:bg-white/5">
        <div className="mx-auto max-w-6xl px-4 py-12 sm:py-16">
          <h2 className="text-2xl sm:text-3xl font-bold mb-6">Simple process</h2>
          <ol className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Step n={1} title="Discover" desc="We align on goals, scope, and success criteria." />
            <Step n={2} title="Design" desc="Wireframe fast, pick a style, define components." />
            <Step n={3} title="Build" desc="Ship incremental features with live previews." />
            <Step n={4} title="Iterate" desc="Polish, test, and launch with confidence." />
          </ol>
        </div>
      </section>

      {/* Pricing */}
      <section className="mx-auto max-w-6xl px-4 py-12 sm:py-16">
        <h2 className="text-2xl sm:text-3xl font-bold mb-6">Transparent pricing</h2>
        <div className="grid gap-4 md:grid-cols-3">
          <PricingCard
            name="Starter"
            price="$299"
            highlight={false}
            features={[
              '1-page landing',
              'Responsive + dark mode',
              'Contact CTA + basic analytics',
              'Delivery in 3 days',
            ]}
          />
          <PricingCard
            name="Pro"
            price="$699"
            highlight
            features={[
              'Multi-section landing',
              'Custom components + animations',
              'Blog or portfolio section',
              'Delivery in 5–7 days',
            ]}
          />
          <PricingCard
            name="Premium"
            price="$1299+"
            highlight={false}
            features={[
              'Full SPA w/ routing',
              'API integration + auth',
              'Testing + CI-ready',
              'Delivery timeframe by scope',
            ]}
          />
        </div>
        <div className="mt-6">
          <Link to="/contact" className="inline-flex items-center rounded-md border border-transparent bg-indigo-600 px-4 py-2 text-white hover:bg-indigo-500">
            Let’s talk about your project
          </Link>
        </div>
      </section>

      {/* Testimonials */}
      <section className="bg-black/5 dark:bg-white/5">
        <div className="mx-auto max-w-6xl px-4 py-12 sm:py-16">
          <h2 className="text-2xl sm:text-3xl font-bold mb-6">What clients say</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <Testimonial
              quote="Delivered ahead of schedule with great attention to detail. The site is fast and looks fantastic."
              name="Alex R."
            />
            <Testimonial
              quote="Super smooth process and excellent communication. Loved the code quality."
              name="Mina K."
            />
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="mx-auto max-w-6xl px-4 py-12 sm:py-16">
        <h2 className="text-2xl sm:text-3xl font-bold mb-6">FAQ</h2>
        <div className="space-y-4">
          <QA q="Do you handle design?" a="Yes—lightweight design in Tailwind, or I can implement your Figma precisely." />
          <QA q="Can you integrate my backend?" a="Absolutely. I work with REST/GraphQL, auth, and form flows." />
          <QA q="Revisions?" a="Each package includes revisions; we finalize scope together upfront." />
        </div>
      </section>
    </div>
  )
}

function Badge({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-medium text-slate-600 dark:text-slate-300">
      {children}
    </span>
  )
}

function Feature({ title, desc }: { title: string; desc: string }) {
  return (
    <div className="rounded-xl border p-4 bg-white/60 dark:bg-white/5">
      <h3 className="font-semibold mb-1">{title}</h3>
      <p className="text-slate-600 dark:text-slate-300 text-sm">{desc}</p>
    </div>
  )
}

function Step({ n, title, desc }: { n: number; title: string; desc: string }) {
  return (
    <li className="rounded-xl border p-4 bg-white/60 dark:bg-white/5">
      <div className="mb-1 text-xs font-semibold text-indigo-600">Step {n}</div>
      <div className="font-semibold">{title}</div>
      <div className="text-slate-600 dark:text-slate-300 text-sm">{desc}</div>
    </li>
  )
}

function PricingCard({ name, price, features, highlight }: { name: string; price: string; features: string[]; highlight?: boolean }) {
  return (
    <div className={`rounded-2xl border p-6 ${highlight ? 'ring-2 ring-indigo-500' : ''} bg-white/60 dark:bg-white/5`}>
      <div className="mb-2 text-sm text-slate-500 dark:text-slate-400">{name}</div>
      <div className="text-3xl font-extrabold mb-3">{price}</div>
      <ul className="space-y-2 text-sm mb-4">
        {features.map((f) => (
          <li key={f} className="flex items-start gap-2">
            <span className="mt-1 text-green-600">✔</span>
            <span className="text-slate-700 dark:text-slate-200">{f}</span>
          </li>
        ))}
      </ul>
      <Link to="/contact" className={`inline-flex items-center rounded-md px-4 py-2 text-sm ${highlight ? 'bg-indigo-600 text-white hover:bg-indigo-500' : 'border hover:border-indigo-500'}`}>
        Choose {name}
      </Link>
    </div>
  )
}

function Testimonial({ quote, name }: { quote: string; name: string }) {
  return (
    <figure className="rounded-xl border p-4 bg-white/60 dark:bg-white/5">
      <blockquote className="text-slate-700 dark:text-slate-200">
        “{quote}”
      </blockquote>
      <figcaption className="mt-2 text-sm text-slate-500 dark:text-slate-400">— {name}</figcaption>
    </figure>
  )
}

function QA({ q, a }: { q: string; a: string }) {
  return (
    <div className="rounded-xl border p-4 bg-white/60 dark:bg-white/5">
      <div className="font-semibold">{q}</div>
      <div className="text-slate-600 dark:text-slate-300 text-sm">{a}</div>
    </div>
  )
}
