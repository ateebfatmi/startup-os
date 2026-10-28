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

test("persists shared meeting notes and linked resources", async ({ page }) => {
  await page.goto("/office");
  await page.getByRole("button", { name: "Meetings" }).click();
  await page.getByRole("button", { name: "Notes & resources" }).first().click();
  const dialog = page.getByRole("dialog", { name: /workspace$/ });
  await dialog.getByLabel("Shared meeting notes").fill("Decision: ship the guided beta on Friday.");
  await dialog.getByRole("button", { name: "Save notes" }).click();
  await expect(dialog.getByText("Meeting notes saved")).toBeVisible();
  await dialog.getByLabel("Resource title").fill("Launch brief");
  await dialog.getByLabel("Resource URL").fill("https://example.com/launch-brief");
  await dialog.getByLabel("Resource description").fill("Final launch narrative and owners");
  await dialog.getByRole("button", { name: "Link resource" }).click();
  await expect(dialog.getByRole("link", { name: /Launch brief/ })).toBeVisible();
  await dialog.getByRole("button", { name: "Close dialog" }).click();
  await page.getByRole("button", { name: "Notes & resources" }).first().click();
  await expect(page.getByRole("dialog", { name: /workspace$/ }).getByLabel("Shared meeting notes")).toHaveValue("Decision: ship the guided beta on Friday.");
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

test("navigates with the command search and renders executive analytics", async ({ page }) => {
  await page.goto("/office");
  await page.getByLabel("Search workspace").fill("Analytics");
  await page.getByRole("button", { name: "Analytics" }).last().click();
  await expect(page.getByRole("heading", { name: "Operating pulse" })).toBeVisible();
  await expect(page.getByText("Task completion")).toBeVisible();
});

test("shows secure integration setup without exposing connect actions in demo mode", async ({ page }) => {
  await page.goto("/office");
  await page.getByRole("button", { name: "Integrations" }).click();
  await expect(page.getByRole("heading", { name: "Connect your operating stack" })).toBeVisible();
  await expect(page.getByText("Google Calendar", { exact: true })).toBeVisible();
  await expect(page.getByText("Slack", { exact: true })).toBeVisible();
  await expect(page.getByText("GitHub", { exact: true })).toBeVisible();
  await expect(page.getByText("Linear", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Configure credentials first" }).first()).toBeDisabled();
});
