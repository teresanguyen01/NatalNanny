import { useState, useEffect } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { getOrCreateAgentThread } from '../../lib/api'
import ChatPanel from './ChatPanel'

export default function AIAgentChat() {
  const { isDemoMode } = useAuth()
  const [threadId, setThreadId] = useState<string | null>(null)

  useEffect(() => {
    if (isDemoMode) {
      setThreadId('demo-agent-thread')
      return
    }
    getOrCreateAgentThread()
      .then((t) => setThreadId(t.id))
      .catch(() => {})
  }, [isDemoMode])

  const avatar = (
    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-nn-periwinkle to-nn-deep-blue shadow-sm">
      <svg viewBox="0 0 20 20" fill="white" className="h-5 w-5">
        <path d="M10 2a1 1 0 0 1 .894.553l2.083 4.221 4.658.677a1 1 0 0 1 .555 1.705l-3.37 3.285.795 4.638a1 1 0 0 1-1.45 1.054L10 15.913l-4.165 2.22a1 1 0 0 1-1.45-1.054l.795-4.638L1.81 9.156a1 1 0 0 1 .555-1.705l4.658-.677L9.106 2.553A1 1 0 0 1 10 2Z" />
      </svg>
    </div>
  )

  return (
    <div className="flex h-full flex-col">
      {/* AI notice banner */}
      <div className="border-b border-amber-200 bg-amber-50 px-6 py-2">
        <p className="text-[11px] text-amber-700 text-center">
          AI replies coming soon — messages are saved. This is not a diagnosis tool.
        </p>
      </div>

      {/* Chat panel */}
      <div className="flex-1 overflow-hidden">
        <ChatPanel
          threadId={threadId}
          contactName="NatalNanny AI"
          contactAvatar={avatar}
          statusLine="AI Assistant · Not a diagnosis"
        />
      </div>
    </div>
  )
}
