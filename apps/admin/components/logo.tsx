interface LogoProps {
  className?: string;
}

/**
 * The ClubHub mark: a blue-indigo gradient "C" wrapping five connection
 * nodes (emerald, violet, navy, cyan, amber) — matches the brand
 * description in globals.css exactly, rather than being a new, unrelated
 * design. Pure SVG, no external image asset required.
 */
export function Logo({ className }: LogoProps) {
  return (
    <svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      <defs>
        <linearGradient id="clubhub-c-gradient" x1="4" y1="4" x2="36" y2="36" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="hsl(221 83% 45%)" />
          <stop offset="1" stopColor="hsl(243 75% 52%)" />
        </linearGradient>
      </defs>
      {/* The "C" arc — open on the right, where the nodes sit */}
      <path
        d="M 30 9 A 14 14 0 1 0 30 31"
        stroke="url(#clubhub-c-gradient)"
        strokeWidth="4.5"
        strokeLinecap="round"
        fill="none"
      />
      {/* Five connection nodes, arranged around the arc's open edge */}
      <circle cx="30" cy="9" r="3" fill="hsl(142 71% 40%)" />
      <circle cx="34.5" cy="20" r="3" fill="hsl(262 72% 58%)" />
      <circle cx="30" cy="31" r="3" fill="hsl(191 80% 38%)" />
      <circle cx="20" cy="34.5" r="2.5" fill="hsl(25 95% 53%)" />
      <circle cx="20" cy="5.5" r="2.5" fill="hsl(222 47% 8%)" />
    </svg>
  );
}