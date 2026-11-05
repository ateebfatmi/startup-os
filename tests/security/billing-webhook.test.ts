import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const stripe = vi.hoisted(() => ({ constructEvent: vi.fn(), upsert: vi.fn() }));
vi.mock("@/lib/stripe", () => ({
  createStripeClient: () => ({ webhooks: { constructEvent: stripe.constructEvent } }),
}));
vi.mock("@/lib/supabase/admin", () => ({
  createSupabaseAdminClient: () => ({ from: () => ({ upsert: stripe.upsert }) }),
}));

import { POST } from "@/app/api/billing/webhook/route";

const request = () => new Request("http://localhost/api/billing/webhook", {
  method: "POST",
  body: "{}",
  headers: { "stripe-signature": "test-signature" },
});

describe("Stripe webhook acknowledgment", () => {
  afterEach(() => vi.unstubAllEnvs());
  beforeEach(() => {
    vi.stubEnv("STRIPE_WEBHOOK_SECRET", "test-webhook-secret");
    stripe.upsert.mockReset();
    stripe.constructEvent.mockReset().mockReturnValue({
      id: "evt_test",
      type: "customer.subscription.deleted",
      data: { object: {
        id: "sub_test", metadata: { workspaceId: "workspace-a", plan: "pro" },
        customer: { id: "cus_test" }, status: "canceled", items: { data: [] },
        cancel_at_period_end: false,
      } },
    });
  });

  it("rejects an invalid signature before touching billing data", async () => {
    stripe.constructEvent.mockImplementation(() => { throw new Error("Invalid signature"); });
    expect((await POST(request())).status).toBe(400);
    expect(stripe.upsert).not.toHaveBeenCalled();
  });

  it("allows Stripe to retry when a valid subscription event cannot be saved", async () => {
    stripe.upsert.mockResolvedValue({ error: { code: "23503" } });
    expect((await POST(request())).status).toBe(500);
  });

  it("persists cancellation with an empty item list before acknowledging", async () => {
    stripe.upsert.mockResolvedValue({ error: null });
    expect((await POST(request())).status).toBe(200);
    expect(stripe.upsert).toHaveBeenCalledWith(expect.objectContaining({
      status: "cancelled", stripe_customer_id: "cus_test", current_period_end: null,
    }));
  });
});
