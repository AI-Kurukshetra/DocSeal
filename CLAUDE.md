# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev            # Start development server (localhost:3000)
npm run build          # Production build
npm run start          # Start production server
npm run lint           # Run ESLint
npm run tsc:typecheck  # TypeScript type checking (no emit)
```

No test framework is configured.

## Architecture

DocSeal is a **Next.js 15 (App Router)** document signing platform with **Supabase** (auth, database, storage). Three user roles: `sender`, `recipient`, `admin`.

### Request Flow

1. Every request goes through `proxy.ts` (Next.js middleware entry) → `lib/supabase/middleware.ts`
2. Middleware creates a per-request Supabase client, refreshes session via `getUser()`, and enforces auth
3. Public routes excluded from auth: `/login`, `/register`, `/forgot-password`, `/sign`, `/api/sign`
4. Root `/` redirects to `/dashboard` (authenticated) or `/login` (unauthenticated)
5. Logged-in users hitting `/login` or `/register` are redirected to `/dashboard`

### Feature Organization

Features live in `features/<name>/` with this structure:

```
features/<name>/
├── actions.ts        # "use server" Server Actions (all features)
├── schemas.ts        # Zod validation schemas (auth, documents, signing)
├── types.ts          # Local types (preparation, signing)
├── constants.ts      # Local constants (preparation)
└── components/       # React components
```

Six features: `activity`, `admin`, `auth`, `documents`, `preparation`, `signing`.

Page files in `app/` are thin wrappers that import feature components. All mutations go through Server Actions that validate with Zod, check auth, and call `revalidatePath()`.

### Route Groups

- `app/(auth)/` — auth pages (login, register, forgot-password) with centered layout
- `app/(dashboard)/` — authenticated pages wrapped in `DashboardShell` (sidebar + topbar + mobile nav)
- `app/sign/[token]/` — public signing page (no auth required)
- `app/api/convert/` — doc/docx to PDF conversion (mammoth + pdf-lib)
- `app/api/sign/[token]/route.ts` — GET signing request data (service role client, no user session)
- `app/api/sign/[token]/submit/route.ts` — POST signing submission: embeds fields into PDF with pdf-lib, stores signed PDF, emails both sender and signer via Resend

### Supabase Clients

| File | Context | Notes |
|------|---------|-------|
| `lib/supabase/client.ts` | Browser/Client Components | `createBrowserClient` |
| `lib/supabase/server.ts` | Server Components, Actions, Route Handlers | `createServerClient()` (async, uses cookies); `createServiceClient()` (service role, no cookies); `createClient()` (alias for `createServerClient`) |

### Storage Buckets

- `documents` — uploaded raw files
- `converted` — PDFs converted from doc/docx
- `signatures` — signature images from signing
- `signed` — completed signed PDFs

### Database

Key tables: `profiles` (extends auth.users with role), `documents`, `document_fields` (positioned form fields), `signing_requests` (per-recipient with unique token), `field_values`, `activity_log`, `recipient_signatures` (saved signatures per email for reuse). A DB trigger auto-creates profile rows on user signup.

### Document Signing Workflow

Upload → Prepare (drag-and-drop field placement via react-dnd) → Send (create signing requests with tokens, optionally email via Resend) → Sign (public `/sign/[token]` page, submitted via API) → signed PDF stored in `signed` bucket, emails sent to both sender and signer with signed PDF attached

## Key Patterns

- **Import alias**: Always use `@/` (maps to project root)
- **Forms**: `react-hook-form` + `zodResolver` in Client Components, calling Server Actions in `useTransition()`
- **Toasts**: `sonner` — `<Toaster>` is in root layout
- **Signed URLs**: Documents served via time-limited `createSignedUrl()`, never direct public URLs
- **Role-based access**: Navigation (`NAV_ITEMS[profile.role]` from `lib/constants.ts`), dashboard views, and queries all branch on role
- **UI components**: shadcn/ui (new-york style) in `components/ui/`, configured via `components.json`
- **Shared components**: `components/layout/` (dashboard-shell, sidebar, topbar, mobile-nav), `components/shared/` (empty-state, status-badge)
- **Utilities**: `lib/utils.ts` exports `cn`, `formatDate`, `formatRelativeTime`, `getInitials`

## Environment Variables

Required in `.env.local` (see `.env.example`):
- `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` — Supabase project credentials
- `SUPABASE_SERVICE_ROLE_KEY` — server-only, used by service client
- `NEXT_PUBLIC_APP_URL` — app URL (e.g., `http://localhost:3000`)
- `RESEND_API_KEY` — optional, for sending signing emails

## Configuration Notes

- `next.config.ts`: Turbopack alias `canvas: ""` (needed for react-pdf), allows `*.supabase.co` images under `/storage/v1/object/**`
- `tailwind.config.ts`: content paths include `features/**`; primary color is purple/violet (`#7C3AED`); dark mode via `class` strategy; uses `tailwindcss-animate` plugin
- Types are centralized in `types/index.ts` (`UserRole`, `DocumentStatus`, `DocumentFileType`, `FieldType`, `FieldValidation`, `SigningStatus`, `ActivityAction`, `Profile`, `Document`, `DocumentField`, `SigningRequest`, `FieldValue`, `ActivityLogEntry`)
