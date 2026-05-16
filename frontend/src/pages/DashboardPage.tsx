export default function DashboardPage() {
  return (
    <div className="p-8">
      <h1 className="mb-2 text-2xl font-bold text-neutral-800">Dashboard</h1>
      <p className="text-neutral-500">
        Your post-natal overview will appear here — recovery timeline, recent vitals, and upcoming
        checkups.
      </p>

      <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
        {['Heart rate', 'Recovery score', 'Next checkup'].map((label) => (
          <div key={label} className="rounded-2xl bg-white p-6 shadow-xs">
            <p className="text-xs font-medium uppercase tracking-wide text-neutral-400">{label}</p>
            <p className="mt-2 text-2xl font-semibold text-neutral-300">—</p>
          </div>
        ))}
      </div>

      <p className="mt-10 text-sm text-neutral-400 italic">
        rPPG analysis and full dashboard coming soon.
      </p>
    </div>
  )
}
