import { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useAppContext } from '../contexts/AppContext'
import CheckupProgressRing from '../components/checkup/CheckupProgressRing'
import { api, getProfile } from '../lib/api'
import type { VoiceQuestion } from '../types/checkup'

type Stage =
  | 'idle'
  | 'requesting'
  | 'starting_session'
  | 'recording'
  | 'uploading'
  | 'finishing'
  | 'done'

type Mode = 'real' | 'demo'
type MicState = 'awaiting' | 'listening' | 'transcribing' | 'ready' | 'done' | 'disabled'

interface AnswerItem {
  questionId: string
  question: string
  rawTranscript: string
}

const DURATION = 120

function getSupportedVideoMimeType(): string {
  const candidates = ['video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm', 'video/mp4']
  return candidates.find((t) => MediaRecorder.isTypeSupported(t)) ?? 'video/webm'
}

function getSupportedAudioMimeType(): string {
  const candidates = ['audio/webm;codecs=opus', 'audio/webm', 'audio/ogg', 'audio/mp4']
  return candidates.find((t) => MediaRecorder.isTypeSupported(t)) ?? 'audio/webm'
}

// Preferred voice names in priority order.
// Exact names vary by browser/OS — getBestVoice() tries each in turn.
// v.name values as reported by Chrome/macOS — no lang suffix (that's v.lang separately)
const PREFERRED_VOICE_NAMES = [
  'Flo (English (United States))',   // macOS newer enhanced — warmest
  'Sandy (English (United States))',
  'Shelley (English (United States))',
  'Samantha',                        // macOS classic
  'Microsoft Ava Online (Natural) - English (United States)',
  'en-US-AvaNeural',
  'Microsoft Aria Online (Natural)',
  'Google US English',
  'Google UK English Female',
]

function pickVoice(voices: SpeechSynthesisVoice[]): SpeechSynthesisVoice | null {
  for (const name of PREFERRED_VOICE_NAMES) {
    const match = voices.find((v) => v.name === name)
    if (match) return match
  }
  // Last resort: any en-US voice, preferring female-sounding names
  const enUS = voices.filter((v) => v.lang === 'en-US' || v.lang === 'en_US')
  return (
    enUS.find((v) => /flo|sandy|shelley|samantha|karen|aria|ava/i.test(v.name)) ??
    enUS[0] ??
    null
  )
}

function speakWebSpeech(text: string, onEnd: () => void) {
  if (!('speechSynthesis' in window)) { onEnd(); return }
  window.speechSynthesis.cancel()
  const doSpeak = (voices: SpeechSynthesisVoice[]) => {
    const utterance = new SpeechSynthesisUtterance(text)
    const voice = pickVoice(voices)
    if (voice) utterance.voice = voice
    utterance.rate = 0.88
    utterance.pitch = 1.0
    utterance.lang = 'en-US'
    let done = false
    const finish = () => { if (!done) { done = true; onEnd() } }
    utterance.onend = finish
    utterance.onerror = finish
    setTimeout(finish, 15000)
    window.speechSynthesis.speak(utterance)
  }
  const voices = window.speechSynthesis.getVoices()
  if (voices.length > 0) {
    doSpeak(voices)
  } else {
    window.speechSynthesis.addEventListener('voiceschanged', () => doSpeak(window.speechSynthesis.getVoices()), { once: true })
  }
}

function speakQuestion(text: string, onEnd: () => void) {
  const ttsBase = (import.meta as Record<string, Record<string, string>>).env?.VITE_API_URL || ''

  fetch(`${ttsBase}/api/tts/speak`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text }),
  })
    .then(async (res) => {
      if (!res.ok) throw new Error('TTS endpoint error')
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const audio = new Audio(url)
      let done = false
      const finish = () => { if (!done) { done = true; URL.revokeObjectURL(url); onEnd() } }
      audio.onended = finish
      audio.onerror = finish
      setTimeout(finish, 20000)
      audio.play().catch(finish)
    })
    .catch(() => {
      // Backend unavailable — fall back to browser TTS
      speakWebSpeech(text, onEnd)
    })
}

function sessionId(): string {
  return new Date().toISOString().replace(/\D/g, '').slice(0, 15)
}

