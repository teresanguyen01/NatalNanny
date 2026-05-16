import { useState, useRef, useEffect } from 'react'
import { mockDoctorMessages, type ChatMessage } from '../../data/mockData'

export default function DoctorChat() {
  const [messages, setMessages] = useState<ChatMessage[]>(mockDoctorMessages)
  const [input, setInput] = useState('')
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  function sendMessage(text: string) {
    if (!text.trim()) return
    const msg: ChatMessage = {
      id: Date.now().toString(),
      sender: 'user',
      name: 'Teresa',
      text: text.trim(),
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    }
    setMessages((m) => [...m, msg])
    setInput('')

    setTimeout(() => {
      setMessages((m) => [
        ...m,
        {
          id: Date.now().toString() + '-reply',
          sender: 'doctor',
          name: 'Dr. Rivera',
          text: "Thank you for the update. I'll review this and follow up shortly. In the meantime, continue your daily checkups and reach out immediately if you have any urgent symptoms.",
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ])
    }, 1500)
  }

  function sendCheckupSummary() {
    sendMessage(
      "Hi Dr. Rivera — just completed my rPPG wellness checkup. Estimated HR: 91 bpm, RR: 18 br/min, signal quality: Good. No chest pain, shortness of breath, or severe headache today."
    )
  }

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-nn-mist bg-white px-6 py-4">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-nn-deep-blue text-white font-bold text-lg flex-shrink-0">
          R
        </div>
        <div>
          <p className="font-semibold text-nn-navy">Dr. Rivera</p>
          <p className="text-xs text-nn-navy-light flex items-center gap-1">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 inline-block" />
            Available · Maternal-Fetal Medicine
          </p>
        </div>
        <div className="ml-auto">
          <span className="rounded-full bg-nn-pale-sky px-3 py-1 text-xs text-nn-navy-light flex items-center gap-1">
            <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-3.5 w-3.5">
              <rect x="1" y="2" width="14" height="12" rx="2" />
              <path d="M5 2v3M11 2v3M1 7h14" strokeLinecap="round" />
            </svg>
            Secure channel
          </span>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
        {messages.map((msg) => {
          const isUser = msg.sender === 'user'
          return (
            <div key={msg.id} className={`flex gap-3 ${isUser ? 'flex-row-reverse' : ''}`}>
              {!isUser && (
                <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-nn-deep-blue text-white text-sm font-bold">
                  R
                </div>
              )}
              <div className={`max-w-[75%] ${isUser ? 'items-end' : 'items-start'} flex flex-col`}>
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
        <div ref={bottomRef} />
      </div>

      {/* Quick actions */}
      <div className="px-6 py-2">
        <button
          onClick={sendCheckupSummary}
          className="flex items-center gap-2 rounded-xl border border-nn-periwinkle bg-nn-pale-sky px-4 py-2 text-xs font-medium text-nn-navy transition-colors hover:bg-nn-periwinkle"
        >
          <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-3.5 w-3.5">
            <path d="M13 2H3a1 1 0 0 0-1 1v9l3-2h8a1 1 0 0 0 1-1V3a1 1 0 0 0-1-1Z" strokeLinejoin="round" />
          </svg>
          Send latest checkup summary
        </button>
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
            placeholder="Message Dr. Rivera…"
            className="flex-1 rounded-xl border border-nn-mist bg-nn-pale-sky px-4 py-2.5 text-sm text-nn-navy placeholder-nn-navy-light outline-none focus:border-nn-periwinkle focus:ring-2 focus:ring-nn-periwinkle/40"
          />
          <button
            type="submit"
            disabled={!input.trim()}
            className="flex h-10 w-10 items-center justify-center rounded-xl bg-nn-deep-blue text-white disabled:opacity-40 transition-all"
            aria-label="Send message"
          >
            <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
              <path d="M3.105 2.289a.75.75 0 0 0-.826.95l1.813 6.932H11a.75.75 0 0 1 0 1.5H4.092l-1.813 6.932a.75.75 0 0 0 .826.95 28.896 28.896 0 0 0 15.293-7.154.75.75 0 0 0 0-1.115A28.897 28.897 0 0 0 3.105 2.289Z" />
            </svg>
          </button>
        </form>
      </div>
    </div>
  )
}
