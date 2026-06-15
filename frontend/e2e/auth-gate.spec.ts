import { expect, test } from "@playwright/test";

test.describe("Dashboard auth gate", () => {
  test("unauthenticated visitors see the wallet connect gate, not dashboard content", async ({ page }) => {
    await page.goto("/dashboard");

    await expect(page.getByRole("heading", { name: /connect your wallet/i })).toBeVisible();
    await expect(page.getByText(/total saved/i)).not.toBeVisible();
  });

  test("goal detail route also gates behind wallet connect", async ({ page }) => {
    await page.goto("/dashboard/goals/does-not-matter");
    await expect(page.getByRole("heading", { name: /connect your wallet/i })).toBeVisible();
  });
});
