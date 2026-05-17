import { useNavigate } from 'react-router-dom'
import happyCappy from '../../assets/happy_cappy.PNG'
import superHappyCap from '../../assets/super_happy_cap.PNG'

interface HeroCheckupCardProps {
  todayCheckupComplete: boolean
  streakCount: number
  longestStreak: number
  mascotHealth: number
  displayName: string
}

function getGreeting() {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 17) return 'Good afternoon'
  return 'Good evening'
}

function Confetti() {
  const particles = Array.from({ length: 20 }, (_, i) => ({
    id: i,
    left: Math.random() * 100,
    delay: Math.random() * 0.5,
    color: ['#10b981', '#3b82f6', '#f59e0b', '#ec4899'][Math.floor(Math.random() * 4)],
  }))

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {particles.map(p => (
        <div
          key={p.id}
          className="confetti absolute w-2 h-2 rounded-full"
          style={{
            left: `${p.left}%`,
            top: '-10px',
            backgroundColor: p.color,
            animationDelay: `${p.delay}s`,
          }}
        />
      ))}
    </div>
  )
}

export default function HeroCheckupCard({
  todayCheckupComplete,
  streakCount,
  longestStreak,
  mascotHealth,
  displayName,
}: HeroCheckupCardProps) {
  const navigate = useNavigate()

  // Complete state - celebrating with confetti
  if (todayCheckupComplete) {
    return (
      <div className="fade-up fade-up-1 relative rounded-3xl bg-gradient-to-br from-emerald-50 to-emerald-100 p-6 sm:p-8 shadow-sm min-h-56 overflow-hidden">
        <Confetti />

        {/* Celebrating Sam - positioned top-left */}
        <img
          src={superHappyCap}
          alt="Sam celebrating"
          className="absolute -top-2 -left-2 h-32 w-32 object-contain breathe"
        />

        {/* Streak badge - top-right */}
        <div className="absolute top-4 right-4 bg-white rounded-full px-4 py-2 shadow-sm">
          <p className="text-sm font-semibold text-emerald-700">
            🔥 {streakCount} {streakCount === 1 ? 'day' : 'days'} in a row
          </p>
        </div>

        {/* Content - positioned to avoid Sam overlap */}
        <div className="relative ml-28 mt-2">
          <h2 className="text-2xl font-bold text-emerald-800">
            Great work, {displayName}! ✨
          </h2>
          <p className="text-emerald-600 mt-1">
            Today's checkup complete
          </p>

          {/* Quick metrics inline */}
          <div className="flex gap-4 mt-4 text-sm text-emerald-700">
            <div>
              <span className="font-semibold">Pulse:</span> tracked
            </div>
            <div>
              <span className="font-semibold">Signal:</span> captured
            </div>
            <div>
              <span className="font-semibold">Wellness:</span> analyzed
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex gap-3 mt-6">
            <button
              onClick={() => navigate('/checkup/results')}
              className="flex-1 sm:flex-none rounded-xl bg-emerald-500 px-6 py-3 text-sm font-semibold text-white hover:bg-emerald-600 transition-colors shadow-sm"
            >
              View full results
            </button>
            <button
              onClick={() => navigate('/messaging')}
              className="flex-1 sm:flex-none rounded-xl bg-white px-6 py-3 text-sm font-semibold text-emerald-700 hover:bg-emerald-50 transition-colors border border-emerald-200"
            >
              Share with doctor
            </button>
          </div>

          {/* Motivational text */}
          <p className="mt-4 text-sm text-emerald-600/80">
            Come back tomorrow for day {streakCount + 1}!
          </p>
        </div>
      </div>
    )
  }

  // Pending state - calling user to action
  return (
    <div className="fade-up fade-up-1 relative rounded-3xl bg-gradient-to-br from-nn-pale-sky to-nn-periwinkle p-6 sm:p-8 shadow-sm min-h-64 overflow-hidden">
      {/* Sam illustration - positioned top-left with overlap */}
      <img
        src={happyCappy}
        alt="Sam the capybara"
        className="absolute -top-2 -left-2 h-32 w-32 object-contain breathe"
      />

      {/* Streak badge - top-right */}
      <div className="absolute top-4 right-4 bg-white rounded-full px-4 py-2 shadow-sm">
        <p className="text-sm font-semibold text-nn-navy">
          🔥 {streakCount} {streakCount === 1 ? 'day' : 'days'} in a row
        </p>
      </div>

      {/* Content - positioned to avoid Sam overlap */}
      <div className="relative ml-28 mt-2">
        <h2 className="text-2xl font-bold text-nn-navy">
          {getGreeting()}, {displayName}
        </h2>
        <p className="text-nn-navy-light mt-1">
          Your daily checkup is ready
        </p>

        {/* Sam's health status */}
        <div className="mt-4 inline-flex items-center gap-2 rounded-full bg-white/60 backdrop-blur-sm px-4 py-2">
          <div className="h-2 w-16 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-emerald-400 to-emerald-600 transition-all"
              style={{ width: `${mascotHealth}%` }}
            />
          </div>
          <span className="text-sm font-semibold text-nn-navy">
            Sam: {mascotHealth}%
          </span>
        </div>

        {/* Main CTA button */}
        <button
          onClick={() => navigate('/checkup')}
          className="mt-6 w-full sm:w-auto rounded-xl bg-nn-deep-blue px-8 py-4 text-lg font-semibold text-white shadow-md hover:bg-nn-deep-blue-hover transition-colors pulse-glow"
        >
          Start today's 2-minute checkup
        </button>

        {/* Helper text */}
        <p className="mt-4 text-sm text-nn-navy-light">
          Uses your webcam to estimate heart and breathing signals
        </p>

        {/* Streak motivation */}
        {streakCount > 0 && (
          <div className="mt-4 pt-4 border-t border-nn-periwinkle/50">
            <p className="text-xs text-nn-navy-light">
              Complete today's checkup to extend your streak
            </p>
            {longestStreak > 0 && (
              <p className="text-xs text-nn-navy-light mt-1">
                Personal best: <span className="font-semibold">{longestStreak} {longestStreak === 1 ? 'day' : 'days'}</span>
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
