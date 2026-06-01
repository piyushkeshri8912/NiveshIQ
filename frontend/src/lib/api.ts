const API_BASE = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000").replace(/\/$/, "") + "/api/v1";

// Security Header Injection Helper
function getAuthHeaders(hasBody: boolean = false): HeadersInit {
  const token = typeof window !== "undefined" ? localStorage.getItem("niveshiq_token") : null;
  const headers: Record<string, string> = {
    "Authorization": `Bearer ${token || "demo-token"}`,
  };
  if (hasBody) {
    headers["Content-Type"] = "application/json";
  }
  return headers;
}

export interface UserProfile {
  risk_appetite: string;
  time_horizon: string;
  investment_goal: string;
  preferred_sectors: string[];
  avoid_sectors: string[];
  liquidity_preference: string;
  dividend_vs_growth: string;
  monthly_investment_budget: number;
  notes: string;
  full_name?: string;
  dob?: string;
  profession?: string;
}

export interface UserProfileResponse extends UserProfile {
  id: number;
  user_id: number;
}

export interface Transaction {
  symbol: string;
  company_name?: string;
  transaction_type: string; // BUY, SELL
  quantity: number;
  price: number;
  fees?: number;
  executed_at?: string;
}

export interface TransactionResponse extends Transaction {
  id: number;
  user_id: number;
  executed_at: string;
}

export interface HoldingResponse {
  symbol: string;
  company_name?: string;
  quantity: number;
  average_buy_price: number;
  market_price: number;
  market_value: number;
  unrealized_pnl: number;
  unrealized_pnl_percent: number;
  allocation_percent: number;
}

export interface PortfolioSummaryResponse {
  total_cost: number;
  total_value: number;
  total_unrealized_pnl: number;
  total_unrealized_pnl_percent: number;
  total_realized_pnl: number;
}

export interface PortfolioHoldingsListResponse {
  holdings: HoldingResponse[];
  summary: PortfolioSummaryResponse;
}

// AUTHENTICATION APIS
export interface RegisterResponse {
  message: string;
  email_sent: boolean;
}

export interface LoginResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
}

export async function registerUser(email: string, password: string): Promise<RegisterResponse> {
  const res = await fetch(`${API_BASE}/auth/register`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.detail || "Registration failed");
  }
  return await res.json();
}

export async function loginUser(email: string, password: string): Promise<LoginResponse> {
  const res = await fetch(`${API_BASE}/auth/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.detail || "Incorrect email or password");
  }
  const data: LoginResponse = await res.json();
  // Save token in localStorage
  localStorage.setItem("niveshiq_token", data.access_token);
  localStorage.setItem("niveshiq_refresh_token", data.refresh_token);
  return data;
}

export async function loginWithGoogle(credential: string): Promise<LoginResponse> {
  const res = await fetch(`${API_BASE}/auth/google`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ credential }),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.detail || "Google login failed");
  }
  const data: LoginResponse = await res.json();
  // Save token in localStorage
  localStorage.setItem("niveshiq_token", data.access_token);
  localStorage.setItem("niveshiq_refresh_token", data.refresh_token);
  return data;
}

export async function verifyEmail(token: string): Promise<string> {
  const res = await fetch(`${API_BASE}/auth/verify?token=${token}`);
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.detail || "Email verification failed");
  }
  const data = await res.json();
  // Automatically capture authentication tokens to log them in
  if (data.access_token) {
    localStorage.setItem("niveshiq_token", data.access_token);
  }
  if (data.refresh_token) {
    localStorage.setItem("niveshiq_refresh_token", data.refresh_token);
  }
  return data.message;
}

export async function forgotPassword(email: string): Promise<string> {
  const res = await fetch(`${API_BASE}/auth/forgot-password`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ email }),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.detail || "Forgot password request failed");
  }
  const data = await res.json();
  return data.message;
}

export async function resetPassword(token: string, newPassword: string): Promise<string> {
  const res = await fetch(`${API_BASE}/auth/reset-password`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ token, new_password: newPassword }),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.detail || "Reset password request failed");
  }
  const data = await res.json();
  return data.message;
}

export async function changePassword(currentPassword: string, newPassword: string): Promise<string> {
  const res = await fetch(`${API_BASE}/profile/change-password`, {
    method: "POST",
    headers: getAuthHeaders(true),
    body: JSON.stringify({ current_password: currentPassword, new_password: newPassword }),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.detail || "Failed to change password");
  }
  const data = await res.json();
  return data.message;
}

export async function deleteAccount(): Promise<boolean> {
  const res = await fetch(`${API_BASE}/profile/delete-account`, {
    method: "DELETE",
    headers: getAuthHeaders(),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.detail || "Failed to delete account");
  }
  return res.ok;
}

export function logout(): void {
  localStorage.removeItem("niveshiq_token");
  localStorage.removeItem("niveshiq_refresh_token");
}

export function isAuthenticated(): boolean {
  if (typeof window === "undefined") return false;
  return !!localStorage.getItem("niveshiq_token");
}

// PROFILE APIS
export async function fetchProfile(): Promise<UserProfileResponse | null> {
  try {
    const res = await fetch(`${API_BASE}/profile`, {
      cache: "no-store",
      headers: getAuthHeaders(),
    });
    if (res.status === 404) return null;
    if (!res.ok) throw new Error("Failed to fetch profile");
    return await res.json();
  } catch (error) {
    console.error("fetchProfile error:", error);
    return null;
  }
}

export async function saveProfile(profile: UserProfile): Promise<UserProfileResponse> {
  const res = await fetch(`${API_BASE}/profile`, {
    method: "POST",
    headers: getAuthHeaders(true),
    body: JSON.stringify(profile),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.detail || "Failed to save profile");
  }
  return await res.json();
}

// TRANSACTION APIS
export async function fetchTransactions(): Promise<TransactionResponse[]> {
  try {
    const res = await fetch(`${API_BASE}/transactions`, {
      cache: "no-store",
      headers: getAuthHeaders(),
    });
    if (!res.ok) throw new Error("Failed to fetch transactions");
    return await res.json();
  } catch (error) {
    console.error("fetchTransactions error:", error);
    return [];
  }
}

export async function addTransaction(tx: Transaction): Promise<TransactionResponse> {
  const res = await fetch(`${API_BASE}/transactions`, {
    method: "POST",
    headers: getAuthHeaders(true),
    body: JSON.stringify(tx),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.detail || "Failed to record transaction");
  }
  return await res.json();
}

export async function updateTransaction(txId: number, tx: Transaction): Promise<TransactionResponse> {
  const res = await fetch(`${API_BASE}/transactions/${txId}`, {
    method: "PUT",
    headers: getAuthHeaders(true),
    body: JSON.stringify(tx),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.detail || "Failed to update transaction");
  }
  return await res.json();
}

export async function deleteTransaction(txId: number): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE}/transactions/${txId}`, {
      method: "DELETE",
      headers: getAuthHeaders(),
    });
    return res.ok;
  } catch (error) {
    console.error("deleteTransaction error:", error);
    return false;
  }
}

