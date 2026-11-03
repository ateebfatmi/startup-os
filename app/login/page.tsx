"use client";

import { SignIn } from "@clerk/nextjs";
import { Command } from "lucide-react";

export default function LoginPage() {
  return (
    <main className="grid min-h-screen bg-[#f4f1e8] lg:grid-cols-[1.08fr_.92fr]">
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

      <section className="ambient-auth flex items-center justify-center p-5 sm:p-10">
        <div className="w-full max-w-md flex flex-col items-center">
          <div className="mb-6 flex items-center gap-2 lg:hidden">
            <div className="grid h-9 w-9 place-items-center rounded-xl bg-[#173f2b] text-[#c8f560]">
              <Command size={19} />
            </div>
            <span className="font-extrabold tracking-tight">CrewVilla</span>
          </div>
          <SignIn
            routing="hash"
            forceRedirectUrl="/office"
            signUpUrl="/sign-up"
            appearance={{
              elements: {
                formButtonPrimary: "bg-[#173f2b] hover:bg-[#205339] text-[#c8f560] transition-colors",
                card: "shadow-panel rounded-[24px] border border-black/10 bg-[#fffdf7] w-full",
                headerTitle: "text-2xl font-extrabold text-[#173f2b]",
                headerSubtitle: "text-[#68736b]",
              },
            }}
          />
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
