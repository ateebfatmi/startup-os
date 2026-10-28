import { NextResponse } from "next/server";
import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createStripeClient, stripePriceIds } from "@/lib/stripe";
import { getSiteOrigin } from "@/lib/site-url";

const Schema = z.object({ workspaceId: z.string().uuid(), plan: z.enum(["pro", "business"]), seats: z.number().int().min(1).max(500) });

export async function POST(request: Request) {
  try {
    const input = Schema.parse(await request.json());
    const price = stripePriceIds[input.plan];
    if (!price) return NextResponse.json({ error: `${input.plan} billing is not configured` }, { status: 503 });
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { data: membership } = await supabase.from("workspace_members").select("role").eq("workspace_id", input.workspaceId).eq("user_id", user.id).single();
    if (!membership || !["owner", "admin"].includes(membership.role)) return NextResponse.json({ error: "Owner or admin access required" }, { status: 403 });

    const admin = createSupabaseAdminClient();
    const { data: billing } = await admin.from("workspace_billing").select("stripe_customer_id").eq("workspace_id", input.workspaceId).maybeSingle();
    const stripe = createStripeClient();
    let customerId = billing?.stripe_customer_id as string | undefined;
    if (!customerId) {
      const customer = await stripe.customers.create({ email: user.email, metadata: { workspaceId: input.workspaceId } });
      customerId = customer.id;
      await admin.from("workspace_billing").upsert({ workspace_id: input.workspaceId, stripe_customer_id: customerId, seats: input.seats });
    }
    const origin = getSiteOrigin(request.url);
    const session = await stripe.checkout.sessions.create({ mode: "subscription", customer: customerId, line_items: [{ price, quantity: input.seats }], allow_promotion_codes: true, success_url: `${origin}/office?billing=success`, cancel_url: `${origin}/office?billing=cancelled`, metadata: { workspaceId: input.workspaceId, plan: input.plan }, subscription_data: { metadata: { workspaceId: input.workspaceId, plan: input.plan } } });
    return NextResponse.json({ url: session.url }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Billing checkout failed", error);
    return NextResponse.json({ error: "Could not start checkout" }, { status: 400 });
  }
}
