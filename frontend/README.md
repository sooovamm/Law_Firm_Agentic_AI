# Frontend — Legal CMS

Next.js 15 (App Router) + TypeScript + TailwindCSS.

## Setup

```bash
cp .env.local.example .env.local
npm install
npm run dev
```

App runs at http://localhost:3000.

## Environment Variables

- `NEXT_PUBLIC_API_BASE_URL` — backend API base, e.g. `http://localhost:8000/api/v1`.

## Scripts

```bash
npm run dev      # dev server
npm run build    # production build
npm run start    # serve production build
npm run lint     # eslint
```

## Structure

- `src/app/` — App Router routes.
  - `login/`, `register/` — public auth pages.
  - `dashboard/` — protected route group (layout wraps children in `AuthGuard`).
- `src/hooks/use-auth.tsx` — auth context: current user, login, register, logout.
- `src/components/auth-guard.tsx` — redirects unauthenticated users to `/login`.
- `src/components/sidebar.tsx` — dashboard navigation.
- `src/lib/api.ts` — typed API client with automatic refresh-on-401.
- `src/lib/token-store.ts` — access/refresh token persistence.
- `src/types/` — shared types mirroring backend schemas.

## Auth Flow

1. Login/register stores the access + refresh tokens.
2. The API client attaches the access token to each request.
3. On a 401, the client transparently attempts one refresh, then retries.
4. If refresh fails, tokens are cleared and the guard redirects to `/login`.

## Version Note

Pinned to Next.js 15.5.22 (patched). Earlier 15.1.x releases carry a known
security advisory.

## AI Intake (Sprint 2)

- `src/app/dashboard/intake/` — intake routes:
  - `page.tsx` — conversation history + New Intake entry.
  - `new/page.tsx` — start a new intake conversation.
  - `[id]/page.tsx` — resume/view an existing conversation.
- `src/components/intake/` — chat panel, message bubbles, progress indicator,
  summary card, and the document-upload placeholder.

The chat panel talks to `POST /chat/message`, tracks the workflow stage via the
progress indicator, and renders the AI summary card when the intake completes.
The document-upload control is a disabled placeholder in this sprint.

## Document Manager (Sprint 3)

- `src/app/dashboard/documents/page.tsx` — the document manager: searchable
  table with upload, download, delete, and a detail drawer.
- `src/components/documents/` — upload dialog, detail drawer (preview + AI
  fields), and shared formatting/style helpers.

Uploads go to `POST /documents/upload` (multipart). The table polls the list
endpoint with a debounced `q` search. The detail drawer shows the AI-extracted
summary, key facts, dates, people, organizations, and missing documents, with an
inline preview for images and a download link for all types.

## Professional Dashboard (Sprint 4)

- `src/app/dashboard/page.tsx` — overview cards, Recharts charts (practice area
  bar, status pie), and panels for recent activity, urgent cases, upcoming
  hearings/events, and recent documents.
- `src/app/dashboard/cases/page.tsx` — filterable case list (practice area,
  lawyer, status, urgency, date, search).
- `src/app/dashboard/cases/[id]/page.tsx` — case detail with client, assigned
  lawyer, AI summary, and tabs for timeline, documents, notes, and the linked
  intake conversation.
- `src/app/dashboard/clients/page.tsx` — client list.
- `src/components/dashboard/` — reusable overview cards, charts, panels, filter
  bar, and badge helpers.
- `src/components/ui/` — shadcn-style `badge`, `select`, and `tabs` (Radix +
  class-variance-authority), alongside the existing button/input/card.

Charts use Recharts. All dashboard data is fetched from
`GET /dashboard/overview`; nothing is hardcoded.

## Consultation Scheduling (Sprint 5)

- `src/app/dashboard/consultations/page.tsx` — week calendar with prev/next/today
  navigation, booking, detail drawer, and reschedule.
- `src/components/scheduling/` — booking dialog (with an available-slots picker),
  reschedule dialog, week calendar, consultation drawer (approve / complete /
  reschedule / cancel), and shared helpers.
- Upcoming consultations also appear as a panel on the main dashboard.

Only lawyers and admins see the "Approve booking" action; the API enforces this
regardless of the UI. All slot availability comes from
`GET /consultations/availability`.

## Email Intelligence (Sprint 6)

- `src/app/dashboard/emails/page.tsx` — inbox with search, urgency filter, and a
  two-pane list/detail layout.
- `src/components/email/email-detail-pane.tsx` — email detail with the AI
  summary, extracted tasks and deadlines, the attached client/case, and a draft
  reply that can be edited and approved (Approve & Send).
- Emails are triaged by the backend agent; the UI never generates content
  itself.

## Court Deadlines (Sprint 7)

- `src/app/dashboard/deadlines/page.tsx` — an Alerts view (overdue / today /
  upcoming buckets with complete toggles) and a month Calendar view with
  navigation.
- `src/components/deadlines/` — bucket view, month calendar, add-deadline dialog,
  and shared helpers.
- `src/components/dashboard/deadline-alert-panel.tsx` — compact overdue/today
  alerts surfaced on the main dashboard.

Deadlines are AI-extracted from documents and emails by the backend, or added
manually. The UI never generates them itself.
