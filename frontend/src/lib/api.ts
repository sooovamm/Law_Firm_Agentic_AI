import { tokenStore } from "@/lib/token-store";
import type {
  AuthResponse,
  Case,
  ChatMessageResponse,
  Client,
  Consultation,
  ConversationDetail,
  ConversationSummaryItem,
  AvailabilityResponse,
  CaseEvent,
  CaseFullDetail,
  CaseListItem,
  CaseNote,
  DashboardOverview,
  DashboardStats,
  Deadline,
  DeadlineBuckets,
  DocumentDetail,
  DocumentItem,
  DocumentType,
  EmailDetail,
  EmailListItem,
  LawyerMatchHistoryItem,
  LawyerOnboardingStatus,
  LawyerPracticeArea,
  LawyerProfile,
  LawyerProfileAdmin,
  LawyerProfileInput,
  ReplyResponse,
  TokenPair,
  User,
} from "@/types";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000/api/v1";

export class ApiError extends Error {
  constructor(
    public status: number,
    public detail: string,
  ) {
    super(detail);
    this.name = "ApiError";
  }
}

/**
 * Normalize a FastAPI error body's `detail` into a readable string.
 * `detail` may be a plain string, or - for 422 validation errors - an array of
 * Pydantic error objects ({type, loc, msg, ...}). Rendering the raw array in
 * React throws "Objects are not valid as a React child", so always coerce here.
 */
function extractDetail(detail: unknown, fallback: string): string {
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail)) {
    const messages = detail
      .map((item) => {
        if (item && typeof item === "object" && "msg" in item) {
          const loc = Array.isArray((item as { loc?: unknown[] }).loc)
            ? (item as { loc: unknown[] }).loc.filter((p) => p !== "body").join(".")
            : "";
          const msg = String((item as { msg: unknown }).msg);
          return loc ? `${loc}: ${msg}` : msg;
        }
        return typeof item === "string" ? item : null;
      })
      .filter(Boolean);
    if (messages.length > 0) return messages.join("; ");
  }
  if (detail && typeof detail === "object" && "msg" in detail) {
    return String((detail as { msg: unknown }).msg);
  }
  return fallback;
}

interface RequestOptions {
  method?: string;
  body?: unknown;
  auth?: boolean;
  retryOnAuthFail?: boolean;
}

async function refreshTokens(): Promise<boolean> {
  const refresh = tokenStore.refresh;
  if (!refresh) return false;

  const resp = await fetch(`${API_BASE_URL}/auth/refresh`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refresh_token: refresh }),
  });

  if (!resp.ok) {
    tokenStore.clear();
    return false;
  }

  const tokens = (await resp.json()) as TokenPair;
  tokenStore.set(tokens);
  return true;
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = "GET", body, auth = true, retryOnAuthFail = true } = options;

  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (auth && tokenStore.access) {
    headers.Authorization = `Bearer ${tokenStore.access}`;
  }

  const resp = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  // Transparently refresh once on an expired access token.
  if (resp.status === 401 && auth && retryOnAuthFail) {
    const refreshed = await refreshTokens();
    if (refreshed) {
      return request<T>(path, { ...options, retryOnAuthFail: false });
    }
  }

  if (!resp.ok) {
    let detail = `Request failed with status ${resp.status}`;
    try {
      const data = await resp.json();
      if (data?.detail) detail = extractDetail(data.detail, detail);
    } catch {
      // non-JSON error body; keep default message
    }
    throw new ApiError(resp.status, detail);
  }

  if (resp.status === 204) return undefined as T;
  return (await resp.json()) as T;
}

