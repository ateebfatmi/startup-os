import { NextResponse } from "next/server";
import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createStripeClient } from "@/lib/stripe";
import { getSiteOrigin } from "@/lib/site-url";

export async function POST(request: Request) {
  try {
    const { workspaceId } = z.object({ workspaceId: z.string().uuid() }).parse(await request.json());
    const supabase = await createSupabaseServerClient(); const { data: { user } } = await supabase.auth.getUser(); if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { data: membership } = await supabase.from("workspace_members").select("role").eq("workspace_id", workspaceId).eq("user_id", user.id).single();
    if (!membership || !["owner", "admin"].includes(membership.role)) return NextResponse.json({ error: "Owner or admin access required" }, { status: 403 });
    const { data } = await createSupabaseAdminClient().from("workspace_billing").select("stripe_customer_id").eq("workspace_id", workspaceId).single();
    if (!data?.stripe_customer_id) return NextResponse.json({ error: "No billing account found" }, { status: 404 });
    const session = await createStripeClient().billingPortal.sessions.create({ customer: data.stripe_customer_id, return_url: `${getSiteOrigin(request.url)}/office` });
    return NextResponse.json({ url: session.url }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) { console.error("Billing portal failed", error); return NextResponse.json({ error: "Could not open billing portal" }, { status: 400 }); }
}
