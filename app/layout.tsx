import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "PZ Orbit — your team, in one place",
  description: "A spatial operating system for focused startup teams.",
  icons: { icon: "/logo.png" },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
