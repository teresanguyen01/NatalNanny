import { useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useAppContext } from '../contexts/AppContext'
import { today } from '../data/mockData'
import { api } from '../lib/api'
import happyCappy from '../assets/happy_cappy.PNG'
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
  const {
    todayCheckupComplete, streakCount, longestStreak, mascotHealth,
    completedDates, vitals, checkupResult, resultsByDate,
    setCheckupResult, addResultForDate,
    setStreakCount, setLongestStreak, setMascotHealth, setCompletedDates,
  } = useAppContext()

  useEffect(() => {
    // Fetch latest for dashboard metrics display
    api.checkup.latest().then(setCheckupResult).catch(() => {})

    // Fetch history so calendar day-clicks can show past results
    api.checkup.history(60).then(history => {
      history.forEach(r => addResultForDate(r.created_at.substring(0, 10), r))
    }).catch(() => {})

    // Fetch dashboard summary (health, streak, completed dates)
    api.dashboard.summary().then(summary => {
      setStreakCount(summary.streak)
      setLongestStreak(summary.longest_streak)
      setMascotHealth(summary.mascot_health)
      setCompletedDates(summary.checkin_dates)
    }).catch(err => {
      console.warn('Failed to load dashboard summary:', err)
      // Fallback to initial values already set in AppContext
    })
  }, [setCheckupResult, addResultForDate, setStreakCount, setLongestStreak, setMascotHealth, setCompletedDates])


  // Derive real values from latest checkup when available, fall back to mock vitals
  const liveHR = checkupResult?.checkup_summary?.estimated_pulse_bpm
    ?? checkupResult?.rppg_analysis?.consensus?.estimated_pulse_bpm
    ?? vitals.heartRate
  const liveSignalQuality = checkupResult?.signal_quality?.overall
    ?? checkupResult?.rppg_analysis?.signal_quality?.label
    ?? vitals.signalQuality.toLowerCase()
  const liveTrend = checkupResult?.heart_rate_statistics?.trend
    ?? (checkupResult?.rppg_analysis?.check_in_trend as string | undefined)
    ?? vitals.trend
  const liveWellnessScore = checkupResult?.maternal_wellness_interpretation?.wellness_score
    ?? checkupResult?.rppg_analysis?.signal_quality?.wellness_score

  return (
    <div className="min-h-full p-6 lg:p-8">
      {/* ── Page header ── */}
      <header className="fade-up mb-5 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-nn-navy flex items-center gap-2">
            {getGreeting()}, {displayName}
            <img
              src={happyCappy}
              alt="Sam the capybara waving hello"
              className="h-8 w-8 object-contain inline-block"
            />
          </h1>
          <p className="mt-1 text-sm text-nn-navy-light" style={{ fontFamily: 'var(--font-body)' }}>
            Your daily heart and breathing wellness companion
          </p>

          {/* Mobile mascot health bar */}
          <div className="lg:hidden mt-2 flex items-center gap-2">
            <div className="flex-1 h-2 bg-nn-mist rounded-full overflow-hidden">
              <div className="h-full bg-emerald-500" style={{ width: `${mascotHealth}%` }} />
            </div>
            <span className="text-xs font-medium text-nn-navy">{mascotHealth}%</span>
          </div>
        </div>

        <div className="flex items-center gap-3 flex-shrink-0">
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
            <StreakCard
              streakCount={streakCount}
              longestStreak={longestStreak}
              todayComplete={todayCheckupComplete}
            />
            <DailyCheckupCTA todayCheckupComplete={todayCheckupComplete} />
          </div>

          {/* Calendar */}
          <CalendarCheckupCard
            completedDates={completedDates}
            today={today}
            resultsByDate={resultsByDate}
          />

          {/* Metrics */}
          <MetricsSummaryCards
            heartRate={typeof liveHR === 'number' ? Math.round(liveHR) : vitals.heartRate}
            signalQuality={liveSignalQuality}
            trend={typeof liveTrend === 'string' ? (liveTrend.charAt(0).toUpperCase() + liveTrend.slice(1)) : vitals.trend}
            weeklyCompletion={vitals.weeklyCompletion}
            wellnessScore={liveWellnessScore ?? undefined}
          />
        </div>

        {/* ── Right column (1/3 width on desktop) ── */}
        <div className="space-y-5">
          <div className="hidden lg:block">
            <MascotPanel mascotHealth={mascotHealth} />
          </div>
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
