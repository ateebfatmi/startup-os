import { createServerClient, type SetAllCookies } from "@supabase/ssr";
import { cookies } from "next/headers";

export function createSupabaseServerClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error("Supabase is not configured.");
  const cookieStore = cookies();
  return createServerClient(url, key, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll: (values: Parameters<SetAllCookies>[0]) => {
        values.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
      },
    },
  });
}
