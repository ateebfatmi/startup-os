import { expect, test } from "@playwright/test";

const workspaces = [
  { id: "local-alpha", name: "Alpha Studio", slug: "alpha", role: "owner" },
  { id: "local-beta", name: "Beta Studio", slug: "beta", role: "owner" },
];

test.beforeEach(async ({ page }) => {
  await page.addInitScript((workspaces) => {
    if (localStorage.getItem("phase1-initialized")) return;
    localStorage.setItem("phase1-initialized", "1");
    localStorage.setItem("orbit-local-workspaces", JSON.stringify(workspaces));
    localStorage.setItem("orbit-workspace-id", workspaces[0].id);
    localStorage.setItem("orbit-workspace-name", workspaces[0].name);
  }, workspaces);
});

async function addTask(page: import("@playwright/test").Page, title: string) {
  await page.getByRole("button", { name: /^My tasks/ }).click();
  await page.getByRole("button", { name: "Add Task", exact: true }).click();
  await page.getByPlaceholder("e.g. Implement WebRTC signaling candidate buffer").fill(title);
  await page.getByRole("button", { name: "Create Task", exact: true }).click();
  await expect(page.getByText(title, { exact: true })).toBeVisible();
}

async function switchWorkspace(page: import("@playwright/test").Page, current: string, next: string) {
  await page.getByRole("button", { name: new RegExp(`${current} Local demo`) }).click();
  await page.getByRole("button", { name: `${next} owner`, exact: true }).click();
  await expect(page.getByRole("button", { name: new RegExp(`${next} Local demo`) })).toBeVisible();
}

