type BrandMarkProps = {
  className?: string;
  decorative?: boolean;
};

export function BrandMark({ className = "h-8 w-8", decorative = true }: BrandMarkProps) {
  return (
    <svg
      aria-hidden={decorative}
      className={className}
      fill="none"
      viewBox="0 0 128 128"
      xmlns="http://www.w3.org/2000/svg"
    >
      <circle cx="64" cy="16" r="10" fill="currentColor" />
      <circle cx="64" cy="112" r="10" fill="currentColor" />
      <circle cx="16" cy="64" r="10" fill="currentColor" />
      <circle cx="112" cy="64" r="10" fill="currentColor" />
      <rect x="36" y="44" width="56" height="40" rx="16" stroke="currentColor" strokeWidth="10" />
      <path
        d="M16 64H36M112 64H92M64 16V44M64 112V84"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="4"
      />
      <path
        d="M56 58V70M72 58V70"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="6"
      />
    </svg>
  );
}
