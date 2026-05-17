// ── Legacy / backward-compat types ───────────────────────────────────────────
export type SignalQualityLabel = 'good' | 'medium' | 'low'
export type MethodAgreementLabel = 'good' | 'moderate' | 'poor' | 'insufficient'
export type PulseCategory = 'low' | 'normal' | 'elevated' | 'high' | 'unknown'
export type CheckInTrend = 'stable' | 'increasing' | 'decreasing' | 'variable'

export interface MethodResult {
  hr_bpm: number | null
  snr: number | null
  status: 'ok' | 'unavailable'
}

// ── New rich schema types ─────────────────────────────────────────────────────
export type PulseCategoryNew =
  | 'below_typical_resting_range'
  | 'typical_resting_range'
  | 'elevated_for_resting_checkin'

export type AgreementQuality = 'good' | 'medium' | 'low'
export type HRTrend = 'stable' | 'increasing' | 'decreasing' | 'variable'
export type WaveformStrength = 'good' | 'medium' | 'low' | 'unknown'
export type Confidence = 'good' | 'medium' | 'low'

export interface CheckupSummary {
  estimated_pulse_bpm: number | null
  pulse_category: PulseCategoryNew
  pulse_label: string
  confidence: Confidence
  retake_recommended: boolean
}

export interface HeartRateStatistics {
  primary_method: string
  backup_method: string
  baseline_method: string
  consensus_method: string
  heart_rate_by_method: { POS: number | null; CHROM: number | null; GREEN: number | null }
  consensus_heart_rate_bpm: number | null
  window_size_seconds: number
  window_values_bpm: number[]
  mean_window_bpm: number | null
  min_window_bpm: number | null
  max_window_bpm: number | null
  range_window_bpm: number | null
  std_window_bpm: number | null
  trend: HRTrend
}

export interface MethodAgreementStats {
  pos_chrom_difference_bpm: number | null
  pos_green_difference_bpm: number | null
  chrom_green_difference_bpm: number | null
  green_difference_from_consensus_bpm: number | null
  outlier_methods: string[]
  agreement_quality: AgreementQuality
}

export interface RPPGWaveformStatistics {
  waveform_available: boolean
  waveform_sample_count: number | null
  dominant_frequency_hz: number | null
  dominant_frequency_bpm: number | null
  peak_power: number | null
  average_band_power: number | null
  snr_like_score: number | null
  valid_window_count: number
}

export interface SignalQuality {
  overall: SignalQualityLabel
  method_agreement: AgreementQuality
  hr_stability: string
  waveform_strength: WaveformStrength
  face_detected: boolean
  multiple_faces_detected: boolean
  recording_duration_seconds: number
  estimated_fps: number
}

export interface RecordingQuality {
  face_detected: boolean
  multiple_faces_detected: boolean
  recording_duration_seconds: number
  frame_count: number
  estimated_fps: number
  resolution: string
  retake_recommended: boolean
  retake_reasons: string[]
}

export interface MaternalWellnessInterpretation {
  wellness_score: number
  score_label: string
  message: string
  suggested_next_step: string
  escalation_note: string
}

export interface FutureMetricRR {
  status: string
  value_breaths_per_min: number | null
  explanation: string
}
export interface FutureMetricBP {
  status: string
  systolic_mmHg: number | null
  diastolic_mmHg: number | null
  explanation: string
}
export interface FutureMetricPWV {
  status: string
  value: number | null
  explanation: string
}
export interface FutureMetricSpO2 {
  status: string
  value_percent: number | null
  explanation: string
}

// ── Combined result interface (new schema + legacy compat fields) ──────────────
export interface CheckupResult {
  session_id: string
  created_at: string

  // New rich schema (present in all results from the updated backend)
  source?: {
    pipeline: string
    mode: string
    methods_run: string[]
    ground_truth_used: boolean
  }
  checkup_summary?: CheckupSummary
  heart_rate_statistics?: HeartRateStatistics
  method_agreement?: MethodAgreementStats
  rppg_waveform_statistics?: RPPGWaveformStatistics
  signal_quality?: SignalQuality
  recording_quality?: RecordingQuality
  maternal_wellness_interpretation?: MaternalWellnessInterpretation
  future_or_unsupported_metrics?: {
    respiratory_rate: FutureMetricRR
    blood_pressure: FutureMetricBP
    pulse_wave_velocity: FutureMetricPWV
    spo2: FutureMetricSpO2
  }
  available_from_webcam?: {
    heart_rate: boolean
    heart_rate_trend: boolean
    rppg_waveform: boolean
    signal_quality: boolean
    recording_quality: boolean
    respiratory_rate: boolean
    blood_pressure: boolean
    spo2: boolean
    pulse_wave_velocity: boolean
  }
  medical_notice?: string

  // Legacy compat fields (always present)
  recording: {
    duration_seconds: number
    frame_count: number
    estimated_fps: number
    video_path: string
  }
  rppg_analysis: {
    methods: {
      pos: MethodResult
      chrom: MethodResult
      green: MethodResult
    }
    consensus: {
      estimated_pulse_bpm: number | null
      pulse_category: PulseCategory
      pulse_label: string
      method_agreement: MethodAgreementLabel | string
      retake_recommended: boolean
    }
    signal_quality: {
      label: SignalQualityLabel
      best_snr: number
      wellness_score: number
    }
    check_in_trend: CheckInTrend | string
  }
  safety: {
    not_diagnostic: boolean
    disclaimer: string
    urgent_notice: string
  }
  analysis_warnings?: Record<string, string>
}
