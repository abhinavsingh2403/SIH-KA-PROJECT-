export function SihLogo({ className = "w-9 h-9" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 100 100"
      className={className}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="Smart India Hackathon Logo"
    >
      {/* Precision Circular Enclosure */}
      <circle cx="50" cy="50" r="48" fill="#1B1F27" stroke="#CFCDC4" strokeWidth="1.5" />

      {/* Saffron Arc Top */}
      <path
        d="M24 38 C32 24, 68 24, 76 38"
        stroke="#FF9933"
        strokeWidth="4"
        strokeLinecap="round"
      />

      {/* Tricolor Stylized Tech Nodes */}
      <circle cx="28" cy="38" r="3.5" fill="#FF9933" />
      <circle cx="50" cy="27" r="3.5" fill="#FFFFFF" />
      <circle cx="72" cy="38" r="3.5" fill="#138808" />

      {/* Green Arc Bottom */}
      <path
        d="M24 62 C32 76, 68 76, 76 62"
        stroke="#138808"
        strokeWidth="4"
        strokeLinecap="round"
      />

      {/* Central Ashoka Spoke Emblem Ring */}
      <circle cx="50" cy="50" r="16" stroke="#FFFFFF" strokeWidth="1.8" strokeDasharray="3 2" />
      <circle cx="50" cy="50" r="4" fill="#FF9933" />

      {/* SIH High-Contrast Monogram */}
      <text
        x="50"
        y="54"
        textAnchor="middle"
        fill="#FFFFFF"
        fontFamily="'Space Grotesk', -apple-system, sans-serif"
        fontWeight="800"
        fontSize="12.5"
        letterSpacing="0.08em"
      >
        SIH
      </text>

      {/* Smart India Hackathon Tagline Arch Marker */}
      <circle cx="50" cy="73" r="3" fill="#138808" />
    </svg>
  );
}
