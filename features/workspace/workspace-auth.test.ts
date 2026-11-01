import { beforeEach, describe, expect, it, vi } from "vitest";

// Contract double for the authenticated Supabase client. This verifies our
// repository's auth/filter/write behavior; it is not a substitute for live RLS.
const backend = vi.hoisted(() => ({ userId: "alice" as string | null, members: new Set(["alice:alpha", "bob:alpha", "bob:beta"]), rows: [] as Record<string, unknown>[], from: vi.fn() }));
vi.mock("@/lib/supabase/client", () => ({
  hasSupabaseConfig: true,
  createSupabaseBrowserClient: () => ({
    auth: { getUser: async () => ({ data: { user: backend.userId ? { id: backend.userId } : null } }) },
    from: backend.from,
  }),
}));
import { createTask, fetchWorkspaceTasks } from "./project-service";
import { persistSuggestedTask } from "./workspace-task-adapter";

beforeEach(() => {
  backend.userId = "alice";
  backend.rows = [];
  backend.from.mockReset();
  backend.from.mockImplementation((table: string) => {
    const filters: Record<string, unknown> = {};
    let insert: Record<string, unknown> | null = null;
    const result = () => {
      if (table !== "tasks") return { data: [], error: null };
      if (insert) {
        if (!backend.members.has(`${backend.userId}:${insert.workspace_id}`)) return { data: null, error: { message: "new row violates row-level security policy" } };
        const row = { id: `task-${backend.rows.length}`, created_at: new Date().toISOString(), updated_at: new Date().toISOString(), position: 0, ...insert };
        backend.rows.push(row);
        return { data: row, error: null };
      }
      return { data: backend.rows.filter((row) => backend.members.has(`${backend.userId}:${row.workspace_id}`) && Object.entries(filters).every(([key, value]) => row[key] === value)), error: null };
    };
    const query = {
      select: () => query,
      insert: (row: Record<string, unknown>) => { insert = row; return query; },
      eq: (key: string, value: unknown) => { filters[key] = value; return query; },
      order: () => query,
      single: async () => result(),
      then: (resolve: (value: ReturnType<typeof result>) => unknown) => Promise.resolve(result()).then(resolve),
    };
    return query;
  });
});

describe("authenticated shared task persistence", () => {
  it("makes Alice's persisted task readable by Bob in the same workspace", async () => {
    const task = await createTask({ workspaceId: "alpha", title: "Shared between people" });
    expect(task.createdBy).toBe("alice");
    backend.userId = "bob";
    expect(await fetchWorkspaceTasks("alpha")).toEqual([expect.objectContaining({ id: task.id, title: "Shared between people" })]);
    expect(await fetchWorkspaceTasks("beta")).toEqual([]);
  });

  it("rejects unauthenticated creation before making a database write", async () => {
    backend.userId = null;
    await expect(createTask({ workspaceId: "alpha", title: "Unauthorized" })).rejects.toThrow("Authentication required");
    expect(backend.from).not.toHaveBeenCalled();
  });

  it("propagates RLS rejection for a signed-in non-member without reporting success", async () => {
    await expect(createTask({ workspaceId: "beta", title: "Not my workspace" })).rejects.toThrow("row-level security");
    expect(backend.rows).toEqual([]);
  });

  it("uses the authenticated repository for Copilot tasks and preserves server errors", async () => {
    await persistSuggestedTask("alpha", [], { title: "Reviewed AI suggestion", priority: "High" });
    backend.userId = "bob";
    expect((await fetchWorkspaceTasks("alpha"))[0]).toMatchObject({ title: "Reviewed AI suggestion", createdBy: "alice", priority: "high" });
    backend.userId = "outsider";
    await expect(persistSuggestedTask("alpha", [], { title: "Denied suggestion" })).rejects.toThrow("row-level security");
    expect(backend.rows).toHaveLength(1);
  });
});
