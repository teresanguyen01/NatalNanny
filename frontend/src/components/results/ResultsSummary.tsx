import { mockCheckupResult } from '../../data/mockData'

export default function ResultsSummary() {
  const r = mockCheckupResult

  const metrics = [
    { label: 'Heart Rate', value: `${r.heartRate} bpm`, badge: 'rPPG estimate', color: 'text-nn-deep-blue' },
    { label: 'Respiratory Rate', value: `${r.respiratoryRate} br/min`, badge: 'rPPG estimate', color: 'text-nn-deep-blue' },
    { label: 'Signal Quality', value: r.signalQuality, badge: r.lightingNote, color: 'text-emerald-600' },
    { label: 'Trend', value: r.trend, badge: 'vs. 7-day baseline', color: 'text-nn-navy' },
  ]

  return (
    <div className="rounded-3xl bg-white p-6 shadow-sm">
      <div className="mb-5 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-100">
          <svg viewBox="0 0 20 20" fill="none" stroke="#10b981" strokeWidth="1.8" className="h-5 w-5">
            <path d="M5 10l3.5 3.5L15 7" strokeLinecap="round" strokeLinejoin="round" />
            <circle cx="10" cy="10" r="8" />
          </svg>
        </div>
        <div>
          <h2 className="font-semibold text-nn-navy">Checkup Results</h2>
          <p className="text-xs text-nn-navy-light">
            Completed {r.completedAt} · {r.method}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {metrics.map(({ label, value, badge, color }) => (
          <div key={label} className="rounded-2xl bg-nn-pale-sky p-4">
            <p className="text-xs font-medium text-nn-navy-light">{label}</p>
            <p className={`mt-1 text-xl font-bold ${color}`}>{value}</p>
            <span className="mt-1.5 inline-block rounded-full bg-white px-2 py-0.5 text-[10px] text-nn-navy-light">
              {badge}
            </span>
          </div>
        ))}
      </div>

      <div className="mt-4 rounded-2xl border border-nn-mist bg-nn-pale-sky/50 px-4 py-3 text-xs text-nn-navy-light">
        <p><strong className="text-nn-navy">Recording:</strong> {r.recordingLengthSeconds}s · <strong className="text-nn-navy">Method:</strong> {r.method}</p>
        <p className="mt-0.5"><strong className="text-nn-navy">Notes:</strong> {r.motionNote}</p>
      </div>
    </div>
  )
}
