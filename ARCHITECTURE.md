# Architecture Overview

This document helps AI tools and developers understand the project structure and patterns.

## Tech Stack

| Layer     | Technology                          |
| --------- | ----------------------------------- |
| Framework | Next.js 15 (App Router)             |
| Backend   | Supabase (Auth, Database, Realtime) |
| Styling   | Tailwind CSS + shadcn/ui            |
| Language  | TypeScript (strict mode)            |
| Hosting   | Vercel                              |

## Directory Structure

```
├── app/                    # Next.js App Router
│   ├── auth/              # Authentication routes
│   │   ├── login/         # Login page
│   │   ├── sign-up/       # Registration page
│   │   ├── forgot-password/
│   │   ├── update-password/
│   │   └── confirm/       # Email confirmation handler
│   ├── protected/         # Authenticated-only routes
│   ├── layout.tsx         # Root layout (providers, fonts)
│   ├── page.tsx           # Homepage
│   └── globals.css        # Global styles + CSS variables
│
├── components/
│   ├── ui/                # Primitive UI components (shadcn/ui)
│   │   ├── button.tsx
│   │   ├── input.tsx
│   │   └── ...
│   ├── tutorial/          # Tutorial-specific components
│   └── *.tsx              # Feature components
│
├── lib/
│   ├── supabase/
│   │   ├── server.ts      # Server-side Supabase client
│   │   ├── client.ts      # Browser Supabase client
│   │   └── proxy.ts       # Proxy utilities
│   └── utils.ts           # Shared utilities (cn, etc.)
│
└── .cursor/
    └── rules/             # AI coding rules (MDC format)
```

## Data Flow

```
┌─────────────────────────────────────────────────────────────┐
│                        Browser                               │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                   Next.js App Router                         │
│  ┌─────────────────┐    ┌─────────────────┐                 │
│  │ Server          │    │ Client          │                 │
│  │ Components      │    │ Components      │                 │
│  │ (data fetching) │    │ (interactivity) │                 │
│  └────────┬────────┘    └────────┬────────┘                 │
│           │                      │                           │
│           ▼                      ▼                           │
│  ┌─────────────────┐    ┌─────────────────┐                 │
│  │ Server Actions  │    │ Client Supabase │                 │
│  │ (mutations)     │    │ (realtime)      │                 │
│  └────────┬────────┘    └────────┬────────┘                 │
└───────────┼──────────────────────┼──────────────────────────┘
            │                      │
            ▼                      ▼
┌─────────────────────────────────────────────────────────────┐
│                     Supabase                                 │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐    │
│  │   Auth   │  │ Database │  │ Realtime │  │ Storage  │    │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘    │
└─────────────────────────────────────────────────────────────┘
```

## Authentication Flow

1. **Sign Up**: `app/auth/sign-up/` → Email confirmation → `app/auth/confirm/`
2. **Login**: `app/auth/login/` → Session created → Redirect to `/protected`
3. **Session Refresh**: Handled by middleware on each request
4. **Protected Routes**: Check auth in Server Components, redirect if unauthenticated

## Key Patterns

### Supabase Client Usage

```typescript
// Server Components / Server Actions - ALWAYS await createClient()
const supabase = await createClient();

// Client Components - use browser client
import { createClient } from '@/lib/supabase/client';
const supabase = createClient();
```

### Component Composition

```
Page (Server Component)
  └── Layout wrapper
       └── Feature Component (may be client)
            └── UI primitives (Button, Input, etc.)
```

### Styling

- All styling via Tailwind utility classes
- Use `cn()` utility for conditional classes
- CSS variables in `globals.css` for theming
- Dark mode via `next-themes` (class-based)

## Environment Variables

| Variable                               | Purpose                     | Client-safe? |
| -------------------------------------- | --------------------------- | ------------ |
| `NEXT_PUBLIC_SUPABASE_URL`             | Supabase project URL        | Yes          |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Supabase anon key           | Yes          |
| `SUPABASE_SERVICE_ROLE_KEY`            | Admin access (never expose) | No           |
