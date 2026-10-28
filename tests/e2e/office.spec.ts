import { expect, test } from "@playwright/test";

test("creates a personalized local workspace and exits the demo", async ({ page }) => {
  await page.goto("/onboarding");
  await page.getByLabel("Your display name").fill("Maya Chen");
  await page.getByLabel("Workspace name").fill("Arc Studio");
  await page.getByRole("button", { name: "Avatar color #6c86d9" }).click();
  await page.getByRole("button", { name: "Client lab" }).click();
  await page.getByRole("button", { name: "Enter local demo" }).click();
  await expect(page.getByRole("button", { name: /Arc Studio/ })).toBeVisible();
  await expect(page.getByRole("button", { name: "Maya Chen profile" })).toBeVisible();
  await expect.poll(() => page.evaluate(() => window.localStorage.getItem("orbit-avatar-color"))).toBe("#6c86d9");
  await page.getByRole("button", { name: "Exit demo" }).click();
  await expect(page).toHaveURL(/\/login$/);
});

test("opens the 3D office shell", async ({ page }) => {
  await page.goto("/office");
  await expect(page.getByRole("heading", { name: "Office", exact: true })).toBeVisible();
  await expect(page.getByText("Move with WASD or arrow keys")).toBeVisible();
  await expect(page.getByRole("button", { name: "Start huddle" })).toBeVisible();
  await expect(page.getByText("Animated GLTF avatar ready")).toBeAttached();
  const avatar = await page.request.get("/models/orbit-avatar.gltf");
  expect(avatar.ok()).toBe(true);
  expect(((await avatar.json()).animations as Array<{ name: string }>).map((clip) => clip.name)).toEqual(["Idle", "Walk"]);
  await expect.poll(async () => page.getByText("You", { exact: true }).last().evaluate((label) => label.getBoundingClientRect().width)).toBeLessThan(100);
  const ice = await page.request.get("/api/realtime/ice");
  expect(ice.ok()).toBe(true);
  expect((await ice.json()).iceServers.length).toBeGreaterThan(0);
});

test("navigates the office with a live room map", async ({ page }) => {
  await page.goto("/office");
  await page.getByRole("button", { name: "Expand office map" }).click();
  await expect(page.getByRole("button", { name: "Collapse office map" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Walk to Executive Boardroom" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Walk to Sky Terrace" })).toBeVisible();
  await page.getByRole("button", { name: "Walk to Sky Terrace" }).click();
  await expect(page.getByRole("button", { name: "Collapse office map" })).toBeVisible();
});

test("helps users discover controls and jump to a workspace destination", async ({ page }) => {
  await page.goto("/office");
  await page.getByRole("button", { name: "Help and keyboard shortcuts" }).click();
  const help = page.getByRole("dialog", { name: "Make yourself at home" });
  await expect(help.getByText("Explore the office")).toBeVisible();
  await expect(help.getByText("Huddles and proximity audio are opt-in.")).toBeVisible();
  await help.getByRole("button", { name: "Close dialog" }).click();

  await page.keyboard.press("Control+K");
  const search = page.getByRole("dialog", { name: "Search workspace" });
  await search.getByRole("textbox", { name: "Search destinations" }).fill("team");
  await search.getByRole("button", { name: "Team Manage" }).dispatchEvent("click");
  await expect(page.getByRole("heading", { name: "Team", exact: true })).toBeVisible();
});

test("generates a grounded professional PRD and requires task review", async ({ page }) => {
  await page.goto("/office");
  await page.getByRole("button", { name: "AI Copilot" }).click();
  const copilot = page.getByRole("dialog", { name: "AI Startup Copilot" });
  await copilot.getByRole("button", { name: /PRD Implementation-ready spec/ }).click();
  await copilot.getByLabel("What outcome do you need?").fill("Guided onboarding");
  await copilot.getByRole("button", { name: "Generate" }).click();

  await expect(copilot.getByText("Professional local mode")).toBeVisible();
  await expect(copilot.getByText("## 5. Non-goals")).toBeVisible();
  await expect(copilot.getByText("Context used")).toBeVisible();
  await expect(copilot.getByRole("button", { name: "Add 3 selected tasks" })).toBeVisible();
  await copilot.getByLabel("Select Prototype and test Guided onboarding").uncheck();
  await copilot.getByRole("button", { name: "Add 2 selected tasks" }).click();
  await expect(copilot.getByText("Added 2 reviewed tasks to My tasks.")).toBeVisible();
});

