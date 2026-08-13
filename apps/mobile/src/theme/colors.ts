/**
 * ClubHub Mobile — Design Tokens
 * ================================
 * Same palette as apps/admin/app/globals.css, ported to static hex values
 * because React Native's StyleSheet can't consume CSS custom properties —
 * there's no `hsl(var(--primary))` equivalent at the RN layer. Keeping the
 * actual color values identical (not just "close") across web and mobile
 * is what makes this one brand instead of two apps that happen to share a
 * name — see apps/admin/app/globals.css for the source-of-truth derivation
 * from the ClubHub logo.
 */

export interface ThemeColors {
  background: string;
  foreground: string;
  card: string;
  cardForeground: string;
  primary: string;
  primaryForeground: string;
  secondary: string;
  secondaryForeground: string;
  muted: string;
  mutedForeground: string;
  destructive: string;
  destructiveForeground: string;
  border: string;
  nodeEmerald: string;
  nodeViolet: string;
  nodeCyan: string;
  nodeAmber: string;
  nodeNavy: string;
}

export const colors: { light: ThemeColors; dark: ThemeColors } = {
  light: {
    background: "#FAFAF7", // warm paper-white — matches admin's hsl(40 20% 98%)
    foreground: "#0F1420", // logo navy, as text ink
    card: "#FFFFFF",
    cardForeground: "#0F1420",
    primary: "#1D4ED8", // ClubHub Blue — logo "C" gradient start
    primaryForeground: "#FFFFFF",
    secondary: "#F0EEE9",
    secondaryForeground: "#0F1420",
    muted: "#F0EEE9",
    mutedForeground: "#6B7280",
    destructive: "#DC2626",
    destructiveForeground: "#FFFFFF",
    border: "#E4E1D8",

    // logo node colors — same semantic roles as tailwind.config.ts's node.* palette
    nodeEmerald: "#16A34A",
    nodeViolet: "#8B5CF6",
    nodeCyan: "#0891B2",
    nodeAmber: "#F59E0B",
    nodeNavy: "#0F1420",
  },
  dark: {
    background: "#0F1420",
    foreground: "#F5F4EE",
    card: "#161C2C",
    cardForeground: "#F5F4EE",
    primary: "#3B82F6",
    primaryForeground: "#0F1420",
    secondary: "#1E2536",
    secondaryForeground: "#F5F4EE",
    muted: "#1E2536",
    mutedForeground: "#9CA3AF",
    destructive: "#EF4444",
    destructiveForeground: "#FFFFFF",
    border: "#2A3348",

    nodeEmerald: "#22C55E",
    nodeViolet: "#A78BFA",
    nodeCyan: "#22D3EE",
    nodeAmber: "#FBBF24",
    nodeNavy: "#B0B8CC",
  },
};

export type ColorScheme = keyof typeof colors;

export const radius = { sm: 6, md: 10, lg: 16 };

export const spacing = { xs: 4, sm: 8, md: 16, lg: 24, xl: 32 };
