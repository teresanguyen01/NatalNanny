import { useEffect, useState } from 'react'
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
import NotificationDisplay from '../components/admin/NotificationDisplay'

function getGreeting() {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 17) return 'Good afternoon'
  return 'Good evening'
}

export default function DashboardPage() {
  const { displayName } = useAuth()
  const {
    streakCount, longestStreak, mascotHealth,
    completedDates, vitals, checkupResult, resultsByDate,
    setCheckupResult, addResultForDate,
    setTodayCheckupComplete,
    setStreakCount, setLongestStreak, setMascotHealth, setCompletedDates,
  } = useAppContext()
  const [pendingNotifications, setPendingNotifications] = useState<any[]>([])
  const localToday = new Date().toLocaleDateString('en-CA')

  useEffect(() => {

    // Fetch latest result for this user from Supabase — metrics stay N/A if none found
    api.checkup.latestFromDb().then(r => {
      setCheckupResult(r)
      if (r.created_at.substring(0, 10) === localToday) {
        setTodayCheckupComplete(true)
      }
    }).catch(() => {})

    // Fetch user-specific history from Supabase so calendar day-clicks show real results
    api.checkup.historyFromDb(60).then(history => {
      history.forEach(r => addResultForDate(r.created_at.substring(0, 10), r))
    }).catch(() => {})

    // Fetch dashboard summary (health, streak, completed dates, notifications)
    api.dashboard.summary().then(summary => {
      setStreakCount(summary.streak)
      setLongestStreak(summary.longest_streak)
      setMascotHealth(summary.mascot_health)
      setCompletedDates(summary.checkin_dates)
      setPendingNotifications(summary.pending_notifications || [])
      // Also detect today complete from the checkin dates list
      if (summary.checkin_dates.some((d: { date: string }) => d.date === localToday)) {
        setTodayCheckupComplete(true)
      }
    }).catch(err => {
      console.warn('Failed to load dashboard summary:', err)
    })
  }, [setCheckupResult, addResultForDate, setTodayCheckupComplete, setStreakCount, setLongestStreak, setMascotHealth, setCompletedDates])


  // Supabase-only source of truth for whether today's checkup is done
  const todayComplete = completedDates.some(d => d.date === localToday)

  // Only show today's metrics — N/A if the latest result is from a previous day
  const resultIsToday = checkupResult?.created_at?.substring(0, 10) === localToday

  const liveHR = resultIsToday
    ? (checkupResult?.checkup_summary?.estimated_pulse_bpm
        ?? checkupResult?.rppg_analysis?.consensus?.estimated_pulse_bpm
        ?? null)
    : null
  const liveSignalQuality = resultIsToday
    ? (checkupResult?.signal_quality?.overall
        ?? checkupResult?.rppg_analysis?.signal_quality?.label
        ?? null)
    : null
  const liveTrend = resultIsToday
    ? (checkupResult?.heart_rate_statistics?.trend
        ?? (checkupResult?.rppg_analysis?.check_in_trend as string | undefined)
        ?? null)
    : null
  const liveWellnessScore = resultIsToday
    ? (checkupResult?.maternal_wellness_interpretation?.wellness_score
        ?? checkupResult?.rppg_analysis?.signal_quality?.wellness_score
        ?? null)
    : null

  // Compute weekly completion from real completed dates (null = no data yet)
  const liveWeeklyCompletion = (() => {
    if (!completedDates.length) return null
    const now = new Date()
    const monday = new Date(now)
    monday.setDate(now.getDate() - ((now.getDay() + 6) % 7))
    monday.setHours(0, 0, 0, 0)
    const sunday = new Date(monday)
    sunday.setDate(monday.getDate() + 7)
    const count = completedDates.filter(d => {
      const dt = new Date(d.date + 'T00:00:00')
      return dt >= monday && dt < sunday
    }).length
    return Math.round((count / 7) * 100)
  })()

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

      {/* ── Pending Notifications ── */}
      {pendingNotifications.length > 0 && (
        <div className="mb-6">
          <NotificationDisplay notifications={pendingNotifications} />
        </div>
      )}

      {/* ── Main grid ── */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">

        {/* ── Left column (2/3 width on desktop) ── */}
        <div className="space-y-5 lg:col-span-2">
          {/* Streak + CTA row */}
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <StreakCard
              streakCount={streakCount}
              longestStreak={longestStreak}
              todayComplete={todayComplete}
            />
            <DailyCheckupCTA todayCheckupComplete={todayComplete} />
          </div>

          {/* Calendar */}
          <CalendarCheckupCard
            completedDates={completedDates}
            today={today}
            resultsByDate={resultsByDate}
          />

          {/* Metrics */}
          <MetricsSummaryCards
            heartRate={typeof liveHR === 'number' ? Math.round(liveHR) : null}
            signalQuality={liveSignalQuality}
            trend={typeof liveTrend === 'string' ? (liveTrend.charAt(0).toUpperCase() + liveTrend.slice(1)) : null}
            weeklyCompletion={liveWeeklyCompletion}
            wellnessScore={liveWellnessScore}
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
