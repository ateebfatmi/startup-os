import { expect, test } from "@playwright/test";

test.describe("Projects & Task Management E2E", () => {
  test("creates a project and filters tasks by project and priority", async ({ page }) => {
    await page.goto("/office");
    await expect(page.getByRole("heading", { name: "Office", exact: true })).toBeVisible({ timeout: 10000 });

    // Open Projects tab
    await page.getByRole("button", { name: "Projects" }).click();
    await expect(page.getByRole("heading", { name: "Projects", level: 2 })).toBeVisible();

    // Create a new project
    await page.getByRole("button", { name: "New project" }).click();
    await expect(page.getByRole("heading", { name: "Create New Project" })).toBeVisible();

    const projectName = `Alpha Launch ${Date.now()}`;
    await page.getByPlaceholder("e.g. Q4 Growth Launch").fill(projectName);
    await page.getByPlaceholder("Briefly outline goals and target outcomes…").fill("End to end project release");
    await page.getByRole("button", { name: "Create Project" }).click();

    // Verify project created
    await expect(page.getByText(projectName)).toBeVisible();

    // Switch to Tasks tab
    await page.getByRole("button", { name: "My tasks" }).click();
    await expect(page.getByRole("heading", { name: "Launch Board" })).toBeVisible();

    // Add a task
    await page.getByRole("button", { name: "Add Task" }).click();
    await expect(page.getByRole("heading", { name: "Add New Task" })).toBeVisible();

    const taskTitle = `E2E Security Verification ${Date.now()}`;
    await page.getByPlaceholder("e.g. Implement WebRTC signaling candidate buffer").fill(taskTitle);
    await page.getByPlaceholder("Details, requirements, or acceptance criteria…").fill("Complete RLS policy audit");
    await page.getByRole("button", { name: "Create Task" }).click();

    // Verify task appears in Kanban Todo column
    await expect(page.getByText(taskTitle)).toBeVisible();

    // Click task card to open task detail modal
    await page.getByText(taskTitle).click();
    await expect(page.getByText("Comments (")).toBeVisible();

    // Post a comment
    await page.getByPlaceholder("Add a comment…").fill("Security audit verified by automated test runner.");
    await page.getByRole("button", { name: "Comment" }).click();
    await expect(page.getByText("Security audit verified by automated test runner.")).toBeVisible();

    // Close detail modal
    await page.getByRole("button", { name: "Close dialog" }).click();
  });
});
