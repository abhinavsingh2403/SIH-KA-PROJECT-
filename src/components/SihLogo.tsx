export function SihLogo({ className = "h-10 w-auto" }: { className?: string }) {
  return (
    <div className={`flex items-center gap-2 select-none shrink-0 ${className}`}>
      {/* Precision Vector SVG of the Official SIH Innovation Brain Lightbulb */}
      <svg
        viewBox="0 0 140 140"
        className="w-10 h-10 shrink-0"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        role="img"
        aria-label="Smart India Hackathon 2026 Official Logo"
      >
        {/* Dark Slate Light Rays (6 Innovation Emission Bars) */}
        {/* Top 90 deg */}
        <line x1="70" y1="18" x2="70" y2="4" stroke="#2F3E46" strokeWidth="5.5" strokeLinecap="round" />
        {/* Top Left 135 deg */}
        <line x1="32" y1="36" x2="22" y2="24" stroke="#2F3E46" strokeWidth="5.5" strokeLinecap="round" />
        {/* Top Right 45 deg */}
        <line x1="108" y1="36" x2="118" y2="24" stroke="#2F3E46" strokeWidth="5.5" strokeLinecap="round" />
        {/* Left 180 deg */}
        <line x1="18" y1="72" x2="4" y2="72" stroke="#2F3E46" strokeWidth="5.5" strokeLinecap="round" />
        {/* Right 0 deg */}
        <line x1="122" y1="72" x2="136" y2="72" stroke="#2F3E46" strokeWidth="5.5" strokeLinecap="round" />
        {/* Bottom Left Angle */}
        <line x1="30" y1="112" x2="20" y2="124" stroke="#2F3E46" strokeWidth="5.5" strokeLinecap="round" />
        {/* Bottom Right Angle */}
        <line x1="110" y1="112" x2="120" y2="124" stroke="#2F3E46" strokeWidth="5.5" strokeLinecap="round" />

        {/* ─── LEFT HEMISPHERE: ORANGE CIRCUIT BOARD BRAIN ─── */}
        <g>
          {/* Orange Brain Silhouette Shell */}
          <path
            d="M66 22 C52 22 40 28 35 38 C28 42 24 50 25 58 C22 65 24 75 29 82 C25 90 30 102 40 106 C48 110 60 110 66 110 Z"
            fill="#FF681F"
          />

          {/* White Circuit Traces inside Left Hemisphere */}
          {/* Vertical Bus Lines */}
          <path d="M62 30 L62 102" stroke="#FFFFFF" strokeWidth="2.5" strokeLinecap="round" />
          <path d="M54 34 L54 100" stroke="#FFFFFF" strokeWidth="2.5" strokeLinecap="round" />
          <path d="M46 44 L46 92" stroke="#FFFFFF" strokeWidth="2.5" strokeLinecap="round" />
          <path d="M38 56 L38 82" stroke="#FFFFFF" strokeWidth="2.5" strokeLinecap="round" />

          {/* Diagonal Circuit Junctions */}
          <path d="M54 50 L46 58" stroke="#FFFFFF" strokeWidth="2.2" strokeLinecap="round" />
          <path d="M62 66 L54 74" stroke="#FFFFFF" strokeWidth="2.2" strokeLinecap="round" />
          <path d="M46 76 L38 84" stroke="#FFFFFF" strokeWidth="2.2" strokeLinecap="round" />
          <path d="M54 86 L62 94" stroke="#FFFFFF" strokeWidth="2.2" strokeLinecap="round" />

          {/* Circuit Nodes (Pads) */}
          <circle cx="54" cy="34" r="2.2" fill="#FFFFFF" />
          <circle cx="46" cy="44" r="2.2" fill="#FFFFFF" />
          <circle cx="38" cy="56" r="2.2" fill="#FFFFFF" />
          <circle cx="38" cy="82" r="2.2" fill="#FFFFFF" />
          <circle cx="46" cy="92" r="2.2" fill="#FFFFFF" />
          <circle cx="54" cy="100" r="2.2" fill="#FFFFFF" />
          <circle cx="62" cy="102" r="2.2" fill="#FFFFFF" />
        </g>

        {/* ─── RIGHT HEMISPHERE: GREEN BINARY CODE BRAIN ─── */}
        <g>
          {/* Green Brain Silhouette Shell */}
          <path
            d="M74 22 C88 22 100 28 105 38 C112 42 116 50 115 58 C118 65 116 75 111 82 C115 90 110 102 100 106 C92 110 80 110 74 110 Z"
            fill="#0B8F46"
          />

          {/* Binary Matrix Code Strings in Crisp White */}
          <text x="79" y="38" fill="#FFFFFF" fontFamily="monospace" fontSize="10" fontWeight="900" letterSpacing="0.05em">1010</text>
          <text x="77" y="52" fill="#FFFFFF" fontFamily="monospace" fontSize="9.5" fontWeight="900" letterSpacing="0.05em">010101</text>
          <text x="78" y="66" fill="#FFFFFF" fontFamily="monospace" fontSize="10" fontWeight="900" letterSpacing="0.05em">101010</text>
          <text x="77" y="80" fill="#FFFFFF" fontFamily="monospace" fontSize="9.5" fontWeight="900" letterSpacing="0.05em">0101010</text>
          <text x="78" y="94" fill="#FFFFFF" fontFamily="monospace" fontSize="10" fontWeight="900" letterSpacing="0.05em">101010</text>
          <text x="80" y="106" fill="#FFFFFF" fontFamily="monospace" fontSize="9.5" fontWeight="900" letterSpacing="0.05em">0101</text>
        </g>

        {/* ─── LIGHTBULB THREADED SCREW BASE & SIH MONOGRAM ─── */}
        {/* Top Metallic Lip */}
        <path d="M48 114 L92 114" stroke="#2F3E46" strokeWidth="5.5" strokeLinecap="round" />

        {/* SIH Monogram in Sturdy Slab Font */}
        <text
          x="70"
          y="131"
          textAnchor="middle"
          fill="#2F3E46"
          fontFamily="'Space Grotesk', -apple-system, sans-serif"
          fontWeight="900"
          fontSize="17"
          letterSpacing="0.04em"
        >
          SIH
        </text>

        {/* Bottom Contact Plate */}
        <path d="M58 137 L82 137" stroke="#2F3E46" strokeWidth="4.5" strokeLinecap="round" />
      </svg>

      {/* Typography Wordmark Matching the Official Identity for 2026 */}
      <div className="flex flex-col leading-none font-bold select-none text-[#2F3E46]">
        <span className="text-[13px] tracking-tight uppercase" style={{ fontWeight: 800 }}>SMART INDIA</span>
        <span className="text-[13px] tracking-tight uppercase" style={{ fontWeight: 800 }}>HACKATHON</span>
        <span className="text-[15px] font-black tracking-wide text-[#FF681F]" style={{ marginTop: "1px" }}>2026</span>
      </div>
    </div>
  );
}
