import { expect, test } from "@playwright/test";

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
