import React from "react";
import Svg, { Circle, Line } from "react-native-svg";
import { colors } from "../theme/colors";

/** Mirrors apps/admin/components/org-avatar.tsx exactly — same hashing
 * logic, same four-satellite-node structure — so the same organization
 * renders as the same identity chip on both web and mobile. */

const NODE_COLOR_KEYS = ["nodeEmerald", "nodeViolet", "nodeCyan", "nodeAmber"] as const;

function hashToIndex(seed: string, mod: number): number {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  }
  return hash % mod;
}

interface OrgAvatarProps {
  seed: string;
  size?: number;
}

export function OrgAvatar({ seed, size = 40 }: OrgAvatarProps) {
  const palette = colors.light; // avatar colors stay constant regardless of scheme, matching the web version's fixed node hues
  const satelliteColors = NODE_COLOR_KEYS.map((_, i) => palette[NODE_COLOR_KEYS[hashToIndex(seed + i, NODE_COLOR_KEYS.length)]]);
  const cx = size / 2;
  const cy = size / 2;
  const centerR = size * 0.16;
  const satelliteR = size * 0.09;
  const orbit = size * 0.32;
  const angles = [-90, 0, 90, 180];

  return (
    <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <Circle cx={cx} cy={cy} r={size / 2} fill={palette.primary} fillOpacity={0.08} />
      {angles.map((angle, i) => {
        const rad = (angle * Math.PI) / 180;
        const x = cx + orbit * Math.cos(rad);
        const y = cy + orbit * Math.sin(rad);
        return (
          <React.Fragment key={angle}>
            <Line x1={cx} y1={cy} x2={x} y2={y} stroke={palette.primary} strokeOpacity={0.35} strokeWidth={1.5} />
            <Circle cx={x} cy={y} r={satelliteR} fill={satelliteColors[i]} />
          </React.Fragment>
        );
      })}
      <Circle cx={cx} cy={cy} r={centerR} fill={palette.primary} />
    </Svg>
  );
}
