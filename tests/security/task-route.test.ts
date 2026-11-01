import { beforeEach, describe, expect, it, vi } from "vitest";
const session = vi.hoisted(() => ({ user: null as { id: string } | null, insert: vi.fn(), error: null as { message: string } | null }));
vi.mock("@/lib/supabase/client", () => ({ hasSupabaseConfig: true }));
vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServerClient: async () => ({
    auth: { getUser: async () => ({ data: { user: session.user } }) },
    from: () => ({ insert: session.insert }),
  }),
}));
import { POST } from "@/app/api/workspace/tasks/route";
const request = () => new Request("http://localhost/api/workspace/tasks", { method: "POST", body: JSON.stringify({ workspaceId: "workspace-alpha", title: "Reviewed task", createdBy: "forged-author" }) });

beforeEach(() => {
  session.user = null;
  session.error = null;
  session.insert.mockReset();
  session.insert.mockImplementation((row) => ({ select: () => ({ single: async () => ({ data: row, error: session.error }) }) }));
});

describe("task creation HTTP authorization contract", () => {
  it("rejects an anonymous caller without writing", async () => {
    expect((await POST(request())).status).toBe(401);
    expect(session.insert).not.toHaveBeenCalled();
  });
  it("preserves the RLS denial from the session-bound client", async () => {
    session.user = { id: "outsider" };
    session.error = { message: "new row violates row-level security policy" };
    const response = await POST(request());
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: session.error.message });
  });
  it("takes the author from the authenticated session, never the request", async () => {
    session.user = { id: "alice" };
    expect((await POST(request())).status).toBe(200);
    expect(session.insert).toHaveBeenCalledWith(expect.objectContaining({ workspace_id: "workspace-alpha", created_by: "alice" }));
  });
});
