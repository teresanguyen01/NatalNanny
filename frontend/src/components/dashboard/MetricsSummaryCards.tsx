import { mockTrendData } from '../../data/mockData'
import measureHeartCappy from '../../assets/measure_heart_cappy.png'
import signalCappy from '../../assets/signal_cappy.png'
import weeklyCappy from '../../assets/weekly_cappy.png'
import wellnessCappy from '../../assets/wellness_cappy.png'

interface MetricsProps {
  heartRate: number
  signalQuality: string
  trend: string
  weeklyCompletion: number
  wellnessScore?: number
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

function qualityColor(label: string) {
  const l = label.toLowerCase()
  if (l === 'good') return 'text-emerald-600'
  if (l === 'medium') return 'text-amber-600'
  return 'text-red-500'
}

export default function MetricsSummaryCards({
  heartRate,
  signalQuality,
  trend,
  weeklyCompletion,
  wellnessScore,
}: MetricsProps) {
  const hrData = mockTrendData.map((d) => d.heartRate)

  const cards = [
    {
      label: 'Estimated Pulse',
      value: `${heartRate}`,
      unit: 'bpm',
      sub: 'Camera-based wellness signal',
      sparkData: hrData,
      sparkColor: '#4663ac',
      iconImg: measureHeartCappy,
      iconAlt: 'Sam measuring your pulse',
    },
    {
      label: 'Signal Quality',
      value: signalQuality.charAt(0).toUpperCase() + signalQuality.slice(1),
      unit: '',
      sub: 'rPPG camera signal',
      sparkData: null,
      sparkColor: null,
      iconImg: signalCappy,
      iconAlt: 'Sam checking the camera signal',
      badge: (
        <span className={`mt-1 inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
          signalQuality.toLowerCase() === 'good' ? 'bg-emerald-100 text-emerald-700' :
          signalQuality.toLowerCase() === 'medium' ? 'bg-amber-100 text-amber-700' :
          'bg-red-100 text-red-700'
        }`}>
          ● {signalQuality.charAt(0).toUpperCase() + signalQuality.slice(1)}
        </span>
      ),
      valueColor: qualityColor(signalQuality),
    },
    {
      label: 'Weekly Completion',
      value: `${weeklyCompletion}`,
      unit: '%',
      sub: 'Check-ins this week',
      sparkData: null,
      sparkColor: null,
      iconImg: weeklyCappy,
      iconAlt: 'Sam celebrating your weekly check-ins',
      customContent: (
        <div className="mt-2 h-2 overflow-hidden rounded-full bg-nn-mist">
          <div
            className="h-full rounded-full bg-nn-deep-blue transition-all"
            style={{ width: `${weeklyCompletion}%` }}
          />
        </div>
      ),
    },
    wellnessScore != null
      ? {
          label: 'Wellness Score',
          value: `${wellnessScore}`,
          unit: '/ 100',
          sub: 'Estimated check-in score',
          sparkData: null,
          sparkColor: null,
          iconImg: wellnessCappy,
          iconAlt: 'Sam doing yoga for your wellness score',
          valueColor: wellnessScore >= 75 ? 'text-emerald-600' : wellnessScore >= 50 ? 'text-amber-600' : 'text-red-500',
        }
      : {
          label: 'Check-in Trend',
          value: trend,
          unit: '',
          sub: 'Compared to baseline',
          sparkData: null,
          sparkColor: null,
          iconImg: wellnessCappy,
          iconAlt: 'Sam tracking your trend',
          badge: (
            <span className="mt-1 inline-flex items-center rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700">
              ● {trend}
            </span>
          ),
        },
  ]

  return (
    <div className="fade-up fade-up-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
      {cards.map(({ label, value, unit, sub, sparkData, sparkColor, iconImg, iconAlt, customContent, badge, valueColor }) => (
        <div key={label} className="rounded-2xl bg-white p-4 shadow-sm">
          <div className="mb-2 flex items-center justify-between">
            <img src={iconImg} alt={iconAlt} className="h-8 w-8 rounded-xl object-cover" />
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
                <span className={`text-2xl font-bold ${valueColor ?? 'text-nn-navy'}`}>{value}</span>
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
