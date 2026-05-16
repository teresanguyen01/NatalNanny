export default function MascotPanel() {
  return (
    <div className="fade-up fade-up-1 rounded-3xl bg-gradient-to-b from-nn-pale-sky to-nn-soft-blue p-6 flex flex-col items-center text-center">
      {/* Mascot SVG */}
      <div className="relative mb-4">
        <svg viewBox="0 0 120 140" fill="none" xmlns="http://www.w3.org/2000/svg" className="h-36 w-36 drop-shadow-sm">
          {/* Sparkles */}
          <circle cx="18" cy="28" r="3" fill="#c1d8f0" opacity="0.8" />
          <circle cx="104" cy="22" r="2.5" fill="#c1d8f0" opacity="0.7" />
          <circle cx="108" cy="100" r="2" fill="#c8d9ed" opacity="0.6" />
          <circle cx="14" cy="95" r="2" fill="#c1d8f0" opacity="0.6" />
          <circle cx="25" cy="55" r="1.5" fill="#4663ac" opacity="0.3" />
          <circle cx="96" cy="60" r="1.5" fill="#4663ac" opacity="0.3" />

          {/* Body cloud-shape */}
          <ellipse cx="60" cy="95" rx="38" ry="28" fill="#c8d9ed" />
          <ellipse cx="40" cy="88" rx="20" ry="16" fill="#c8d9ed" />
          <ellipse cx="80" cy="88" rx="20" ry="16" fill="#c8d9ed" />

          {/* Head */}
          <circle cx="60" cy="55" r="32" fill="#e1f1fd" />

          {/* Ear nubs */}
          <circle cx="32" cy="36" r="8" fill="#d2deeb" />
          <circle cx="88" cy="36" r="8" fill="#d2deeb" />
          <circle cx="32" cy="36" r="4.5" fill="#e1f1fd" />
          <circle cx="88" cy="36" r="4.5" fill="#e1f1fd" />

          {/* Blush */}
          <ellipse cx="43" cy="62" rx="8" ry="5" fill="#f0c0c0" opacity="0.45" />
          <ellipse cx="77" cy="62" rx="8" ry="5" fill="#f0c0c0" opacity="0.45" />

          {/* Eyes */}
          <circle cx="50" cy="52" r="5.5" fill="#4663ac" />
          <circle cx="70" cy="52" r="5.5" fill="#4663ac" />
          <circle cx="52" cy="50" r="2" fill="white" />
          <circle cx="72" cy="50" r="2" fill="white" />

          {/* Smile */}
          <path d="M 50 65 Q 60 73 70 65" stroke="#4663ac" strokeWidth="2.5" fill="none" strokeLinecap="round" />

          {/* Heart on body */}
          <path
            d="M60 102 L52 94 Q47.5 89.5 52 85 Q56.5 80.5 60 85 Q63.5 80.5 68 85 Q72.5 89.5 68 94 Z"
            fill="#4663ac"
            opacity="0.65"
          />
        </svg>

        {/* Speech bubble */}
        <div className="absolute -right-3 -top-2 max-w-[120px] rounded-2xl rounded-bl-sm bg-white px-3 py-2 shadow-md">
          <p className="text-[10px] font-medium leading-snug text-nn-navy">
            I'm here to help you check in today! 💙
          </p>
          {/* bubble tail */}
          <div className="absolute -bottom-1.5 left-3 h-3 w-3 rotate-45 bg-white" />
        </div>
      </div>

      <h3 className="text-sm font-semibold text-nn-navy">NatalNanny</h3>
      <p className="mt-1 text-xs leading-relaxed text-nn-navy-light">
        Your daily heart and breathing companion
      </p>

      <div className="mt-4 w-full space-y-2">
        <div className="rounded-2xl bg-white/70 px-4 py-3 text-left">
          <p className="text-xs text-nn-navy leading-relaxed">
            "Small daily signals can help you and your care team notice changes earlier."
          </p>
        </div>
        <div className="rounded-2xl bg-white/70 px-4 py-3 text-left">
          <p className="text-xs text-nn-navy leading-relaxed">
            "Your checkup summary is always ready to share with Dr. Rivera."
          </p>
        </div>
      </div>
    </div>
  )
}