test("moves the avatar with accessible touch controls", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/office");
  const position = page.getByLabel("Player position");
  await expect(position).toBeVisible();
  const before = Number(await position.getAttribute("data-x"));
  const right = page.getByRole("button", { name: "Move right" });
  await right.dispatchEvent("pointerdown", { pointerId: 1, pointerType: "touch", isPrimary: true, button: 0 });
  await page.waitForTimeout(650);
  await right.dispatchEvent("pointerup", { pointerId: 1, pointerType: "touch", isPrimary: true, button: 0 });
  await expect.poll(async () => Number(await position.getAttribute("data-x"))).toBeGreaterThan(before + 0.5);
});

test("measures 3D performance and supports reduced rendering", async ({ page }) => {
  await page.goto("/office");
  const metric = page.getByLabel("3D frame rate");
  await expect.poll(async () => Number(await metric.getAttribute("data-fps")), { timeout: 15_000 }).toBeGreaterThan(3);
  const rendererClass = await metric.getAttribute("data-renderer-class");
  const measured = Number(await metric.getAttribute("data-fps"));
  if (rendererClass === "hardware") expect(measured).toBeGreaterThan(45);
  else expect(rendererClass).toBe("software");
  const before = await page.getByRole("button", { name: "Toggle rendering quality" }).textContent();
  await page.getByRole("button", { name: "Toggle rendering quality" }).click();
  await expect(page.getByRole("button", { name: "Toggle rendering quality" })).toContainText(before?.includes("Reduced") ? "High" : "Reduced");
});

test("creates a local task", async ({ page }) => {
  await page.goto("/office");
  await page.getByRole("button", { name: "My tasks" }).click();
  await page.getByRole("button", { name: "Add Task" }).click();
  await page.getByPlaceholder("e.g. Implement WebRTC signaling candidate buffer").fill("Verify beta access");
  await page.getByRole("button", { name: "Create Task" }).click();
  await expect(page.getByText("Verify beta access")).toBeVisible();
});

test("stores private file metadata and shows the workspace audit trail", async ({ page }) => {
  await page.goto("/office");
  await page.getByRole("button", { name: "Files" }).click();
  await page.locator('input[type="file"]').setInputFiles({
    name: "launch-brief.txt",
    mimeType: "text/plain",
    buffer: Buffer.from("Orbit launch brief"),
  });
  await expect(page.getByText("launch-brief.txt")).toBeVisible();
  await page.getByRole("button", { name: "Activity" }).click();
  await expect(page.getByRole("heading", { name: "Workspace activity" })).toBeVisible();
  await expect(page.getByText(/updated task/).first()).toBeVisible();
});

test("customizes and persists the office design", async ({ page }) => {
  await page.goto("/office");
  await page.getByRole("button", { name: "Office design" }).click();
  await page.getByRole("button", { name: /Midnight Lab/ }).click();
  await page.getByLabel("Penthouse terrace").uncheck();
  await page.getByRole("button", { name: "Save design" }).click();
  await expect(page.getByText("Office design saved for this workspace.")).toBeVisible();
  await page.reload();
  await page.getByRole("button", { name: "Office design" }).click();
  await expect(page.getByRole("button", { name: /Midnight Lab/ })).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByLabel("Penthouse terrace")).not.toBeChecked();
});

test("places persistent collision-aware office furniture", async ({ page }) => {
  await page.goto("/office");
  await page.getByRole("button", { name: "Office design" }).click();
  await page.getByLabel("Office object").selectOption("whiteboard");
  await page.getByLabel("X position").fill("2");
  await page.getByLabel("Z position").fill("8");
  await page.getByLabel("Rotation").fill("90");
  await page.getByRole("button", { name: "Place" }).click();
  await expect(page.getByText("Object placed and saved to the shared office.")).toBeVisible();
  await expect(page.getByRole("button", { name: "Remove Collaboration whiteboard" })).toBeVisible();
  await page.reload();
  await page.getByRole("button", { name: "Office design" }).click();
  await expect(page.getByRole("button", { name: "Remove Collaboration whiteboard" })).toBeVisible();
  await page.getByRole("button", { name: "Remove Collaboration whiteboard" }).click();
  await expect(page.getByText("Object removed from the shared office.")).toBeVisible();
});

