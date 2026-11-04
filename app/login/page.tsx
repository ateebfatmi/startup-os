"use client";

import { SignIn, ClerkLoaded, ClerkLoading } from "@clerk/nextjs";
import { Command, RefreshCw, ShieldAlert } from "lucide-react";
import { useEffect, useState } from "react";

export default function LoginPage() {
  const [showShieldsNotice, setShowShieldsNotice] = useState(false);

  useEffect(() => {
    // If Clerk takes longer than 3.5s to load, it's almost certainly Brave Shields or an ad-blocker
    const timer = setTimeout(() => {
      setShowShieldsNotice(true);
    }, 3500);
    return () => clearTimeout(timer);
  }, []);

  return (
    <main className="grid min-h-screen bg-[#f4f1e8] lg:grid-cols-[1.08fr_.92fr]">
      {/* Left Brand Hero */}
      <section className="relative hidden overflow-hidden bg-[linear-gradient(145deg,#173f2b_0%,#0f2e20_100%)] p-12 text-white lg:flex lg:flex-col">
        <div className="grid-noise absolute inset-0 opacity-50" />
        <div className="absolute -bottom-48 -right-40 h-[34rem] w-[34rem] rounded-full border border-[#c8f560]/15 bg-[#c8f560]/[.045]" />
        <div className="relative flex items-center gap-2.5 text-xl font-extrabold tracking-[-.02em]">
          <div className="grid h-10 w-10 place-items-center rounded-[14px] bg-[#c8f560] text-[#173f2b] shadow-[0_12px_32px_rgba(200,245,96,.18)]">
            <Command size={21} strokeWidth={2.6} />
          </div>
          CrewVilla
        </div>
        <div className="relative my-auto max-w-lg">
          <BadgeLike>YOUR TEAM, WITH A SENSE OF PLACE</BadgeLike>
          <h1 className="mt-6 text-6xl font-bold leading-[.98] tracking-[-.065em]">
            Work feels different when you’re actually together.
          </h1>
          <p className="mt-6 max-w-md text-lg leading-8 text-white/62">
            Move through a shared office, make decisions close to the work, and keep your startup’s operating rhythm in one home.
          </p>
        </div>
        <p className="relative text-sm text-white/40">Spatial collaboration for small, ambitious teams.</p>
      </section>

      {/* Right Auth Area */}
      <section className="ambient-auth flex items-center justify-center p-5 sm:p-10">
        <div className="w-full max-w-md flex flex-col items-center">
          {/* Mobile Header */}
          <div className="mb-6 flex items-center gap-2 lg:hidden">
            <div className="grid h-9 w-9 place-items-center rounded-xl bg-[#173f2b] text-[#c8f560]">
              <Command size={19} />
            </div>
            <span className="font-extrabold tracking-tight text-xl text-[#173f2b]">CrewVilla</span>
          </div>

          {/* Browser Shields Banner (shows if Clerk script is taking longer than usual) */}
          {showShieldsNotice && (
            <div className="mb-4 w-full rounded-2xl border border-amber-300 bg-amber-50/90 p-4 text-xs text-amber-900 shadow-sm backdrop-blur">
              <div className="flex items-start gap-2.5">
                <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
                <div className="space-y-1">
                  <p className="font-semibold text-amber-950">Using Brave Browser or an Ad-Blocker?</p>
                  <p className="text-amber-800 leading-relaxed">
                    If Google login doesn’t appear, click the lion shield icon in the URL bar and toggle{" "}
                    <strong>Shields DOWN</strong> for this site to allow authentication.
                  </p>
                  <button
                    onClick={() => window.location.reload()}
                    className="mt-2 inline-flex items-center gap-1.5 rounded-lg bg-amber-200/80 px-2.5 py-1 text-xs font-semibold text-amber-900 hover:bg-amber-300 transition-colors"
                  >
                    <RefreshCw className="h-3 w-3" /> Reload page
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Loading Skeleton while Clerk initializes */}
          <ClerkLoading>
            <div className="w-full rounded-[24px] border border-black/10 bg-[#fffdf7] p-8 shadow-panel animate-pulse">
              <div className="flex flex-col items-center text-center">
                <div className="h-10 w-10 rounded-2xl bg-[#173f2b]/10 mb-4" />
                <div className="h-6 w-48 rounded-lg bg-black/10 mb-2" />
                <div className="h-4 w-64 rounded-md bg-black/5" />
              </div>

              {/* Google Button Skeleton */}
              <div className="mt-8">
                <div className="flex h-11 w-full items-center justify-center gap-3 rounded-xl border border-black/10 bg-white">
                  <svg className="h-4 w-4 opacity-50" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                    />
                  </svg>
                  <span className="text-sm font-medium text-black/50">Continue with Google</span>
                </div>
              </div>

              {/* Divider */}
              <div className="my-6 flex items-center gap-3">
                <div className="h-px flex-1 bg-black/10" />
                <span className="text-xs uppercase tracking-wider text-black/40 font-semibold">or</span>
                <div className="h-px flex-1 bg-black/10" />
              </div>

              {/* Email Input Skeleton */}
              <div className="space-y-4">
                <div>
                  <div className="h-3 w-20 rounded bg-black/10 mb-2" />
                  <div className="h-10 w-full rounded-xl border border-black/10 bg-white/60" />
                </div>
                <div className="h-10 w-full rounded-xl bg-[#173f2b]/20" />
              </div>
            </div>
          </ClerkLoading>

          {/* Active Clerk SignIn Component */}
          <ClerkLoaded>
            <SignIn
              routing="hash"
              forceRedirectUrl="/office"
              signUpUrl="/sign-up"
              appearance={{
                elements: {
                  formButtonPrimary: "bg-[#173f2b] hover:bg-[#205339] text-[#c8f560] transition-colors font-semibold",
                  card: "shadow-panel rounded-[24px] border border-black/10 bg-[#fffdf7] w-full",
                  headerTitle: "text-2xl font-extrabold text-[#173f2b]",
                  headerSubtitle: "text-[#68736b]",
                  socialButtonsBlockButton: "border border-black/10 bg-white hover:bg-black/[.02] transition-colors",
                  socialButtonsBlockButtonText: "font-semibold text-neutral-800",
                },
              }}
            />
          </ClerkLoaded>
        </div>
      </section>
    </main>
  );
}

function BadgeLike({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-bold tracking-wider text-[#c8f560]">
      {children}
    </span>
  );
}
