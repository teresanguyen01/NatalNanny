interface CalendarSummaryProps {
  completedCount: number
  currentMonth: string
  onClick: () => void
}

export default function CalendarSummary({
  completedCount,
  currentMonth,
  onClick
}: CalendarSummaryProps) {
  return (
    <button
      onClick={onClick}
      className="w-full rounded-2xl bg-white p-4 shadow-sm border border-nn-mist hover:border-nn-periwinkle hover:shadow transition-all text-center"
    >
      <p className="text-sm font-semibold text-nn-navy">
        📅 {currentMonth}: {completedCount} checkups
      </p>
      <p className="text-xs text-nn-navy-light mt-1">
        Tap to view calendar & results
      </p>
    </button>
  )
}
