import { expect, test } from "@playwright/test";

test.describe("Landing page", () => {
  test("renders hero, nav, and CTAs with no console errors", async ({ page }) => {
    const errors: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") errors.push(msg.text());
    });
    page.on("pageerror", (err) => errors.push(String(err)));

    await page.goto("/");

    await expect(page.getByRole("heading", { name: /save for your dreams/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /connect wallet/i }).first()).toBeVisible();
    await expect(page.getByRole("heading", { name: /everything you need to save/i })).toBeVisible();

    expect(errors).toEqual([]);
  });

  test("nav links scroll to the right sections", async ({ page }) => {
    await page.goto("/");
    await page.getByLabel("Main").getByRole("link", { name: "Features", exact: true }).click();
    await expect(page.getByRole("heading", { name: /everything you need to save/i })).toBeInViewport();
  });
});
