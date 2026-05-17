import type { CheckupResult } from '../types/checkup'

const BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:8000'

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...init,
  })
  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText)
    throw new Error(`API ${res.status}: ${text}`)
  }
  return res.json() as Promise<T>
}

// Separate helper for multipart uploads — browser sets Content-Type with boundary automatically
async function upload<T>(path: string, form: FormData): Promise<T> {
  const res = await fetch(`${BASE}${path}`, { method: 'POST', body: form })
  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText)
    throw new Error(`API ${res.status}: ${text}`)
  }
  return res.json() as Promise<T>
}

export const api = {
  checkup: {
    // Upload a recorded video blob for real rPPG analysis
    upload: (blob: Blob, sid: string) => {
      const ext = blob.type.includes('mp4') ? '.mp4' : '.webm'
      const form = new FormData()
      form.append('file', blob, `recording${ext}`)
      form.append('session_id', sid)
      return upload<CheckupResult>('/api/checkup/upload', form)
    },

    // Analyze an already-saved video by file path (server-side path)
    analyze: (videoPath: string, sessionId?: string) =>
      request<CheckupResult>('/api/checkup/analyze', {
        method: 'POST',
        body: JSON.stringify({ video_path: videoPath, session_id: sessionId }),
      }),

    latest: () => request<CheckupResult>('/api/checkup/latest'),

    history: (limit = 30) =>
      request<CheckupResult[]>(`/api/checkup/history?limit=${limit}`),

    mock: (estimatedHrBpm = 78, signalQuality = 'good') =>
      request<CheckupResult>('/api/checkup/mock', {
        method: 'POST',
        body: JSON.stringify({
          estimated_hr_bpm: estimatedHrBpm,
          signal_quality: signalQuality,
        }),
      }),
  },
}
