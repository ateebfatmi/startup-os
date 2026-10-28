"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/logo";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Orbit application error", error);
  }, [error]);

  return (
    <main className="grid min-h-screen place-items-center bg-[#f5f0e4] p-6 text-[#173f2b]">
      <section className="w-full max-w-md rounded-3xl border border-black/10 bg-white p-8 text-center shadow-panel">
        <Logo size="lg" className="justify-center" />
        <h1 className="mt-6 text-2xl font-bold">The workspace hit a snag</h1>
        <p className="mt-3 text-sm leading-6 text-[#68736b]">
          Your data is safe. Retry the current view, or return to the office if the problem continues.
        </p>
        <div className="mt-6 flex justify-center gap-3">
          <Button onClick={reset}>Try again</Button>
          <Button variant="outline" onClick={() => window.location.assign("/office")}>Return to office</Button>
        </div>
      </section>
    </main>
  );
}
