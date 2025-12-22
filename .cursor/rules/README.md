# Cursor Rules & SDLC Playbook

Complete AI-assisted development workflow from ideation to deployment.

---

## Part 1: How Rules Apply

### Always Applied (Core Rules)

These rules are **always active** - no action needed from you:

| Rule                          | Purpose                           |
| ----------------------------- | --------------------------------- |
| `core/global.mdc`             | TypeScript standards, code style  |
| `core/security-checklist.mdc` | Auth, validation, secrets         |
| `core/ai-workflow.mdc`        | AI behavior, prompting patterns   |
| `ui/design-system.mdc`        | Orderly brand, colors, typography |

### Auto-Activated by File Type (Globs)

These rules **automatically activate** when you're editing matching files:

| When editing...        | Rule activates                                                                                       |
| ---------------------- | ---------------------------------------------------------------------------------------------------- |
| `app/**/*.tsx`         | `nextjs-app-router.mdc`, `nextjs.server-client.mdc`, `nextjs-anti-patterns.mdc`, `ui-components.mdc` |
| `app/**/[*]/**`        | `nextjs-dynamic-routes-pattern.mdc`                                                                  |
| `actions/**/*.ts`      | `api-design.mdc`, `nextjs-advanced-routing.mdc`                                                      |
| `app/api/**/*.ts`      | `api-design.mdc`                                                                                     |
| `components/**/*.tsx`  | `ui-components.mdc`, `nextjs.server-client.mdc`                                                      |
| `supabase/**/*.sql`    | `supabase-database.mdc`                                                                              |
| `lib/supabase/**/*.ts` | `supabase-nextjs.mdc`                                                                                |

### Manual Reference (Use `@` When Needed)

Reference these explicitly when you need them:

```
@commit-helper.mdc      → When committing code
@pr-best-practices.mdc  → When creating PRs
@tdd-workflow.mdc       → When writing tests
@code-review.mdc        → When reviewing code
@vercel-ai-sdk.mdc      → When adding AI features
@supabase-rls-policies.mdc → When setting up RLS
@supabase-realtime.mdc  → When adding real-time features
```

---

## Part 2: Complete SDLC Workflow

### Phase 1: Ideation & Planning

**When to use:** Starting a new feature, unclear requirements, multiple approaches possible.

#### Prompt Templates

**Feature Planning:**

```
I want to build [feature description].

Help me plan:
1. What components/files need to be created?
2. What database changes are needed?
3. What's the best approach?

Consider our stack: Next.js App Router, Supabase, shadcn/ui
```

**Architecture Decision:**

```
I'm deciding between [option A] and [option B] for [feature].

Compare the approaches considering:
- Performance implications
- Complexity/maintenance
- Our existing patterns

@folder-structure.mdc @api-design.mdc
```

**Scope Clarification:**

```
For [feature], let's start with MVP scope:
- Must have: [core functionality]
- Nice to have: [extras]
- Out of scope: [defer for later]

What's the minimal implementation?
```

---

### Phase 2: Database & Schema

**When to use:** Creating tables, migrations, RLS policies.

#### Prompt Templates

**Create Migration:**

```
Create a Supabase migration for [table/feature].

Requirements:
- [field requirements]
- [relationships]
- [constraints]

Include RLS policies for [access pattern].

@supabase-database.mdc @supabase-rls-policies.mdc
```

**Generate Types:**

```
Generate TypeScript types for my Supabase tables.

Run: npx supabase gen types typescript --local > types/database.types.ts
```

---

### Phase 3: Server Actions & API

**When to use:** Creating mutations, form handlers, API integrations.

#### Prompt Templates

**Create Server Action:**

```
Create a Server Action for [action name] in actions/[domain].ts

It should:
- [what it does]
- Validate input with Zod
- Check auth with getUser()
- Return { success, data/error } format

@api-design.mdc @security-checklist.mdc
```

**API Route (Webhooks/External):**

```
Create an API route at app/api/[path]/route.ts for [purpose].

Requirements:
- [method: POST/GET]
- [validation needed]
- [response format]

@api-design.mdc
```

---

### Phase 4: UI Components

**When to use:** Building interfaces, forms, layouts.

#### Prompt Templates

**Create Component:**

```
Create a [ComponentName] component at components/[path].tsx

Requirements:
- [functionality]
- [props needed]
- Use shadcn/ui primitives from @/components/ui
- Follow Orderly design system

@ui-components.mdc @design-system.mdc
```

**Create Form:**

```
Create a form component for [purpose].

Requirements:
- Fields: [list fields]
- Submit via Server Action: [action name]
- Use useActionState for pending states
- Show validation errors

@ui-components.mdc @api-design.mdc
```

**Create Page:**

```
Create page at app/[path]/page.tsx

Requirements:
- [data to fetch]
- [UI structure]
- Server Component unless [interactivity needed]

@nextjs-app-router.mdc @nextjs.server-client.mdc
```

---

### Phase 5: Testing

**When to use:** Writing unit tests, E2E tests.

#### Prompt Templates

**Unit Test:**

```
Write unit tests for [component/function] using Vitest.

Test cases:
- [happy path]
- [error case]
- [edge case]

@tdd-workflow.mdc
```

**E2E Test:**

```
Write a Playwright E2E test for [user flow].

Steps:
1. [action]
2. [action]
3. [expected outcome]

Use Page Object pattern.

@tdd-workflow.mdc
```

---

### Phase 6: Code Review & Commit

**When to use:** Before committing, creating PRs.

#### Prompt Templates

**Self-Review:**

```
Review this code for:
- Security issues (auth checks, validation)
- Performance (unnecessary re-renders, N+1)
- Next.js anti-patterns

@code-review.mdc @security-checklist.mdc @nextjs-anti-patterns.mdc
```

