import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import {
  getContacts,
  createThread,
  getReceivedMessageRequests,
  acceptMessageRequest,
  rejectMessageRequest,
  getMessages,
  type Contact,
  type ThreadWithStatus,
  type UserSearchResult,
} from '../lib/api'
import ChatPanel from '../components/messaging/ChatPanel'
import AIAgentChat from '../components/messaging/AIAgentChat'
import UserSearchModal from '../components/messaging/UserSearchModal'
import MessageRequestModal from '../components/messaging/MessageRequestModal'
import MessageRequestItem from '../components/messaging/MessageRequestItem'

export default function MessagingPage() {
  const { isDemoMode } = useAuth()
  const [searchParams] = useSearchParams()
  const [contacts, setContacts] = useState<Contact[]>([])
  const [activeContactId, setActiveContactId] = useState<string | null>(null)
  const [mobileShowChat, setMobileShowChat] = useState(false)
  const [threadId, setThreadId] = useState<string | null>(null)
  const [loadingThread, setLoadingThread] = useState(false)

  // Message request management
  const [activeTab, setActiveTab] = useState<'active' | 'requests'>('active')
  const [showSearchModal, setShowSearchModal] = useState(false)
  const [showRequestModal, setShowRequestModal] = useState(false)
  const [selectedUser, setSelectedUser] = useState<UserSearchResult | null>(null)
  const [messageRequests, setMessageRequests] = useState<ThreadWithStatus[]>([])
  const [requestMessages, setRequestMessages] = useState<Map<string, string>>(new Map())

  // Load contacts
  useEffect(() => {
    if (isDemoMode) {
      setContacts([
        { id: 'demo-doctor', role: 'doctor', display_name: 'Dr. Rivera', email: null },
        { id: 'ai-agent', role: null, display_name: 'NatalNanny AI', email: null },
      ])
      return
    }
    getContacts()
      .then(setContacts)
      .catch(() => {})
  }, [isDemoMode])

  // Load message requests
  useEffect(() => {
    if (isDemoMode) return
    loadMessageRequests()
  }, [isDemoMode])

  async function loadMessageRequests() {
    try {
      const requests = await getReceivedMessageRequests()
      setMessageRequests(requests)

      // Load first message for each request
      const messages = new Map<string, string>()
      await Promise.all(
        requests.map(async (req) => {
          try {
            const page = await getMessages(req.id)
            if (page.items.length > 0) {
              messages.set(req.id, page.items[0].content)
            }
          } catch {
            // Ignore errors for individual messages
          }
        })
      )
      setRequestMessages(messages)
    } catch {
      // Ignore errors
    }
  }

  // Handle URL params
  useEffect(() => {
    const tab = searchParams.get('tab')
    if (tab === 'ai') {
      setActiveContactId('ai-agent')
      setMobileShowChat(true)
    } else if (tab === 'doctor' && contacts.length > 0) {
      const doctor = contacts.find((c) => c.role === 'doctor')
      if (doctor) {
        setActiveContactId(doctor.id)
        setMobileShowChat(true)
      }
    }
  }, [searchParams, contacts])

  // When selecting a contact, find/create thread
  async function selectContact(contact: Contact) {
    setActiveContactId(contact.id)
    setMobileShowChat(true)
    setThreadId(null)

    if (contact.id === 'ai-agent') return // AI agent handles its own thread

    if (isDemoMode) {
      setThreadId('demo-thread-' + contact.id)
      return
    }

    setLoadingThread(true)
    try {
      const thread = await createThread([contact.id])
      setThreadId(thread.id)
    } catch {
      // Could show error
    } finally {
      setLoadingThread(false)
    }
  }

  async function handleAcceptRequest(threadId: string) {
    try {
      await acceptMessageRequest(threadId)
      await loadMessageRequests()
      // Refresh contacts to show newly accepted conversation
      getContacts().then(setContacts).catch(() => {})
      // Switch to active tab
      setActiveTab('active')
    } catch (err) {
      console.error('Failed to accept request:', err)
    }
  }

  async function handleRejectRequest(threadId: string) {
    try {
      await rejectMessageRequest(threadId)
      await loadMessageRequests()
    } catch (err) {
      console.error('Failed to reject request:', err)
    }
  }

  function handleSelectUser(user: UserSearchResult) {
    setSelectedUser(user)
    setShowRequestModal(true)
  }

  async function handleRequestSuccess() {
    await loadMessageRequests()
    // Optionally switch to requests tab
    setActiveTab('requests')
  }

  const activeContact = contacts.find((c) => c.id === activeContactId)
  const isAI = activeContactId === 'ai-agent'
  const requestCount = messageRequests.length

  return (
    <div className="flex h-full overflow-hidden">
      {/* Left contacts sidebar */}
      <aside
        className={[
          'flex flex-col border-r border-nn-mist bg-white',
          'w-full flex-shrink-0 lg:w-80',
          mobileShowChat ? 'hidden lg:flex' : 'flex',
        ].join(' ')}
      >
        {/* Sidebar header */}
        <div className="flex-shrink-0 border-b border-nn-mist px-5 py-5">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold text-nn-navy">Messages</h1>
              <p className="mt-0.5 text-xs text-nn-navy-light" style={{ fontFamily: 'var(--font-body)' }}>
                Your care team &amp; AI support
              </p>
            </div>
            {!isDemoMode && (
              <button
                onClick={() => setShowSearchModal(true)}
                className="flex-shrink-0 w-10 h-10 rounded-full bg-nn-deep-blue text-white flex items-center justify-center hover:bg-nn-deep-blue/90 transition-colors shadow-md"
                aria-label="New message"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
              </button>
            )}
          </div>

          {/* Tabs */}
          {!isDemoMode && (
            <div className="mt-4 flex gap-2">
              <button
                onClick={() => setActiveTab('active')}
                className={`flex-1 px-4 py-2 text-sm font-medium rounded-lg transition-all ${
                  activeTab === 'active'
                    ? 'bg-white shadow-sm text-nn-deep-blue'
                    : 'text-gray-600 hover:text-gray-800'
                }`}
              >
                Active Chats
              </button>
              <button
                onClick={() => setActiveTab('requests')}
                className={`relative flex-1 px-4 py-2 text-sm font-medium rounded-lg transition-all ${
                  activeTab === 'requests'
                    ? 'bg-white shadow-sm text-nn-deep-blue'
                    : 'text-gray-600 hover:text-gray-800'
                }`}
              >
                Requests
                {requestCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                    {requestCount}
                  </span>
                )}
              </button>
            </div>
          )}
        </div>

        {/* Contact list / Request list */}
        <nav className="flex-1 overflow-y-auto p-3 space-y-1">
          {activeTab === 'requests' && !isDemoMode ? (
            messageRequests.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
                <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mb-3">
                  <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 19v-8.93a2 2 0 01.89-1.664l7-4.666a2 2 0 012.22 0l7 4.666A2 2 0 0121 10.07V19M3 19a2 2 0 002 2h14a2 2 0 002-2M3 19l6.75-4.5M21 19l-6.75-4.5M3 10l6.75 4.5M21 10l-6.75 4.5m0 0l-1.14.76a2 2 0 01-2.22 0l-1.14-.76" />
                  </svg>
                </div>
                <p className="text-sm font-medium text-gray-900">No message requests</p>
                <p className="text-xs text-gray-500 mt-1">
                  New message requests will appear here
                </p>
              </div>
            ) : (
              messageRequests.map((request) => {
                // Get display name from the first message sender (will be the other person)
                const firstMessage = requestMessages.get(request.id) || 'Sent you a message request'
                const displayName = `User ${request.initiator_id?.slice(0, 8) || 'Unknown'}`

                return (
                  <MessageRequestItem
                    key={request.id}
                    request={request}
                    displayName={displayName}
                    firstMessage={firstMessage}
                    onAccept={() => handleAcceptRequest(request.id)}
                    onReject={() => handleRejectRequest(request.id)}
                  />
                )
              })
            )
          ) : (
            contacts.map((contact) => {
            const isActive = activeContactId === contact.id
            const isAIContact = contact.id === 'ai-agent'

            return (
              <button
                key={contact.id}
                onClick={() => selectContact(contact)}
                className={[
                  'group flex w-full items-start gap-3 rounded-xl px-4 py-3 text-left transition-all',
                  isActive
                    ? 'bg-nn-pale-sky shadow-sm border border-nn-periwinkle/60'
                    : 'hover:bg-nn-pale-sky/60',
                ].join(' ')}
              >
                {/* Avatar */}
                <div className={`relative flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full ${isAIContact ? 'bg-gradient-to-br from-nn-periwinkle to-nn-deep-blue' : 'bg-nn-deep-blue'} shadow-sm`}>
                  {isAIContact ? (
                    <svg viewBox="0 0 20 20" fill="white" className="h-5 w-5">
                      <path d="M10 2a1 1 0 0 1 .894.553l2.083 4.221 4.658.677a1 1 0 0 1 .555 1.705l-3.37 3.285.795 4.638a1 1 0 0 1-1.45 1.054L10 15.913l-4.165 2.22a1 1 0 0 1-1.45-1.054l.795-4.638L1.81 9.156a1 1 0 0 1 .555-1.705l4.658-.677L9.106 2.553A1 1 0 0 1 10 2Z" />
                    </svg>
                  ) : (
                    <span className="text-lg font-bold text-white">
                      {contact.display_name.charAt(0).toUpperCase()}
                    </span>
                  )}
                  <span className="absolute bottom-0.5 right-0.5 h-3 w-3 rounded-full border-2 border-white bg-emerald-400" />
                </div>

                {/* Info */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <p className={`truncate text-sm font-bold ${isActive ? 'text-nn-deep-blue' : 'text-nn-navy'}`}>
                      {contact.display_name}
                    </p>
                    {contact.role && (
                      <span className="flex-shrink-0 rounded-full bg-nn-pale-sky px-2 py-0.5 text-[10px] font-medium text-nn-deep-blue capitalize">
                        {contact.role}
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-nn-navy-light" style={{ fontFamily: 'var(--font-body)' }}>
                    {isAIContact ? 'Health context · Not a diagnosis' : contact.role === 'doctor' ? 'Care provider' : 'Patient'}
                  </p>
                </div>
              </button>
            )
          })
          )}
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

      {/* Right chat panel */}
      <div
        className={[
          'flex flex-1 flex-col overflow-hidden',
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

        {/* Chat area */}
        <div className="flex-1 overflow-hidden">
          {isAI ? (
            <AIAgentChat />
          ) : activeContact ? (
            loadingThread ? (
              <div className="flex h-full items-center justify-center">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-nn-periwinkle border-t-nn-deep-blue" />
              </div>
            ) : (
              <ChatPanel
                threadId={threadId}
                contactName={activeContact.display_name}
                contactAvatar={
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-nn-deep-blue text-white font-bold text-lg flex-shrink-0">
                    {activeContact.display_name.charAt(0).toUpperCase()}
                  </div>
                }
                statusLine={activeContact.role === 'doctor' ? 'Available · Care provider' : 'Patient'}
              />
            )
          ) : (
            <div className="flex h-full flex-col items-center justify-center text-center bg-nn-pale-sky/50">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-nn-soft-blue mb-4">
                <svg viewBox="0 0 24 24" fill="none" stroke="#4663ac" strokeWidth="1.6" className="h-8 w-8">
                  <path d="M21 13.5C21 18.19 16.97 22 12 22c-1.38 0-2.69-.3-3.85-.84L3 22l1.38-4.65A9.46 9.46 0 0 1 3 13.5C3 8.81 7.03 5 12 5s9 3.81 9 8.5Z" strokeLinejoin="round" />
                </svg>
              </div>
              <p className="font-bold text-nn-navy">Select a conversation</p>
              <p className="mt-1 text-sm text-nn-navy-light" style={{ fontFamily: 'var(--font-body)' }}>
                Choose a contact from the sidebar to start messaging
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      <UserSearchModal
        isOpen={showSearchModal}
        onClose={() => setShowSearchModal(false)}
        onSelectUser={handleSelectUser}
      />
      <MessageRequestModal
        isOpen={showRequestModal}
        onClose={() => {
          setShowRequestModal(false)
          setSelectedUser(null)
        }}
        recipient={selectedUser}
        onSuccess={handleRequestSuccess}
      />
    </div>
  )
}
