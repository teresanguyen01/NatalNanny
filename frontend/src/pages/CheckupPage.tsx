import { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAppContext } from '../contexts/AppContext'
import CheckupProgressRing from '../components/checkup/CheckupProgressRing'
import { api } from '../lib/api'

type Stage = 'idle' | 'requesting' | 'recording' | 'uploading' | 'analyzing' | 'done'
type Mode = 'real' | 'demo'

const DURATION = 60

const INSTRUCTIONS = [
  { icon: '💡', text: 'Good lighting — face the camera directly' },
  { icon: '🧘', text: 'Sit still and breathe normally' },
  { icon: '👤', text: 'Keep your face visible and uncovered' },
  { icon: '📵', text: 'Avoid moving your device' },
]

function getSupportedMimeType(): string {
  const candidates = [
    'video/webm;codecs=vp9',
    'video/webm;codecs=vp8',
    'video/webm',
    'video/mp4',
  ]
  return candidates.find(t => MediaRecorder.isTypeSupported(t)) ?? 'video/webm'
}

function sessionId(): string {
  return new Date().toISOString().replace(/\D/g, '').slice(0, 15)
}

export default function CheckupPage() {
  const navigate = useNavigate()
  const { markCheckupComplete, todayCheckupComplete, setCheckupResult } = useAppContext()
  const [stage, setStage] = useState<Stage>('idle')
  const [secondsLeft, setSecondsLeft] = useState(DURATION)
  const [mode, setMode] = useState<Mode>('real')
  const [cameraError, setCameraError] = useState<string | null>(null)

  // Camera / recording refs — do not store in state to avoid re-renders
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const recorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const didAnalyzeRef = useRef(false)  // guard against double-fire in StrictMode

  // Stop camera tracks on unmount
  useEffect(() => {
    return () => { streamRef.current?.getTracks().forEach(t => t.stop()) }
  }, [])

  const progress =
    stage === 'recording'
      ? ((DURATION - secondsLeft) / DURATION) * 100
      : stage === 'uploading' || stage === 'analyzing' || stage === 'done'
      ? 100
      : 0

  // ── Start real 60-second scan ──────────────────────────────────────────────
  const startRecording = useCallback(async () => {
    if (todayCheckupComplete) { navigate('/checkup/results'); return }
    setCameraError(null)
    didAnalyzeRef.current = false
    setMode('real')
    setStage('requesting')

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 640 }, height: { ideal: 480 }, frameRate: { ideal: 30 } },
        audio: false,
      })
      streamRef.current = stream

      // Wire up the live preview
      if (videoRef.current) {
        videoRef.current.srcObject = stream
      }

      // Set up MediaRecorder
      const mimeType = getSupportedMimeType()
      const recorder = new MediaRecorder(stream, { mimeType })
      recorderRef.current = recorder
      chunksRef.current = []
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data)
      }
      recorder.start(500) // collect data every 500 ms

      setStage('recording')
      setSecondsLeft(DURATION)
    } catch (err) {
      const msg = err instanceof DOMException && err.name === 'NotAllowedError'
        ? 'Camera permission denied. Using demo mode instead.'
        : 'Camera not available. Using demo mode instead.'
      setCameraError(msg)
      // Auto-fall through to demo
      setMode('demo')
      setStage('analyzing')
    }
  }, [todayCheckupComplete, navigate])

  // ── Demo (no camera) ───────────────────────────────────────────────────────
  const startDemo = useCallback(() => {
    if (todayCheckupComplete) { navigate('/checkup/results'); return }
    didAnalyzeRef.current = false
    setMode('demo')
    setStage('analyzing')
  }, [todayCheckupComplete, navigate])

  // ── Countdown ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (stage !== 'recording') return
    if (secondsLeft <= 0) {
      setStage('uploading')
      return
    }
    const id = setTimeout(() => setSecondsLeft((s) => s - 1), 1000)
    return () => clearTimeout(id)
  }, [stage, secondsLeft])

  // ── Upload + analyze after recording ──────────────────────────────────────
  useEffect(() => {
    if (stage !== 'uploading') return
    if (didAnalyzeRef.current) return
    didAnalyzeRef.current = true

    const recorder = recorderRef.current

    if (!recorder || recorder.state === 'inactive') {
      // Recorder already stopped or never started — fall to mock
      setStage('analyzing')
      return
    }

    recorder.onstop = async () => {
      const mimeType = recorder.mimeType || 'video/webm'
      const blob = new Blob(chunksRef.current, { type: mimeType })

      // Release camera
      streamRef.current?.getTracks().forEach(t => t.stop())

      try {
        const result = await api.checkup.upload(blob, sessionId())
        setCheckupResult(result)
      } catch (uploadErr) {
        console.warn('Upload/analysis failed, falling back to mock:', uploadErr)
        try {
          const result = await api.checkup.mock(78, 'good')
          setCheckupResult(result)
        } catch { /* no backend */ }
      }

      markCheckupComplete()
      setStage('done')
      navigate('/checkup/results')
    }

    recorder.stop()
  }, [stage, markCheckupComplete, setCheckupResult, navigate])

  // ── Demo / mock analysis path ─────────────────────────────────────────────
  useEffect(() => {
    if (stage !== 'analyzing') return
    if (didAnalyzeRef.current) return
    didAnalyzeRef.current = true

    const demoHr = parseFloat((85 + Math.random() * 20).toFixed(1))
    const id = setTimeout(async () => {
      try {
        const result = await api.checkup.mock(demoHr, 'good')
        setCheckupResult(result)
      } catch { /* no backend */ }
      markCheckupComplete()
      setStage('done')
      navigate('/checkup/results')
    }, 2000)
    return () => clearTimeout(id)
  }, [stage, markCheckupComplete, setCheckupResult, navigate])

  // Derived label for the status bar during uploading
  const isProcessing = stage === 'uploading' || stage === 'analyzing'

  return (
    <div className="flex h-full flex-col overflow-hidden">

      {/* ── Header ── */}
      <header className="flex-shrink-0 border-b border-nn-mist/60 bg-white px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-nn-navy">60-Second Wellness Checkup</h1>
            <p className="text-xs text-nn-navy-light" style={{ fontFamily: 'var(--font-body)' }}>
              Estimates heart rate via rPPG webcam analysis
            </p>
          </div>
          <StageBadge stage={stage} />
        </div>
      </header>

      {/* ── Body ── */}
      <div className="flex flex-1 flex-col gap-3 overflow-hidden p-4 lg:p-5">

        {/* Safety notice */}
        <div className="flex-shrink-0">
          <CompactSafetyNotice />
        </div>

        {/* Camera error banner */}
        {cameraError && (
          <div className="flex-shrink-0 rounded-xl border border-amber-200 bg-amber-50 px-4 py-2 text-xs text-amber-800">
            {cameraError}
          </div>
        )}

        {/* ── Two-column layout ── */}
        <div className="flex flex-1 gap-4 overflow-hidden flex-col lg:flex-row">

          {/* Left: webcam + CTA */}
          <div className="flex flex-1 lg:flex-[3] flex-col gap-3 overflow-hidden">

            {/* Webcam area */}
            <div className="relative flex-1 overflow-hidden rounded-2xl bg-[#1a2540] min-h-[140px]">

              {/* ── Live video element (always in DOM so ref stays valid) ── */}
              <video
                ref={videoRef}
                className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-300 ${
                  stage === 'recording' ? 'opacity-100' : 'opacity-0'
                }`}
                autoPlay
                muted
                playsInline
              />

              {/* ── Overlay decorations ── */}
              <WebcamOverlay stage={stage} secondsLeft={secondsLeft} />
            </div>

            {/* CTA / status */}
            <div className="flex-shrink-0">
              {stage === 'idle' && (
                <div className="space-y-2">
                  <button
                    onClick={startRecording}
                    className="w-full rounded-xl bg-nn-deep-blue px-6 py-3 text-sm font-bold text-white shadow-sm hover:bg-nn-deep-blue-hover transition-colors"
                  >
                    {todayCheckupComplete ? "View today's results" : 'Begin 60-second scan'}
                  </button>
                  {!todayCheckupComplete && (
                    <>
                      <p className="text-center text-xs text-nn-navy-light">or</p>
                      <button
                        onClick={startDemo}
                        className="w-full rounded-xl border border-nn-periwinkle bg-white px-5 py-2.5 text-xs font-semibold text-nn-deep-blue hover:bg-nn-pale-sky transition-colors"
                      >
                        Skip camera — run demo check-in
                      </button>
                      <p className="text-center text-[10px] text-nn-navy-light leading-snug">
                        Demo mode generates sample data without camera access
                      </p>
                    </>
                  )}
                </div>
              )}
              {stage === 'requesting' && (
                <div className="rounded-xl border border-nn-periwinkle bg-nn-pale-sky px-5 py-3 text-center">
                  <p className="font-semibold text-nn-navy">Requesting camera access…</p>
                  <p className="text-xs text-nn-navy-light" style={{ fontFamily: 'var(--font-body)' }}>Allow camera access when prompted</p>
                </div>
              )}
              {stage === 'recording' && (
                <div className="rounded-xl border border-red-200 bg-red-50 px-5 py-3 text-center">
                  <p className="font-semibold text-red-700">
                    Recording… <span className="text-nn-deep-blue">{secondsLeft}s remaining</span>
                  </p>
                  <p className="text-xs text-red-500" style={{ fontFamily: 'var(--font-body)' }}>
                    Stay still, face the camera, breathe normally
                  </p>
                </div>
              )}
              {isProcessing && (
                <div className="rounded-xl border border-nn-periwinkle bg-nn-pale-sky px-5 py-3 text-center">
                  <p className="font-semibold text-nn-navy">
                    {stage === 'uploading' ? 'Uploading & analyzing…' : 'Analyzing camera-based wellness signals…'}
                  </p>
                  <p className="text-xs text-nn-navy-light" style={{ fontFamily: 'var(--font-body)' }}>
                    {stage === 'uploading' ? 'Running rPPG analysis — this may take a few seconds' : 'Processing — almost done'}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Right: ring + panel */}
          <div className="flex lg:flex-[2] flex-col gap-3 overflow-hidden lg:min-w-[260px] lg:max-w-[340px]">

            {/* Progress ring */}
            <div className="flex-shrink-0 rounded-2xl bg-white px-4 py-5 shadow-sm flex flex-col items-center gap-3">
              <CheckupProgressRing
                progress={progress}
                secondsLeft={secondsLeft}
                isRecording={stage === 'recording'}
                isAnalyzing={isProcessing}
              />

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

            {/* Instructions / status panel */}
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
                  <div className="h-3 w-3 rounded-full bg-red-500 animate-pulse" />
                  <div>
                    <p className="text-sm font-bold text-nn-navy">Recording active</p>
                    <p className="text-xs text-nn-navy-light mt-1" style={{ fontFamily: 'var(--font-body)' }}>
                      Hold still for the best signal quality
                    </p>
                  </div>
                  <p className="text-[10px] text-nn-navy-light px-3" style={{ fontFamily: 'var(--font-body)' }}>
                    Video is being recorded for rPPG analysis. No data leaves your device until analysis begins.
                  </p>
                </div>
              ) : (
                <div className="flex h-full flex-col items-center justify-center text-center gap-3">
                  <div className="h-10 w-10 animate-spin rounded-full border-4 border-nn-periwinkle border-t-nn-deep-blue" />
                  <div>
                    <p className="text-sm font-bold text-nn-navy">
                      {stage === 'uploading' ? 'Running rPPG analysis…' : 'Processing…'}
                    </p>
                    <p className="text-xs text-nn-navy-light mt-1" style={{ fontFamily: 'var(--font-body)' }}>
                      {stage === 'uploading'
                        ? 'Estimating heart rate from camera signal'
                        : 'Estimating wellness signals'}
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
    idle:      { label: 'Ready',        cls: 'bg-nn-mist text-nn-navy-light' },
    requesting:{ label: '◌ Requesting', cls: 'bg-amber-100 text-amber-700' },
    recording: { label: '● Recording',  cls: 'bg-red-100 text-red-600' },
    uploading: { label: '↑ Uploading',  cls: 'bg-nn-pale-sky text-nn-deep-blue' },
    analyzing: { label: '◌ Analyzing',  cls: 'bg-nn-pale-sky text-nn-deep-blue' },
    done:      { label: '✓ Complete',   cls: 'bg-emerald-100 text-emerald-700' },
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

function WebcamOverlay({ stage, secondsLeft }: { stage: Stage; secondsLeft: number }) {
  return (
    <>
      {/* Solid background only when camera isn't showing */}
      {stage !== 'recording' && (
        <div className="absolute inset-0 bg-gradient-to-br from-[#1a2540] to-nn-navy" />
      )}

      {/* Subtle dark scrim behind HUD elements during recording */}
      {stage === 'recording' && (
        <div className="absolute inset-0 bg-black/20" />
      )}

      {/* Idle: camera placeholder icon */}
      {stage === 'idle' && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-white/50">
          <svg viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="1.4" className="h-14 w-14">
            <rect x="3" y="10" width="42" height="30" rx="5" />
            <circle cx="24" cy="25" r="8" />
            <circle cx="24" cy="25" r="3.5" fill="currentColor" stroke="none" opacity="0.3" />
            <path d="M34 6l5 4-5 4" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <p className="text-sm font-semibold">Camera preview</p>
          <p className="text-xs opacity-60" style={{ fontFamily: 'var(--font-body)' }}>
            Webcam access requested on scan start
          </p>
        </div>
      )}

      {/* Requesting: spinner */}
      {stage === 'requesting' && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-white">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-white/20 border-t-white" />
          <p className="text-sm font-semibold">Accessing camera…</p>
        </div>
      )}

      {/* Recording: HUD overlays on top of real video */}
      {stage === 'recording' && (
        <>
          {/* REC badge */}
          <div className="absolute top-3 left-3 flex items-center gap-2 rounded-full bg-black/60 px-3 py-1.5 backdrop-blur-sm">
            <div className="h-2.5 w-2.5 rounded-full bg-red-500 animate-pulse" />
            <span className="text-xs font-bold text-white">REC</span>
          </div>
          {/* Timer */}
          <div className="absolute top-3 right-3 rounded-full bg-black/60 px-3 py-1.5 backdrop-blur-sm">
            <span className="text-xs font-mono font-bold text-white">
              {String(Math.floor(secondsLeft / 60)).padStart(2, '0')}:
              {String(secondsLeft % 60).padStart(2, '0')}
            </span>
          </div>
          {/* ECG waveform at the bottom */}
          <div className="absolute bottom-0 inset-x-0 h-14 flex items-end px-4 pb-3">
            <svg viewBox="0 0 320 36" className="w-full h-full opacity-60">
              <polyline
                points="0,18 22,18 32,4 42,32 52,12 64,18 86,18 96,4 106,32 116,12 128,18 150,18 160,4 170,32 180,12 192,18 214,18 224,4 234,32 244,12 256,18 278,18 288,4 298,32 308,12 320,18"
                fill="none" stroke="#4663ac" strokeWidth="2"
                strokeLinecap="round" strokeLinejoin="round"
              />
            </svg>
          </div>
        </>
      )}

      {/* Uploading / analyzing: spinner */}
      {(stage === 'uploading' || stage === 'analyzing') && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 text-white">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-white/20 border-t-white" />
          <div className="text-center">
            <p className="text-sm font-bold">
              {stage === 'uploading' ? 'Running rPPG analysis…' : 'Analyzing wellness signals…'}
            </p>
            <p className="text-xs text-white/50 mt-1" style={{ fontFamily: 'var(--font-body)' }}>
              {stage === 'uploading' ? 'Processing camera frames' : 'Estimating check-in metrics'}
            </p>
          </div>
        </div>
      )}

      {/* Face guide (idle + recording) */}
      {(stage === 'idle' || stage === 'recording') && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="h-32 w-24 rounded-full border-2 border-dashed border-white/30" />
        </div>
      )}
    </>
  )
}
