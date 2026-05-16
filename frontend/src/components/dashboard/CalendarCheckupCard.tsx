interface CalendarCheckupCardProps {
  completedDates: string[]
  today: string
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

export default function CalendarCheckupCard({ completedDates, today }: CalendarCheckupCardProps) {
  const todayDate = new Date(today)
  const year = todayDate.getFullYear()
  const month = todayDate.getMonth()
  const days = buildCalendarDays(year, month)
  const completedSet = new Set(completedDates)

  return (
    <div className="fade-up fade-up-2 rounded-3xl bg-white p-6 shadow-sm">
      {/* Header */}
      <div className="mb-5 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-nn-navy">
            {MONTHS[month]} {year}
          </h2>
          <p className="text-sm text-nn-navy-light">Daily checkup calendar</p>
        </div>
        {/* Legend */}
        <div className="flex flex-col gap-1.5 text-right text-[11px] text-nn-navy-light">
          <span className="flex items-center justify-end gap-1.5">
            <span className="h-3 w-3 rounded-full bg-emerald-400 inline-block" /> Completed
          </span>
          <span className="flex items-center justify-end gap-1.5">
            <span className="h-3 w-3 rounded-full border-2 border-nn-mist inline-block" /> Not completed
          </span>
          <span className="flex items-center justify-end gap-1.5">
            <span className="h-3 w-3 rounded-full border-2 border-nn-deep-blue inline-block" /> Today
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
          const isComplete = completedSet.has(day.date)
          const isPast = day.date < today

          return (
            <div
              key={day.date}
              className="flex items-center justify-center"
              aria-label={`${day.date}${isComplete ? ' — completed' : ''}${isToday ? ' — today' : ''}`}
            >
              <div
                className={[
                  'flex h-9 w-9 items-center justify-center rounded-full text-sm font-medium transition-all',
                  isToday
                    ? 'border-2 border-nn-deep-blue font-bold text-nn-deep-blue'
                    : isComplete
                    ? 'bg-emerald-400 text-white shadow-sm'
                    : isPast
                    ? 'text-nn-navy-light'
                    : 'text-nn-navy-light/50',
                ].join(' ')}
              >
                {day.dayNum}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