// PORTFOLIO APIS
export async function fetchHoldings(): Promise<PortfolioHoldingsListResponse | null> {
  try {
    const res = await fetch(`${API_BASE}/portfolio/holdings`, {
      cache: "no-store",
      headers: getAuthHeaders(),
    });
    if (!res.ok) throw new Error("Failed to fetch holdings");
    return await res.json();
  } catch (error) {
    console.error("fetchHoldings error:", error);
    return null;
  }
}

// ANALYTICS APIS
export interface SectorExposure {
  sector: string;
  value: number;
  percentage: number;
}

export interface MarketCapExposure {
  bucket: string;
  value: number;
  percentage: number;
}

export interface ExposuresResponse {
  sectors: SectorExposure[];
  market_caps: MarketCapExposure[];
}

export interface PortfolioHealthWarning {
  type: string;
  symbol: string;
  message: string;
}

export interface PortfolioHealthResponse {
  risk_score: number;
  diversification_score: number;
  warnings: PortfolioHealthWarning[];
  status: string;
}

export interface PortfolioSnapshotResponse {
  id: number;
  user_id: number;
  captured_at: string;
  total_value: number;
  total_cost: number;
  risk_score: number;
  diversification_score: number;
}

export async function fetchExposures(): Promise<ExposuresResponse | null> {
  try {
    const res = await fetch(`${API_BASE}/analytics/exposures`, {
      cache: "no-store",
      headers: getAuthHeaders(),
    });
    if (!res.ok) throw new Error("Failed to fetch exposures");
    return await res.json();
  } catch (error) {
    console.error("fetchExposures error:", error);
    return null;
  }
}

export async function fetchPortfolioHealth(): Promise<PortfolioHealthResponse | null> {
  try {
    const res = await fetch(`${API_BASE}/analytics/health`, {
      cache: "no-store",
      headers: getAuthHeaders(),
    });
    if (!res.ok) throw new Error("Failed to fetch health");
    return await res.json();
  } catch (error) {
    console.error("fetchPortfolioHealth error:", error);
    return null;
  }
}

export async function fetchPerformanceHistory(): Promise<PortfolioSnapshotResponse[]> {
  try {
    const res = await fetch(`${API_BASE}/analytics/performance-history`, {
      cache: "no-store",
      headers: getAuthHeaders(),
    });
    if (!res.ok) throw new Error("Failed to fetch performance history");
    return await res.json();
  } catch (error) {
    console.error("fetchPerformanceHistory error:", error);
    return [];
  }
}

export async function triggerSnapshot(): Promise<PortfolioSnapshotResponse | null> {
  try {
    const res = await fetch(`${API_BASE}/analytics/snapshot`, {
      method: "POST",
      headers: getAuthHeaders(),
    });
    if (!res.ok) throw new Error("Failed to trigger snapshot");
    return await res.json();
  } catch (error) {
    console.error("triggerSnapshot error:", error);
    return null;
  }
}

