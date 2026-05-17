import type {
  CheckupResult,
  StartSessionResponse,
  TranscribeResponse,
  FinishSessionPayload,
} from '../types/checkup'

// Empty string = relative URLs → Vite proxy forwards /api/* to localhost:8000 (no CORS).
// Set VITE_API_URL in .env for production deployments with an absolute URL.
const API_BASE = import.meta.env.VITE_API_URL || ''

export const isDemoMode = false

function getToken(): string | null {
  return localStorage.getItem('token')
}

async function fetchApi<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken()
  const res = await fetch(`${API_BASE}/api${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.detail || `API error ${res.status}`)
  }
  if (res.status === 204) return undefined as unknown as T
  return res.json()
}

// Multipart upload — browser sets Content-Type with boundary automatically
async function uploadFile<T>(path: string, form: FormData): Promise<T> {
  const token = getToken()
  const res = await fetch(`${API_BASE}/api${path}`, {
    method: 'POST',
    body: form,
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.detail || `API error ${res.status}`)
  }
  return res.json()
}

// ── Auth ────────────────────────────────────────────────────────────────────

interface AuthResult {
  token: string
  user: { id: string; email: string }
}

export async function authLogin(email: string, password: string): Promise<AuthResult> {
  const res = await fetchApi<AuthResult>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  })
  localStorage.setItem('token', res.token)
  return res
}

export async function authSignup(
  email: string,
  password: string,
  firstName: string,
  lastName: string,
  phoneNumber: string
): Promise<AuthResult> {
  const res = await fetchApi<AuthResult>('/auth/signup', {
    method: 'POST',
    body: JSON.stringify({
      email,
      password,
      first_name: firstName,
      last_name: lastName,
      phone_number: phoneNumber,
    }),
  })
  localStorage.setItem('token', res.token)
  return res
}

export function authLogout(): void {
  localStorage.removeItem('token')
}

// ── Types ────────────────────────────────────────────────────────────────────

export interface Contact {
  id: string
  role: 'patient' | 'doctor' | null
  display_name: string
  email: string | null
}

export interface Thread {
  id: string
  type: 'user' | 'agent'
  last_message_at: string | null
  created_at: string
}

export interface ThreadWithStatus extends Thread {
  status: 'pending' | 'accepted' | 'rejected' | 'blocked'
  initiator_id: string | null
}

export interface MessageItem {
  id: string
  thread_id: string
  sender_id: string | null
  sender_type: 'user' | 'agent'
  content: string
  created_at: string
  read_at: string | null
}

export interface MessagesPage {
  items: MessageItem[]
  next_cursor: string | null
}

export interface UserProfile {
  id: string
  role: 'patient' | 'doctor' | null
  mascot_health: number
  first_name: string | null
  last_name: string | null
  phone_number: string | null
  emergency_contact_name: string | null
  emergency_contact_phone: string | null
  created_at: string
  updated_at: string
}

export interface DoctorPatientLink {
  doctor_id: string
  patient_id: string
  created_at: string
}

export interface DoctorPatientLinkWithStatus extends DoctorPatientLink {
  status: 'pending' | 'accepted' | 'rejected'
  initiator_id: string
}

export interface UserSearchResult {
  id: string
  first_name: string | null
  last_name: string | null
  display_name: string
  role: 'patient' | 'doctor'
}

// ── API Functions ────────────────────────────────────────────────────────────

export function getProfile(): Promise<UserProfile> {
  return fetchApi('/users/me/profile')
}

export function updateProfile(data: {
  role?: string
  mascot_health?: number
  first_name?: string
  last_name?: string
  phone_number?: string
  emergency_contact_name?: string
  emergency_contact_phone?: string
}): Promise<UserProfile> {
  return fetchApi('/users/me/profile', { method: 'PATCH', body: JSON.stringify(data) })
}

export function getContacts(): Promise<Contact[]> {
  return fetchApi('/messaging/contacts')
}

export function getThreads(): Promise<Thread[]> {
  return fetchApi('/messaging/threads')
}

export function getMessages(threadId: string, cursor?: string): Promise<MessagesPage> {
  const params = new URLSearchParams()
  if (cursor) params.set('cursor', cursor)
  const qs = params.toString()
  return fetchApi(`/messaging/threads/${threadId}/messages${qs ? `?${qs}` : ''}`)
}

export function createThread(participantIds: string[]): Promise<Thread> {
  return fetchApi('/messaging/threads', {
    method: 'POST',
    body: JSON.stringify({ participant_ids: participantIds }),
  })
}

export function getOrCreateAgentThread(): Promise<Thread> {
  return fetchApi('/messaging/agent/thread')
}

export function sendMessageRest(threadId: string, content: string): Promise<MessageItem> {
  return fetchApi(`/messaging/threads/${threadId}/messages`, {
    method: 'POST',
    body: JSON.stringify({ content }),
  })
}

// Doctor-patient management
export function listMyPatients(): Promise<DoctorPatientLink[]> {
  return fetchApi('/doctor-patients')
}

export function addPatient(patientId: string): Promise<DoctorPatientLink> {
  return fetchApi('/doctor-patients', {
    method: 'POST',
    body: JSON.stringify({ patient_id: patientId }),
  })
}

export function removePatient(patientId: string): Promise<void> {
  return fetchApi(`/doctor-patients/${patientId}`, { method: 'DELETE' })
}

export function listMyDoctors(): Promise<DoctorPatientLink[]> {
  return fetchApi('/my-doctors')
}

export function getWebSocketUrl(threadId: string): string {
  const wsBase = API_BASE.replace(/^http/, 'ws')
  return `${wsBase}/ws/messaging/${threadId}`
}

// User search
export function searchUsers(query: string, limit = 20): Promise<UserSearchResult[]> {
  const params = new URLSearchParams({ q: query, limit: limit.toString() })
  return fetchApi(`/users/search?${params}`)
}

// Message requests
export function sendMessageRequest(recipientId: string, initialMessage: string): Promise<ThreadWithStatus> {
  return fetchApi('/messaging/requests', {
    method: 'POST',
    body: JSON.stringify({ recipient_id: recipientId, initial_message: initialMessage }),
  })
}

export function getReceivedMessageRequests(): Promise<ThreadWithStatus[]> {
  return fetchApi('/messaging/requests/received')
}

export function getSentMessageRequests(): Promise<ThreadWithStatus[]> {
  return fetchApi('/messaging/requests/sent')
}

export function acceptMessageRequest(threadId: string): Promise<ThreadWithStatus> {
  return fetchApi(`/messaging/requests/${threadId}/accept`, { method: 'POST' })
}

export function rejectMessageRequest(threadId: string): Promise<ThreadWithStatus> {
  return fetchApi(`/messaging/requests/${threadId}/reject`, { method: 'POST' })
}

// Connection requests
export function sendConnectionRequest(targetUserId: string): Promise<DoctorPatientLinkWithStatus> {
  return fetchApi('/connection-requests', {
    method: 'POST',
    body: JSON.stringify({ target_user_id: targetUserId }),
  })
}

export function getReceivedConnectionRequests(): Promise<DoctorPatientLinkWithStatus[]> {
  return fetchApi('/connection-requests/received')
}

export function getSentConnectionRequests(): Promise<DoctorPatientLinkWithStatus[]> {
  return fetchApi('/connection-requests/sent')
}

export function acceptConnectionRequest(connectionId: string): Promise<DoctorPatientLinkWithStatus> {
  return fetchApi(`/connection-requests/${connectionId}/accept`, { method: 'POST' })
}

export function rejectConnectionRequest(connectionId: string): Promise<DoctorPatientLinkWithStatus> {
  return fetchApi(`/connection-requests/${connectionId}/reject`, { method: 'POST' })
}

// ── Checkup / rPPG ───────────────────────────────────────────────────────────

export const api = {
  checkup: {
    upload: (blob: Blob, sid: string) => {
      const ext = blob.type.includes('mp4') ? '.mp4' : '.webm'
      const form = new FormData()
      form.append('file', blob, `recording${ext}`)
      form.append('session_id', sid)
      return uploadFile<CheckupResult>('/checkup/upload', form)
    },

    analyze: (videoPath: string, sessionId?: string) =>
      fetchApi<CheckupResult>('/checkup/analyze', {
        method: 'POST',
        body: JSON.stringify({ video_path: videoPath, session_id: sessionId }),
      }),

    latest: () => fetchApi<CheckupResult>('/checkup/latest'),

    history: (limit = 30) =>
      fetchApi<CheckupResult[]>(`/checkup/history?limit=${limit}`),

    mock: (estimatedHrBpm = 78, signalQuality = 'good') =>
      fetchApi<CheckupResult>('/checkup/mock', {
        method: 'POST',
        body: JSON.stringify({
          estimated_hr_bpm: estimatedHrBpm,
          signal_quality: signalQuality,
        }),
      }),
  },

  voiceCheckup: {
    startSession: () =>
      fetchApi<StartSessionResponse>('/checkup/start-session', { method: 'POST' }),

    transcribeAnswer: (sessionId: string, questionId: string, audioBlob: Blob) => {
      const suffix = audioBlob.type.includes('mp4') ? '.mp4' : '.webm'
      const form = new FormData()
      form.append('session_id', sessionId)
      form.append('question_id', questionId)
      form.append('audio', audioBlob, `answer${suffix}`)
      return uploadFile<TranscribeResponse>('/checkup/transcribe-answer', form)
    },

    finishSession: (payload: FinishSessionPayload) =>
      fetchApi<CheckupResult>('/checkup/finish-session', {
        method: 'POST',
        body: JSON.stringify(payload),
      }),

    mockVoiceSession: () =>
      fetchApi<CheckupResult>('/checkup/mock-voice-session', { method: 'POST' }),

    voiceLatest: () =>
      fetchApi<CheckupResult>('/checkup/voice-latest').catch(() => null),

    voiceHistory: (limit = 30) =>
      fetchApi<CheckupResult[]>(`/checkup/voice-history?limit=${limit}`).catch(() => [] as CheckupResult[]),
  },
}

export { getToken }
