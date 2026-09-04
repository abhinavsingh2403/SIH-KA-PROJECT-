export function SihLogo({ className = "w-10 h-10" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 120 120"
      className={className}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="Smart India Hackathon Official Lightbulb Logo"
    >
      {/* Background soft glow plate */}
      <rect width="120" height="120" rx="20" fill="#FFFFFF" stroke="#E4E3DD" strokeWidth="1.5" />

      {/* Saffron Glowing Rays (Top Left Innovation Spark) */}
      <line x1="32" y1="26" x2="22" y2="16" stroke="#FF6B00" strokeWidth="3" strokeLinecap="round" />
      <line x1="48" y1="18" x2="48" y2="6" stroke="#FF6B00" strokeWidth="3.2" strokeLinecap="round" />
      <line x1="68" y1="18" x2="72" y2="6" stroke="#FF9933" strokeWidth="3" strokeLinecap="round" />
      <line x1="88" y1="26" x2="98" y2="16" stroke="#0F9D58" strokeWidth="3" strokeLinecap="round" />

      {/* Lightbulb Outer Silhouette (Tricolor Gradient Flow) */}
      <path
        d="M38 68 C34 60 30 52 30 42 C30 25.4 43.4 12 60 12 C76.6 12 90 25.4 90 42 C90 52 86 60 82 68 L78 78 L42 78 Z"
        fill="url(#sihBulbGrad)"
        stroke="#1E293B"
        strokeWidth="2.5"
        strokeLinejoin="round"
      />

      {/* Tricolor Stylized Gear / Ashoka Chakra Innovation Brain inside Bulb */}
      {/* Saffron Half Brain/Idea */}
      <path
        d="M60 22 C50 22 42 30 42 40 C42 46 45 52 50 56"
        stroke="#FF9933"
        strokeWidth="3"
        strokeLinecap="round"
      />
      <circle cx="50" cy="34" r="3" fill="#FF9933" />
      <line x1="50" y1="34" x2="60" y2="40" stroke="#FF9933" strokeWidth="2" />

      {/* White/Navy Core Filament Hub */}
      <circle cx="60" cy="40" r="4.5" fill="#1E293B" stroke="#FFFFFF" strokeWidth="1.5" />

      {/* Green Half Brain / Digital Tech Nodes */}
      <path
        d="M60 22 C70 22 78 30 78 40 C78 46 75 52 70 56"
        stroke="#138808"
        strokeWidth="3"
        strokeLinecap="round"
      />
      <circle cx="70" cy="34" r="3" fill="#138808" />
      <line x1="70" y1="34" x2="60" y2="40" stroke="#138808" strokeWidth="2" />

      {/* Filament connection loop to base */}
      <path
        d="M52 56 L52 74 M68 56 L68 74"
        stroke="#0284C7"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      <path
        d="M52 64 L68 64"
        stroke="#0284C7"
        strokeWidth="2"
      />

      {/* Lightbulb Threaded Screw Base (Metallic Grooves) */}
      <rect x="44" y="80" width="32" height="5" rx="2" fill="#64748B" stroke="#1E293B" strokeWidth="1.5" />
      <rect x="46" y="87" width="28" height="5" rx="2" fill="#475569" stroke="#1E293B" strokeWidth="1.5" />
      <path
        d="M50 94 C50 99 70 99 70 94 Z"
        fill="#1E293B"
      />

      {/* SIH Monogram Banner across screw base */}
      <rect x="36" y="101" width="48" height="15" rx="3" fill="#FF9933" />
      <text
        x="60"
        y="112.5"
        textAnchor="middle"
        fill="#FFFFFF"
        fontFamily="'Space Grotesk', -apple-system, sans-serif"
        fontWeight="900"
        fontSize="11"
        letterSpacing="0.1em"
      >
        SIH
      </text>

      {/* Gradient Definitions */}
      <defs>
        <linearGradient id="sihBulbGrad" x1="30" y1="12" x2="90" y2="78" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#FFF7ED" />
          <stop offset="50%" stopColor="#FFFFFF" />
          <stop offset="100%" stopColor="#F0FDF4" />
        </linearGradient>
      </defs>
    </svg>
  );
}
