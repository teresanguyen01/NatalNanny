import { useNavigate } from 'react-router-dom'
import { useAppContext } from '../contexts/AppContext'
import ResultsSummary from '../components/results/ResultsSummary'
import AISummaryCard from '../components/results/AISummaryCard'
import SafetyNotice from '../components/checkup/SafetyNotice'

export default function CheckupResultsPage() {
  const navigate = useNavigate()
  const { todayCheckupComplete } = useAppContext()

  return (
    <div className="min-h-full p-6 lg:p-8">
      <div className="mx-auto max-w-2xl">
        {/* Header */}
        <div className="fade-up mb-6 flex items-center gap-4">
          <button
            onClick={() => navigate('/dashboard')}
            className="flex items-center gap-1.5 text-sm text-nn-navy-light hover:text-nn-navy transition-colors"
          >
            <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-4 w-4">
              <path d="M10 4L6 8l4 4" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Dashboard
          </button>
          <div>
            <h1 className="text-2xl font-bold text-nn-navy">Checkup Results</h1>
            <p className="text-sm text-nn-navy-light">
              {todayCheckupComplete ? "Today's wellness checkup is complete" : "Latest checkup results"}
            </p>
          </div>
        </div>

        {/* Complete badge */}
        {todayCheckupComplete && (
          <div className="fade-up fade-up-1 mb-5 flex items-center gap-3 rounded-2xl bg-emerald-50 border border-emerald-100 px-5 py-4">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-400 flex-shrink-0">
              <svg viewBox="0 0 16 16" fill="white" className="h-5 w-5">
                <path d="M3 8l3.5 3.5L13 5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
              </svg>
            </div>
            <div>
              <p className="font-semibold text-emerald-800">Checkup complete!</p>
              <p className="text-sm text-emerald-600">Your streak has been updated. Keep it up!</p>
            </div>
          </div>
        )}

        <div className="space-y-5">
          {/* Results summary */}
          <div className="fade-up fade-up-2">
            <ResultsSummary />
          </div>

          {/* AI summary */}
          <div className="fade-up fade-up-3">
            <AISummaryCard />
          </div>

          {/* Safety notice */}
          <div className="fade-up fade-up-4">
            <SafetyNotice />
          </div>

          {/* Action buttons */}
          <div className="fade-up fade-up-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
            <button
              onClick={() => navigate('/dashboard')}
              className="rounded-xl border border-nn-mist bg-white px-5 py-3 text-sm font-semibold text-nn-navy hover:bg-nn-pale-sky transition-colors"
            >
              ← Back to Dashboard
            </button>
            <button
              onClick={() => navigate('/messaging?tab=doctor')}
              className="rounded-xl bg-nn-deep-blue px-5 py-3 text-sm font-semibold text-white hover:bg-nn-navy-light transition-colors"
            >
              Message Dr. Rivera
            </button>
            <button
              onClick={() => navigate('/messaging?tab=ai')}
              className="rounded-xl bg-nn-periwinkle px-5 py-3 text-sm font-semibold text-nn-navy hover:bg-nn-soft-blue transition-colors"
            >
              Ask NatalNanny AI
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
