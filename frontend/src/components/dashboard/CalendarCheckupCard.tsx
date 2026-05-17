import { useState } from 'react'
import type { CheckupResult } from '../../types/checkup'

interface CheckinDateData {
  date: string
  streak: number
}

interface CalendarCheckupCardProps {
  completedDates: CheckinDateData[]
  today: string
  resultsByDate?: Record<string, CheckupResult>
}

function getStreakColor(streak: number): string {
  if (streak === 0 || streak === 1) return 'bg-yellow-400'       // Yellow
  if (streak === 2) return 'bg-lime-400'         // Lime
  if (streak === 3) return 'bg-green-400'        // Light green
  if (streak === 4) return 'bg-green-500'        // Green
  if (streak === 5) return 'bg-emerald-500'      // Emerald
  return 'bg-amber-400'                           // Gold for 6+
}

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const MONTHS = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December',
]

function buildCalendarDays(year: number, month: number) {
  const firstDay = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const days: Array<{ date: string; dayNum: number } | null> = []

  for (let i = 0; i < firstDay; i++) days.push(null)
  for (let d = 1; d <= daysInMonth; d++) {
    const mm = String(month + 1).padStart(2, '0')
    const dd = String(d).padStart(2, '0')
    days.push({ date: `${year}-${mm}-${dd}`, dayNum: d })
  }
  return days
}

function formatDisplayDate(dateStr: string) {
  const [y, m, d] = dateStr.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric',
  })
}

function qualityColor(q: string) {
  if (q === 'good') return 'text-emerald-600'
  if (q === 'medium') return 'text-amber-600'
  return 'text-red-500'
}

function trendLabel(t: string) {
  const map: Record<string, string> = {
    stable: '→ Stable', increasing: '↑ Increasing',
    decreasing: '↓ Decreasing', variable: '↕ Variable',
  }
  return map[t] ?? t
}

function DayResultPopup({
  date,
  result,
  onClose,
}: {
  date: string
  result: CheckupResult
  onClose: () => void
}) {
  const pulse = result.checkup_summary?.estimated_pulse_bpm
    ?? result.rppg_analysis.consensus.estimated_pulse_bpm
  const quality = result.signal_quality?.overall
    ?? result.rppg_analysis.signal_quality.label
  const wellness = result.maternal_wellness_interpretation?.wellness_score
    ?? result.rppg_analysis.signal_quality.wellness_score
  const trend = result.heart_rate_statistics?.trend
    ?? result.rppg_analysis.check_in_trend as string
  const retake = result.checkup_summary?.retake_recommended
    ?? result.rppg_analysis.consensus.retake_recommended

  return (
    <div className="mt-4 rounded-2xl border border-nn-periwinkle bg-nn-pale-sky p-4 animate-fade-in">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <p className="text-xs font-bold text-nn-navy">{formatDisplayDate(date)}</p>
          <p className="text-[10px] text-nn-navy-light">Session {result.session_id}</p>
        </div>
        <button
          onClick={onClose}
          className="flex h-6 w-6 items-center justify-center rounded-full bg-white text-nn-navy-light hover:bg-nn-mist transition-colors"
          aria-label="Close"
        >
          <svg viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-3 w-3">
            <path d="M2 2l8 8M10 2L2 10" strokeLinecap="round" />
          </svg>
        </button>
      </div>

      <div className="grid grid-cols-2 gap-2">
        {/* Estimated pulse */}
        <div className="rounded-xl bg-white px-3 py-2.5">
          <p className="text-[10px] text-nn-navy-light font-medium">Estimated Pulse</p>
          <p className="text-base font-bold text-nn-deep-blue">
            {pulse != null ? `${pulse.toFixed(1)} bpm` : '—'}
          </p>
          <p className="text-[9px] text-nn-navy-light">Camera-based signal</p>
        </div>

        {/* Signal quality */}
        <div className="rounded-xl bg-white px-3 py-2.5">
          <p className="text-[10px] text-nn-navy-light font-medium">Signal Quality</p>
          <p className={`text-base font-bold capitalize ${qualityColor(quality)}`}>{quality}</p>
          <p className="text-[9px] text-nn-navy-light">rPPG estimate</p>
        </div>

        {/* Wellness score */}
        <div className="rounded-xl bg-white px-3 py-2.5">
          <p className="text-[10px] text-nn-navy-light font-medium">Wellness Score</p>
          <p className={`text-base font-bold ${
            wellness >= 75 ? 'text-emerald-600' : wellness >= 50 ? 'text-amber-600' : 'text-red-500'
          }`}>
            {wellness} <span className="text-xs font-normal text-nn-navy-light">/ 100</span>
          </p>
          <p className="text-[9px] text-nn-navy-light">Not a medical score</p>
        </div>

        {/* HR trend */}
        <div className="rounded-xl bg-white px-3 py-2.5">
          <p className="text-[10px] text-nn-navy-light font-medium">HR Trend</p>
          <p className="text-base font-bold text-nn-navy">{trendLabel(trend)}</p>
          <p className="text-[9px] text-nn-navy-light">During check-in</p>
        </div>
      </div>

      {retake && (
        <div className="mt-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-[10px] text-amber-700">
          Retake was recommended for this session.
        </div>
      )}

      <p className="mt-2 text-[9px] text-nn-navy-light leading-snug">
        Estimated wellness signal only, not diagnostic.
      </p>
    </div>
  )
}

