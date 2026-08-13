"use client";

/**
 * The signature element of the admin dashboard: a small generated "node
 * cluster" mark, echoing the actual ClubHub logo's connected-dot motif
 * (a center node with satellite nodes in the brand's five colors). Every
 * organization gets one, colors deterministically assigned from its id so
 * the same org always renders identically, but different orgs are visually
 * distinct from each other — a real identity chip, not decoration, standing
 * in for a real uploaded org logo when one hasn't been set yet.
 */

const NODE_COLOR_VARS = ["--node-emerald", "--node-violet", "--node-cyan", "--node-amber"] as const;

function hashToIndex(seed: string, mod: number): number {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  }
  return hash % mod;
}

interface OrgAvatarProps {
  seed: string; // organization id or slug — deterministic per-org
  size?: number;
  className?: string;
}

export function OrgAvatar({ seed, size = 36, className }: OrgAvatarProps) {
  const satelliteColors = NODE_COLOR_VARS.map((_, i) => NODE_COLOR_VARS[hashToIndex(seed + i, NODE_COLOR_VARS.length)]);
  const cx = size / 2;
  const cy = size / 2;
  const centerR = size * 0.16;
  const satelliteR = size * 0.09;
  const orbit = size * 0.32;

  // Four satellites at fixed angles (N, E, S, W) — the center-and-satellite
  // structure is what reads as "ClubHub" at a glance; only the colors vary.
  const angles = [-90, 0, 90, 180];

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className={className} role="img" aria-label="Organization badge">
      <circle cx={cx} cy={cy} r={size / 2} fill="hsl(var(--primary) / 0.08)" />
      {angles.map((angle, i) => {
        const rad = (angle * Math.PI) / 180;
        const x = cx + orbit * Math.cos(rad);
        const y = cy + orbit * Math.sin(rad);
        return (
          <g key={angle}>
            <line x1={cx} y1={cy} x2={x} y2={y} stroke="hsl(var(--primary) / 0.35)" strokeWidth={1.5} />
            <circle cx={x} cy={y} r={satelliteR} fill={`hsl(var(${satelliteColors[i]}))`} />
          </g>
        );
      })}
      <circle cx={cx} cy={cy} r={centerR} fill="hsl(var(--primary))" />
    </svg>
  );
}
