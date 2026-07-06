import { expect, test, type Page } from "@playwright/test";

const FAKE_SESSION = {
  state: {
    token: "e2e-fake-token",
    user: {
      id: "e2e-user-id",
      publicKey: "GE2EXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
      displayName: null,
      email: null,
      currency: "USD",
      theme: "dark",
      createdAt: new Date().toISOString(),
    },
    walletId: "freighter",
  },
  version: 0,
};

const MOCK_GOAL = {
  id: "goal-1",
  goalId: "1",
  vaultAddress: "CVAULTXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
  name: "MacBook Pro",
  icon: "laptop",
  template: "LAPTOP",
  targetAmount: 2500,
  depositedAmount: 1260,
  accruedInterest: 3.2,
  claimedInterest: 0,
  apyBps: 500,
  unlockDate: new Date(Date.now() + 365 * 86_400_000).toISOString(),
  savingsFrequency: "MANUAL",
  completed: false,
  paused: false,
  closed: false,
  progressPercent: 50.4,
  remaining: 1240,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

async function mockBackend(page: Page) {
  await page.route("http://localhost:4000/goals*", (route) =>
    route.fulfill({ json: { goals: [MOCK_GOAL] } }),
  );
  await page.route("http://localhost:4000/goal/goal-1", (route) =>
    route.fulfill({ json: { goal: MOCK_GOAL } }),
  );
  await page.route("http://localhost:4000/goal/goal-1/history", (route) =>
    route.fulfill({
      json: {
        history: [
          {
            id: "h1",
            goalId: "goal-1",
            eventType: "created",
            payload: {},
            ledger: "100",
            txHash: "abc123",
            createdAt: new Date().toISOString(),
          },
        ],
      },
    }),
  );
  await page.route("http://localhost:4000/analytics*", (route) =>
    route.fulfill({
      json: {
        totalSaved: 1260,
        totalInterestEarned: 3.2,
        totalAccruedInterest: 3.2,
        totalClaimedInterest: 0,
        activeGoals: 1,
        completedGoals: 0,
        completionRate: 0,
        depositCount: 3,
        averageDeposit: 420,
        savingsStreakDays: 2,
        contributionChart: [{ date: new Date().toISOString().slice(0, 10), total: 420, count: 1 }],
        goalSuccessPredictions: [
          { goalId: "goal-1", name: "MacBook Pro", onTrack: true, confidencePercent: 82, impliedDailyRate: 12, requiredDailyRate: 9 },
        ],
      },
    }),
  );
  await page.route("http://localhost:4000/transactions*", (route) =>
    route.fulfill({ json: { transactions: [] } }),
  );
  await page.route("http://localhost:4000/notifications*", (route) =>
    route.fulfill({ json: { notifications: [], unreadCount: 0 } }),
  );
}

test.describe("Authenticated dashboard (mocked backend)", () => {
  test.beforeEach(async ({ page }) => {
    await mockBackend(page);
    await page.addInitScript((session) => {
      window.localStorage.setItem("haven-auth", JSON.stringify(session));
    }, FAKE_SESSION);
  });

  test("overview shows stats and the mocked goal", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(page.getByText("Total saved")).toBeVisible();
    await expect(page.getByText("$1,260.00").first()).toBeVisible();
    await expect(page.getByText("MacBook Pro").first()).toBeVisible();
  });

  test("goal detail page renders progress and action buttons", async ({ page }) => {
    await page.goto("/dashboard/goals/goal-1");
    await expect(page.getByRole("heading", { name: "MacBook Pro" })).toBeVisible();
    await expect(page.getByRole("button", { name: /deposit/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /withdraw/i })).toBeVisible();
  });

  test("analytics page renders charts and predictions", async ({ page }) => {
    await page.goto("/dashboard/analytics");
    await expect(page.getByText("Savings streak")).toBeVisible();
    await expect(page.getByText("Goal success predictions")).toBeVisible();
    await expect(page.getByText(/on track/i)).toBeVisible();
  });

  test("sidebar navigation moves between sections", async ({ page }) => {
    await page.goto("/dashboard");
    await page.getByRole("link", { name: "Transactions" }).click();
    await expect(page).toHaveURL(/\/dashboard\/transactions/);
    await page.getByRole("link", { name: "Settings" }).click();
    await expect(page).toHaveURL(/\/dashboard\/settings/);
    await expect(page.getByText("Connected wallet")).toBeVisible();
  });
});
