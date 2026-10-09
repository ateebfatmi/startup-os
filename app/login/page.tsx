"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Command, Eye, EyeOff } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { createSupabaseBrowserClient, hasSupabaseConfig } from "@/lib/supabase/client";

const schema = z.object({ email: z.string().email("Enter a valid email"), password: z.string().min(8, "Use at least 8 characters") });
type Values = z.infer<typeof schema>;

export default function LoginPage() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<Values>({ resolver: zodResolver(schema) });

  const submit = async (values: Values) => {
    setMessage(null);
    if (!hasSupabaseConfig) { router.push("/office"); return; }
    const { error } = await createSupabaseBrowserClient().auth.signInWithPassword(values);
    if (error) { setMessage(error.message); return; }
    router.push("/office");
  };

  return <main className="grid min-h-screen bg-[#f4f1e8] lg:grid-cols-[1.08fr_.92fr]">
    <section className="relative hidden overflow-hidden bg-[#173f2b] p-12 text-white lg:flex lg:flex-col">
      <div className="grid-noise absolute inset-0 opacity-60" /><div className="relative flex items-center gap-2.5 text-xl font-bold"><div className="grid h-10 w-10 place-items-center rounded-xl bg-[#c8f560] text-[#173f2b]"><Command size={22} /></div>orbit</div>
      <div className="relative my-auto max-w-lg"><BadgeLike>YOUR TEAM, WITH A SENSE OF PLACE</BadgeLike><h1 className="mt-6 text-6xl font-bold leading-[.98] tracking-[-.065em]">Work feels different when you’re actually together.</h1><p className="mt-6 max-w-md text-lg leading-8 text-white/62">Move through a shared office, make decisions close to the work, and keep your startup’s operating rhythm in one home.</p></div>
      <p className="relative text-sm text-white/40">Spatial collaboration for small, ambitious teams.</p>
    </section>
    <section className="flex items-center justify-center p-5 sm:p-10"><div className="w-full max-w-md"><div className="mb-9 flex items-center gap-2 lg:hidden"><div className="grid h-9 w-9 place-items-center rounded-xl bg-[#173f2b] text-[#c8f560]"><Command size={19} /></div><span className="font-bold">orbit</span></div><p className="text-sm font-semibold text-[#4b7a5e]">WELCOME BACK</p><h2 className="mt-2 text-4xl font-bold tracking-[-.045em]">Enter your workspace</h2><p className="mt-3 text-[#68736b]">Continue where your team left off.</p><form className="mt-8 space-y-5" onSubmit={handleSubmit(submit)}><label className="block text-sm font-semibold">Work email<input {...register("email")} type="email" className="mt-2 h-12 w-full rounded-xl border border-black/10 bg-[#fffdf7] px-4 outline-none focus:border-[#4b7a5e]" placeholder="you@company.com" />{errors.email && <span className="mt-1 block text-xs text-red-700">{errors.email.message}</span>}</label><label className="block text-sm font-semibold">Password<div className="relative mt-2"><input {...register("password")} type={showPassword ? "text" : "password"} className="h-12 w-full rounded-xl border border-black/10 bg-[#fffdf7] px-4 pr-12 outline-none focus:border-[#4b7a5e]" placeholder="At least 8 characters" /><button type="button" onClick={() => setShowPassword((value) => !value)} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#68736b]" aria-label={showPassword ? "Hide password" : "Show password"}>{showPassword ? <EyeOff size={18} /> : <Eye size={18} />}</button></div>{errors.password && <span className="mt-1 block text-xs text-red-700">{errors.password.message}</span>}</label>{message && <p className="rounded-xl bg-red-50 p-3 text-sm text-red-800">{message}</p>}<Button className="w-full" type="submit" disabled={isSubmitting}>{isSubmitting ? "Signing in…" : hasSupabaseConfig ? "Sign in" : "Enter local demo"}</Button></form><div className="mt-5 flex items-center justify-between text-sm"><Link href="/onboarding" className="font-semibold text-[#315e45] hover:underline">Create a workspace</Link><button className="text-[#68736b] hover:underline">Forgot password?</button></div>{!hasSupabaseConfig && <p className="mt-8 rounded-2xl border border-[#dfd5a8] bg-[#fff6c8] p-4 text-sm leading-6 text-[#66551d]">Supabase credentials are not present, so this build opens in local demo mode. No account data leaves your browser.</p>}</div></section>
  </main>;
}

function BadgeLike({ children }: { children: React.ReactNode }) { return <span className="inline-flex rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-bold tracking-wider text-[#c8f560]">{children}</span>; }
