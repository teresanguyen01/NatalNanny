import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

export default function MessagingFAB() {
  const [isOpen, setIsOpen] = useState(false)
  const navigate = useNavigate()
  const unreadCount = 0 // TODO: Wire to actual unread state from context

  return (
    <>
      {/* FAB Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-6 right-6 z-50 h-14 w-14 rounded-full bg-nn-deep-blue shadow-lg flex items-center justify-center text-white hover:bg-nn-deep-blue-hover transition-colors"
        aria-label="Open messages"
      >
        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
        </svg>
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-red-500 text-white text-xs flex items-center justify-center font-semibold">
            {unreadCount}
          </span>
        )}
      </button>

      {/* Messaging Dock Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/20 backdrop-blur-sm"
          onClick={() => setIsOpen(false)}
        >
          <div
            className="fixed bottom-0 left-0 right-0 bg-white rounded-t-3xl shadow-2xl p-6 animate-slide-up"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="font-semibold text-nn-navy mb-4">Messages</h3>
            <div className="space-y-3">
              <button
                onClick={() => navigate('/messaging?tab=doctor')}
                className="w-full text-left p-4 rounded-xl bg-nn-pale-sky hover:bg-nn-periwinkle/30 transition-colors"
              >
                <p className="font-semibold text-nn-navy">Your Doctor</p>
                <p className="text-sm text-nn-navy-light">Ask about your vitals or schedule</p>
                {unreadCount > 0 && (
                  <span className="text-xs text-nn-deep-blue font-medium">
                    {unreadCount} new
                  </span>
                )}
              </button>
              <button
                onClick={() => navigate('/messaging?tab=ai')}
                className="w-full text-left p-4 rounded-xl bg-nn-pale-sky hover:bg-nn-periwinkle/30 transition-colors"
              >
                <p className="font-semibold text-nn-navy">NatalNanny AI</p>
                <p className="text-sm text-nn-navy-light">Get instant answers 24/7</p>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
