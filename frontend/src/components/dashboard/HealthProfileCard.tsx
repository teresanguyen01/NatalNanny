import { mockUser } from '../../data/mockData'

export default function HealthProfileCard() {
  const weeksLeft = Math.round(
    (new Date(mockUser.dueDate).getTime() - new Date('2026-05-16').getTime()) /
      (1000 * 60 * 60 * 24 * 7)
  )

  return (
    <div className="fade-up fade-up-2 rounded-3xl bg-white p-6 shadow-sm">
      <div className="mb-4 flex items-center gap-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-nn-pale-sky">
          <svg viewBox="0 0 20 20" fill="none" stroke="#4663ac" strokeWidth="1.6" className="h-4 w-4">
            <circle cx="10" cy="6" r="3" />
            <path d="M3 18a7 7 0 0 1 14 0" strokeLinecap="round" />
          </svg>
        </div>
        <h2 className="font-semibold text-nn-navy">Health Profile</h2>
      </div>

      <div className="space-y-3">
        {/* Gestational week */}
        <div className="rounded-2xl bg-nn-pale-sky px-4 py-3">
          <p className="text-xs text-nn-navy-light">Gestational Week</p>
          <p className="mt-0.5 text-lg font-bold text-nn-deep-blue">
            Week {mockUser.gestationalWeek}
          </p>
          <div className="mt-1.5 h-1.5 rounded-full bg-nn-mist overflow-hidden">
            <div
              className="h-full rounded-full bg-nn-deep-blue"
              style={{ width: `${(mockUser.gestationalWeek / 40) * 100}%` }}
            />
          </div>
          <p className="mt-1 text-[11px] text-nn-navy-light">~{weeksLeft} weeks to due date</p>
        </div>

        <Row label="Due Date" value={new Date(mockUser.dueDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })} />
        <Row label="Care Team" value={mockUser.careTeam} />
        <Row
          label="Risk Factors"
          value={mockUser.riskFactors.join(', ')}
          valueClass="text-amber-600 font-medium"
        />
        <Row label="Last BP (manual)" value={mockUser.lastManualBP} sub="Entered 2026-05-14 • Requires cuff" />
        <Row label="Emergency Contact" value={mockUser.emergencyContact} small />
      </div>

      <p className="mt-4 rounded-xl bg-amber-50 border border-amber-100 px-3 py-2 text-[10px] text-amber-700 leading-relaxed">
        <strong>Note:</strong> Blood pressure requires manual cuff entry. rPPG values are estimates and not diagnostic.
      </p>
    </div>
  )
}

function Row({
  label,
  value,
  sub,
  valueClass = 'text-nn-navy',
  small = false,
}: {
  label: string
  value: string
  sub?: string
  valueClass?: string
  small?: boolean
}) {
  return (
    <div className="border-b border-nn-mist/60 pb-2.5 last:border-0 last:pb-0">
      <p className="text-[11px] text-nn-navy-light">{label}</p>
      <p className={`mt-0.5 ${small ? 'text-xs' : 'text-sm'} font-medium ${valueClass}`}>{value}</p>
      {sub && <p className="text-[10px] text-nn-navy-light/70">{sub}</p>}
    </div>
  )
}