**Generate Commit:**

```
Generate a commit message for these changes.

Follow conventional commits format:
<type>(<scope>): <subject>

@commit-helper.mdc
```

**Create PR:**

```
Create a PR for this branch.

Include:
- Summary of changes
- Testing checklist
- Screenshots (if UI)

@pr-best-practices.mdc
```

---

### Phase 7: Deployment

**When to use:** Deploying, debugging production issues.

#### Environment Flow

```
Local Dev (localhost:3000)
    ↓ git push
Preview (*.vercel.app) ← Test here before merge
    ↓ merge to main
Production (yourdomain.com)
```

#### Prompt Templates

**Pre-Deploy Check:**

```
Before deploying, verify:

npm run lint      # No errors
npm run build     # Builds successfully
npm run typecheck # Types correct

Check Preview URL works correctly.
```

**Debug Production Issue:**

```
I'm seeing [error/issue] in production.

Error message: [paste error]
Expected behavior: [what should happen]
Actual behavior: [what's happening]

Help me debug this.
```

---

## Part 3: Quick Reference Prompts

### Daily Workflow

**Starting Work:**

```
git checkout main && git pull
git checkout -b feat/[feature-name]
```

**During Work:**

```
# Ask for help
"How do I [specific task]? Here's the context: [code/file]"

# Request implementation
"Implement [feature] following our patterns in @api-design.mdc"

# Debug issue
"I'm getting [error]. Here's the code: [paste]. What's wrong?"
```

**Ending Work:**

```
# Stage and commit
git add -A
git commit -m "feat(scope): description"

# Push and create PR
git push -u origin HEAD
gh pr create
```

### Effective Prompting Tips

| Instead of...    | Say...                                                                                 |
| ---------------- | -------------------------------------------------------------------------------------- |
| "Fix this"       | "Fix the TypeScript error on line 23"                                                  |
| "Make it better" | "Optimize this useEffect to prevent re-renders"                                        |
| "Add auth"       | "Add auth check using getUser() per @security-checklist.mdc"                           |
| "Create a form"  | "Create a form using shadcn/ui Input, validated with Zod, submitting to Server Action" |

### When to Reference Rules

| Task                | Reference                                           |
| ------------------- | --------------------------------------------------- |
| Auth/security code  | `@security-checklist.mdc`                           |
| Server Action       | `@api-design.mdc`                                   |
| Component decisions | `@nextjs.server-client.mdc`                         |
| Database work       | `@supabase-database.mdc @supabase-rls-policies.mdc` |
| UI components       | `@ui-components.mdc @design-system.mdc`             |
| Writing tests       | `@tdd-workflow.mdc`                                 |
| Git/commits         | `@commit-helper.mdc`                                |
| Creating PRs        | `@pr-best-practices.mdc`                            |
| AI features         | `@vercel-ai-sdk.mdc`                                |

---

## Part 4: Folder Structure

```
├── app/                        # Next.js App Router
│   ├── (auth)/                 # Auth pages (login, sign-up)
│   ├── (marketing)/            # Public pages
│   ├── (dashboard)/            # Authenticated app
│   └── api/                    # API routes (webhooks only)
├── actions/                    # Server Actions
├── components/
│   ├── ui/                     # shadcn/ui primitives
│   ├── forms/                  # Form components
│   ├── layout/                 # Layout components
│   └── [feature]/              # Feature-specific
├── lib/
│   ├── supabase/               # Supabase clients
│   └── utils.ts                # Utilities
├── hooks/                      # Custom hooks
├── types/                      # TypeScript types
├── supabase/
│   └── migrations/             # Database migrations
└── .cursor/rules/              # AI rules (this folder)
```

---

## Part 5: Security Checklist

Before every commit/PR:

- [ ] Server Actions check `getUser()` (not `getSession()`)
- [ ] User input validated with Zod
- [ ] No secrets with `NEXT_PUBLIC_` prefix
- [ ] No hardcoded API keys
- [ ] No `console.log` with sensitive data
- [ ] RLS enabled on Supabase tables
- [ ] Error messages don't expose internals

---

## Part 6: Rule Files Reference

```
.cursor/rules/
├── core/                        # Always applied
│   ├── ai-workflow.mdc          # AI behavior
│   ├── global.mdc               # TypeScript standards
│   └── security-checklist.mdc   # Security rules
├── nextjs/                      # Auto-activated for app/**
│   ├── nextjs-app-router.mdc    # App Router basics
│   ├── nextjs-advanced-routing.mdc  # Server Actions, Route Handlers
│   ├── nextjs.server-client.mdc # Server vs Client Components
│   ├── nextjs-dynamic-routes-pattern.mdc  # Dynamic routes
│   └── nextjs-anti-patterns.mdc # Common mistakes
├── supabase/                    # Database patterns
│   ├── supabase-database.mdc    # Migrations, SQL
│   ├── supabase-nextjs.mdc      # Auth SSR
│   ├── supabase-rls-policies.mdc # Row Level Security
│   ├── supabase-realtime.mdc    # Real-time
│   └── supabase-edge-functions.mdc # Edge functions
├── ui/                          # UI patterns
│   ├── design-system.mdc        # Orderly design system
│   ├── ui-components.mdc        # shadcn/ui, Tailwind
│   └── performance.mdc          # Optimization
├── workflow/                    # Process rules
│   ├── api-design.mdc           # Server Actions
│   ├── code-review.mdc          # Review guidelines
│   ├── commit-helper.mdc        # Git conventions
│   ├── pr-best-practices.mdc    # PR guidelines
│   ├── tdd-workflow.mdc         # Testing
│   ├── folder-structure.mdc     # Project organization
│   └── environments.mdc         # Env vars
```
