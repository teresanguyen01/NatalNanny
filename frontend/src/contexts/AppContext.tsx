import { createContext, useContext, useState, useCallback, type ReactNode } from 'react'
import {
  completedDates as initialDates,
  mockStreak,
  mockVitals,
  today,
} from '../data/mockData'
import type { CheckupResult } from '../types/checkup'

interface CheckinDateData {
  date: string
  streak: number
}

interface AppState {
  todayCheckupComplete: boolean
  streakCount: number
  longestStreak: number
  mascotHealth: number
  completedDates: CheckinDateData[]
  vitals: typeof mockVitals
  checkupResult: CheckupResult | null
  resultsByDate: Record<string, CheckupResult>
  setCheckupResult: (r: CheckupResult) => void
  addResultForDate: (date: string, result: CheckupResult) => void
  markCheckupComplete: () => void
}

const AppContext = createContext<AppState | null>(null)

export function AppProvider({ children }: { children: ReactNode }) {
  const [todayCheckupComplete, setTodayCheckupComplete] = useState(false)
  const [streakCount, setStreakCount] = useState(mockStreak.count)
  const [longestStreak, setLongestStreak] = useState(mockStreak.count)
  const [mascotHealth, setMascotHealth] = useState(50)
  const [completedDates, setCompletedDates] = useState<CheckinDateData[]>(
    initialDates.map((date, idx) => ({ date, streak: idx + 1 }))
  )
  const [vitals] = useState(mockVitals)
  const [checkupResult, setCheckupResultState] = useState<CheckupResult | null>(null)
  const [resultsByDate, setResultsByDate] = useState<Record<string, CheckupResult>>({})

  function setCheckupResult(r: CheckupResult) {
    setCheckupResultState(r)
    // Also index by date so the calendar can look it up
    const date = r.created_at.substring(0, 10)
    setResultsByDate(prev => ({ ...prev, [date]: r }))
  }

  const addResultForDate = useCallback((date: string, result: CheckupResult) => {
    setResultsByDate(prev => ({ ...prev, [date]: result }))
  }, [])

  function markCheckupComplete() {
    if (todayCheckupComplete) return
    setTodayCheckupComplete(true)
    setStreakCount((n) => {
      const newStreak = n + 1
      setLongestStreak((longest) => Math.max(longest, newStreak))
      return newStreak
    })
    setCompletedDates((dates) => {
      const dateStrings = dates.map(d => d.date)
      if (dateStrings.includes(today)) return dates
      const newStreak = streakCount + 1
      return [...dates, { date: today, streak: newStreak }]
    })
    setMascotHealth((health) => Math.min(100, health + 10))
  }

  return (
    <AppContext.Provider
      value={{
        todayCheckupComplete,
        streakCount,
        longestStreak,
        mascotHealth,
        completedDates,
        vitals,
        checkupResult,
        resultsByDate,
        setCheckupResult,
        addResultForDate,
        markCheckupComplete,
      }}
    >
      {children}
    </AppContext.Provider>
  )
}

export function useAppContext(): AppState {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useAppContext must be used inside <AppProvider>')
  return ctx
}
