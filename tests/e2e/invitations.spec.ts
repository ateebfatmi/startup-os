import { expect, test } from "@playwright/test";

test.describe("Workspace Invitations & Member Administration E2E", () => {
  test("displays team directory and local demo badge in office shell", async ({ page }) => {
    await page.goto("/office");
    await expect(page.getByRole("heading", { name: "Office", exact: true })).toBeVisible({ timeout: 10000 });

    // Click on Team navigation tab
    await page.getByRole("button", { name: "Team" }).click();

    // Verify Team & Roles header and Local Demo Data badge
    await expect(page.getByRole("heading", { name: "Team & Roles" })).toBeVisible();
    await expect(page.getByText("Local Demo Data")).toBeVisible();
    await expect(page.getByText("Active Members")).toBeVisible();
  });

  test("creates a workspace invitation and accepts it via invitation acceptance page", async ({ page }) => {
    await page.goto("/office");
    await expect(page.getByRole("heading", { name: "Office", exact: true })).toBeVisible({ timeout: 10000 });

    // Open Team tab
    await page.getByRole("button", { name: "Team" }).click();

    // Click "Invite teammate"
    await page.getByRole("button", { name: "Invite teammate" }).click();
    await expect(page.getByRole("heading", { name: "Invite a teammate" })).toBeVisible();

    // Fill in email
    const testEmail = `e2e-member-${Date.now()}@company.com`;
    await page.getByPlaceholder("colleague@company.com").fill(testEmail);
    await page.getByRole("button", { name: "Create Invitation" }).click();

    // Verify link generated
    await expect(page.getByText("Invitation Link Generated!")).toBeVisible();

    const inviteUrl = await page.getByRole("textbox", { name: "Invitation link" }).inputValue();

    // Switch to Workspace Invitations tab
    await page.getByRole("button", { name: "Close", exact: true }).click();
    await page.getByRole("button", { name: /Workspace Invitations/i }).click();
    await expect(page.getByText(testEmail)).toBeVisible();

    await page.goto(inviteUrl);
    await expect(page.getByText(testEmail)).toBeVisible();

    // Verify invitation preview card renders
    await expect(page.getByText("Workspace Invitation")).toBeVisible();
    await expect(page.getByText("Northstar Labs")).toBeVisible();

    // Accept invitation
    await page.getByRole("button", { name: /Accept invitation & join/i }).click();

    // Should redirect back to office
    await expect(page).toHaveURL(/\/office/);
    await expect(page.getByRole("heading", { name: "Office", exact: true })).toBeVisible();
  });

  test("opens signup mode for an invitation return path", async ({ page }) => {
    const next = "/invite/accept?token=synthetic-invitation-token";
    await page.goto(`/login?mode=signup&next=${encodeURIComponent(next)}`);
    await expect(page.getByRole("heading", { name: "Create your account" })).toBeVisible();
    await expect(page.getByLabel("Display name")).toBeVisible();
  });

  test("displays error state for invalid invitation tokens", async ({ page }) => {
    await page.goto("/invite/accept?token=invalid-short-token");
    await expect(page.getByText("Invitation unavailable")).toBeVisible();
    await expect(page.getByRole("link", { name: "Go to Login" })).toBeVisible();
  });
});
