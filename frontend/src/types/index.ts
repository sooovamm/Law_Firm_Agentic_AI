export type UserRole = "admin" | "lawyer" | "paralegal";

export type CaseStatus = "open" | "in_progress" | "on_hold" | "closed";

export type PracticeArea =
  | "corporate"
  | "criminal"
  | "family"
  | "immigration"
  | "intellectual_property"
  | "labor"
  | "real_estate"
  | "tax"
  | "litigation"
  | "other";

export interface User {
  id: number;
  email: string;
  full_name: string;
  role: UserRole;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface TokenPair {
  access_token: string;
  refresh_token: string;
  token_type: string;
}

export interface AuthResponse {
  user: User;
  tokens: TokenPair;
}

export interface Client {
  id: number;
  full_name: string;
  email: string | null;
  phone: string | null;
  company: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface Case {
  id: number;
  title: string;
  practice_area: PracticeArea;
  status: CaseStatus;
  description: string | null;
  client_id: number;
  assigned_lawyer_id: number | null;
  client?: Client | null;
  assigned_lawyer?: User | null;
  created_at: string;
  updated_at: string;
}

export interface DashboardStats {
  total_cases: number;
  open_cases: number;
  closed_cases: number;
}

// ---- Sprint 2: AI Intake ----

export type IntakePracticeArea =
  | "divorce"
  | "criminal"
  | "employment"
  | "immigration"
  | "property"
  | "personal_injury"
  | "contract_disputes"
  | "other";

export type IntakeStage =
  | "greeting"
  | "practice_area_detection"
  | "information_collection"
  | "lead_qualification"
  | "generate_summary"
  | "create_case"
  | "finished";

export type ConversationStatus = "active" | "completed" | "abandoned";

export type Urgency = "low" | "medium" | "high" | "critical";

export type MessageRole = "user" | "assistant" | "system";

export interface IntakeMessage {
  id: number;
  role: MessageRole;
  content: string;
  created_at: string;
}

export interface IntakeStructuredResult {
  practice_area: string;
  urgency: string;
  recommended: boolean;
  missing_information: string[];
}

export interface AISummary {
  id: number;
  title: string;
  summary: string;
  client_name: string | null;
  practice_area: IntakePracticeArea | null;
  urgency: Urgency | null;
  recommended: boolean;
  missing_information: string[];
  message_count: number;
  created_at: string;
}

export interface ChatMessageResponse {
  conversation_id: number;
  stage: IntakeStage;
  status: ConversationStatus;
  practice_area: IntakePracticeArea | null;
  assistant_message: string;
  structured: IntakeStructuredResult;
  case_id: number | null;
  summary: AISummary | null;
}

export interface ConversationSummaryItem {
  id: number;
  status: ConversationStatus;
  stage: IntakeStage;
  practice_area: IntakePracticeArea | null;
  created_at: string;
  updated_at: string;
}

export interface ConversationDetail extends ConversationSummaryItem {
  case_id: number | null;
  messages: IntakeMessage[];
  summary: AISummary | null;
}

// ---- Sprint 3: Documents ----

export type DocumentType =
  | "employment"
  | "medical"
  | "contract"
  | "evidence"
  | "police_report"
  | "other";

export type ProcessingStatus = "pending" | "processing" | "completed" | "failed";

export interface DocumentItem {
  id: number;
  filename: string;
  url: string;
  content_type: string;
  size_bytes: number;
  document_type: DocumentType | null;
  processing_status: ProcessingStatus;
  client_id: number | null;
  case_id: number | null;
  created_at: string;
  updated_at: string;
}

export interface DocumentDetail extends DocumentItem {
  summary: string | null;
  key_facts: string[];
  important_dates: string[];
  people: string[];
  organizations: string[];
  missing_documents: string[];
  processing_error: string | null;
}

// ---- Sprint 4: Dashboard & Case Detail ----

export type CaseUrgency = "low" | "medium" | "high" | "critical";

export type CaseEventType =
  | "consultation"
  | "hearing"
  | "filing"
  | "deadline"
  | "meeting"
  | "other";

export type ActivityType =
  | "case_created"
  | "case_updated"
  | "client_created"
  | "document_uploaded"
  | "note_added"
  | "event_scheduled"
  | "intake_completed";

export interface OverviewCards {
  open_cases: number;
  closed_cases: number;
  new_clients: number;
  todays_consultations: number;
}

export interface ActivityItem {
  id: number;
  activity_type: ActivityType;
  description: string;
  case_id: number | null;
  created_at: string;
}

export interface UrgentCaseItem {
  id: number;
  title: string;
  practice_area: string;
  status: CaseStatus;
  urgency: CaseUrgency;
  client_name: string | null;
  assigned_lawyer_name: string | null;
  updated_at: string;
}

export interface UpcomingEventItem {
  id: number;
  case_id: number;
  case_title: string;
  event_type: CaseEventType;
  title: string;
  scheduled_at: string;
  location: string | null;
}

export interface RecentDocumentItem {
  id: number;
  filename: string;
  document_type: string | null;
  case_id: number | null;
  created_at: string;
}

export interface ChartPoint {
  label: string;
  value: number;
}

export interface DashboardOverview {
  cards: OverviewCards;
  charts: {
    cases_by_practice_area: ChartPoint[];
    cases_by_status: ChartPoint[];
  };
  recent_activity: ActivityItem[];
  urgent_cases: UrgentCaseItem[];
  upcoming_events: UpcomingEventItem[];
  upcoming_consultations: UpcomingConsultationItem[];
  recent_documents: RecentDocumentItem[];
}

export interface CaseNote {
  id: number;
  content: string;
  author_id: number | null;
  created_at: string;
}

export interface CaseEvent {
  id: number;
  event_type: CaseEventType;
  title: string;
  description: string | null;
  scheduled_at: string;
  location: string | null;
  created_at: string;
}

export interface TimelineItem {
  kind: string;
  label: string;
  detail: string | null;
  timestamp: string;
}

export interface CaseFullDetail {
  id: number;
  title: string;
  practice_area: string;
  status: CaseStatus;
  urgency: CaseUrgency;
  description: string | null;
  ai_summary: string | null;
  created_at: string;
  updated_at: string;
  client: Client | null;
  assigned_lawyer: User | null;
  documents: DocumentItem[];
  notes: CaseNote[];
  events: CaseEvent[];
  timeline: TimelineItem[];
  conversation: {
    conversation: ConversationSummaryItem;
    messages: IntakeMessage[];
  } | null;
}

export interface CaseListItem {
  id: number;
  title: string;
  practice_area: string;
  status: CaseStatus;
  urgency: CaseUrgency;
  description: string | null;
  client_id: number;
  assigned_lawyer_id: number | null;
  client?: Client | null;
  assigned_lawyer?: User | null;
  created_at: string;
  updated_at: string;
}

// ---- Sprint 5: Consultations ----

export type ConsultationStatus = "pending" | "confirmed" | "completed" | "cancelled";

export interface Consultation {
  id: number;
  case_id: number | null;
  lawyer_id: number;
  client_id: number | null;
  scheduled_time: string;
  duration_minutes: number;
  status: ConsultationStatus;
  notes: string | null;
  lawyer_name: string | null;
  client_name: string | null;
  case_title: string | null;
  created_at: string;
  updated_at: string;
}

export interface AvailableSlot {
  start: string;
  end: string;
}

export interface AvailabilityResponse {
  lawyer_id: number;
  date: string;
  duration_minutes: number;
  slots: AvailableSlot[];
}

export interface UpcomingConsultationItem {
  id: number;
  lawyer_name: string | null;
  client_name: string | null;
  scheduled_time: string;
  duration_minutes: number;
  status: string;
}

// ---- Sprint 6: Email Intelligence ----

export type EmailProvider = "gmail" | "outlook";
export type EmailStatus = "received" | "processed" | "replied" | "failed";
export type EmailUrgency = "low" | "medium" | "high" | "critical";

export interface EmailTask {
  description: string;
  owner: string | null;
}

export interface EmailDeadline {
  description: string;
  due_date: string | null;
}

export interface EmailListItem {
  id: number;
  provider: EmailProvider;
  sender: string;
  receiver: string;
  subject: string;
  status: EmailStatus;
  urgency: EmailUrgency | null;
  summary: string | null;
  case_id: number | null;
  client_id: number | null;
  received_at: string | null;
  created_at: string;
}

export interface EmailDetail extends EmailListItem {
  body: string;
  tasks: EmailTask[];
  deadlines: EmailDeadline[];
  draft_reply: string | null;
  case_title: string | null;
  client_name: string | null;
}

export interface ReplyResponse {
  email_id: number;
  sent: boolean;
  channel: string;
  subject: string;
  body: string;
}

// ---- Sprint 7: Court Deadlines ----

export type DeadlineType = "hearing" | "filing" | "appeal" | "evidence" | "other";
export type DeadlinePriority = "low" | "medium" | "high" | "critical";
export type DeadlineSource = "document" | "email" | "manual";

export interface Deadline {
  id: number;
  case_id: number | null;
  title: string;
  due_date: string;
  completed: boolean;
  priority: DeadlinePriority;
  deadline_type: DeadlineType;
  source: DeadlineSource;
  source_reference: string | null;
  notes: string | null;
  case_title: string | null;
  created_at: string;
}

export interface DeadlineBuckets {
  overdue: Deadline[];
  today: Deadline[];
  upcoming: Deadline[];
}
