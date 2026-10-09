"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { KeyRound } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

const schema = z.object({
  password: z.string().min(8, "Use at least 8 characters"),
  confirmPassword: z.string(),
}).refine((values) => values.password === values.confirmPassword, { message: "Passwords do not match", path: ["confirmPassword"] });

type Values = z.infer<typeof schema>;

export default function ResetPasswordPage() {
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<Values>({ resolver: zodResolver(schema) });

  const submit = async ({ password }: Values) => {
    setMessage(null);
    const { error } = await createSupabaseBrowserClient().auth.updateUser({ password });
    if (error) { setMessage(error.message); return; }
    router.replace("/office");
  };

  return <main className="grid min-h-screen place-items-center bg-[#f4f1e8] p-5"><section className="w-full max-w-md rounded-[28px] border border-black/[.07] bg-[#fffdf7] p-6 shadow-panel sm:p-8"><div className="grid h-11 w-11 place-items-center rounded-xl bg-[#173f2b] text-[#c8f560]"><KeyRound size={20} /></div><h1 className="mt-6 text-3xl font-bold tracking-[-.04em]">Choose a new password</h1><p className="mt-2 text-sm leading-6 text-[#68736b]">Use a unique password with at least eight characters.</p><form className="mt-7 space-y-4" onSubmit={handleSubmit(submit)}><label className="block text-sm font-semibold">New password<input {...register("password")} type="password" autoComplete="new-password" className="mt-2 h-12 w-full rounded-xl border border-black/10 bg-white px-4 outline-none focus:border-[#4b7a5e]" />{errors.password && <span className="mt-1 block text-xs text-red-700">{errors.password.message}</span>}</label><label className="block text-sm font-semibold">Confirm password<input {...register("confirmPassword")} type="password" autoComplete="new-password" className="mt-2 h-12 w-full rounded-xl border border-black/10 bg-white px-4 outline-none focus:border-[#4b7a5e]" />{errors.confirmPassword && <span className="mt-1 block text-xs text-red-700">{errors.confirmPassword.message}</span>}</label>{message && <p className="rounded-xl bg-red-50 p-3 text-sm text-red-800">{message}</p>}<Button className="w-full" type="submit" disabled={isSubmitting}>{isSubmitting ? "Saving…" : "Save new password"}</Button></form></section></main>;
}
