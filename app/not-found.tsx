import Link from "next/link";
import { Logo } from "@/components/logo";

export default function NotFoundPage() {
  return (
    <main className="grid min-h-screen place-items-center bg-[#f5f0e4] p-6 text-[#173f2b]">
      <section className="w-full max-w-md rounded-3xl border border-black/10 bg-white p-8 text-center shadow-panel">
        <Logo size="lg" className="justify-center" />
        <p className="mt-7 text-xs font-bold uppercase tracking-[0.24em] text-[#68736b]">404</p>
        <h1 className="mt-2 text-2xl font-bold">This room does not exist</h1>
        <p className="mt-3 text-sm leading-6 text-[#68736b]">Return to the office and continue where your team left off.</p>
        <Link href="/office" className="mt-6 inline-flex h-10 items-center rounded-xl bg-[#173f2b] px-5 text-sm font-semibold text-white hover:bg-[#20573c]">
          Return to office
        </Link>
      </section>
    </main>
  );
}
