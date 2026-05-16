import { mockTrendData } from '../../data/mockData'

interface MetricsProps {
  heartRate: number
  respiratoryRate: number
  signalQuality: string
  trend: string
  weeklyCompletion: number
}

function Sparkline({ data, color }: { data: number[]; color: string }) {
  const w = 80, h = 32, pad = 3
  const min = Math.min(...data)
  const max = Math.max(...data)
  const range = max - min || 1
  const pts = data.map((v, i) => {
    const x = pad + (i / (data.length - 1)) * (w - 2 * pad)
    const y = h - pad - ((v - min) / range) * (h - 2 * pad)
    return `${x},${y}`
  }).join(' ')

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="h-8 w-20">
      <polyline points={pts} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export default function MetricsSummaryCards({
  heartRate,
  respiratoryRate,
  trend,
  weeklyCompletion,
}: MetricsProps) {
  const hrData = mockTrendData.map((d) => d.heartRate)
  const rrData = mockTrendData.map((d) => d.respiratoryRate)

  const cards = [
    {
      label: 'Heart Rate',
      value: `${heartRate}`,
      unit: 'bpm',
      sub: 'Estimated from rPPG',
      sparkData: hrData,
      sparkColor: '#4663ac',
      icon: (
        <svg viewBox="0 0 20 20" fill="none" stroke="#4663ac" strokeWidth="1.6" className="h-5 w-5">
          <path d="M10 17S2 11.5 2 7a4.5 4.5 0 0 1 8-2.8A4.5 4.5 0 0 1 18 7c0 4.5-8 10-8 10Z" />
        </svg>
      ),
    },
    {
      label: 'Respiratory Rate',
      value: `${respiratoryRate}`,
      unit: 'br/min',
      sub: 'Estimated from rPPG',
      sparkData: rrData,
      sparkColor: '#6ea8d8',
      icon: (
        <svg viewBox="0 0 20 20" fill="none" stroke="#4663ac" strokeWidth="1.6" className="h-5 w-5">
          <path d="M5 10a5 5 0 0 1 10 0" strokeLinecap="round" />
          <path d="M3 13a7 7 0 0 1 14 0" strokeLinecap="round" />
          <path d="M1 16a9 9 0 0 1 18 0" strokeLinecap="round" />
        </svg>
      ),
    },
    {
      label: 'Weekly Completion',
      value: `${weeklyCompletion}`,
      unit: '%',
      sub: '6 of 7 checkups done',
      sparkData: null,
      sparkColor: null,
      icon: (
        <svg viewBox="0 0 20 20" fill="none" stroke="#4663ac" strokeWidth="1.6" className="h-5 w-5">
          <rect x="2" y="4" width="16" height="14" rx="2" />
          <path d="M6 2v4M14 2v4M2 9h16" strokeLinecap="round" />
        </svg>
      ),
      customContent: (
        <div className="mt-2 h-2 overflow-hidden rounded-full bg-nn-mist">
          <div
            className="h-full rounded-full bg-nn-deep-blue transition-all"
            style={{ width: `${weeklyCompletion}%` }}
          />
        </div>
      ),
    },
    {
      label: 'Trend',
      value: trend,
      unit: '',
      sub: 'Compared to baseline',
      sparkData: null,
      sparkColor: null,
      icon: (
        <svg viewBox="0 0 20 20" fill="none" stroke="#4663ac" strokeWidth="1.6" className="h-5 w-5">
          <path d="M3 14l4-5 4 3 6-8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      ),
      badge: (
        <span className="mt-1 inline-flex items-center rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700">
          ● {trend}
        </span>
      ),
    },
  ]

  return (
    <div className="fade-up fade-up-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
      {cards.map(({ label, value, unit, sub, sparkData, sparkColor, icon, customContent, badge }) => (
        <div key={label} className="rounded-2xl bg-white p-4 shadow-sm">
          <div className="mb-2 flex items-center justify-between">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-nn-pale-sky">
              {icon}
            </div>
            {sparkData && sparkColor && (
              <Sparkline data={sparkData} color={sparkColor} />
            )}
          </div>
          <p className="text-xs font-medium uppercase tracking-wide text-nn-navy-light">{label}</p>
          <div className="mt-1 flex items-baseline gap-1">
            {badge ? (
              badge
            ) : (
              <>
                <span className="text-2xl font-bold text-nn-navy">{value}</span>
                {unit && <span className="text-sm text-nn-navy-light">{unit}</span>}
              </>
            )}
          </div>
          {customContent}
          <p className="mt-1.5 text-[10px] text-nn-navy-light">{sub}</p>
        </div>
      ))}
    </div>
  )
}
