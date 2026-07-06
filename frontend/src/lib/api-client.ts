import { apiConfig } from "@/config/site";
import { useAuthStore } from "@/store/auth-store";
import type {
  AnalyticsOverview,
  AppNotification,
  ConfirmedGoal,
  Goal,
  GoalHistoryEntry,
  GoalTemplate,
  PlannerResult,
  PreparedInvocation,
  SavingsFrequency,
  Transaction,
  User,
  Achievement,
} from "@/types/api";

export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public details?: unknown,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = useAuthStore.getState().token;
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(init.headers as Record<string, string> | undefined),
  };
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${apiConfig.baseUrl}${path}`, { ...init, headers });

  if (res.status === 204) return undefined as T;

  const body = await res.json().catch(() => null);

  if (!res.ok) {
    const err = body?.error ?? { code: "UNKNOWN", message: res.statusText };
    if (res.status === 401) {
      useAuthStore.getState().clearSession();
    }
    throw new ApiError(res.status, err.code, err.message, err.details);
  }

  return body as T;
}

// ---- Auth ----

export const authApi = {
  challenge: (publicKey: string) =>
    request<{ challengeXdr: string; nonce: string; expiresAt: string }>("/auth/challenge", {
      method: "POST",
      body: JSON.stringify({ publicKey }),
    }),
  verify: (publicKey: string, nonce: string, signedChallengeXdr: string) =>
    request<{ token: string; expiresAt: string; user: User }>("/auth/verify", {
      method: "POST",
      body: JSON.stringify({ publicKey, nonce, signedChallengeXdr }),
    }),
  me: () => request<User>("/auth/me"),
  logout: () => request<void>("/auth/logout", { method: "POST" }),
};

// ---- Goals ----

export interface CreateGoalInput {
  name: string;
  icon: string;
  template: GoalTemplate;
  targetAmount: number;
  unlockDate: string;
  savingsFrequency: SavingsFrequency;
  signedXdr?: string;
}

export interface PatchGoalInput {
  name?: string;
  icon?: string;
  targetAmount?: number;
  unlockDate?: string;
  paused?: boolean;
  signedXdr?: string;
}

export const goalsApi = {
  list: (includeClosed = false) =>
    request<{ goals: Goal[] }>(`/goals${includeClosed ? "?includeClosed=true" : ""}`),
  get: (id: string) => request<{ goal: Goal }>(`/goal/${id}`),
  history: (id: string) => request<{ history: GoalHistoryEntry[] }>(`/goal/${id}/history`),
  create: (input: CreateGoalInput) =>
    request<PreparedInvocation | ConfirmedGoal>("/goal", { method: "POST", body: JSON.stringify(input) }),
  patch: (id: string, input: PatchGoalInput) =>
    request<PreparedInvocation | ConfirmedGoal>(`/goal/${id}`, { method: "PATCH", body: JSON.stringify(input) }),
  remove: (id: string, signedXdr?: string) =>
    request<PreparedInvocation | ConfirmedGoal>(`/goal/${id}`, {
      method: "DELETE",
      body: JSON.stringify({ signedXdr }),
    }),
};

// ---- Transactions ----

export const transactionsApi = {
  list: (opts: { goalId?: string; limit?: number; cursor?: string } = {}) => {
    const params = new URLSearchParams();
    if (opts.goalId) params.set("goalId", opts.goalId);
    if (opts.limit) params.set("limit", String(opts.limit));
    if (opts.cursor) params.set("cursor", opts.cursor);
    const qs = params.toString();
    return request<{ transactions: Transaction[] }>(`/transactions${qs ? `?${qs}` : ""}`);
  },
  deposit: (goalId: string, amount: number, signedXdr?: string) =>
    request<PreparedInvocation | ConfirmedGoal>("/deposit", {
      method: "POST",
      body: JSON.stringify({ goalId, amount, signedXdr }),
    }),
  withdraw: (goalId: string, amount: number, signedXdr?: string) =>
    request<PreparedInvocation | ConfirmedGoal>("/withdraw", {
      method: "POST",
      body: JSON.stringify({ goalId, amount, signedXdr }),
    }),
  claim: (goalId: string, signedXdr?: string) =>
    request<PreparedInvocation | ConfirmedGoal>("/claim", {
      method: "POST",
      body: JSON.stringify({ goalId, signedXdr }),
    }),
};

// ---- Analytics ----

export const analyticsApi = {
  overview: (days = 30) => request<AnalyticsOverview>(`/analytics?days=${days}`),
};

// ---- Notifications ----

export const notificationsApi = {
  list: (unreadOnly = false) =>
    request<{ notifications: AppNotification[]; unreadCount: number }>(
      `/notifications${unreadOnly ? "?unreadOnly=true" : ""}`,
    ),
  markRead: (id: string) => request<void>(`/notifications/${id}/read`, { method: "PATCH" }),
  markAllRead: () => request<void>("/notifications/read-all", { method: "PATCH" }),
};

// ---- Planner ----

export const plannerApi = {
  plan: (input: { targetAmount: number; currentSaved: number; apyBps: number; months?: number; targetDate?: string }) =>
    request<PlannerResult>("/planner", { method: "POST", body: JSON.stringify(input) }),
};

// ---- Achievements ----

export const achievementsApi = {
  get: () => request<{ achievements: Achievement[]; points: number; level: number }>("/achievements"),
};
