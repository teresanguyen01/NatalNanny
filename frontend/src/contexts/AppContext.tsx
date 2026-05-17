import { createContext, useContext, useState, useCallback, type ReactNode } from 'react'
import {
  completedDates as initialDates,
  mockStreak,
  mockVitals,
  today,
} from '../data/mockData'
import type { CheckupResult } from '../types/checkup'

interface AppState {
  todayCheckupComplete: boolean
  streakCount: number
  completedDates: string[]
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
  const [completedDates, setCompletedDates] = useState<string[]>(initialDates)
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
    setStreakCount((n) => n + 1)
    setCompletedDates((dates) =>
      dates.includes(today) ? dates : [...dates, today]
    )
  }

  return (
    <AppContext.Provider
      value={{
        todayCheckupComplete,
        streakCount,
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
