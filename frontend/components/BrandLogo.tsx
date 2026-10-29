export default function BrandLogo({ size = 32 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={{ display: 'block' }}
    >
      {/* Outer Protective Security Shield */}
      <path
        d="M12 2.2L4 5.9V11.4C4 16.6 7.4 21.3 12 22.5C16.6 21.3 20 16.6 20 11.4V5.9L12 2.2Z"
        fill="url(#brandShieldBg)"
        stroke="url(#brandShieldBorder)"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Subtle Vision Target Ring */}
      <circle
        cx="12"
        cy="12"
        r="6.5"
        stroke="rgba(56, 189, 248, 0.35)"
        strokeWidth="1"
        strokeDasharray="2.5 2.5"
      />

      {/* Verified / Compliance Checkmark */}
      <path
        d="M8.8 12.2L11 14.4L15.4 9.8"
        stroke="#ffffff"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      <defs>
        <linearGradient id="brandShieldBg" x1="4" y1="2" x2="20" y2="22.5" gradientUnits="userSpaceOnUse">
          <stop stopColor="#0284c7" stopOpacity="0.35" />
          <stop offset="1" stopColor="#1e3a8a" stopOpacity="0.6" />
        </linearGradient>
        <linearGradient id="brandShieldBorder" x1="4" y1="2" x2="20" y2="22.5" gradientUnits="userSpaceOnUse">
          <stop stopColor="#38bdf8" />
          <stop offset="1" stopColor="#2563eb" />
        </linearGradient>
      </defs>
    </svg>
  );
}
