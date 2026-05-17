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
  is_admin: boolean
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

export interface BrowniePointEntry {
  date: string  // ISO date
  points: number
}

export interface CheckinDateData {
  date: string  // ISO date
  streak: number
}

export interface LastCheckin {
  date: string  // ISO date
  stats: Record<string, unknown> | null
}

export interface DashboardSummary {
  brownie_points: BrowniePointEntry[]
  streak: number
  longest_streak: number
  mascot_health: number
  last_checkin: LastCheckin | null
  checkin_dates: CheckinDateData[]
}

export interface DoctorDashboardSummary {
  total_patients: number
  patients_with_recent_checkups: number
  patients_with_missed_checkups: number
  patients_with_urgent_symptoms: number
}

export interface CheckupSession {
  id: string
  user_id: string
  status: string
  started_at: string
  completed_at: string | null
  brownie_points: number
  stats: any
  rppg_raw: any
}

export interface HealthRecord {
  user_id: string
  data: Record<string, any>
  created_at: string
  updated_at: string
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

// Doctor dashboard and patient data access
export function getDoctorDashboardSummary(): Promise<DoctorDashboardSummary> {
  return fetchApi('/doctor/dashboard-summary')
}

export function getUserProfile(userId: string): Promise<UserProfile> {
  return fetchApi(`/users/${userId}/profile`)
}

export function getUserHealthRecord(userId: string): Promise<HealthRecord> {
  return fetchApi(`/users/${userId}/health-record`)
}

export function updateUserHealthRecord(userId: string, data: Record<string, any>): Promise<HealthRecord> {
  return fetchApi(`/users/${userId}/health-record`, {
    method: 'PATCH',
    body: JSON.stringify({ data }),
  })
}

export function getPatientCheckupSessions(patientId: string): Promise<CheckupSession[]> {
  return fetchApi(`/checkup/sessions/patient/${patientId}`)
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

  dashboard: {
    summary: () =>
      fetchApi<DashboardSummary>('/dashboard/summary'),
  },
}

// ── Health Documents ─────────────────────────────────────────────────────────

export interface HealthDocument {
  id: string
  file_name: string
  file_size_bytes: number
  document_type: string | null
  uploaded_at: string
  processing_status: 'uploaded' | 'processing' | 'indexed' | 'partially_indexed' | 'failed'
  page_count: number | null
  error_message: string | null
  metadata: Record<string, unknown>
  warning?: string
}

export interface UploadHealthDocumentResult {
  document_id: string
  file_name: string
  file_size_bytes: number
  page_count: number | null
  processing_status: string
  uploaded_at: string
  warning?: string
  error?: string
}

export function listHealthDocuments(): Promise<HealthDocument[]> {
  return fetchApi('/profile/health-documents')
}

export function uploadHealthDocument(file: File): Promise<UploadHealthDocumentResult> {
  const form = new FormData()
  form.append('file', file, file.name)
  return uploadFile('/profile/health-documents/upload', form)
}

export function deleteHealthDocument(documentId: string): Promise<void> {
  return fetchApi(`/profile/health-documents/${documentId}`, { method: 'DELETE' })
}

// ── RAG Chat ─────────────────────────────────────────────────────────────────

export interface RagSource {
  source_type: 'health_document' | 'checkup_session' | string
  document_id?: string
  title?: string
  page_number?: number | null
  snippet?: string
  session_id?: string
  created_at?: string
}

export interface RagChatResponse {
  answer: string
  sources: RagSource[]
  safety_notice: string
}

export function ragChat(message: string): Promise<RagChatResponse> {
  return fetchApi('/chat/rag', {
    method: 'POST',
    body: JSON.stringify({ message }),
  })
}

// ── Admin ────────────────────────────────────────────────────────────────────

export interface AdminUserSummary {
  id: string
  email: string
  role: 'patient' | 'doctor' | null
  is_admin: boolean
  mascot_health: number
  current_streak: number
  longest_streak: number
  total_sessions: number
  last_checkin_date: string | null
  created_at: string
}

export interface RecentSession {
  id: string
  start_time: string
  end_time: string | null
  status: string
  brownie_points: number
}

export interface PendingAction {
  id: string
  user_id: string
  action_type: 'reminder' | 'notification' | 'mascot_adjustment' | 'streak_adjustment' | 'brownie_adjustment'
  action_data: Record<string, unknown>
  message: string | null
  scheduled_for: string | null
  status: 'pending' | 'completed' | 'cancelled'
  created_by: string
  created_at: string
  completed_at: string | null
}

export interface AdminUserDetail {
  id: string
  email: string
  role: 'patient' | 'doctor' | null
  is_admin: boolean
  first_name: string | null
  last_name: string | null
  phone_number: string | null
  emergency_contact_name: string | null
  emergency_contact_phone: string | null
  mascot_health: number
  current_streak: number
  longest_streak: number
  last_checkin_date: string | null
  created_at: string
  updated_at: string
  health_record: Record<string, unknown> | null
  recent_sessions: RecentSession[]
  pending_actions: PendingAction[]
}

export interface AdminStats {
  total_users: number
  total_patients: number
  total_doctors: number
  total_admins: number
  active_sessions_today: number
  total_sessions_all_time: number
  pending_actions_count: number
}

export interface AdminAuditLog {
  id: string
  admin_id: string
  action: string
  target_user_id: string | null
  old_values: Record<string, unknown> | null
  new_values: Record<string, unknown> | null
  created_at: string
}

export const admin = {
  listUsers: (params?: {
    q?: string
    role?: 'patient' | 'doctor'
    limit?: number
    offset?: number
  }): Promise<AdminUserSummary[]> => {
    const searchParams = new URLSearchParams()
    if (params?.q) searchParams.append('q', params.q)
    if (params?.role) searchParams.append('role', params.role)
    if (params?.limit) searchParams.append('limit', params.limit.toString())
    if (params?.offset) searchParams.append('offset', params.offset.toString())
    return fetchApi(`/admin/users${searchParams.toString() ? `?${searchParams}` : ''}`)
  },

  getUserDetail: (userId: string): Promise<AdminUserDetail> => {
    return fetchApi(`/admin/users/${userId}`)
  },

  updateUser: (userId: string, payload: { mascot_health?: number; brownie_points?: number }): Promise<{ message: string; updated_fields: string[] }> => {
    return fetchApi(`/admin/users/${userId}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    })
  },

  cancelSession: (userId: string, sessionId: string): Promise<{ message: string }> => {
    return fetchApi(`/admin/users/${userId}/sessions/${sessionId}/cancel`, {
      method: 'POST',
    })
  },

  sendSmsReminder: (userId: string): Promise<{ message: string; recipient: string; phone: string }> => {
    return fetchApi(`/admin/users/${userId}/send-reminder`, {
      method: 'POST',
    })
  },

  scheduleAction: (payload: {
    user_id: string
    action_type: 'reminder' | 'notification' | 'mascot_adjustment' | 'streak_adjustment' | 'brownie_adjustment'
    action_data?: Record<string, unknown>
    message?: string
    scheduled_for?: string
  }): Promise<PendingAction> => {
    return fetchApi('/admin/actions', {
      method: 'POST',
      body: JSON.stringify(payload),
    })
  },

  listActions: (params?: { status?: 'pending' | 'completed' | 'cancelled'; limit?: number; offset?: number }): Promise<PendingAction[]> => {
    const searchParams = new URLSearchParams()
    if (params?.status) searchParams.append('status', params.status)
    if (params?.limit) searchParams.append('limit', params.limit.toString())
    if (params?.offset) searchParams.append('offset', params.offset.toString())
    return fetchApi(`/admin/actions${searchParams.toString() ? `?${searchParams}` : ''}`)
  },

  cancelAction: (actionId: string): Promise<{ message: string }> => {
    return fetchApi(`/admin/actions/${actionId}`, {
      method: 'DELETE',
    })
  },

  getStats: (): Promise<AdminStats> => {
    return fetchApi('/admin/stats')
  },

  getAuditLogs: (params?: {
    admin_id?: string
    target_user_id?: string
    limit?: number
    offset?: number
  }): Promise<AdminAuditLog[]> => {
    const searchParams = new URLSearchParams()
    if (params?.admin_id) searchParams.append('admin_id', params.admin_id)
    if (params?.target_user_id) searchParams.append('target_user_id', params.target_user_id)
    if (params?.limit) searchParams.append('limit', params.limit.toString())
    if (params?.offset) searchParams.append('offset', params.offset.toString())
    return fetchApi(`/admin/audit-logs${searchParams.toString() ? `?${searchParams}` : ''}`)
  },
}

// Settings API
export interface NotificationPreferences {
  email_reminders_enabled: boolean
}

export function getNotificationPreferences(): Promise<NotificationPreferences> {
  return fetchApi('/settings/notifications')
}

export function updateNotificationPreferences(
  preferences: Partial<NotificationPreferences>
): Promise<NotificationPreferences> {
  return fetchApi('/settings/notifications', {
    method: 'PATCH',
    body: JSON.stringify(preferences),
  })
}

export function getTimezone(): Promise<{ timezone: string }> {
  return fetchApi('/settings/timezone')
}

export function updateTimezone(timezone: string): Promise<{ timezone: string }> {
  return fetchApi('/settings/timezone', {
    method: 'PATCH',
    body: JSON.stringify({ timezone }),
  })
}

export { getToken }
