import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { createStripeClient } from "@/lib/stripe";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

const status = (value: Stripe.Subscription.Status) => value === "active" || value === "trialing" || value === "past_due" || value === "unpaid" ? value : value === "canceled" ? "cancelled" : "inactive";

export async function POST(request: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  const signature = request.headers.get("stripe-signature");
  if (!secret || !signature) return NextResponse.json({ error: "Webhook is not configured" }, { status: 503 });
  let event: Stripe.Event;
  try { event = createStripeClient().webhooks.constructEvent(await request.text(), signature, secret); }
  catch { return NextResponse.json({ error: "Invalid signature" }, { status: 400 }); }
  if (event.type.startsWith("customer.subscription.")) {
    const subscription = event.data.object as Stripe.Subscription;
    const workspaceId = subscription.metadata.workspaceId;
    if (workspaceId) {
      const priceId = subscription.items.data[0]?.price.id;
      const plan = subscription.metadata.plan || (priceId === process.env.STRIPE_BUSINESS_PRICE_ID ? "business" : "pro");
      await createSupabaseAdminClient().from("workspace_billing").upsert({ workspace_id: workspaceId, stripe_customer_id: String(subscription.customer), stripe_subscription_id: subscription.id, plan, status: status(subscription.status), seats: subscription.items.data[0]?.quantity || 1, current_period_end: new Date(subscription.items.data[0].current_period_end * 1000).toISOString(), cancel_at_period_end: subscription.cancel_at_period_end, updated_at: new Date().toISOString() });
    }
  }
  return NextResponse.json({ received: true });
}
