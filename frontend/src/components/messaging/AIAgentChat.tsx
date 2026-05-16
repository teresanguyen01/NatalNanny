import { useState, useRef, useEffect } from 'react'
import { mockAIMessages, mockRAGContext, type ChatMessage } from '../../data/mockData'

export default function AIAgentChat() {
  const [messages, setMessages] = useState<ChatMessage[]>(mockAIMessages)
  const [input, setInput] = useState('')
  const [showSummary, setShowSummary] = useState(false)
  const [isTyping, setIsTyping] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isTyping])

  function sendMessage(text: string) {
    if (!text.trim()) return
    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      sender: 'user',
      name: 'Teresa',
      text: text.trim(),
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    }
    setMessages((m) => [...m, userMsg])
    setInput('')
    setIsTyping(true)

    setTimeout(() => {
      setIsTyping(false)
      setMessages((m) => [
        ...m,
        {
          id: Date.now().toString() + '-ai',
          sender: 'ai',
          name: 'NatalNanny AI',
          text: generateAIResponse(text.trim()),
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ])
    }, 2000)
  }

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="border-b border-nn-mist bg-white px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-nn-periwinkle to-nn-deep-blue shadow-sm">
            <svg viewBox="0 0 20 20" fill="white" className="h-5 w-5">
              <path d="M10 2a1 1 0 0 1 .894.553l2.083 4.221 4.658.677a1 1 0 0 1 .555 1.705l-3.37 3.285.795 4.638a1 1 0 0 1-1.45 1.054L10 15.913l-4.165 2.22a1 1 0 0 1-1.45-1.054l.795-4.638L1.81 9.156a1 1 0 0 1 .555-1.705l4.658-.677L9.106 2.553A1 1 0 0 1 10 2Z" />
            </svg>
          </div>
          <div>
            <p className="font-semibold text-nn-navy">NatalNanny AI</p>
            <p className="text-xs text-nn-navy-light">
              Uses your health history, checkup logs, and provider instructions
            </p>
          </div>
        </div>

        {/* RAG Context panel */}
        <div className="mt-3 rounded-2xl bg-nn-pale-sky p-3">
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-nn-navy-light">
            Health context loaded
          </p>
          <div className="grid grid-cols-2 gap-1.5 text-[11px] text-nn-navy">
            <span>📅 Week {mockRAGContext.gestationalWeek}</span>
            <span>⚠️ {mockRAGContext.riskFactors[0]}</span>
            <span>💓 HR {mockRAGContext.lastCheckup.heartRate} bpm</span>
            <span>🫁 RR {mockRAGContext.lastCheckup.respiratoryRate} br/min</span>
          </div>
          <p className="mt-2 text-[10px] text-nn-navy-light leading-snug italic">
            Provider note: {mockRAGContext.providerInstruction}
          </p>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
        {messages.map((msg) => {
          const isUser = msg.sender === 'user'
          return (
            <div key={msg.id} className={`flex gap-3 ${isUser ? 'flex-row-reverse' : ''}`}>
              {!isUser && (
                <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-nn-periwinkle to-nn-deep-blue">
                  <svg viewBox="0 0 12 12" fill="white" className="h-4 w-4">
                    <path d="M6 1a.5.5 0 0 1 .447.276l1.25 2.535 2.797.407a.5.5 0 0 1 .278.852l-2.022 1.97.477 2.783a.5.5 0 0 1-.725.527L6 9.273l-2.502 1.077a.5.5 0 0 1-.725-.527l.477-2.784L1.228 5.07a.5.5 0 0 1 .278-.852l2.797-.407 1.25-2.535A.5.5 0 0 1 6 1Z" />
                  </svg>
                </div>
              )}
              <div className={`max-w-[80%] flex flex-col ${isUser ? 'items-end' : 'items-start'}`}>
                <div
                  className={[
                    'rounded-2xl px-4 py-3 text-sm leading-relaxed',
                    isUser
                      ? 'bg-nn-deep-blue text-white rounded-tr-sm'
                      : 'bg-white text-nn-navy shadow-sm rounded-tl-sm',
                  ].join(' ')}
                >
                  {msg.text}
                </div>
                <p className="mt-1 text-[10px] text-nn-navy-light px-1">{msg.time}</p>
              </div>
            </div>
          )
        })}

        {isTyping && (
          <div className="flex gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-nn-periwinkle to-nn-deep-blue">
              <svg viewBox="0 0 12 12" fill="white" className="h-4 w-4">
                <path d="M6 1a.5.5 0 0 1 .447.276l1.25 2.535 2.797.407a.5.5 0 0 1 .278.852l-2.022 1.97.477 2.783a.5.5 0 0 1-.725.527L6 9.273l-2.502 1.077a.5.5 0 0 1-.725-.527l.477-2.784L1.228 5.07a.5.5 0 0 1 .278-.852l2.797-.407 1.25-2.535A.5.5 0 0 1 6 1Z" />
              </svg>
            </div>
            <div className="rounded-2xl rounded-tl-sm bg-white px-4 py-3 shadow-sm">
              <div className="flex gap-1 items-center h-5">
                {[0, 1, 2].map((i) => (
                  <div
                    key={i}
                    className="h-2 w-2 rounded-full bg-nn-periwinkle"
                    style={{ animation: `bounce 1.2s ${i * 0.2}s ease-in-out infinite` }}
                  />
                ))}
              </div>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Generate summary button */}
      <div className="border-t border-nn-mist bg-nn-pale-sky px-6 py-3">
        <button
          onClick={() => setShowSummary((v) => !v)}
          className="flex w-full items-center justify-between rounded-xl border border-nn-periwinkle bg-white px-4 py-2.5 text-sm font-medium text-nn-navy hover:bg-nn-pale-sky transition-colors"
        >
          <span className="flex items-center gap-2">
            <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-4 w-4 text-nn-deep-blue">
              <path d="M13 2H3a1 1 0 0 0-1 1v10l3-2h8a1 1 0 0 0 1-1V3a1 1 0 0 0-1-1Z" strokeLinejoin="round" />
              <path d="M5 6h6M5 8.5h4" strokeLinecap="round" />
            </svg>
            Generate provider summary
          </span>
          <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" className={`h-4 w-4 transition-transform ${showSummary ? 'rotate-180' : ''}`}>
            <path d="M4 6l4 4 4-4" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>

        {showSummary && (
          <div className="mt-2 rounded-xl border border-nn-periwinkle bg-white p-4 text-sm text-nn-navy leading-relaxed shadow-sm">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-nn-navy-light mb-2">
              Provider Summary
            </p>
            <p>
              33-week pregnant patient completed rPPG wellness checkup. Estimated HR{' '}
              <strong>91 bpm</strong>, estimated RR <strong>18 br/min</strong>, signal quality{' '}
              <strong>Good</strong>. Patient reports no chest pain, shortness of breath, fainting,
              or severe headache. Risk factor: prior hypertension. App recommendation: continue
              routine monitoring.
            </p>
          </div>
        )}
      </div>

      {/* Input */}
      <div className="border-t border-nn-mist bg-white px-4 py-3">
        <form
          onSubmit={(e) => { e.preventDefault(); sendMessage(input) }}
          className="flex gap-2"
        >
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask NatalNanny AI…"
            className="flex-1 rounded-xl border border-nn-mist bg-nn-pale-sky px-4 py-2.5 text-sm text-nn-navy placeholder-nn-navy-light outline-none focus:border-nn-periwinkle focus:ring-2 focus:ring-nn-periwinkle/40"
          />
          <button
            type="submit"
            disabled={!input.trim() || isTyping}
            className="flex h-10 w-10 items-center justify-center rounded-xl bg-nn-deep-blue text-white disabled:opacity-40 transition-all"
            aria-label="Send"
          >
            <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
              <path d="M3.105 2.289a.75.75 0 0 0-.826.95l1.813 6.932H11a.75.75 0 0 1 0 1.5H4.092l-1.813 6.932a.75.75 0 0 0 .826.95 28.896 28.896 0 0 0 15.293-7.154.75.75 0 0 0 0-1.115A28.897 28.897 0 0 0 3.105 2.289Z" />
            </svg>
          </button>
        </form>
        <p className="mt-1.5 text-center text-[10px] text-nn-navy-light">
          AI summaries use your health context and are not a diagnosis
        </p>
      </div>
    </div>
  )
}

