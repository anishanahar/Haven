export type GoalTemplate =
  | "LAPTOP"
  | "COLLEGE_FEES"
  | "VACATION"
  | "EMERGENCY_FUND"
  | "HOUSE_DOWN_PAYMENT"
  | "WEDDING"
  | "CUSTOM";

export type SavingsFrequency = "ONE_TIME" | "WEEKLY" | "MONTHLY" | "MANUAL";

export interface Goal {
  id: string;
  goalId: string;
  vaultAddress: string;
  name: string;
  icon: string;
  template: GoalTemplate;
  targetAmount: number;
  depositedAmount: number;
  accruedInterest: number;
  claimedInterest: number;
  apyBps: number;
  unlockDate: string;
  savingsFrequency: SavingsFrequency;
  completed: boolean;
  paused: boolean;
  closed: boolean;
  progressPercent: number;
  remaining: number;
  createdAt: string;
  updatedAt: string;
}

export interface GoalHistoryEntry {
  id: string;
  goalId: string;
  eventType: string;
  payload: Record<string, unknown>;
  ledger: string;
  txHash: string;
  createdAt: string;
}

export type TransactionType = "DEPOSIT" | "WITHDRAWAL" | "CLAIM_INTEREST" | "CREATE_GOAL" | "DELETE_GOAL";
export type TransactionStatus = "PENDING" | "SUCCESS" | "FAILED";

export interface Transaction {
  id: string;
  goalId: string;
  userId: string;
  type: TransactionType;
  status: TransactionStatus;
  amount: string;
  txHash: string | null;
  ledger: string | null;
  errorMessage: string | null;
  createdAt: string;
  confirmedAt: string | null;
  goal: { id: string; name: string; icon: string };
}

export interface AnalyticsOverview {
  totalSaved: number;
  totalInterestEarned: number;
  totalAccruedInterest: number;
  totalClaimedInterest: number;
  activeGoals: number;
  completedGoals: number;
  completionRate: number;
  depositCount: number;
  averageDeposit: number;
  savingsStreakDays: number;
  contributionChart: { date: string; total: number; count: number }[];
  goalSuccessPredictions: {
    goalId: string;
    name: string;
    onTrack: boolean;
    confidencePercent: number;
    impliedDailyRate: number;
    requiredDailyRate: number;
  }[];
}

export type NotificationType =
  | "DEPOSIT_SUCCESS"
  | "GOAL_COMPLETED"
  | "WEEKLY_REMINDER"
  | "INTEREST_UPDATED"
  | "DEADLINE_APPROACHING"
  | "TARGET_REACHED";

export interface AppNotification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  goalId: string | null;
  read: boolean;
  createdAt: string;
}

export interface User {
  id: string;
  publicKey: string;
  displayName: string | null;
  email: string | null;
  currency: string;
  theme: string;
  createdAt: string;
}

export interface PlannerResult {
  remaining: number;
  monthsRemaining: number;
  weeksRemaining: number;
  weeklyDeposit: number;
  monthlyDeposit: number;
  projectedInterest: number;
  chanceOfSuccessPercent: number;
  expectedCompletionDate: string;
  suggestions: string[];
}

export interface PreparedInvocation {
  status: "PREPARED";
  xdr: string;
  simulatedCost: { minResourceFee: string };
}

export interface ConfirmedGoal {
  status: "CONFIRMED";
  goal: Goal;
}

export interface ApiErrorShape {
  error: { code: string; message: string; details: unknown };
}

export interface Achievement {
  id: string;
  achievementId: string;
  unlockedAt: string;
  details: {
    icon: string;
    title: string;
    points: number;
    description: string;
  };
}