export const api = {
  // Auth
  requestRegistrationOtp: (payload: {
    email: string;
    full_name: string;
    password: string;
    role?: string;
  }) =>
    request<{ message: string; expires_in_minutes: number }>(
      "/auth/register/request-otp",
      { method: "POST", body: payload, auth: false },
    ),

  verifyRegistrationOtp: (payload: {
    email: string;
    full_name: string;
    password: string;
    role?: string;
    otp_code: string;
  }) =>
    request<AuthResponse>("/auth/register/verify-otp", {
      method: "POST",
      body: payload,
      auth: false,
    }),

  login: (payload: { email: string; password: string }) =>
    request<AuthResponse>("/auth/login", { method: "POST", body: payload, auth: false }),

  me: () => request<User>("/auth/me"),

  // Dashboard
  dashboardStats: () => request<DashboardStats>("/dashboard/stats"),

  // Cases
  listCases: () => request<Case[]>("/cases"),
  getCase: (id: number) => request<Case>(`/cases/${id}`),

  // Clients
  listClients: () => request<Client[]>("/clients"),

  // Users
  listUsers: () => request<User[]>("/users"),

  // Intake (Sprint 2)
  sendChatMessage: (payload: { conversation_id?: number | null; message: string }) =>
    request<ChatMessageResponse>("/chat/message", { method: "POST", body: payload }),

  getConversation: (id: number) => request<ConversationDetail>(`/conversation/${id}`),

  listConversations: () =>
    request<ConversationSummaryItem[]>("/conversation/history"),

  // Documents (Sprint 3)
  listDocuments: (params?: {
    q?: string;
    case_id?: number;
    client_id?: number;
    document_type?: DocumentType;
  }) => {
    const qs = new URLSearchParams();
    if (params?.q) qs.set("q", params.q);
    if (params?.case_id != null) qs.set("case_id", String(params.case_id));
    if (params?.client_id != null) qs.set("client_id", String(params.client_id));
    if (params?.document_type) qs.set("document_type", params.document_type);
    const suffix = qs.toString() ? `?${qs.toString()}` : "";
    return request<DocumentItem[]>(`/documents${suffix}`);
  },

  getDocument: (id: number) => request<DocumentDetail>(`/documents/${id}`),

  getDocumentBlob: async (id: number): Promise<Blob> => {
    const headers: Record<string, string> = {};
    if (tokenStore.access) headers.Authorization = `Bearer ${tokenStore.access}`;

    const resp = await fetch(`${API_BASE_URL}/documents/${id}/download`, { headers });
    if (!resp.ok) {
      throw new ApiError(resp.status, `Download failed with status ${resp.status}`);
    }
    return resp.blob();
  },

  deleteDocument: (id: number) =>
    request<{ detail: string }>(`/documents/${id}`, { method: "DELETE" }),

  uploadDocument: async (
    file: File,
    opts?: { case_id?: number; client_id?: number },
  ): Promise<{ document: DocumentItem; message: string }> => {
    const form = new FormData();
    form.append("file", file);
    if (opts?.case_id != null) form.append("case_id", String(opts.case_id));
    if (opts?.client_id != null) form.append("client_id", String(opts.client_id));

    const headers: Record<string, string> = {};
    if (tokenStore.access) headers.Authorization = `Bearer ${tokenStore.access}`;

    const resp = await fetch(`${API_BASE_URL}/documents/upload`, {
      method: "POST",
      headers,
      body: form,
    });
    if (!resp.ok) {
      let detail = `Upload failed with status ${resp.status}`;
      try {
        const data = await resp.json();
        if (data?.detail) detail = extractDetail(data.detail, detail);
      } catch {
        // keep default
      }
      throw new ApiError(resp.status, detail);
    }
    return resp.json();
  },

  // Dashboard (Sprint 4)
  dashboardOverview: () => request<DashboardOverview>("/dashboard/overview"),

  listCasesFiltered: (params?: {
    q?: string;
    practice_area?: string;
    assigned_lawyer_id?: number;
    status?: string;
    urgency?: string;
    created_from?: string;
    created_to?: string;
  }) => {
    const qs = new URLSearchParams();
    if (params?.q) qs.set("q", params.q);
    if (params?.practice_area) qs.set("practice_area", params.practice_area);
    if (params?.assigned_lawyer_id != null)
      qs.set("assigned_lawyer_id", String(params.assigned_lawyer_id));
    if (params?.status) qs.set("status", params.status);
    if (params?.urgency) qs.set("urgency", params.urgency);
    if (params?.created_from) qs.set("created_from", params.created_from);
    if (params?.created_to) qs.set("created_to", params.created_to);
    const suffix = qs.toString() ? `?${qs.toString()}` : "";
    return request<CaseListItem[]>(`/cases${suffix}`);
  },

  getCaseDetail: (id: number) => request<CaseFullDetail>(`/cases/${id}/detail`),

  addCaseNote: (caseId: number, content: string) =>
    request<CaseNote>(`/cases/${caseId}/notes`, { method: "POST", body: { content } }),

  addCaseEvent: (
    caseId: number,
    payload: {
      event_type: string;
      title: string;
      scheduled_at: string;
      description?: string;
      location?: string;
    },
  ) => request<CaseEvent>(`/cases/${caseId}/events`, { method: "POST", body: payload }),

  downloadDocumentUrl: (id: number) => `${API_BASE_URL}/documents/${id}/download`,

  // Consultations (Sprint 5)
  listConsultations: (params?: {
    lawyer_id?: number;
    client_id?: number;
    case_id?: number;
    status?: string;
    start_from?: string;
    start_to?: string;
  }) => {
    const qs = new URLSearchParams();
    if (params?.lawyer_id != null) qs.set("lawyer_id", String(params.lawyer_id));
    if (params?.client_id != null) qs.set("client_id", String(params.client_id));
    if (params?.case_id != null) qs.set("case_id", String(params.case_id));
    if (params?.status) qs.set("status", params.status);
    if (params?.start_from) qs.set("start_from", params.start_from);
    if (params?.start_to) qs.set("start_to", params.start_to);
    const suffix = qs.toString() ? `?${qs.toString()}` : "";
    return request<Consultation[]>(`/consultations${suffix}`);
  },

  getAvailability: (lawyerId: number, day: string, durationMinutes = 60) => {
    const qs = new URLSearchParams({
      lawyer_id: String(lawyerId),
      day,
      duration_minutes: String(durationMinutes),
    });
    return request<AvailabilityResponse>(`/consultations/availability?${qs.toString()}`);
  },

  bookConsultation: (payload: {
    lawyer_id: number;
    scheduled_time: string;
    duration_minutes?: number;
    client_id?: number;
    case_id?: number;
    notes?: string;
  }) => request<Consultation>("/consultations", { method: "POST", body: payload }),

  updateConsultation: (
    id: number,
    payload: {
      scheduled_time?: string;
      duration_minutes?: number;
      status?: string;
      notes?: string;
    },
  ) => request<Consultation>(`/consultations/${id}`, { method: "PATCH", body: payload }),

  cancelConsultation: (id: number) =>
    request<{ detail: string }>(`/consultations/${id}`, { method: "DELETE" }),

  // Emails (Sprint 6)
  listEmails: (params?: {
    q?: string;
    status?: string;
    urgency?: string;
    case_id?: number;
    client_id?: number;
  }) => {
    const qs = new URLSearchParams();
    if (params?.q) qs.set("q", params.q);
    if (params?.status) qs.set("status", params.status);
    if (params?.urgency) qs.set("urgency", params.urgency);
    if (params?.case_id != null) qs.set("case_id", String(params.case_id));
    if (params?.client_id != null) qs.set("client_id", String(params.client_id));
    const suffix = qs.toString() ? `?${qs.toString()}` : "";
    return request<EmailListItem[]>(`/emails${suffix}`);
  },

  getEmail: (id: number) => request<EmailDetail>(`/emails/${id}`),

  replyEmail: (emailId: number, body: string, subject?: string) =>
    request<ReplyResponse>("/emails/reply", {
      method: "POST",
      body: { email_id: emailId, body, subject },
    }),

  // Deadlines (Sprint 7)
  listDeadlines: (params?: {
    case_id?: number;
    completed?: boolean;
    priority?: string;
    deadline_type?: string;
  }) => {
    const qs = new URLSearchParams();
    if (params?.case_id != null) qs.set("case_id", String(params.case_id));
    if (params?.completed != null) qs.set("completed", String(params.completed));
    if (params?.priority) qs.set("priority", params.priority);
    if (params?.deadline_type) qs.set("deadline_type", params.deadline_type);
    const suffix = qs.toString() ? `?${qs.toString()}` : "";
    return request<Deadline[]>(`/deadlines${suffix}`);
  },

  deadlineBuckets: () => request<DeadlineBuckets>("/deadlines/buckets"),

  deadlineCalendar: (start: string, end: string) => {
    const qs = new URLSearchParams({ start, end });
    return request<Deadline[]>(`/deadlines/calendar?${qs.toString()}`);
  },

  createDeadline: (payload: {
    title: string;
    due_date: string;
    case_id?: number;
    deadline_type?: string;
    priority?: string;
    notes?: string;
  }) => request<Deadline>("/deadlines", { method: "POST", body: payload }),

  updateDeadline: (
    id: number,
    payload: {
      title?: string;
      due_date?: string;
      completed?: boolean;
      priority?: string;
      deadline_type?: string;
      notes?: string;
    },
  ) => request<Deadline>(`/deadlines/${id}`, { method: "PATCH", body: payload }),

  deleteDeadline: (id: number) =>
    request<{ detail: string }>(`/deadlines/${id}`, { method: "DELETE" }),

  // Lawyers (Sprint 8: onboarding + AI matching)
  getLawyerStatus: () => request<LawyerOnboardingStatus>("/lawyers/me/status"),

  getMyLawyerProfile: () => request<LawyerProfile>("/lawyers/me"),

  saveLawyerDraft: (payload: LawyerProfileInput) =>
    request<LawyerProfile>("/lawyers/me", { method: "PUT", body: payload }),

  completeLawyerOnboarding: (payload: LawyerProfileInput) =>
    request<LawyerProfile>("/lawyers/me/complete", { method: "POST", body: payload }),

  getLawyerProfile: (userId: number) => request<LawyerProfileAdmin>(`/lawyers/${userId}`),

  listLawyers: (params?: {
    practice_area?: LawyerPracticeArea;
    min_experience?: number;
    max_experience?: number;
    accepts_new_clients?: boolean;
    max_workload?: number;
    q?: string;
  }) => {
    const qs = new URLSearchParams();
    if (params?.practice_area) qs.set("practice_area", params.practice_area);
    if (params?.min_experience != null) qs.set("min_experience", String(params.min_experience));
    if (params?.max_experience != null) qs.set("max_experience", String(params.max_experience));
    if (params?.accepts_new_clients != null)
      qs.set("accepts_new_clients", String(params.accepts_new_clients));
    if (params?.max_workload != null) qs.set("max_workload", String(params.max_workload));
    if (params?.q) qs.set("q", params.q);
    const suffix = qs.toString() ? `?${qs.toString()}` : "";
    return request<LawyerProfileAdmin[]>(`/lawyers${suffix}`);
  },

  setLawyerAcceptingClients: (userId: number, accepts_new_clients: boolean) =>
    request<LawyerProfile>(`/lawyers/${userId}/accepting-clients`, {
      method: "PATCH",
      body: { accepts_new_clients },
    }),

  getLawyerMatchHistory: (userId: number) =>
    request<LawyerMatchHistoryItem[]>(`/lawyers/${userId}/match-history`),

  overrideLawyerMatch: (matchId: number, lawyerId: number) =>
    request<LawyerMatchHistoryItem>(`/lawyers/match/${matchId}/override`, {
      method: "PATCH",
      body: { lawyer_id: lawyerId },
    }),
};
