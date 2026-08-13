import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Every value below traces back to the actual ClubHub logo — the
        // blue "C" gradient and its five connection-node colors — rather
        // than a generic SaaS palette. See docs in globals.css.
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        // Named after the logo's five node colors — used for category
        // tagging (events=violet, projects=violet, dues/revenue=emerald,
        // members/attendance=cyan, pending/alerts=amber) rather than
        // arbitrary chart colors.
        node: {
          emerald: "hsl(var(--node-emerald))",
          violet: "hsl(var(--node-violet))",
          cyan: "hsl(var(--node-cyan))",
          amber: "hsl(var(--node-amber))",
          navy: "hsl(var(--node-navy))",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      fontFamily: {
        display: ["var(--font-display)", "sans-serif"],
        sans: ["var(--font-body)", "sans-serif"],
        mono: ["var(--font-mono)", "monospace"],
      },
      backgroundImage: {
        "brand-gradient": "linear-gradient(135deg, hsl(var(--primary)) 0%, hsl(224 76% 48%) 100%)",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};

export default config;
