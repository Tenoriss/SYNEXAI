export function BrandMark({ size = 32 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden focusable="false">
      <rect width="32" height="32" rx="8" className="fill-primary" />
      <path d="M10 11.5 16 8l6 3.5v9L16 24l-6-3.5z" fill="none" stroke="white" strokeWidth="2" strokeLinejoin="round" />
      <circle cx="16" cy="16" r="2.5" fill="white" />
    </svg>
  )
}
