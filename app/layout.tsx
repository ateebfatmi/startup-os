import type { Metadata } from "next";
import { getSiteOrigin } from "@/lib/site-url";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(getSiteOrigin()),
  title: {
    default: "PZ Orbit — your team, in one place",
    template: "%s · PZ Orbit",
  },
  description: "A spatial operating system for focused startup teams.",
  applicationName: "PZ Orbit",
  manifest: "/manifest.webmanifest",
  icons: { icon: "/favicon.svg", apple: "/logo.png" },
  openGraph: {
    type: "website",
    siteName: "PZ Orbit",
    title: "PZ Orbit — your team, in one place",
    description: "A spatial operating system for focused startup teams.",
  },
  twitter: {
    card: "summary",
    title: "PZ Orbit — your team, in one place",
    description: "A spatial operating system for focused startup teams.",
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
