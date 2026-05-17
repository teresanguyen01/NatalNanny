import type { CheckupResult } from '../types/checkup'

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000'

export const isDemoMode = !API_BASE || API_BASE === ''

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

export async function authSignup(email: string, password: string): Promise<AuthResult> {
  const res = await fetchApi<AuthResult>('/auth/signup', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
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

// ── API Functions ────────────────────────────────────────────────────────────

export function getProfile(): Promise<UserProfile> {
  return fetchApi('/users/me/profile')
}

export function updateProfile(data: {
  role?: string
  mascot_health?: number
  first_name?: string
  last_name?: string
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
}

export { getToken }
