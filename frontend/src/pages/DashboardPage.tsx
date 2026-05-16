import { useAuth } from '../contexts/AuthContext'
import { useAppContext } from '../contexts/AppContext'
import { today } from '../data/mockData'
import StreakCard from '../components/dashboard/StreakCard'
import CalendarCheckupCard from '../components/dashboard/CalendarCheckupCard'
import DailyCheckupCTA from '../components/dashboard/DailyCheckupCTA'
import MascotPanel from '../components/dashboard/MascotPanel'
import MetricsSummaryCards from '../components/dashboard/MetricsSummaryCards'
import HealthProfileCard from '../components/dashboard/HealthProfileCard'

function getGreeting() {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 17) return 'Good afternoon'
  return 'Good evening'
}

export default function DashboardPage() {
  const { displayName } = useAuth()
  const { todayCheckupComplete, streakCount, completedDates, vitals } = useAppContext()

  return (
    <div className="min-h-full p-6 lg:p-8">
      {/* ── Page header ── */}
      <header className="fade-up mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-nn-navy">
            {getGreeting()}, {displayName} 👋
          </h1>
          <p className="mt-1 text-sm text-nn-navy-light" style={{ fontFamily: 'var(--font-body)' }}>
            Your daily heart and breathing wellness companion
          </p>
        </div>

        <div className="flex items-center gap-3 flex-shrink-0">
          {/* Notification bell */}
          <button
            className="relative flex h-9 w-9 items-center justify-center rounded-xl bg-white shadow-sm hover:bg-nn-pale-sky transition-colors"
            aria-label="Notifications"
          >
            <svg viewBox="0 0 20 20" fill="none" stroke="#2d3a5e" strokeWidth="1.6" className="h-5 w-5">
              <path d="M10 2a6 6 0 0 0-6 6v3l-1.5 2.5h15L16 11V8a6 6 0 0 0-6-6Z" strokeLinejoin="round" />
              <path d="M8 16a2 2 0 0 0 4 0" strokeLinecap="round" />
            </svg>
            {!todayCheckupComplete && (
              <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full bg-amber-400 border-2 border-nn-pale-sky" />
            )}
          </button>

          {/* Profile avatar */}
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-nn-deep-blue text-white font-bold text-sm shadow-sm">
            {displayName.charAt(0).toUpperCase()}
          </div>
        </div>
      </header>

      {/* ── Main grid ── */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">

        {/* ── Left column (2/3 width on desktop) ── */}
        <div className="space-y-5 lg:col-span-2">
          {/* Streak + CTA row */}
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <StreakCard streakCount={streakCount} todayComplete={todayCheckupComplete} />
            <DailyCheckupCTA todayCheckupComplete={todayCheckupComplete} />
          </div>

          {/* Calendar */}
          <CalendarCheckupCard completedDates={completedDates} today={today} />

          {/* Metrics */}
          <MetricsSummaryCards
            heartRate={vitals.heartRate}
            respiratoryRate={vitals.respiratoryRate}
            signalQuality={vitals.signalQuality}
            trend={vitals.trend}
            weeklyCompletion={vitals.weeklyCompletion}
          />
        </div>

        {/* ── Right column (1/3 width on desktop) ── */}
        <div className="space-y-5">
          <MascotPanel />
          <HealthProfileCard />
        </div>
      </div>

      {/* ── Page-level safety footer ── */}
      <footer className="mt-8 text-center text-xs text-nn-navy-light/70">
        NatalNanny is a wellness communication tool. It is not a diagnostic device and does not replace professional medical care.
        <br />
        <strong>Emergency:</strong> If you experience chest pain, severe headache, vision changes, heavy bleeding, or reduced fetal movement — seek urgent care immediately or call 911.
      </footer>
    </div>
  )
}
