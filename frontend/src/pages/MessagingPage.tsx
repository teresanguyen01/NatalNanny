import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import DoctorChat from '../components/messaging/DoctorChat'
import AIAgentChat from '../components/messaging/AIAgentChat'
import { mockDoctorMessages, mockAIMessages } from '../data/mockData'

type Tab = 'doctor' | 'ai'

const CONTACTS = [
  {
    id: 'doctor' as const,
    name: 'Dr. Rivera',
    subtitle: 'Maternal-Fetal Medicine',
    avatar: 'R',
    avatarBg: 'bg-nn-deep-blue',
    lastMessage: mockDoctorMessages[mockDoctorMessages.length - 1].text,
    time: mockDoctorMessages[mockDoctorMessages.length - 1].time,
    online: true,
    unread: 0,
  },
  {
    id: 'ai' as const,
    name: 'NatalNanny AI',
    subtitle: 'Health context · Not a diagnosis',
    avatar: null,
    avatarBg: 'bg-gradient-to-br from-nn-periwinkle to-nn-deep-blue',
    lastMessage: mockAIMessages[mockAIMessages.length - 1].text,
    time: mockAIMessages[mockAIMessages.length - 1].time,
    online: true,
    unread: 0,
  },
]

export default function MessagingPage() {
  const [searchParams] = useSearchParams()
  const [activeTab, setActiveTab] = useState<Tab>('doctor')
  const [mobileShowChat, setMobileShowChat] = useState(false)

  useEffect(() => {
    const tab = searchParams.get('tab')
    if (tab === 'ai') { setActiveTab('ai'); setMobileShowChat(true) }
    else if (tab === 'doctor') { setActiveTab('doctor'); setMobileShowChat(true) }
  }, [searchParams])

  return (
    /* Lock to viewport — no outer scroll */
    <div className="flex h-full overflow-hidden">

      {/* ── Left contacts sidebar ── */}
      <aside
        className={[
          'flex flex-col border-r border-nn-mist bg-white',
          'w-full flex-shrink-0 lg:w-80',
          /* On mobile: hide sidebar when chat is open */
          mobileShowChat ? 'hidden lg:flex' : 'flex',
        ].join(' ')}
      >
        {/* Sidebar header */}
        <div className="flex-shrink-0 border-b border-nn-mist px-5 py-5">
          <h1 className="text-xl font-bold text-nn-navy">Messages</h1>
          <p className="mt-0.5 text-xs text-nn-navy-light" style={{ fontFamily: 'var(--font-body)' }}>
            Your care team &amp; AI support
          </p>
        </div>

        {/* Contact list */}
        <nav className="flex-1 overflow-y-auto p-3 space-y-1">
          {CONTACTS.map((contact) => {
            const isActive = activeTab === contact.id

            return (
              <button
                key={contact.id}
                onClick={() => { setActiveTab(contact.id); setMobileShowChat(true) }}
                className={[
                  'group flex w-full items-start gap-3.5 rounded-2xl p-3.5 text-left transition-all',
                  isActive
                    ? 'bg-nn-pale-sky shadow-sm border border-nn-periwinkle/60'
                    : 'hover:bg-nn-pale-sky/60',
                ].join(' ')}
              >
                {/* Avatar */}
                <div className={`relative flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full ${contact.avatarBg} shadow-sm`}>
                  {contact.avatar ? (
                    <span className="text-lg font-bold text-white">{contact.avatar}</span>
                  ) : (
                    <svg viewBox="0 0 20 20" fill="white" className="h-5 w-5">
                      <path d="M10 2a1 1 0 0 1 .894.553l2.083 4.221 4.658.677a1 1 0 0 1 .555 1.705l-3.37 3.285.795 4.638a1 1 0 0 1-1.45 1.054L10 15.913l-4.165 2.22a1 1 0 0 1-1.45-1.054l.795-4.638L1.81 9.156a1 1 0 0 1 .555-1.705l4.658-.677L9.106 2.553A1 1 0 0 1 10 2Z" />
                    </svg>
                  )}
                  {/* Online dot */}
                  {contact.online && (
                    <span className="absolute bottom-0.5 right-0.5 h-3 w-3 rounded-full border-2 border-white bg-emerald-400" />
                  )}
                </div>

                {/* Info */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <p className={`truncate text-sm font-bold ${isActive ? 'text-nn-deep-blue' : 'text-nn-navy'}`}>
                      {contact.name}
                    </p>
                    <span className="flex-shrink-0 text-[10px] text-nn-navy-light" style={{ fontFamily: 'var(--font-body)' }}>
                      {contact.time}
                    </span>
                  </div>
                  <p className="text-[11px] text-nn-navy-light" style={{ fontFamily: 'var(--font-body)' }}>
                    {contact.subtitle}
                  </p>
                  <p className="mt-1.5 line-clamp-2 text-[11px] text-nn-navy-light leading-snug" style={{ fontFamily: 'var(--font-body)' }}>
                    {contact.lastMessage}
                  </p>
                </div>
              </button>
            )
          })}
        </nav>

        {/* Safety notice pinned at bottom */}
        <div className="flex-shrink-0 border-t border-nn-mist p-3">
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5">
            <p className="text-[10px] text-amber-700 leading-snug" style={{ fontFamily: 'var(--font-body)' }}>
              <strong>Urgent symptoms?</strong> Do not message — call your care team or 911 immediately.
            </p>
          </div>
        </div>
      </aside>

      {/* ── Right chat panel ── */}
      <div
        className={[
          'flex flex-1 flex-col overflow-hidden',
          /* On mobile: show only when chat is open */
          mobileShowChat ? 'flex' : 'hidden lg:flex',
        ].join(' ')}
      >
        {/* Mobile: back button */}
        <div className="flex-shrink-0 border-b border-nn-mist bg-white px-4 py-3 lg:hidden">
          <button
            onClick={() => setMobileShowChat(false)}
            className="flex items-center gap-1.5 text-sm font-medium text-nn-deep-blue"
          >
            <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4">
              <path d="M10 4L6 8l4 4" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Contacts
          </button>
        </div>

        {/* Chat component fills remaining space */}
        <div className="flex-1 overflow-hidden">
          {activeTab === 'doctor' ? <DoctorChat /> : <AIAgentChat />}
        </div>
      </div>

      {/* ── Empty state on desktop if no contact selected yet ── */}
      {!mobileShowChat && (
        <div className="hidden lg:flex flex-1 flex-col items-center justify-center text-center bg-nn-pale-sky/50">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-nn-soft-blue mb-4">
            <svg viewBox="0 0 24 24" fill="none" stroke="#4663ac" strokeWidth="1.6" className="h-8 w-8">
              <path d="M21 13.5C21 18.19 16.97 22 12 22c-1.38 0-2.69-.3-3.85-.84L3 22l1.38-4.65A9.46 9.46 0 0 1 3 13.5C3 8.81 7.03 5 12 5s9 3.81 9 8.5Z" strokeLinejoin="round" />
            </svg>
          </div>
          <p className="font-bold text-nn-navy">Select a conversation</p>
          <p className="mt-1 text-sm text-nn-navy-light" style={{ fontFamily: 'var(--font-body)' }}>
            Choose Dr. Rivera or NatalNanny AI from the sidebar
          </p>
        </div>
      )}
    </div>
  )
}
