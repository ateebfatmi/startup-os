import { expect, test } from "@playwright/test";

test("creates a personalized local workspace and exits the demo", async ({ page }) => {
  await page.goto("/onboarding");
  await page.getByLabel("Your display name").fill("Maya Chen");
  await page.getByLabel("Workspace name").fill("Arc Studio");
  await page.getByRole("button", { name: "Client lab" }).click();
  await page.getByRole("button", { name: "Enter local demo" }).click();
  await expect(page.getByRole("button", { name: /Arc Studio/ })).toBeVisible();
  await expect(page.getByRole("button", { name: "Maya Chen profile" })).toBeVisible();
  await page.getByRole("button", { name: "Exit demo" }).click();
  await expect(page).toHaveURL(/\/login$/);
});

test("opens the 3D office shell", async ({ page }) => {
  await page.goto("/office");
  await expect(page.getByRole("heading", { name: "Office", exact: true })).toBeVisible();
  await expect(page.getByText("Move with WASD or arrow keys")).toBeVisible();
  await expect(page.getByRole("button", { name: "Start huddle" })).toBeVisible();
});

test("creates a local task", async ({ page }) => {
  await page.goto("/office");
  await page.getByRole("button", { name: "Projects" }).click();
  await page.getByLabel("Task title").fill("Verify beta access");
  await page.getByRole("button", { name: "Add" }).click();
  await expect(page.getByText("Verify beta access")).toBeVisible();
});

test("synchronizes presence across two office tabs", async ({ context }) => {
  const first = await context.newPage();
  const second = await context.newPage();
  await Promise.all([first.goto("/office"), second.goto("/office")]);
  await expect(first.getByText("2 online", { exact: true })).toBeVisible();
  await expect(second.getByText("2 online", { exact: true })).toBeVisible();
  await second.close();
  await expect(first.getByText("1 online", { exact: true })).toBeVisible();
});

test("joins a real permission-gated huddle across two tabs", async ({ context }) => {
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
