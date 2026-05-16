import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAppContext } from '../contexts/AppContext'
import CheckupProgressRing from '../components/checkup/CheckupProgressRing'

type Stage = 'idle' | 'recording' | 'analyzing' | 'done'

const DURATION = 60

const INSTRUCTIONS = [
  { icon: '💡', text: 'Good lighting — face the camera directly' },
  { icon: '🧘', text: 'Sit still and breathe normally' },
  { icon: '👤', text: 'Keep your face visible and uncovered' },
  { icon: '📵', text: 'Avoid moving your device' },
]

export default function CheckupPage() {
  const navigate = useNavigate()
  const { markCheckupComplete, todayCheckupComplete } = useAppContext()
  const [stage, setStage] = useState<Stage>('idle')
  const [secondsLeft, setSecondsLeft] = useState(DURATION)

  const progress =
    stage === 'recording'
      ? ((DURATION - secondsLeft) / DURATION) * 100
      : stage === 'analyzing' || stage === 'done'
      ? 100
      : 0

  const startRecording = useCallback(() => {
    if (todayCheckupComplete) { navigate('/checkup/results'); return }
    setStage('recording')
    setSecondsLeft(DURATION)
  }, [todayCheckupComplete, navigate])

  useEffect(() => {
    if (stage !== 'recording') return
    if (secondsLeft <= 0) { setStage('analyzing'); return }
    const id = setTimeout(() => setSecondsLeft((s) => s - 1), 1000)
    return () => clearTimeout(id)
  }, [stage, secondsLeft])

  useEffect(() => {
    if (stage !== 'analyzing') return
    const id = setTimeout(() => {
      markCheckupComplete()
      setStage('done')
      navigate('/checkup/results')
    }, 2500)
    return () => clearTimeout(id)
  }, [stage, markCheckupComplete, navigate])

  return (
    /* Fills the parent flex-1 column exactly — no scroll on desktop */
    <div className="flex h-full flex-col overflow-hidden">

      {/* ── Compact header ── */}
      <header className="flex-shrink-0 border-b border-nn-mist/60 bg-white px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-nn-navy">60-Second Wellness Checkup</h1>
            <p className="text-xs text-nn-navy-light" style={{ fontFamily: 'var(--font-body)' }}>
              Estimates heart rate &amp; respiratory rate via rPPG webcam analysis
            </p>
          </div>
          {/* Stage badge */}
          <StageBadge stage={stage} />
        </div>
      </header>

      {/* ── Body — flex-1, no outer scroll ── */}
      <div className="flex flex-1 flex-col gap-3 overflow-hidden p-4 lg:p-5">

        {/* Safety notice — always pinned at top, compact */}
        <div className="flex-shrink-0">
          <CompactSafetyNotice />
        </div>

        {/* ── Two-column grid — fills remaining height ── */}
        <div className="flex flex-1 gap-4 overflow-hidden flex-col lg:flex-row">

          {/* ── Left column: webcam + CTA (3/5) ── */}
          <div className="flex flex-1 lg:flex-[3] flex-col gap-3 overflow-hidden">

            {/* Webcam preview — fills all available height */}
            <div className="relative flex-1 overflow-hidden rounded-2xl bg-[#1a2540] min-h-[140px]">
              <WebcamArea stage={stage} secondsLeft={secondsLeft} />
            </div>

            {/* CTA / status — pinned to bottom of left col */}
            <div className="flex-shrink-0">
              {stage === 'idle' && (
                <button
                  onClick={startRecording}
                  className="w-full rounded-xl bg-nn-deep-blue px-6 py-3.5 text-sm font-bold text-white shadow-sm hover:bg-nn-navy-light transition-colors"
                >
                  {todayCheckupComplete ? "View today's results" : 'Begin 60-second scan'}
                </button>
              )}
              {stage === 'recording' && (
                <div className="rounded-xl border border-nn-periwinkle bg-nn-pale-sky px-5 py-3 text-center">
                  <p className="font-semibold text-nn-navy">Recording… <span className="text-nn-deep-blue">{secondsLeft}s remaining</span></p>
                  <p className="text-xs text-nn-navy-light" style={{ fontFamily: 'var(--font-body)' }}>Stay still and face the camera</p>
                </div>
              )}
              {stage === 'analyzing' && (
                <div className="rounded-xl border border-nn-periwinkle bg-nn-pale-sky px-5 py-3 text-center">
                  <p className="font-semibold text-nn-navy">Analyzing rPPG signal…</p>
                  <p className="text-xs text-nn-navy-light" style={{ fontFamily: 'var(--font-body)' }}>Processing camera frames — almost done</p>
                </div>
              )}
            </div>
          </div>

          {/* ── Right column: ring + panel (2/5) ── */}
          <div className="flex lg:flex-[2] flex-col gap-3 overflow-hidden lg:min-w-[260px] lg:max-w-[340px]">

            {/* Progress ring card */}
            <div className="flex-shrink-0 rounded-2xl bg-white px-4 py-5 shadow-sm flex flex-col items-center gap-3">
              <CheckupProgressRing
                progress={progress}
                secondsLeft={secondsLeft}
                isRecording={stage === 'recording'}
                isAnalyzing={stage === 'analyzing'}
              />

              {/* Voice check-in — recording only */}
              {stage === 'recording' && (
                <div className="w-full rounded-xl border border-nn-periwinkle bg-nn-pale-sky px-4 py-3 text-center">
                  <p className="text-xs font-semibold text-nn-navy mb-1 flex items-center justify-center gap-1">
                    <svg viewBox="0 0 16 16" fill="none" stroke="#4663ac" strokeWidth="1.6" className="h-3.5 w-3.5">
                      <rect x="5" y="1" width="6" height="9" rx="3" />
                      <path d="M3 8a5 5 0 0 0 10 0M8 14v-2" strokeLinecap="round" />
                    </svg>
                    Wellness check-in
                  </p>
                  <p className="text-[11px] text-nn-navy-light italic" style={{ fontFamily: 'var(--font-body)' }}>
                    "Any chest pain or shortness of breath today?"
                  </p>
                </div>
              )}
            </div>

            {/* Instructions panel (idle) / rPPG info (recording/analyzing) */}
            <div className="flex-1 overflow-y-auto rounded-2xl bg-white p-4 shadow-sm">
              {stage === 'idle' ? (
                <>
                  <p className="mb-3 text-sm font-bold text-nn-navy">Best results tips</p>
                  <div className="space-y-2">
                    {INSTRUCTIONS.map(({ icon, text }) => (
                      <div key={text} className="flex items-center gap-2.5 rounded-xl bg-nn-pale-sky px-3 py-2.5">
                        <span className="text-base flex-shrink-0">{icon}</span>
                        <p className="text-xs text-nn-navy" style={{ fontFamily: 'var(--font-body)' }}>{text}</p>
                      </div>
                    ))}
                  </div>
                  <div className="mt-3 rounded-xl bg-nn-mist/60 px-3 py-2.5 text-[10px] text-nn-navy-light leading-relaxed" style={{ fontFamily: 'var(--font-body)' }}>
                    <strong className="text-nn-navy">About rPPG:</strong> Detects subtle color changes in skin caused by blood flow — webcam only, no wearable needed.
                  </div>
                </>
              ) : stage === 'recording' ? (
                <div className="flex h-full flex-col items-center justify-center text-center gap-3">
                  <svg viewBox="0 0 40 40" fill="none" stroke="#4663ac" strokeWidth="1.5" className="h-12 w-12 opacity-60">
                    <path d="M20 28S8 21.5 8 13a7 7 0 0 1 12-4.9A7 7 0 0 1 32 13c0 8.5-12 15-12 15Z" />
                  </svg>
                  <div>
                    <p className="text-sm font-bold text-nn-navy">Recording active</p>
                    <p className="text-xs text-nn-navy-light mt-1" style={{ fontFamily: 'var(--font-body)' }}>
                      Hold still for the best signal quality
                    </p>
                  </div>
                </div>
              ) : (
                <div className="flex h-full flex-col items-center justify-center text-center gap-3">
                  <div className="h-10 w-10 animate-spin rounded-full border-4 border-nn-periwinkle border-t-nn-deep-blue" />
                  <div>
                    <p className="text-sm font-bold text-nn-navy">Processing…</p>
                    <p className="text-xs text-nn-navy-light mt-1" style={{ fontFamily: 'var(--font-body)' }}>
                      Estimating heart rate &amp; breathing signals
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

/* ── Sub-components ── */

function StageBadge({ stage }: { stage: Stage }) {
  const map: Record<Stage, { label: string; cls: string }> = {
    idle:      { label: 'Ready',      cls: 'bg-nn-mist text-nn-navy-light' },
    recording: { label: '● Recording', cls: 'bg-red-100 text-red-600' },
    analyzing: { label: '◌ Analyzing', cls: 'bg-nn-pale-sky text-nn-deep-blue' },
    done:      { label: '✓ Complete',  cls: 'bg-emerald-100 text-emerald-700' },
  }
  const { label, cls } = map[stage]
  return (
    <span className={`rounded-full px-3 py-1.5 text-xs font-semibold ${cls}`}>{label}</span>
  )
}

function CompactSafetyNotice() {
  return (
    <div className="flex items-start gap-2.5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-2.5">
      <svg viewBox="0 0 16 16" fill="none" stroke="#d97706" strokeWidth="1.6" className="mt-0.5 h-3.5 w-3.5 flex-shrink-0">
        <path d="M8 1L1 14h14L8 1Z" strokeLinejoin="round" />
        <path d="M8 6v4M8 11.5v.5" strokeLinecap="round" />
      </svg>
      <p className="text-[11px] text-amber-700 leading-snug" style={{ fontFamily: 'var(--font-body)' }}>
        <strong>Not a diagnosis.</strong> Seek <strong>urgent care</strong> for chest pain, trouble breathing, fainting, severe headache, vision changes, heavy bleeding, or reduced fetal movement.
      </p>
    </div>
  )
}

function WebcamArea({ stage, secondsLeft }: { stage: Stage; secondsLeft: number }) {
  return (
    <>
      {/* Base overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#1a2540] to-nn-navy" />

      {stage === 'idle' && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-white/50">
          <svg viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="1.4" className="h-14 w-14">
            <rect x="3" y="10" width="42" height="30" rx="5" />
            <circle cx="24" cy="25" r="8" />
            <circle cx="24" cy="25" r="3.5" fill="currentColor" stroke="none" opacity="0.3" />
            <path d="M34 6l5 4-5 4" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <p className="text-sm font-semibold">Camera preview</p>
          <p className="text-xs opacity-60" style={{ fontFamily: 'var(--font-body)' }}>Webcam access requested on scan start</p>
        </div>
      )}

      {stage === 'recording' && (
        <>
          <div className="absolute inset-0 flex flex-col items-center justify-center text-white/30">
            <svg viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="1.2" className="h-20 w-20 opacity-20">
              <circle cx="24" cy="24" r="14" />
              <circle cx="24" cy="24" r="5" fill="currentColor" stroke="none" />
            </svg>
          </div>
          {/* REC badge */}
          <div className="absolute top-3 left-3 flex items-center gap-2 rounded-full bg-black/50 px-3 py-1.5">
            <div className="recording-dot h-2.5 w-2.5 rounded-full bg-red-500" />
            <span className="text-xs font-bold text-white">REC</span>
          </div>
          {/* Timer */}
          <div className="absolute top-3 right-3 rounded-full bg-black/50 px-3 py-1.5">
            <span className="text-xs font-mono font-bold text-white">
              {String(Math.floor(secondsLeft / 60)).padStart(2, '0')}:
              {String(secondsLeft % 60).padStart(2, '0')}
            </span>
          </div>
          {/* ECG waveform */}
          <div className="absolute bottom-0 inset-x-0 h-14 flex items-end px-4 pb-3">
            <svg viewBox="0 0 320 36" className="w-full h-full opacity-50">
              <polyline
                points="0,18 22,18 32,4 42,32 52,12 64,18 86,18 96,4 106,32 116,12 128,18 150,18 160,4 170,32 180,12 192,18 214,18 224,4 234,32 244,12 256,18 278,18 288,4 298,32 308,12 320,18"
                fill="none" stroke="#4663ac" strokeWidth="2"
                strokeLinecap="round" strokeLinejoin="round"
              />
            </svg>
          </div>
        </>
      )}

      {stage === 'analyzing' && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 text-white">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-white/20 border-t-white" />
          <div className="text-center">
            <p className="text-sm font-bold">Analyzing rPPG signal…</p>
            <p className="text-xs text-white/50 mt-1" style={{ fontFamily: 'var(--font-body)' }}>Processing camera frames</p>
          </div>
        </div>
      )}

      {/* Face-guide overlay frame (idle & recording) */}
      {(stage === 'idle' || stage === 'recording') && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="h-32 w-24 rounded-full border-2 border-dashed border-white/20" />
        </div>
      )}
    </>
  )
}
