import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import { getSiteOrigin } from "@/lib/site-url";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(getSiteOrigin()),
  title: {
    default: "CrewVilla — your team, in one place",
    template: "%s · CrewVilla",
  },
  description: "A spatial operating system for focused startup teams.",
  applicationName: "CrewVilla",
  manifest: "/manifest.webmanifest",
  icons: { icon: "/favicon.svg", apple: "/logo.png" },
  openGraph: {
    type: "website",
    siteName: "CrewVilla",
    title: "CrewVilla — your team, in one place",
    description: "A spatial operating system for focused startup teams.",
  },
  twitter: {
    card: "summary",
    title: "CrewVilla — your team, in one place",
    description: "A spatial operating system for focused startup teams.",
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <ClerkProvider
          proxyUrl="/__clerk"
          signInUrl="/login"
          signUpUrl="/sign-up"
          signInFallbackRedirectUrl="/office"
          signUpFallbackRedirectUrl="/office"
        >
          {children}
        </ClerkProvider>
      </body>
    </html>
  );
}
