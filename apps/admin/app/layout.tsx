import type { Metadata } from "next";
import { Space_Grotesk, Inter, IBM_Plex_Mono } from "next/font/google";
import { Providers } from "@/lib/providers";
import "./globals.css";

// Type pairing is a deliberate choice, not a default: Space Grotesk's
// geometric character echoes the connected-node feel of the ClubHub logo
// for headings; Inter carries the dense body/UI text; IBM Plex Mono's
// tabular figures give financial data in the treasurer views a precise,
// trustworthy alignment.
const displayFont = Space_Grotesk({ subsets: ["latin"], variable: "--font-display" });
const bodyFont = Inter({ subsets: ["latin"], variable: "--font-body" });
const monoFont = IBM_Plex_Mono({ subsets: ["latin"], weight: ["400", "500", "600"], variable: "--font-mono" });

export const metadata: Metadata = {
  title: "ClubHub Admin",
  description: "One Platform. Every Club. Unlimited Possibilities.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${displayFont.variable} ${bodyFont.variable} ${monoFont.variable}`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
