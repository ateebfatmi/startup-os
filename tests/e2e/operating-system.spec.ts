import { expect, test } from "@playwright/test";

test("schedules a persistent workspace meeting", async ({ page }) => {
  await page.goto("/office");
  await page.getByRole("button", { name: "Meetings" }).click();
  await page.getByRole("button", { name: "Schedule meeting" }).click();
  await page.getByLabel("Title").fill("Investor readiness review");
  await page.getByLabel("Agenda").fill("Review metrics, narrative, and open diligence items.");
  await page.getByLabel("Starts").fill("2026-11-03T10:00");
  await page.getByRole("dialog").getByRole("button", { name: "Schedule meeting" }).click();
  await expect(page.getByText("Investor readiness review")).toBeVisible();
});

test("creates a measurable company objective", async ({ page }) => {
  await page.goto("/office");
  await page.getByRole("button", { name: "Goals" }).click();
  await page.getByRole("button", { name: "New objective" }).click();
  const dialog = page.getByRole("dialog", { name: "Create an objective" });
  await dialog.getByRole("textbox", { name: "Objective", exact: true }).fill("Reach repeatable activation");
  await dialog.getByRole("textbox", { name: "Description" }).fill("Turn onboarding into a repeatable growth loop.");
  await dialog.getByRole("textbox", { name: "First key result" }).fill("Activate 50 qualified teams");
  await dialog.getByLabel("Target value").fill("50");
  await dialog.getByRole("button", { name: "Create objective" }).click();
  await expect(page.getByText("Reach repeatable activation")).toBeVisible();
  await expect(page.getByText("Activate 50 qualified teams")).toBeVisible();
});

test("opens and reads workspace notifications", async ({ page }) => {
  await page.goto("/office");
  await page.getByRole("button", { name: "Notifications" }).click();
  await expect(page.getByText("Welcome to Orbit")).toBeVisible();
  await page.getByText("Welcome to Orbit").click();
  await expect(page.getByText("0 unread")).toBeVisible();
});

test("keeps commercial billing inert in local demo mode", async ({ page }) => {
  await page.goto("/office");
  await page.getByRole("button", { name: "Billing" }).click();
  await expect(page.getByText("Billing is safely disabled in local demo mode.")).toBeVisible();
  await expect(page.getByRole("button", { name: "Choose Pro" })).toBeDisabled();
  await expect(page.getByRole("button", { name: "Choose Business" })).toBeDisabled();
});