export default function CalendarCheckupCard({
  completedDates,
  today,
  resultsByDate = {},
}: CalendarCheckupCardProps) {
  const [selectedDate, setSelectedDate] = useState<string | null>(null)

  const todayDate = new Date(today)
  const year = todayDate.getFullYear()
  const month = todayDate.getMonth()
  const days = buildCalendarDays(year, month)

  // Convert to map for O(1) lookup
  const completedMap = new Map(
    completedDates.map(d => [d.date, d.streak])
  )
  const completedSet = new Set(completedDates.map(d => d.date))

  function handleDayClick(date: string) {
    if (!completedSet.has(date)) return
    setSelectedDate(prev => (prev === date ? null : date))
  }

  const selectedResult = selectedDate ? resultsByDate[selectedDate] : null

  return (
    <div className="fade-up fade-up-2 rounded-3xl bg-white p-6 shadow-sm">
      {/* Header */}
      <div className="mb-5 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-nn-navy">
            {MONTHS[month]} {year}
          </h2>
          <p className="text-sm text-nn-navy-light">
            Daily checkup calendar{' '}
            {Object.keys(resultsByDate).length > 0 && (
              <span className="text-nn-deep-blue font-medium">· tap a green day for results</span>
            )}
          </p>
        </div>
        {/* Legend */}
        <div className="flex flex-col gap-1.5 text-right text-[11px] text-nn-navy-light">
          <span className="flex items-center justify-end gap-1.5">
            <span className="h-3 w-3 rounded-full bg-yellow-400 inline-block" /> Streak 1
          </span>
          <span className="flex items-center justify-end gap-1.5">
            <span className="h-3 w-3 rounded-full bg-green-400 inline-block" /> Streak 2-5
          </span>
          <span className="flex items-center justify-end gap-1.5">
            <span className="h-3 w-3 rounded-full bg-amber-400 inline-block" /> Streak 6+
          </span>
        </div>
      </div>

      {/* Weekday headers */}
      <div className="mb-2 grid grid-cols-7 gap-1">
        {WEEKDAYS.map((d) => (
          <div key={d} className="text-center text-xs font-medium text-nn-navy-light py-1">
            {d}
          </div>
        ))}
      </div>

      {/* Day grid */}
      <div className="grid grid-cols-7 gap-1">
        {days.map((day, idx) => {
          if (!day) return <div key={`empty-${idx}`} />

          const isToday = day.date === today
          const streakValue = completedMap.get(day.date)
          const isComplete = streakValue !== undefined
          const isPast = day.date < today
          const isSelected = day.date === selectedDate
          const hasResult = Boolean(resultsByDate[day.date])

          // Classes: completed uses streak gradient; today gets a ring; selected gets a stronger ring
          const baseRing = isSelected
            ? 'ring-2 ring-nn-deep-blue ring-offset-1'
            : isToday && isComplete
            ? 'ring-2 ring-nn-deep-blue ring-offset-1'
            : ''

          const bgCls = isComplete
            ? `${getStreakColor(streakValue!)} text-white shadow-sm`
            : isToday
            ? 'border-2 border-nn-deep-blue font-bold text-nn-deep-blue'
            : isPast
            ? 'text-nn-navy-light'
            : 'text-nn-navy-light/50'

          const interactiveCls = isComplete
            ? `cursor-pointer hover:scale-105 transition-all ${hasResult ? 'hover:scale-110' : ''}`
            : ''

          return (
            <div
              key={day.date}
              className="flex items-center justify-center"
            >
              <button
                type="button"
                disabled={!isComplete}
                onClick={() => handleDayClick(day.date)}
                className={[
                  'flex h-9 w-9 items-center justify-center rounded-full text-sm font-medium transition-all',
                  bgCls,
                  baseRing,
                  interactiveCls,
                  !isComplete ? 'cursor-default' : '',
                ].join(' ')}
                aria-label={`${day.date}${isComplete ? ' — completed, click for results' : ''}${isToday ? ' — today' : ''}`}
                title={isComplete && hasResult ? 'Click to view results' : undefined}
              >
                {day.dayNum}
              </button>
            </div>
          )
        })}
      </div>

      {/* Inline result popup */}
      {selectedDate && selectedResult && (
        <DayResultPopup
          date={selectedDate}
          result={selectedResult}
          onClose={() => setSelectedDate(null)}
        />
      )}

      {/* Clicked a completed day but no result stored yet */}
      {selectedDate && !selectedResult && completedSet.has(selectedDate) && (
        <div className="mt-4 rounded-2xl border border-nn-mist bg-nn-pale-sky/50 px-4 py-3 text-center text-xs text-nn-navy-light">
          <p className="font-medium text-nn-navy">{formatDisplayDate(selectedDate)}</p>
          <p className="mt-1">Check-in recorded, but detailed results are not available for this session.</p>
          <button onClick={() => setSelectedDate(null)} className="mt-2 text-nn-deep-blue hover:underline text-[11px]">Dismiss</button>
        </div>
      )}
    </div>
  )
}