// WATCHLIST APIS
export interface WatchlistItem {
  symbol: string;
  watch_reason?: string;
}

export interface WatchlistItemResponse extends WatchlistItem {
  id: number;
  user_id: number;
  company_name?: string;
  added_at: string;
}

export interface WatchlistPriorityResponse {
  id: number;
  symbol: string;
  company_name?: string;
  watch_reason?: string;
  sector?: string;
  market_cap_bucket?: string;
  market_price?: number;
  fit_score: number;
  compatibility: "EXCELLENT" | "GOOD" | "NEUTRAL" | "AVOID";
  commentary: string;
}

export async function fetchWatchlist(): Promise<WatchlistItemResponse[]> {
  try {
    const res = await fetch(`${API_BASE}/watchlist`, {
      cache: "no-store",
      headers: getAuthHeaders(),
    });
    if (!res.ok) throw new Error("Failed to fetch watchlist");
    return await res.json();
  } catch (error) {
    console.error("fetchWatchlist error:", error);
    return [];
  }
}

export async function addWatchlistItem(item: WatchlistItem): Promise<WatchlistItemResponse> {
  const res = await fetch(`${API_BASE}/watchlist`, {
    method: "POST",
    headers: getAuthHeaders(true),
    body: JSON.stringify(item),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.detail || "Failed to add watchlist item");
  }
  return await res.json();
}

export async function deleteWatchlistItem(itemId: number): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE}/watchlist/${itemId}`, {
      method: "DELETE",
      headers: getAuthHeaders(),
    });
    return res.ok;
  } catch (error) {
    console.error("deleteWatchlistItem error:", error);
    return false;
  }
}

export async function fetchWatchlistPriorities(): Promise<WatchlistPriorityResponse[]> {
  try {
    const res = await fetch(`${API_BASE}/watchlist/priorities`, {
      cache: "no-store",
      headers: getAuthHeaders(),
    });
    if (!res.ok) throw new Error("Failed to fetch watchlist priorities");
    return await res.json();
  } catch (error) {
    console.error("fetchWatchlistPriorities error:", error);
    return [];
  }
}

// NEWS APIS
export interface NewsItemResponse {
  symbol: string;
  company_name?: string;
  title: string;
  link: string;
  source: string;
  published_at: string;
  why_matters: string;
}

export async function fetchPortfolioNews(): Promise<NewsItemResponse[]> {
  try {
    const res = await fetch(`${API_BASE}/news`, {
      cache: "no-store",
      headers: getAuthHeaders(),
    });
    if (!res.ok) throw new Error("Failed to fetch news");
    return await res.json();
  } catch (error) {
    console.error("fetchPortfolioNews error:", error);
    return [];
  }
}

// INSIGHTS APIS
export interface PortfolioReviewResponse {
  id: number;
  user_id: number;
  created_at: string;
  risk_summary: string;
  diversification_summary: string;
  rebalancing_ideas: any[];
  potential_stock_picks: any[];
  warnings: any[];
  market_impact: string;
  evidence: any;
  disclaimers: string;
}

export interface WatchlistAIRecommendation {
  symbol: string;
  recommendation: string;
  compatibility: string;
}

export async function fetchLatestPortfolioReview(): Promise<PortfolioReviewResponse | null> {
  try {
    const res = await fetch(`${API_BASE}/insights`, {
      cache: "no-store",
      headers: getAuthHeaders(),
    });
    if (res.status === 404) return null;
    if (!res.ok) throw new Error("Failed to fetch latest review");
    return await res.json();
  } catch (error) {
    console.error("fetchLatestPortfolioReview error:", error);
    return null;
  }
}

export async function generatePortfolioReview(): Promise<PortfolioReviewResponse> {
  const res = await fetch(`${API_BASE}/insights/generate`, {
    method: "POST",
    headers: getAuthHeaders(),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.detail || "Failed to generate AI review");
  }
  return await res.json();
}

export async function fetchWatchlistAIRecommendations(): Promise<WatchlistAIRecommendation[]> {
  try {
    const res = await fetch(`${API_BASE}/watchlist/ai-recommendations`, {
      cache: "no-store",
      headers: getAuthHeaders(),
    });
    if (!res.ok) {
      throw new Error("Failed to fetch watchlist AI recommendations");
    }
    return await res.json();
  } catch (error) {
    console.error("fetchWatchlistAIRecommendations error:", error);
    return [];
  }
}

export interface AskResponse {
  answer: string;
  evidence: string[];
  caveat: string;
  next_steps: string[];
}

export async function askCopilot(query: string): Promise<AskResponse> {
  const res = await fetch(`${API_BASE}/ask`, {
    method: "POST",
    headers: getAuthHeaders(true),
    body: JSON.stringify({ query }),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.detail || "Failed to query portfolio copilot");
  }
  return await res.json();
}