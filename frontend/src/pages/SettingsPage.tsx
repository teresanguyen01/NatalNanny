import { mockUser } from '../data/mockData'
import { useAuth } from '../contexts/AuthContext'

export default function SettingsPage() {
  const { displayName, signOut } = useAuth()

  return (
    <div className="min-h-full p-6 lg:p-8">
      <div className="mx-auto max-w-2xl">
        <div className="fade-up mb-6">
          <h1 className="text-2xl font-bold text-nn-navy">Settings & Profile</h1>
          <p className="text-sm text-nn-navy-light">
            Your health context, preferences, and account settings
          </p>
        </div>

        <div className="space-y-5">
          {/* Profile card */}
          <div className="fade-up fade-up-1 rounded-3xl bg-white p-6 shadow-sm">
            <div className="mb-5 flex items-center gap-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-nn-deep-blue text-2xl font-bold text-white shadow-sm">
                {displayName.charAt(0).toUpperCase()}
              </div>
              <div>
                <p className="text-xl font-bold text-nn-navy">{displayName}</p>
                <p className="text-sm text-nn-navy-light">{mockUser.email}</p>
                <span className="mt-1 inline-block rounded-full bg-nn-pale-sky px-3 py-0.5 text-xs font-medium text-nn-deep-blue">
                  Week {mockUser.gestationalWeek} · Active patient
                </span>
              </div>
            </div>

            <div className="space-y-3">
              <SettingRow label="Full Name" value={displayName} />
              <SettingRow label="Email" value={mockUser.email} />
              <SettingRow label="Preferred Language" value={mockUser.preferredLanguage} />
            </div>
          </div>

          {/* Health context card */}
          <div className="fade-up fade-up-2 rounded-3xl bg-white p-6 shadow-sm">
            <h2 className="mb-4 font-semibold text-nn-navy">Health Context</h2>
            <div className="space-y-3">
              <SettingRow label="Gestational Week" value={`Week ${mockUser.gestationalWeek} of 40`} />
              <SettingRow
                label="Due Date"
                value={new Date(mockUser.dueDate).toLocaleDateString('en-US', {
                  month: 'long',
                  day: 'numeric',
                  year: 'numeric',
                })}
              />
              <SettingRow label="Care Team" value={mockUser.careTeam} />
              <SettingRow
                label="Risk Factors"
                value={mockUser.riskFactors.join(', ')}
                valueClass="text-amber-600"
              />
              <SettingRow label="Emergency Contact" value={mockUser.emergencyContact} />
            </div>
          </div>

          {/* Blood pressure card */}
          <div className="fade-up fade-up-3 rounded-3xl bg-white p-6 shadow-sm">
            <h2 className="mb-1 font-semibold text-nn-navy">Blood Pressure (Manual Entry)</h2>
            <p className="mb-4 text-xs text-nn-navy-light">
              Blood pressure requires manual cuff entry. rPPG values are estimates and cannot measure BP.
            </p>
            <div className="flex items-center gap-4">
              <div className="rounded-2xl bg-nn-pale-sky px-5 py-4">
                <p className="text-xs text-nn-navy-light">Last recorded</p>
                <p className="mt-0.5 text-2xl font-bold text-nn-deep-blue">{mockUser.lastManualBP}</p>
                <p className="text-[11px] text-nn-navy-light">{mockUser.lastBPDate}</p>
              </div>
              <button className="rounded-xl border border-nn-periwinkle bg-nn-pale-sky px-4 py-3 text-sm font-medium text-nn-navy hover:bg-nn-periwinkle transition-colors">
                + Log new reading
              </button>
            </div>
          </div>

          {/* Notification preferences */}
          <div className="fade-up fade-up-4 rounded-3xl bg-white p-6 shadow-sm">
            <h2 className="mb-4 font-semibold text-nn-navy">Notification Preferences</h2>
            <div className="space-y-3">
              {[
                { label: 'Daily checkup reminder', checked: true },
                { label: 'Streak milestone alerts', checked: true },
                { label: 'Doctor message notifications', checked: true },
                { label: 'AI wellness summaries', checked: false },
              ].map(({ label, checked }) => (
                <div key={label} className="flex items-center justify-between py-2 border-b border-nn-mist/60 last:border-0">
                  <span className="text-sm text-nn-navy">{label}</span>
                  <button
                    className={[
                      'relative h-6 w-11 rounded-full transition-colors',
                      checked ? 'bg-nn-deep-blue' : 'bg-nn-mist',
                    ].join(' ')}
                    aria-label={`Toggle ${label}`}
                  >
                    <span
                      className={[
                        'absolute top-1 h-4 w-4 rounded-full bg-white shadow transition-transform',
                        checked ? 'translate-x-6' : 'translate-x-1',
                      ].join(' ')}
                    />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Safety notice */}
          <div className="fade-up fade-up-5 rounded-3xl border border-amber-200 bg-amber-50 p-6">
            <div className="flex gap-3">
              <svg viewBox="0 0 20 20" fill="none" stroke="#d97706" strokeWidth="1.8" className="mt-0.5 h-5 w-5 flex-shrink-0">
                <path d="M10 2L2 17h16L10 2Z" strokeLinejoin="round" />
                <path d="M10 8v4M10 14v.5" strokeLinecap="round" />
              </svg>
              <div>
                <p className="font-semibold text-amber-800">Medical safety notice</p>
                <p className="mt-1 text-sm text-amber-700 leading-relaxed">
                  NatalNanny is a wellness communication tool, not a diagnostic device. All rPPG
                  values are estimates. Blood pressure must be measured with a validated cuff.
                  Always contact your care team for medical decisions. If you have a medical emergency,
                  call 911.
                </p>
              </div>
            </div>
          </div>

          {/* Sign out */}
          <div className="fade-up text-center">
            <button
              onClick={() => void signOut()}
              className="rounded-xl border border-red-200 bg-white px-8 py-3 text-sm font-medium text-red-600 hover:bg-red-50 transition-colors"
            >
              Sign out
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function SettingRow({
  label,
  value,
  valueClass = 'text-nn-navy',
}: {
  label: string
  value: string
  valueClass?: string
}) {
  return (
    <div className="flex items-center justify-between border-b border-nn-mist/60 pb-3 last:border-0 last:pb-0">
      <span className="text-sm text-nn-navy-light">{label}</span>
      <span className={`text-sm font-medium ${valueClass}`}>{value}</span>
    </div>
  )
}
