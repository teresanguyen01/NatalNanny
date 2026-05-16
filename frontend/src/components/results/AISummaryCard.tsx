export default function AISummaryCard() {
  return (
    <div className="rounded-3xl bg-gradient-to-br from-nn-pale-sky to-nn-periwinkle p-6 shadow-sm">
      <div className="mb-4 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-nn-deep-blue shadow-sm">
          <svg viewBox="0 0 20 20" fill="white" className="h-5 w-5">
            <path d="M10 2a1 1 0 0 1 .894.553l2.083 4.221 4.658.677a1 1 0 0 1 .555 1.705l-3.37 3.285.795 4.638a1 1 0 0 1-1.45 1.054L10 15.913l-4.165 2.22a1 1 0 0 1-1.45-1.054l.795-4.638L1.81 9.156a1 1 0 0 1 .555-1.705l4.658-.677L9.106 2.553A1 1 0 0 1 10 2Z" />
          </svg>
        </div>
        <div>
          <p className="font-semibold text-nn-navy">NatalNanny AI Summary</p>
          <p className="text-xs text-nn-navy-light">Based on your health context and checkup history</p>
        </div>
      </div>

      <div className="rounded-2xl bg-white/80 p-4">
        <p className="text-sm leading-relaxed text-nn-navy">
          Your estimated heart and breathing signals look close to your recent baseline. Your
          7-day heart rate range has been <strong>87–92 bpm</strong> and respiratory rate{' '}
          <strong>16–19 br/min</strong>. Continue daily checkups to build a clearer picture of your
          trends.
        </p>
        <p className="mt-3 text-sm leading-relaxed text-nn-navy">
          If you feel <strong>chest pain</strong>, <strong>shortness of breath</strong>,{' '}
          <strong>dizziness</strong>, <strong>fainting</strong>, or{' '}
          <strong>severe headache</strong>, contact your care team right away.
        </p>
      </div>

      <div className="mt-3 rounded-2xl bg-amber-50 border border-amber-100 px-4 py-2.5">
        <p className="text-[11px] text-amber-700">
          <strong>Reminder from Dr. Rivera:</strong> Call if shortness of breath at rest, chest
          pain, severe headache, vision changes, or BP ≥ 140/90.
        </p>
      </div>

      <p className="mt-3 text-center text-[10px] text-nn-navy-light">
        AI summaries use your health context. They are not a diagnosis. Always contact your care team for medical decisions.
      </p>
    </div>
  )
}