function generateAIResponse(input: string): string {
  const lower = input.toLowerCase()
  if (lower.includes('blood pressure') || lower.includes('bp')) {
    return "Blood pressure monitoring during pregnancy is very important, especially with your history of prior hypertension. The rPPG checkup estimates heart rate and respiratory rate from your webcam — it cannot measure blood pressure. Please use a manual cuff and record your readings. Dr. Rivera has noted: contact them if BP ≥ 140/90 mmHg."
  }
  if (lower.includes('heart rate') || lower.includes('hr')) {
    return `Your heart rate over the last 7 days has ranged from 87 to 92 bpm. Your most recent estimate was 91 bpm. Mild increases in resting heart rate are common during pregnancy. If you feel palpitations, chest pain, or dizziness, contact Dr. Rivera. I can help summarize your data, but I cannot diagnose.`
  }
  if (lower.includes('breath') || lower.includes('respiratory')) {
    return "Respiratory rate can change when the body is under stress or when circulation is affected. Your recent range has been 16–19 breaths/min. Shortness of breath is common in the third trimester. However, sudden shortness of breath at rest or with chest pain should be reported to your care team right away. I cannot diagnose — please contact Dr. Rivera if you're concerned."
  }
  if (lower.includes('safe') || lower.includes('emergency') || lower.includes('urgent')) {
    return "Please seek urgent medical care if you experience: chest pain, sudden shortness of breath at rest, fainting or near-fainting, seizure, severe headache, vision changes, heavy bleeding, or reduced fetal movement. Call 911 or go to the ER immediately. I cannot diagnose — NatalNanny is a wellness monitoring tool, not a substitute for emergency care."
  }
  return "Based on your recent checkups, your wellness signals look close to your baseline. Continue your daily rPPG checkups to help Dr. Rivera track any trends. If you have specific symptoms or concerns, I'd recommend messaging Dr. Rivera directly. I can summarize your data, but I cannot diagnose or provide medical advice."
}
