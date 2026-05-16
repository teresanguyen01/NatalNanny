import { Link } from 'react-router-dom'

export default function LandingPage() {
  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-br from-brand-50 to-white">
      {/* Header */}
      <header className="flex items-center justify-between px-8 py-5">
        <div className="flex items-center gap-2">
          <span className="text-2xl">🌸</span>
          <span className="text-lg font-semibold tracking-tight text-brand-700">NatalNanny</span>
        </div>
        <Link
          to="/login"
          className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-600"
        >
          Sign in
        </Link>
      </header>

      {/* Hero */}
      <main className="flex flex-1 flex-col items-center justify-center px-6 text-center">
        <div className="max-w-2xl">
          <h1 className="mb-4 text-5xl font-bold tracking-tight text-neutral-900">
            Post-natal care,{' '}
            <span className="text-brand-600">powered by rPPG</span>
          </h1>
          <p className="mb-8 text-lg text-neutral-500">
            NatalNanny uses remote photoplethysmography to monitor your vitals from your camera —
            no wearable required. Stay connected with your care team and track your recovery in
            real time.
          </p>
          <Link
            to="/login"
            className="inline-block rounded-xl bg-brand-500 px-8 py-3.5 text-base font-semibold text-white shadow-sm transition-colors hover:bg-brand-600"
          >
            Get started
          </Link>
        </div>
      </main>

      {/* Feature grid */}
      <section className="mx-auto grid max-w-4xl grid-cols-1 gap-6 px-6 pb-20 sm:grid-cols-3">
        {[
          { icon: '♡', title: 'Vitals monitoring', desc: 'Camera-based heart rate and breathing via rPPG — no patches, no hassle.' },
          { icon: '✉', title: 'Care team messaging', desc: 'Direct messaging with your midwife, OB, or postpartum doula.' },
          { icon: '⬡', title: 'Recovery dashboard', desc: 'Track your post-natal journey with a clear, calming overview.' },
        ].map(({ icon, title, desc }) => (
          <div key={title} className="rounded-2xl bg-white p-6 shadow-xs">
            <div className="mb-3 text-3xl">{icon}</div>
            <h3 className="mb-1 font-semibold text-neutral-800">{title}</h3>
            <p className="text-sm text-neutral-500">{desc}</p>
          </div>
        ))}
      </section>
    </div>
  )
}
