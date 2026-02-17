# DocSeal — Document Signing Platform

A full-featured document e-signing platform built with **Next.js 15 (App Router)** and **Supabase**. Upload PDFs, drag-and-drop signature fields, send signing requests via email, and receive signed PDFs — end to end.

**Live Demo:** [doc-seal.vercel.app](https://doc-seal.vercel.app)

---

## Features

- **Role-based access** — three roles: `sender`, `recipient`, `admin`
- **Upload & convert** — PDF upload (up to 10 MB); doc/docx conversion to PDF via Mammoth + pdf-lib
- **Visual field placement** — drag-and-drop signature, text, date, checkbox, initials, and dropdown fields onto PDF pages (react-dnd)
- **Tokenized signing links** — unique secure tokens per recipient; no login required to sign
- **Signature pad** — freehand signature drawing (react-signature-canvas) with reuse across sessions
- **PDF embedding** — submitted field values embedded into the PDF with pdf-lib; signed PDF stored in Supabase Storage
- **Email notifications** — signing invitations and signed-PDF delivery via Resend
- **Activity timeline** — full audit log of every document event
- **Admin panel** — user management and platform-wide document/activity visibility
- **Row Level Security** — all tables protected by Supabase RLS policies
- **Dark mode ready** — Tailwind CSS `class` strategy + next-themes

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 15 (App Router, React 19) |
| Auth & Database | Supabase (PostgreSQL + GoTrue) |
| Storage | Supabase Storage (4 private buckets) |
| Styling | Tailwind CSS 3 + shadcn/ui (new-york) |
| Forms | react-hook-form + zod |
| PDF rendering | react-pdf |
| PDF manipulation | pdf-lib |
| Doc conversion | mammoth |
| Drag-and-drop | react-dnd |
| Signature pad | react-signature-canvas |
| Email | Resend |
| Toasts | sonner |
| Icons | lucide-react |
| Type safety | TypeScript 5 |

---

## Architecture

### Request Flow

```
Browser Request
      │
      ▼
middleware.ts (proxy.ts entry)
      │
      ▼
lib/supabase/middleware.ts
  ├── Creates per-request Supabase client
  ├── Refreshes session via getUser()
  └── Enforces auth (redirects unauthenticated users)
      │
      ├── Public routes (no auth): /login  /register  /forgot-password  /sign/*  /api/sign/*
      │
      └── Protected routes → App Router handlers
```

### Route Groups

```
app/
├── (auth)/                      # Centered auth layout
│   ├── login/
│   ├── register/
│   ├── forgot-password/
│   └── reset-password/
│
├── (dashboard)/                 # DashboardShell (sidebar + topbar + mobile nav)
│   └── dashboard/
│       ├── page.tsx             # Role-aware home dashboard
│       ├── documents/
│       │   ├── page.tsx         # Document list
│       │   ├── [id]/page.tsx    # Document detail
│       │   ├── [id]/prepare/    # Field placement editor
│       │   └── [id]/request/    # Send signing request
│       ├── upload/              # Upload wizard (sender)
│       ├── signing/             # Pending signing requests (recipient)
│       ├── activity/            # Activity timeline (admin)
│       └── users/               # User management (admin)
│
├── sign/[token]/                # Public signing page (no auth)
│
└── api/
    ├── convert/                 # doc/docx → PDF
    └── sign/[token]/
        ├── route.ts             # GET signing request data
        └── submit/route.ts      # POST submit signed fields
```

### Feature Modules

All business logic lives in `features/<name>/`:

```
features/
├── activity/
│   ├── actions.ts
│   └── components/activity-timeline.tsx
├── admin/
│   ├── actions.ts
│   └── components/ (admin-dashboard, user-table)
├── auth/
│   ├── actions.ts
│   ├── schemas.ts
│   └── components/ (login-form, register-form, forgot-password-form, reset-password-form)
├── documents/
│   ├── actions.ts
│   ├── schemas.ts
│   └── components/ (document-list, document-detail, sender-dashboard, upload-dropzone, upload-wizard)
├── preparation/
│   ├── actions.ts
│   ├── constants.ts
│   ├── types.ts
│   └── components/ (prepare-editor, pdf-canvas, field-overlay, field-toolbar, properties-panel)
└── signing/
    ├── actions.ts
    ├── schemas.ts
    ├── types.ts
    └── components/ (signing-page, signing-token-page, signing-pdf-viewer, field-renderer,
                     signature-pad, request-form, recipient-dashboard,
                     signing-success, signing-error)
```

---

## Document Signing Workflow

```
[Sender] Upload PDF
      │
      ▼
[Sender] Prepare — drag-and-drop fields onto PDF pages
      │  (signature, text, date, checkbox, initials, dropdown)
      ▼
[Sender] Send — create signing_request with unique token
      │          optionally email recipient via Resend
      ▼
[Recipient] Clicks link → /sign/<token>  (no login required)
      │  Views PDF, fills all fields, draws signature
      ▼
POST /api/sign/<token>/submit
      │  ┌─ Validates fields
      │  ├─ Embeds values into PDF with pdf-lib
      │  ├─ Stores signed PDF in `signed` bucket
      │  ├─ Saves field_values rows
      │  └─ Emails signed PDF to sender + signer (Resend)
      ▼
Document status → "signed" / "completed"
Activity log updated throughout every step
```

---

## Database Schema

```
auth.users (Supabase managed)
      │
      │ trigger: handle_new_user
      ▼
profiles
  id, email, full_name, role (sender|recipient|admin), avatar_url

documents
  id, title, file_url, file_type, converted_pdf_url,
  status (draft|pending|signed|completed), sender_id → profiles

document_fields
  id, document_id → documents,
  type (signature|text|date|checkbox|initials|dropdown),
  label, placeholder, required, validation,
  font_size, page_number, position_x, position_y, width, height, options[]

signing_requests
  id, document_id → documents,
  recipient_email, recipient_id → profiles,
  token (unique), status (pending|viewed|signed|cancelled|declined),
  signature_url, signed_file_url, signed_at, message

field_values
  id, signing_request_id → signing_requests,
  document_field_id → document_fields, value

activity_log
  id, document_id → documents,
  user_id → profiles, action, metadata (jsonb)

recipient_signatures
  (saved signatures per email for reuse across sessions)
```

### Storage Buckets

| Bucket | Contents |
|---|---|
| `documents` | Uploaded raw files |
| `converted` | PDFs converted from doc/docx |
| `signatures` | Signature images from signing |
| `signed` | Completed signed PDFs |

All buckets are **private** — served via time-limited `createSignedUrl()`, never direct public URLs.

---

## Supabase Clients

| File | Context | Client |
|---|---|---|
| `lib/supabase/client.ts` | Browser / Client Components | `createBrowserClient` |
| `lib/supabase/server.ts` | Server Components, Actions, Route Handlers | `createServerClient()` (cookie-based session) |
| `lib/supabase/server.ts` | API routes that bypass RLS | `createServiceClient()` (service role) |

---

## Role-Based Navigation

| Role | Pages |
|---|---|
| `sender` | Dashboard, My Documents, New Signing Request |
| `recipient` | Dashboard, Signing (pending requests) |
| `admin` | Dashboard, All Documents, Users, Activity Log |

---

## Project Structure

```
with-supabase-app/
├── app/                    # Next.js App Router pages & API routes
├── components/
│   ├── layout/             # dashboard-shell, sidebar, topbar, mobile-nav
│   ├── shared/             # empty-state, status-badge
│   └── ui/                 # shadcn/ui primitives
├── features/               # Feature modules (see above)
├── lib/
│   ├── constants.ts        # NAV_ITEMS, STATUS_COLORS, ACTIVITY_LABELS, file limits
│   ├── rate-limit.ts       # Simple in-memory rate limiter
│   ├── utils.ts            # cn, formatDate, formatRelativeTime, getInitials
│   └── supabase/           # client, server, middleware helpers
├── supabase/
│   └── migrations/         # SQL migration files
├── types/
│   ├── index.ts            # All shared TypeScript types
│   └── database.types.ts   # Supabase generated types
├── middleware.ts            # Next.js middleware entry (proxy.ts)
├── next.config.ts
├── tailwind.config.ts
└── components.json         # shadcn/ui config
```

---

## Local Development

### Prerequisites

- Node.js 18+
- A [Supabase project](https://database.new) (or local Supabase via `supabase start`)
- (Optional) A [Resend](https://resend.com) account for email

### Setup

1. Clone the repository and install dependencies:

   ```bash
   git clone <repo-url>
   cd with-supabase-app
   npm install
   ```

2. Copy the environment example and fill in your values:

   ```bash
   cp .env.example .env.local
   ```

   ```env
   NEXT_PUBLIC_SUPABASE_URL=<your-supabase-url>
   NEXT_PUBLIC_SUPABASE_ANON_KEY=<your-supabase-anon-key>
   SUPABASE_SERVICE_ROLE_KEY=<your-service-role-key>
   NEXT_PUBLIC_APP_URL=http://localhost:3000
   RESEND_API_KEY=<your-resend-api-key>   # optional
   ```

3. Apply database migrations to your Supabase project:

   ```bash
   supabase db push
   # or via the Supabase dashboard SQL editor
   ```

4. Start the development server:

   ```bash
   npm run dev
   ```

   The app runs at [localhost:3000](http://localhost:3000).

### Available Commands

```bash
npm run dev            # Start development server (Turbopack)
npm run build          # Production build
npm run start          # Start production server
npm run lint           # Run ESLint
npm run tsc:typecheck  # TypeScript type checking (no emit)
```

---

## Key Patterns

- **Import alias** — always `@/` (maps to project root)
- **Forms** — `react-hook-form` + `zodResolver` in Client Components, calling Server Actions via `useTransition()`
- **Server Actions** — validate with Zod, check auth, mutate DB, call `revalidatePath()`
- **Toasts** — `sonner`; `<Toaster>` is in root layout
- **Rate limiting** — `lib/rate-limit.ts` guards API submission endpoints
- **UI components** — shadcn/ui (new-york style) in `components/ui/`

---

## Future Scope

### Near-term

- [ ] **Multi-recipient signing** — sequential or parallel signing order per document
- [ ] **Signing templates** — save field layouts as reusable templates
- [ ] **Document expiry** — auto-expire signing requests after N days
- [ ] **Decline / re-request flow** — recipients can decline with a reason; senders can re-send
- [ ] **Bulk send** — send one document to many recipients at once

### Mid-term

- [ ] **Audit certificate** — downloadable PDF audit trail with timestamps and IP addresses
- [ ] **In-app notifications** — real-time bell notifications via Supabase Realtime
- [ ] **Signer authentication** — optional OTP or SSO verification before signing
- [ ] **Webhook support** — POST to external URLs on document signed / completed events
- [ ] **Folder / workspace organization** — group documents into projects or folders
- [ ] **Custom branding** — logo and color overrides per organization

### Long-term

- [ ] **Team / organization accounts** — multi-user sender teams with shared document access
- [ ] **API access** — REST/GraphQL API with API keys for programmatic document creation
- [ ] **Integrations** — Google Drive, Dropbox, Slack, Zapier connectors
- [ ] **Annotation tools** — comments and markup on documents before sending
- [ ] **Mobile app** — React Native or PWA for on-the-go signing
- [ ] **Advanced compliance** — eIDAS / ESIGN Act qualified signatures, long-term validation (LTV)
- [ ] **AI field detection** — auto-detect signature and form fields from uploaded documents

---

## Feedback & Issues

Please file bugs and feature requests on the project issue tracker.