export default function CheckupPage() {
  const navigate = useNavigate()
  const { role } = useAuth()
  const { markCheckupComplete, todayCheckupComplete, setCheckupResult } = useAppContext()

  // Redirect doctors to dashboard
  useEffect(() => {
    if (role === 'doctor') {
      navigate('/dashboard', { replace: true })
    }
  }, [role, navigate])

  const [stage, setStage] = useState<Stage>('idle')
  const [secondsLeft, setSecondsLeft] = useState(DURATION)
  const [mode, setMode] = useState<Mode>('real')
  const [cameraError, setCameraError] = useState<string | null>(null)
  const [micError, setMicError] = useState<string | null>(null)

  // Voice session state
  const [voiceSessionId, setVoiceSessionId] = useState<string | null>(null)
  const [questions, setQuestions] = useState<VoiceQuestion[]>([])
  const [currentQIndex, setCurrentQIndex] = useState(0)
  const [answers, setAnswers] = useState<AnswerItem[]>([])
  const [micState, setMicState] = useState<MicState>('awaiting')
  const [liveTranscript, setLiveTranscript] = useState('')
  const [canFinishEarly, setCanFinishEarly] = useState(false)
  const [finishingMsg, setFinishingMsg] = useState('')
  const [lastTranscript, setLastTranscript] = useState('')

  // Refs — avoid stale closures in event handlers
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const micStreamRef = useRef<MediaStream | null>(null)
  const recorderRef = useRef<MediaRecorder | null>(null)
  const audioRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const audioChunksRef = useRef<Blob[]>([])
  const didAnalyzeRef = useRef(false)
  const voiceSessionIdRef = useRef<string | null>(null)
  const questionsRef = useRef<VoiceQuestion[]>([])
  const answersRef = useRef<AnswerItem[]>([])
  const currentQIndexRef = useRef(0)
  const micStateRef = useRef<MicState>('awaiting')
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const speechRecognitionRef = useRef<any>(null)
  const webSpeechFinalRef = useRef<string>('')   // accumulates committed final words
  const currentSessionIdRef = useRef('')
  const stageRef = useRef<Stage>('idle')
  const secondsLeftRef = useRef(DURATION)
  const modeRef = useRef<Mode>('real')

  // Keep refs in sync with state
  useEffect(() => { voiceSessionIdRef.current = voiceSessionId }, [voiceSessionId])
  useEffect(() => { questionsRef.current = questions }, [questions])
  useEffect(() => { answersRef.current = answers }, [answers])
  useEffect(() => { currentQIndexRef.current = currentQIndex }, [currentQIndex])
  useEffect(() => { micStateRef.current = micState }, [micState])
  useEffect(() => { stageRef.current = stage }, [stage])
  useEffect(() => { secondsLeftRef.current = secondsLeft }, [secondsLeft])
  useEffect(() => { modeRef.current = mode }, [mode])

  // Preload TTS voices on mount — getVoices() is empty until voiceschanged fires
  useEffect(() => {
    if (!('speechSynthesis' in window)) return
    const logVoices = (voices: SpeechSynthesisVoice[]) => {
      console.log('[TTS] Available voices:', voices.map((v) => `${v.name} (${v.lang})`))
    }
    const voices = window.speechSynthesis.getVoices()
    if (voices.length > 0) {
      logVoices(voices)
    } else {
      window.speechSynthesis.addEventListener('voiceschanged', () => {
        logVoices(window.speechSynthesis.getVoices())
      }, { once: true })
    }
  }, [])

  // Stop all tracks on unmount
  useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach((t) => t.stop())
      micStreamRef.current?.getTracks().forEach((t) => t.stop())
      speechRecognitionRef.current?.stop()
      window.speechSynthesis?.cancel()
    }
  }, [])

  const progress =
    stage === 'recording'
      ? ((DURATION - secondsLeft) / DURATION) * 100
      : stage === 'uploading' || stage === 'finishing' || stage === 'done'
      ? 100
      : 0

  // ── Countdown ──────────────────────────────────────────────────────────────
  useEffect(() => {
    if (stage !== 'recording') return
    if (secondsLeft <= 0) {
      // Only auto-finish when all questions are answered; otherwise keep session alive
      if (questionsRef.current.length > 0 && answersRef.current.length >= questionsRef.current.length) {
        handleFinishSession('time_limit_reached')
      }
      return
    }
    const id = setTimeout(() => setSecondsLeft((s) => s - 1), 1000)
    return () => clearTimeout(id)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stage, secondsLeft])

  // ── Live transcription (Web Speech API — progressive enhancement) ──────────
  function startLiveTranscription() {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const w = window as any
    const SR = w.SpeechRecognition || w.webkitSpeechRecognition
    if (!SR) return
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const recognition: any = new SR()
      recognition.continuous = true
      recognition.interimResults = true
      recognition.lang = 'en-US'
      webSpeechFinalRef.current = ''   // reset for this question
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      recognition.onresult = (event: any) => {
        // Accumulate final results — they don't change, only append
        for (let i = event.resultIndex; i < event.results.length; i++) {
          if (event.results[i].isFinal) {
            webSpeechFinalRef.current += event.results[i][0].transcript + ' '
          }
        }
        // Build display = committed finals + current interim
        let interim = ''
        for (let i = event.resultIndex; i < event.results.length; i++) {
          if (!event.results[i].isFinal) interim += event.results[i][0].transcript
        }
        setLiveTranscript((webSpeechFinalRef.current + interim).trim())
      }
      recognition.onerror = () => recognition.stop()
      recognition.start()
      speechRecognitionRef.current = recognition
    } catch {
      // Speech API not available — silent fallback
    }
  }

  function stopLiveTranscription() {
    speechRecognitionRef.current?.stop()
    speechRecognitionRef.current = null
    setLiveTranscript('')
    // Note: webSpeechFinalRef.current is preserved here so stopAndTranscribe can use it
  }

  // ── Mic recording per question ─────────────────────────────────────────────
  function startMicRecording() {
    if (!micStreamRef.current || micStateRef.current === 'disabled') return
    try {
      // Try with the preferred MIME type, fall back to browser default if it fails
      let recorder: MediaRecorder
      const mimeType = getSupportedAudioMimeType()
      try {
        recorder = new MediaRecorder(micStreamRef.current, { mimeType })
      } catch {
        recorder = new MediaRecorder(micStreamRef.current)
      }
      audioRecorderRef.current = recorder
      audioChunksRef.current = []
      recorder.ondataavailable = (e) => { if (e.data.size > 0) audioChunksRef.current.push(e.data) }
      recorder.start(200)
      setMicState('listening')
      micStateRef.current = 'listening'
      startLiveTranscription()
    } catch (err) {
      console.warn('Mic recorder error:', err)
      setMicState('disabled')
      micStateRef.current = 'disabled'
    }
  }

  async function stopAndTranscribe(qId: string): Promise<string> {
    stopLiveTranscription()
    const webSpeechFallback = webSpeechFinalRef.current.trim()
    const recorder = audioRecorderRef.current

    if (!recorder || recorder.state === 'inactive') {
      return webSpeechFallback || '[No audio captured — check microphone permission]'
    }

    return new Promise((resolve) => {
      recorder.onstop = async () => {
        const mimeType = recorder.mimeType || 'audio/webm'
        const blob = new Blob(audioChunksRef.current, { type: mimeType })
        const sid = voiceSessionIdRef.current

        // If audio is too tiny to contain real speech, fall back to Web Speech
        if (blob.size < 500) {
          resolve(webSpeechFallback || '[No audio captured — microphone may be off]')
          return
        }

        if (!sid) { resolve(webSpeechFallback || '[Session error]'); return }
        try {
          const res = await api.voiceCheckup.transcribeAnswer(sid, qId, blob)
          const whisperText = (res.transcript || '').trim()
          // Use Whisper if it returned real content, otherwise fall back to Web Speech
          resolve(whisperText && !whisperText.startsWith('[') ? whisperText : (webSpeechFallback || whisperText || '[Nothing detected]'))
        } catch (err) {
          console.warn('Whisper transcription failed, using Web Speech fallback:', err)
          resolve(webSpeechFallback || '[Transcription unavailable — check backend is running]')
        }
      }
      recorder.stop()
    })
  }

  // ── Space bar handler ──────────────────────────────────────────────────────
  const handleSpacePress = useCallback(async () => {
    if (micStateRef.current !== 'listening') return

    setMicState('transcribing')
    micStateRef.current = 'transcribing'

    const idx = currentQIndexRef.current
    const qs = questionsRef.current
    if (idx >= qs.length) return

    const currentQ = qs[idx]
    const transcript = await stopAndTranscribe(currentQ.id)

    const newAnswer: AnswerItem = {
      questionId: currentQ.id,
      question: currentQ.question,
      rawTranscript: transcript,
    }

    const updatedAnswers = [...answersRef.current, newAnswer]
    setAnswers(updatedAnswers)
    answersRef.current = updatedAnswers

    setLastTranscript(transcript)

    const nextIdx = idx + 1
    if (nextIdx >= qs.length) {
      setMicState('done')
      micStateRef.current = 'done'
      setCanFinishEarly(true)
      // Recording continues until 120s timer naturally ends
      // User can click "Finish early" in the ring area if they want
    } else {
      setMicState('ready')
      micStateRef.current = 'ready'
      setTimeout(() => {
        setLastTranscript('')
        setCurrentQIndex(nextIdx)
        currentQIndexRef.current = nextIdx
        const nextQ = qs[nextIdx]
        if (nextQ) {
          speakQuestion(nextQ.question, () => startMicRecording())
        } else {
          startMicRecording()
        }
      }, 600)
    }
  }, [])

  useEffect(() => {
    if (stage !== 'recording') return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' && micStateRef.current === 'listening') {
        e.preventDefault()
        handleSpacePress()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [stage, handleSpacePress])

  // ── Finish session ─────────────────────────────────────────────────────────
  const handleFinishSession = useCallback(async (reason: string) => {
    if (stageRef.current === 'uploading' || stageRef.current === 'finishing' || stageRef.current === 'done') return
    if (didAnalyzeRef.current) return
    didAnalyzeRef.current = true

    window.speechSynthesis?.cancel()
    stopLiveTranscription()
    micStreamRef.current?.getTracks().forEach((t) => t.stop())
    if (audioRecorderRef.current?.state === 'recording') audioRecorderRef.current.stop()

    const elapsed = DURATION - secondsLeftRef.current
    const currentAnswers = answersRef.current
    const sid = voiceSessionIdRef.current

    setStage('uploading')
    stageRef.current = 'uploading'
    setFinishingMsg('Uploading video and running rPPG analysis…')

    // Stop video recorder and get blob
    const videoBlob = await new Promise<Blob>((resolve) => {
      const recorder = recorderRef.current
      if (!recorder || recorder.state === 'inactive') {
        resolve(new Blob(chunksRef.current))
        return
      }
      recorder.onstop = () => {
        resolve(new Blob(chunksRef.current, { type: recorder.mimeType || 'video/webm' }))
      }
      recorder.stop()
    })

    streamRef.current?.getTracks().forEach((t) => t.stop())

    // Analyze video for rPPG
    let rppgResult = null
    if (modeRef.current === 'real' && videoBlob.size > 0) {
      try {
        rppgResult = await api.checkup.upload(videoBlob, currentSessionIdRef.current)
      } catch {
        try {
          rppgResult = await api.checkup.mock(78 + Math.random() * 20, 'medium')
        } catch { /* no backend */ }
      }
    } else if (modeRef.current === 'demo') {
      try {
        rppgResult = await api.checkup.mock(78 + Math.random() * 20, 'good')
      } catch { /* no backend */ }
    }

    setStage('finishing')
    setFinishingMsg('Cleaning up your session notes and combining with checkup data…')

    // Finish voice session
    let finalResult = rppgResult
    if (sid) {
      try {
        finalResult = await api.voiceCheckup.finishSession({
          session_id: sid,
          rppg_result: rppgResult,
          duration_seconds: elapsed,
          completed_reason: reason,
          answers: currentAnswers.map((a) => ({
            question_id: a.questionId,
            question: a.question,
            raw_transcript: a.rawTranscript,
          })),
        })
      } catch (err) {
        console.warn('finish-session failed:', err)
        // Fall back to just rPPG result
        finalResult = rppgResult
      }
    }

    if (finalResult) setCheckupResult(finalResult)
    markCheckupComplete()
    setStage('done')
    navigate('/checkup/results')
  }, [markCheckupComplete, setCheckupResult, navigate])

  // ── Start real recording ───────────────────────────────────────────────────
  const startRecording = useCallback(async () => {
    if (todayCheckupComplete) { navigate('/checkup/results'); return }
    setCameraError(null)
    setMicError(null)
    didAnalyzeRef.current = false
    setMode('real')
    setStage('requesting')
    setAnswers([])
    answersRef.current = []
    setCurrentQIndex(0)
    currentQIndexRef.current = 0
    setCanFinishEarly(false)

    let videoStream: MediaStream | null = null
    let micStream: MediaStream | null = null

    // Request camera
    try {
      videoStream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 640 }, height: { ideal: 480 }, frameRate: { ideal: 30 } },
        audio: false,
      })
      streamRef.current = videoStream
      if (videoRef.current) videoRef.current.srcObject = videoStream
    } catch {
      setCameraError('Camera permission denied — using demo mode.')
      setMode('demo')
    }

    // Request microphone
    try {
      micStream = await navigator.mediaDevices.getUserMedia({ audio: true })
      micStreamRef.current = micStream
    } catch {
      setMicError('Microphone permission denied — voice questions will be skipped.')
      setMicState('disabled')
    }

    setStage('starting_session')

    // Fetch voice session + user profile in parallel
    const [sessionRes, profileRes] = await Promise.allSettled([
      api.voiceCheckup.startSession(),
      getProfile(),
    ])

    if (sessionRes.status === 'fulfilled') {
      const sessionData = sessionRes.value
      setVoiceSessionId(sessionData.session_id)
      voiceSessionIdRef.current = sessionData.session_id
      setQuestions(sessionData.questions)
      questionsRef.current = sessionData.questions
    } else {
      // Backend unavailable — use local question list
      const localSid = sessionId()
      setVoiceSessionId(localSid)
      voiceSessionIdRef.current = localSid
      const fallbackQs = [
        { id: 'feeling_now', question: 'How are you feeling right now?' },
        { id: 'activity_before', question: 'Did you rest quietly before starting, or were you recently active?' },
        { id: 'symptoms_check', question: 'Do you feel heart racing, shortness of breath, chest pain, or dizziness?' },
        { id: 'urgent_symptoms', question: 'Any severe headache, vision changes, heavy bleeding, or reduced fetal movement today?' },
        { id: 'care_team_notes', question: 'Is there anything you want your care team to know?' },
      ]
      setQuestions(fallbackQs)
      questionsRef.current = fallbackQs
    }

    const userName =
      profileRes.status === 'fulfilled' && profileRes.value?.first_name
        ? profileRes.value.first_name
        : 'there'

    const sid = sessionId()
    currentSessionIdRef.current = sid

    // Start video recorder (if camera available)
    if (videoStream) {
      try {
        const mimeType = getSupportedVideoMimeType()
        const recorder = new MediaRecorder(videoStream, { mimeType })
        recorderRef.current = recorder
        chunksRef.current = []
        recorder.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data) }
        recorder.start(500)
      } catch (err) {
        console.warn('Video recorder failed:', err)
      }
    }

    setStage('recording')
    setSecondsLeft(DURATION)

    // Greet user by name, then speak first question, then start mic recording
    if (micStream) {
      const firstQ = questionsRef.current[0]
      const greeting = `Hi ${userName}. Hope you are doing well. Let's start today's session.`
      setTimeout(() => {
        speakQuestion(greeting, () => {
          if (firstQ) {
            speakQuestion(firstQ.question, () => startMicRecording())
          } else {
            startMicRecording()
          }
        })
      }, 200)
    }
  }, [todayCheckupComplete, navigate])

  // ── Demo mode ──────────────────────────────────────────────────────────────
  const startDemo = useCallback(async () => {
    if (todayCheckupComplete) { navigate('/checkup/results'); return }
    didAnalyzeRef.current = false
    setMode('demo')
    setStage('finishing')
    setFinishingMsg('Loading demo check-in session…')
    try {
      const result = await api.voiceCheckup.mockVoiceSession()
      setCheckupResult(result)
    } catch {
      try {
        const result = await api.checkup.mock(85, 'good')
        setCheckupResult(result)
      } catch { /* no backend */ }
    }
    markCheckupComplete()
    setStage('done')
    navigate('/checkup/results')
  }, [todayCheckupComplete, navigate, markCheckupComplete, setCheckupResult])

  const isProcessing = stage === 'uploading' || stage === 'finishing'

  return (
    <div className="flex h-full flex-col overflow-hidden">

      {/* Header */}
      <header className="flex-shrink-0 border-b border-nn-mist/60 bg-white px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-nn-navy">120-Second Voice + Camera Check-In</h1>
            <p className="text-xs text-nn-navy-light" style={{ fontFamily: 'var(--font-body)' }}>
              Camera-based pulse estimate · AI voice check-in · Estimated wellness signal only
            </p>
          </div>
          <StageBadge stage={stage} />
        </div>
      </header>

      {/* Body */}
      <div className="flex flex-1 flex-col gap-3 overflow-hidden p-4 lg:p-5">

        {/* Safety notice */}
        <div className="flex-shrink-0">
          <CompactSafetyNotice />
        </div>

        {/* Error banners */}
        {cameraError && (
          <div className="flex-shrink-0 rounded-xl border border-amber-200 bg-amber-50 px-4 py-2 text-xs text-amber-800">
            {cameraError}
          </div>
        )}
        {micError && (
          <div className="flex-shrink-0 rounded-xl border border-amber-200 bg-amber-50 px-4 py-2 text-xs text-amber-800">
            {micError}
          </div>
        )}

        {/* Two-column layout */}
        <div className="flex flex-1 gap-4 overflow-hidden flex-col lg:flex-row min-h-0">

          {/* Left: camera */}
          <div className="flex flex-1 lg:flex-[3] flex-col gap-3 overflow-hidden">

            {/* Camera preview — always fills available height */}
            <div className="relative overflow-hidden rounded-2xl bg-[#1a2540] flex-1 min-h-[180px]">
              <video
                ref={videoRef}
                className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-300 ${stage === 'recording' ? 'opacity-100' : 'opacity-0'}`}
                autoPlay muted playsInline
              />
              <WebcamOverlay stage={stage} secondsLeft={secondsLeft} />
            </div>

            {/* CTA / status below camera when not recording */}
            {stage !== 'recording' && (
              <div className="flex-shrink-0">
                {stage === 'idle' && (
                  <div className="space-y-2">
                    <div className="rounded-xl border border-nn-periwinkle/50 bg-nn-pale-sky px-5 py-3.5 text-center space-y-1">
                      <p className="font-semibold text-nn-navy text-sm">NatalNanny will ask you a few short questions</p>
                      <p className="text-xs text-nn-navy-light" style={{ fontFamily: 'var(--font-body)' }}>
                        Answer out loud, then press <kbd className="rounded bg-white px-1.5 py-0.5 font-mono text-[10px] border border-nn-mist shadow-sm">Space</kbd> when finished each answer.
                      </p>
                    </div>
                    <button
                      onClick={startRecording}
                      className="w-full rounded-xl bg-nn-deep-blue px-6 py-3.5 text-sm font-bold text-white shadow-sm hover:bg-nn-navy-light transition-colors"
                    >
                      {todayCheckupComplete ? "View today's results" : 'Start 120-second check-in'}
                    </button>
                    {!todayCheckupComplete && (
                      <button
                        onClick={startDemo}
                        className="w-full rounded-xl border border-nn-periwinkle bg-white px-6 py-2.5 text-xs font-semibold text-nn-deep-blue hover:bg-nn-pale-sky transition-colors"
                      >
                        Run demo check-in (no camera or mic required)
                      </button>
                    )}
                  </div>
                )}
                {stage === 'requesting' && (
                  <div className="rounded-xl border border-nn-periwinkle bg-nn-pale-sky px-5 py-3 text-center">
                    <p className="font-semibold text-nn-navy">Requesting camera and microphone access…</p>
                    <p className="text-xs text-nn-navy-light mt-1" style={{ fontFamily: 'var(--font-body)' }}>Allow access when prompted</p>
                  </div>
                )}
                {stage === 'starting_session' && (
                  <div className="rounded-xl border border-nn-periwinkle bg-nn-pale-sky px-5 py-3 text-center">
                    <p className="font-semibold text-nn-navy">Starting your check-in session…</p>
                    <p className="text-xs text-nn-navy-light mt-1" style={{ fontFamily: 'var(--font-body)' }}>Loading questions</p>
                  </div>
                )}
                {isProcessing && (
                  <div className="rounded-xl border border-nn-periwinkle bg-nn-pale-sky px-5 py-3 text-center">
                    <p className="font-semibold text-nn-navy">{finishingMsg || 'Processing your check-in…'}</p>
                    <p className="text-xs text-nn-navy-light mt-1" style={{ fontFamily: 'var(--font-body)' }}>
                      This may take a few seconds
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Right: ring + answered Q&As */}
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
                <MicStatePill micState={micState} />
              )}
            </div>

            {/* Instructions / answered Q&As */}
            <div className="flex-1 overflow-y-auto rounded-2xl bg-white p-4 shadow-sm">
              {stage === 'idle' ? (
                <IdleInstructionsPanel />
              ) : stage === 'recording' ? (
                <PreviousAnswersPanel
                  answers={answers}
                  questions={questions}
                />
              ) : (
                <div className="flex h-full flex-col items-center justify-center text-center gap-3">
                  <div className="h-10 w-10 animate-spin rounded-full border-4 border-nn-periwinkle border-t-nn-deep-blue" />
                  <p className="text-sm font-bold text-nn-navy">
                    {stage === 'uploading' ? 'Analyzing rPPG signal…' : 'Cleaning up session notes…'}
                  </p>
                  <p className="text-xs text-nn-navy-light" style={{ fontFamily: 'var(--font-body)' }}>
                    {finishingMsg || 'Almost done'}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Voice check-in — bottom bar, visible during recording */}
        {stage === 'recording' && (
          <div className="flex-shrink-0 rounded-2xl bg-white shadow-sm border border-nn-mist/60">
            <VoiceCheckinPanel
              questions={questions}
              currentQIndex={currentQIndex}
              answers={answers}
              micState={micState}
              liveTranscript={liveTranscript}
              lastTranscript={lastTranscript}
              onSpacePress={handleSpacePress}
            />
          </div>
        )}
      </div>
    </div>
  )
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function VoiceCheckinPanel({
  questions,
  currentQIndex,
  answers,
  micState,
  liveTranscript,
  lastTranscript,
  onSpacePress,
}: {
  questions: VoiceQuestion[]
  currentQIndex: number
  answers: AnswerItem[]
  micState: MicState
  liveTranscript: string
  lastTranscript: string
  onSpacePress: () => void
}) {
  const currentQ = questions[currentQIndex]
  const totalQ = questions.length

  return (
    <div className="px-4 py-3 space-y-2">
      {/* Progress bar + counter */}
      <div className="flex items-center gap-3">
        <div className="flex-1 h-1 rounded-full bg-nn-mist overflow-hidden">
          <div
            className="h-full rounded-full bg-nn-deep-blue transition-all duration-500"
            style={{ width: totalQ > 0 ? `${(answers.length / totalQ) * 100}%` : '0%' }}
          />
        </div>
        <span className="text-[11px] font-semibold text-nn-navy-light whitespace-nowrap">
          {micState === 'done'
            ? `${totalQ}/${totalQ} ✓`
            : `Q${Math.min(currentQIndex + 1, totalQ)} of ${totalQ}`}
        </span>
      </div>

      {/* Main row: question · transcript · SPACE */}
      <div className="flex items-center gap-3">

        {/* Question text */}
        <div className="flex-[2] min-w-0">
          {micState === 'done' ? (
            <p className="text-sm font-semibold text-emerald-700">All questions answered — camera recording until 120 s</p>
          ) : (
            <p className="text-sm font-semibold text-nn-navy leading-snug line-clamp-2">
              {currentQ ? `"${currentQ.question}"` : ''}
            </p>
          )}
        </div>

        {/* Transcript / status */}
        {micState !== 'done' && micState !== 'disabled' && (
          <div className={`flex-[3] min-w-0 rounded-lg border px-3 py-2 transition-colors min-h-[52px] ${
            micState === 'listening'    ? 'border-red-300 bg-red-50'
            : micState === 'transcribing' ? 'border-amber-200 bg-amber-50'
            : micState === 'ready'       ? 'border-emerald-200 bg-emerald-50'
            : 'border-nn-mist bg-nn-pale-sky/50'
          }`}>
            <div className="flex items-start gap-1.5">
              {micState === 'listening' && (
                <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse flex-shrink-0 mt-1" />
              )}
              <p className="text-xs text-nn-navy line-clamp-3 leading-snug" style={{ fontFamily: 'var(--font-body)' }}>
                {micState === 'listening'
                  ? liveTranscript || 'Listening — speak your answer…'
                  : micState === 'transcribing'
                  ? 'Transcribing your answer…'
                  : lastTranscript
                  ? `✓ ${lastTranscript}`
                  : 'Waiting…'}
              </p>
            </div>
          </div>
        )}

        {/* SPACE / done button */}
        {micState === 'listening' ? (
          <button
            onClick={onSpacePress}
            className="flex-shrink-0 rounded-xl border-2 border-nn-deep-blue bg-white px-4 py-2 font-bold text-nn-deep-blue hover:bg-nn-pale-sky transition-colors flex items-center gap-1.5 text-xs"
          >
            <kbd className="font-mono text-sm">SPACE</kbd>
            <span className="hidden sm:inline">done</span>
          </button>
        ) : micState !== 'done' ? (
          <div className="flex-shrink-0 w-20" />
        ) : null}
      </div>
    </div>
  )
}

function MicStatePill({ micState }: { micState: MicState }) {
  const cfg: Record<MicState, { label: string; cls: string; dot?: string }> = {
    awaiting:    { label: 'Waiting…',             cls: 'bg-nn-mist text-nn-navy-light' },
    listening:   { label: '● Listening',           cls: 'bg-red-100 text-red-600', dot: 'bg-red-500' },
    transcribing:{ label: '◌ Transcribing…',       cls: 'bg-amber-100 text-amber-700' },
    ready:       { label: '✓ Ready for next',       cls: 'bg-emerald-100 text-emerald-700' },
    done:        { label: '✓ All questions done',   cls: 'bg-emerald-100 text-emerald-700' },
    disabled:    { label: 'Mic unavailable',        cls: 'bg-nn-mist text-nn-navy-light' },
  }
  const { label, cls } = cfg[micState]
  return (
    <span className={`rounded-full px-3 py-1 text-xs font-semibold ${cls}`}>
      {label}
    </span>
  )
}

function PreviousAnswersPanel({
  answers, questions,
}: {
  answers: AnswerItem[]
  questions: VoiceQuestion[]
}) {
  if (answers.length === 0) {
    return (
      <div className="space-y-3 text-xs">
        <div className="flex items-center gap-2">
          <div className="h-2.5 w-2.5 rounded-full bg-red-500 animate-pulse flex-shrink-0" />
          <p className="font-semibold text-nn-navy">Camera recording active</p>
        </div>
        <p className="text-[11px] text-nn-navy-light leading-snug" style={{ fontFamily: 'var(--font-body)' }}>
          Your answers will appear here as you complete each question.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <p className="text-[10px] font-semibold text-nn-navy-light uppercase tracking-wide">
        Answered · {answers.length} of {questions.length}
      </p>
      <div className="space-y-2">
        {answers.map((a, i) => (
          <div key={a.questionId} className="rounded-xl bg-nn-pale-sky/70 px-3 py-2.5">
            <div className="flex items-start gap-2">
              <span className="flex-shrink-0 mt-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-emerald-400">
                <svg viewBox="0 0 10 10" fill="white" className="h-2.5 w-2.5">
                  <path d="M2 5l2.5 2.5L8 3" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
                </svg>
              </span>
              <div className="min-w-0">
                <p className="text-[10px] font-semibold text-nn-navy-light">{i + 1}. {a.question}</p>
                <p className="text-xs text-nn-navy mt-0.5 leading-snug italic" style={{ fontFamily: 'var(--font-body)' }}>
                  "{a.rawTranscript}"
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function IdleInstructionsPanel() {
  const tips = [
    { icon: '💡', text: 'Good lighting — face the camera directly' },
    { icon: '🧘', text: 'Sit still and breathe normally' },
    { icon: '👤', text: 'Keep your face visible and uncovered' },
    { icon: '🎤', text: 'Speak clearly when answering questions' },
    { icon: '⌨️', text: 'Press Space when done with each answer' },
  ]
  return (
    <>
      <p className="mb-3 text-sm font-bold text-nn-navy">Best results tips</p>
      <div className="space-y-2">
        {tips.map(({ icon, text }) => (
          <div key={text} className="flex items-center gap-2.5 rounded-xl bg-nn-pale-sky px-3 py-2.5">
            <span className="text-base flex-shrink-0">{icon}</span>
            <p className="text-xs text-nn-navy" style={{ fontFamily: 'var(--font-body)' }}>{text}</p>
          </div>
        ))}
      </div>
      <div className="mt-3 rounded-xl bg-nn-mist/60 px-3 py-2.5 text-[10px] text-nn-navy-light leading-relaxed" style={{ fontFamily: 'var(--font-body)' }}>
        <strong className="text-nn-navy">About this check-in:</strong> NatalNanny uses your webcam to estimate a camera-based wellness signal, then asks a few voice questions. Everything stays on your device until the session is complete.
      </div>
    </>
  )
}

function StageBadge({ stage }: { stage: Stage }) {
  const map: Record<Stage, { label: string; cls: string }> = {
    idle:             { label: 'Ready',           cls: 'bg-nn-mist text-nn-navy-light' },
    requesting:       { label: '◌ Requesting',    cls: 'bg-amber-100 text-amber-700' },
    starting_session: { label: '◌ Starting',      cls: 'bg-nn-pale-sky text-nn-deep-blue' },
    recording:        { label: '● Recording',     cls: 'bg-red-100 text-red-600' },
    uploading:        { label: '↑ Analyzing',     cls: 'bg-nn-pale-sky text-nn-deep-blue' },
    finishing:        { label: '◌ Finishing',     cls: 'bg-nn-pale-sky text-nn-deep-blue' },
    done:             { label: '✓ Complete',      cls: 'bg-emerald-100 text-emerald-700' },
  }
  const { label, cls } = map[stage]
  return <span className={`rounded-full px-3 py-1.5 text-xs font-semibold ${cls}`}>{label}</span>
}

function CompactSafetyNotice() {
  return (
    <div className="flex items-start gap-2.5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-2.5">
      <svg viewBox="0 0 16 16" fill="none" stroke="#d97706" strokeWidth="1.6" className="mt-0.5 h-3.5 w-3.5 flex-shrink-0">
        <path d="M8 1L1 14h14L8 1Z" strokeLinejoin="round" />
        <path d="M8 6v4M8 11.5v.5" strokeLinecap="round" />
      </svg>
      <p className="text-[11px] text-amber-700 leading-snug" style={{ fontFamily: 'var(--font-body)' }}>
        <strong>Estimated wellness signal only — not a diagnosis.</strong> Seek <strong>urgent care</strong> for chest pain, trouble breathing, fainting, seizure, severe headache, vision changes, heavy bleeding, or reduced fetal movement.
      </p>
    </div>
  )
}

function WebcamOverlay({ stage, secondsLeft }: { stage: Stage; secondsLeft: number }) {
  return (
    <>
      {stage !== 'recording' && (
        <div className="absolute inset-0 bg-gradient-to-br from-[#1a2540] to-nn-navy" />
      )}
      {stage === 'recording' && (
        <div className="absolute inset-0 bg-black/20" />
      )}
      {stage === 'idle' && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-white/50">
          <svg viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="1.4" className="h-14 w-14">
            <rect x="3" y="10" width="42" height="30" rx="5" />
            <circle cx="24" cy="25" r="8" />
            <circle cx="24" cy="25" r="3.5" fill="currentColor" stroke="none" opacity="0.3" />
          </svg>
          <p className="text-sm font-semibold">Camera preview</p>
        </div>
      )}
      {(stage === 'requesting' || stage === 'starting_session') && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-white">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-white/20 border-t-white" />
          <p className="text-sm font-semibold">
            {stage === 'requesting' ? 'Accessing camera…' : 'Starting session…'}
          </p>
        </div>
      )}
      {stage === 'recording' && (
        <>
          <div className="absolute top-3 left-3 flex items-center gap-2 rounded-full bg-black/60 px-3 py-1.5 backdrop-blur-sm">
            <div className="h-2.5 w-2.5 rounded-full bg-red-500 animate-pulse" />
            <span className="text-xs font-bold text-white">REC</span>
          </div>
          <div className="absolute top-3 right-3 rounded-full bg-black/60 px-3 py-1.5 backdrop-blur-sm">
            <span className="text-xs font-mono font-bold text-white">
              {String(Math.floor(secondsLeft / 60)).padStart(2, '0')}:
              {String(secondsLeft % 60).padStart(2, '0')}
            </span>
          </div>
          <div className="absolute bottom-0 inset-x-0 h-12 flex items-end px-4 pb-2">
            <svg viewBox="0 0 320 36" className="w-full h-full opacity-50">
              <polyline
                points="0,18 22,18 32,4 42,32 52,12 64,18 86,18 96,4 106,32 116,12 128,18 150,18 160,4 170,32 180,12 192,18 214,18 224,4 234,32 244,12 256,18 278,18 288,4 298,32 308,12 320,18"
                fill="none" stroke="#4663ac" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
              />
            </svg>
          </div>
        </>
      )}
      {(stage === 'uploading' || stage === 'finishing') && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 text-white">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-white/20 border-t-white" />
          <p className="text-sm font-bold">
            {stage === 'uploading' ? 'Analyzing rPPG signal…' : 'Cleaning up session notes…'}
          </p>
        </div>
      )}
      {(stage === 'idle' || stage === 'recording') && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="h-72 w-56 rounded-full border-2 border-dashed border-white/30" />
        </div>
      )}
    </>
  )
}
