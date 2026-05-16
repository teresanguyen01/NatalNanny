import { createContext, useContext, useState, type ReactNode } from 'react'
import {
  completedDates as initialDates,
  mockStreak,
  mockVitals,
  mockCheckupResult,
  today,
} from '../data/mockData'

interface AppState {
  todayCheckupComplete: boolean
  streakCount: number
  completedDates: string[]
  vitals: typeof mockVitals
  checkupResult: typeof mockCheckupResult
  markCheckupComplete: () => void
}

const AppContext = createContext<AppState | null>(null)

export function AppProvider({ children }: { children: ReactNode }) {
  const [todayCheckupComplete, setTodayCheckupComplete] = useState(false)
  const [streakCount, setStreakCount] = useState(mockStreak.count)
  const [completedDates, setCompletedDates] = useState<string[]>(initialDates)
  const [vitals] = useState(mockVitals)
  const [checkupResult] = useState(mockCheckupResult)

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