test("synchronizes presence across two office tabs", async ({ context }) => {
  const first = await context.newPage();
  await first.goto("/office");
  await expect(first.getByText("1 online", { exact: true }).first()).toBeVisible();
  const second = await context.newPage();
  await second.goto("/office");
  await expect(first.getByText("2 online", { exact: true }).first()).toBeVisible();
  await expect(second.getByText("2 online", { exact: true }).first()).toBeVisible();
  await first.getByLabel("Availability").selectOption("focus");
  await expect(second.getByText("focus", { exact: true })).toBeVisible();
  await second.close();
  await expect(first.getByText("1 online", { exact: true }).first()).toBeVisible();
});

test("forms an opt-in proximity audio group across nearby tabs", async ({ context }) => {
  test.setTimeout(90_000);
  const first = await context.newPage();
  const second = await context.newPage();
  await Promise.all([first.goto("/office"), second.goto("/office")]);
  await expect(first.getByText("2 online", { exact: true }).first()).toBeVisible();
  await expect(second.getByText("2 online", { exact: true }).first()).toBeVisible();
  await Promise.all([
    first.getByRole("button", { name: "Enable proximity audio" }).click(),
    second.getByRole("button", { name: "Enable proximity audio" }).click(),
  ]);
  await expect(first.getByText("Proximity audio active")).toBeVisible();
  await expect(second.getByText("Proximity audio active")).toBeVisible();
  await expect(first.getByText(/Teammate nearby/)).toBeVisible();
  await Promise.all([
    first.getByRole("button", { name: "Disable proximity audio" }).click(),
    second.getByRole("button", { name: "Disable proximity audio" }).click(),
  ]);
  await expect(first.getByText("Proximity audio off")).toBeVisible();
});

test("merges and persists whiteboard changes across two tabs", async ({ context }) => {
  const first = await context.newPage();
  const second = await context.newPage();
  await Promise.all([first.goto("/office"), second.goto("/office")]);
  await Promise.all([
    first.getByRole("button", { name: "Whiteboard" }).click(),
    second.getByRole("button", { name: "Whiteboard" }).click(),
  ]);
  await expect(first.getByText("Live · saved")).toBeVisible();
  await expect(second.getByText("Live · saved")).toBeVisible();
  await first.getByRole("button", { name: "Note" }).click();
  await expect(second.getByLabel("Sticky note")).toBeVisible();
  await first.getByLabel("Sticky note").fill("Interview five design partners");
  await first.getByLabel("Sticky note").blur();
  await expect(second.getByLabel("Sticky note")).toHaveValue("Interview five design partners");
  await expect(first.getByText("Live · saved")).toBeVisible();
  await first.getByRole("button", { name: "Overview" }).click();
  await first.getByRole("button", { name: "Whiteboard" }).click();
  await expect(first.getByLabel("Sticky note")).toHaveValue("Interview five design partners");
});

test("joins a real permission-gated huddle across two tabs", async ({ context }) => {
  test.setTimeout(90_000);
  const first = await context.newPage();
  const second = await context.newPage();
  await Promise.all([first.goto("/office"), second.goto("/office")]);
  await first.getByRole("button", { name: "Start huddle" }).click();
  await second.getByRole("button", { name: "Start huddle" }).click();
  await Promise.all([
    first.getByRole("button", { name: "Audio only" }).click(),
    second.getByRole("button", { name: "Audio only" }).click(),
  ]);
  const firstDialog = first.getByRole("dialog");
  const secondDialog = second.getByRole("dialog");
  await expect(firstDialog.getByText("Teammate", { exact: true })).toBeVisible();
  await expect(secondDialog.getByText("Teammate", { exact: true })).toBeVisible();
  await expect(firstDialog.getByRole("button", { name: "Leave huddle" })).toBeVisible();
  await firstDialog.getByRole("button", { name: "Mute microphone" }).click();
  await expect(firstDialog.getByRole("button", { name: "Unmute microphone" })).toBeVisible();
  await Promise.all([
    firstDialog.getByRole("button", { name: "Leave huddle" }).click(),
    secondDialog.getByRole("button", { name: "Leave huddle" }).click(),
  ]);
});
