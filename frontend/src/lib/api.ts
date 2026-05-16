import { supabase } from './supabase'

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000'

async function getToken(): Promise<string | null> {
  if (!supabase) return null
  const { data } = await supabase.auth.getSession()
  return data.session?.access_token ?? null
}

async function fetchApi<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = await getToken()
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

export function updateProfile(data: { role?: string; mascot_health?: number }): Promise<UserProfile> {
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

export function getWebSocketUrl(threadId: string): string {
  const wsBase = API_BASE.replace(/^http/, 'ws')
  return `${wsBase}/ws/messaging/${threadId}`
}

export { getToken }