test("Copilot saves reviewed tasks into Kanban, overview and office panels after reload", async ({ page }) => {
  await page.goto("/office");
  await page.getByRole("button", { name: "AI Copilot", exact: true }).click();
  const copilot = page.getByRole("dialog", { name: "AI Startup Copilot" });
  await copilot.getByRole("button", { name: /PRD Implementation-ready spec/ }).click();
  await copilot.getByLabel("What outcome do you need?").fill("Shared activation");
  await copilot.getByRole("button", { name: "Generate", exact: true }).click();
  await expect(copilot.getByRole("button", { name: "Add 3 selected tasks" })).toBeVisible();
  await copilot.getByLabel("Select Prototype and test Shared activation").uncheck();
  await copilot.getByRole("button", { name: "Add 2 selected tasks" }).click();
  await expect(copilot.getByText("Added 2 reviewed tasks to My tasks.")).toBeVisible();
  await copilot.getByRole("button", { name: "Close dialog" }).click();
  await page.getByRole("button", { name: /^My tasks/ }).click();
  // Match the provider's exact generated title rather than assuming text from the document body.
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem("orbit-demo-tasks-v2") || "[]").filter((task: { workspaceId: string }) => task.workspaceId === "local-alpha").map((task: { title: string }) => task.title));
  expect(saved).toHaveLength(2);
  const persistedTitle = saved[0];
  await expect(page.getByText(persistedTitle, { exact: true })).toBeVisible();
  await page.reload();
  await page.getByRole("button", { name: /^My tasks/ }).click();
  await expect(page.getByText(persistedTitle, { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Overview", exact: true }).click();
  await expect(page.getByText(persistedTitle, { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Office", exact: true }).click();
  await page.getByRole("button", { name: "Open office task board" }).click();
  const officeBoard = page.getByRole("dialog", { name: "Project board" });
  await expect(officeBoard.getByText(persistedTitle, { exact: true })).toBeVisible();
  await officeBoard.getByRole("button", { name: "Close dialog" }).click();
  await switchWorkspace(page, "Alpha Studio", "Beta Studio");
  await page.getByRole("button", { name: /^My tasks/ }).click();
  await expect(page.getByText(persistedTitle, { exact: true })).toHaveCount(0);
});

test("switching workspaces clears open task drafts and never mixes saved data", async ({ page }) => {
  await page.goto("/office");
  await addTask(page, "Alpha private task");
  await page.getByRole("button", { name: "Add Task", exact: true }).click();
  await page.getByPlaceholder("e.g. Implement WebRTC signaling candidate buffer").fill("Unsubmitted Alpha draft");
  // A workspace switch unmounts all dialogs; use the actual sidebar action after dismissing the modal.
  await page.getByRole("button", { name: "Close dialog" }).click();
  await switchWorkspace(page, "Alpha Studio", "Beta Studio");
  await page.getByRole("button", { name: /^My tasks/ }).click();
  await expect(page.getByText("Alpha private task", { exact: true })).toHaveCount(0);
  await page.getByRole("button", { name: "Add Task", exact: true }).click();
  await expect(page.getByPlaceholder("e.g. Implement WebRTC signaling candidate buffer")).toHaveValue("");
  await page.getByRole("button", { name: "Close dialog" }).click();
  await addTask(page, "Beta private task");
  await switchWorkspace(page, "Beta Studio", "Alpha Studio");
  await page.getByRole("button", { name: /^My tasks/ }).click();
  await expect(page.getByText("Alpha private task", { exact: true })).toBeVisible();
  await expect(page.getByText("Beta private task", { exact: true })).toHaveCount(0);
  await page.reload();
  await page.getByRole("button", { name: /^My tasks/ }).click();
  await expect(page.getByText("Alpha private task", { exact: true })).toBeVisible();
  await expect(page.getByText("Beta private task", { exact: true })).toHaveCount(0);
});

test("a second browser tab observes shared task saves without manual refresh", async ({ page, context }) => {
  await page.goto("/office");
  const teammate = await context.newPage();
  await teammate.goto("/office");
  await teammate.getByRole("button", { name: /^My tasks/ }).click();
  await addTask(page, "Shared tab task");
  await expect(teammate.getByText("Shared tab task", { exact: true })).toBeVisible();
  await teammate.reload();
  await teammate.getByRole("button", { name: /^My tasks/ }).click();
  await expect(teammate.getByText("Shared tab task", { exact: true })).toBeVisible();
  await teammate.close();
});

test("migrates old local Copilot tasks only into the original demo", async ({ page }) => {
  await page.addInitScript(() => {
    if (localStorage.getItem("legacy-seeded")) return;
    localStorage.setItem("legacy-seeded", "1");
    localStorage.setItem("orbit-demo-tasks", JSON.stringify([{ id: "legacy-task", title: "Legacy reviewed task", priority: "High", status: "Todo", project: "Launch", due: "Soon" }]));
  });
  await page.goto("/office");
  await page.getByRole("button", { name: /^My tasks/ }).click();
  await expect(page.getByText("Legacy reviewed task", { exact: true })).toHaveCount(0);
  await switchWorkspace(page, "Alpha Studio", "Northstar Labs");
  await page.getByRole("button", { name: /^My tasks/ }).click();
  await expect(page.getByText("Legacy reviewed task", { exact: true })).toBeVisible();
  await page.reload();
  await page.getByRole("button", { name: /^My tasks/ }).click();
  await expect(page.getByText("Legacy reviewed task", { exact: true })).toHaveCount(1);
});

test("Copilot reports partial save failure and retries only unsaved suggestions", async ({ page }) => {
  await page.goto("/office");
  await page.getByRole("button", { name: "AI Copilot", exact: true }).click();
  const copilot = page.getByRole("dialog", { name: "AI Startup Copilot" });
  await copilot.getByRole("button", { name: /PRD Implementation-ready spec/ }).click();
  await copilot.getByLabel("What outcome do you need?").fill("Save recovery");
  await copilot.getByRole("button", { name: "Generate", exact: true }).click();
  await expect(copilot.getByRole("button", { name: "Add 3 selected tasks" })).toBeVisible();
  await page.evaluate(() => {
    const original = Storage.prototype.setItem;
    let writes = 0;
    Storage.prototype.setItem = function (key, value) {
      if (key === "orbit-demo-tasks-v2" && ++writes === 2) throw new Error("Simulated task save failure");
      return original.call(this, key, value);
    };
  });
  await copilot.getByRole("button", { name: "Add 3 selected tasks" }).click();
  await expect(copilot.getByRole("alert")).toContainText("Simulated task save failure");
  await expect(copilot.getByText("Added 1 reviewed task to My tasks.")).toBeVisible();
  await expect(copilot.getByRole("checkbox")).toHaveCount(2);
  await copilot.getByRole("checkbox").nth(0).check();
  await copilot.getByRole("checkbox").nth(1).check();
  await copilot.getByRole("button", { name: "Add 2 selected tasks" }).click();
  await expect(copilot.getByText("Added 3 reviewed tasks to My tasks.")).toBeVisible();
  const titles = await page.evaluate(() => JSON.parse(localStorage.getItem("orbit-demo-tasks-v2") || "[]").filter((task: { workspaceId: string }) => task.workspaceId === "local-alpha").map((task: { title: string }) => task.title));
  expect(titles).toHaveLength(3);
  expect(new Set(titles).size).toBe(3);
});
