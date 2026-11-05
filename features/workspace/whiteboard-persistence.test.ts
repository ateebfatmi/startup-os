import { expect, it, vi } from "vitest";
import type { WhiteboardElement } from "./whiteboard-service";

const db = vi.hoisted(() => ({ read: vi.fn(), update: vi.fn(), commit: vi.fn() }));
vi.mock("@/lib/supabase/client", () => ({
  hasSupabaseConfig: true,
  createSupabaseBrowserClient: () => ({
    auth: { getUser: async () => ({ data: { user: { id: "member" } } }) },
    from: () => {
      const read = { eq: () => read, single: db.read };
      const write = { eq: () => write, select: () => write, maybeSingle: db.commit };
      return { select: () => read, update: db.update.mockReturnValue(write) };
    },
  }),
}));

import { saveWhiteboard } from "./whiteboard-service";

const note = (id: string): WhiteboardElement => ({
  id, type: "note", x: 0, y: 0, width: 180, height: 120, text: id,
  color: "#fff", clock: 1, clientId: id, deleted: false,
});

it("retries a concurrent save and persists the missed remote edit", async () => {
  const remote = note("remote");
  const local = note("local");
  db.read.mockResolvedValueOnce({ data: { revision: 1, document: { version: 2, elements: [] } } })
    .mockResolvedValueOnce({ data: { revision: 2, document: { version: 2, elements: [remote] } } });
  db.commit.mockResolvedValueOnce({ data: null }).mockResolvedValueOnce({ data: { id: "board" } });

  await saveWhiteboard("workspace", { id: "board", document: { version: 2, elements: [local] } });
  expect(db.update).toHaveBeenNthCalledWith(2, expect.objectContaining({
    document: { version: 2, elements: [remote, local] }, revision: 3,
  }));
});
