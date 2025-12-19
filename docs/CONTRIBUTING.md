# Contributing Guide

Welcome! This guide will get you set up and coding in minutes.

## Quick Start

```bash
# Clone and enter the repo
git clone <repo-url>
cd with-supabase-app

# Run the automated setup
./scripts/setup.sh
```

The setup script will:

1. Check prerequisites (Node.js 18+, npm, git)
2. Install dependencies
3. Configure environment variables (prompts for Supabase keys)
4. Set up Cursor MCP servers (optional but recommended)
5. Initialize git hooks
6. Verify everything works

---

## What You'll Need

Before running setup, have these ready:

| Item                                | Where to Get It                                                                 |
| ----------------------------------- | ------------------------------------------------------------------------------- |
| **Supabase URL**                    | [Project Settings → API](https://supabase.com/dashboard/project/_/settings/api) |
| **Supabase Anon Key**               | Same page as above                                                              |
| **Supabase Access Token** (for MCP) | [Account → Access Tokens](https://supabase.com/dashboard/account/tokens)        |
| **GitHub Token** (for MCP)          | [Settings → Developer → Tokens](https://github.com/settings/tokens)             |
| **Vercel Token** (for MCP)          | [Account Settings → Tokens](https://vercel.com/account/tokens)                  |

---

## Using Cursor Effectively

### MCP Servers

After setup, Cursor can directly query:

- **Supabase**: Database schema, tables, RLS policies
- **GitHub**: PRs, issues, diffs
- **Vercel**: Deployments, logs, environment

### The @ Commands

Use these to give Cursor explicit context:

| Command         | Example                              |
| --------------- | ------------------------------------ |
| `@file`         | `@file .cursor/rules/api-design.mdc` |
| `@folder`       | `@folder .cursor/rules`              |
| `@cursor-rules` | Pick rules from a menu               |
| `@codebase`     | Search the entire codebase           |
| `@docs`         | Search official docs (Next.js, etc.) |

### Project Rules

Our `.cursor/rules/` folder contains AI guidelines. Key files:

| Rule                     | Use When                                |
| ------------------------ | --------------------------------------- |
| `nextjs.mdc`             | Working with App Router, pages, layouts |
| `supabase.mdc`           | Database queries, auth, realtime        |
| `api-design.mdc`         | Creating Server Actions or APIs         |
| `ui-components.mdc`      | Building UI components                  |
| `security-checklist.mdc` | Auth flows, sensitive data              |

**Pro tip**: Reference rules explicitly in prompts:

```
@file .cursor/rules/api-design.mdc

Create a Server Action to update user profiles.
```

---

## Development Workflow

### Starting a Feature

```bash
# 1. Pull latest and create branch
git checkout main && git pull
git checkout -b feat/my-feature

# 2. Start dev server
npm run dev
```

### The 4-Phase Process

#### Phase 1: Plan

```
Help me plan [feature]. What files need to change?
What's the minimal scope for a first PR?
```

#### Phase 2: Build (in small chunks)

```
# Chunk 1: Database
Create a migration for [table] with RLS policies.

# Chunk 2: Server Action
Create a Server Action for [action] with Zod validation.

# Chunk 3: Component
Create a [Component] using shadcn/ui primitives.
```

After each working chunk:

```bash
git add .
git commit -m "feat(scope): what you did"
```

#### Phase 3: Review

```bash
# Run checks
npm run lint
npm run typecheck
npm run build

# Push for Preview deployment
git push -u origin feat/my-feature
```

Ask Cursor to review:

```
Review this code for security issues and convention violations.
```

#### Phase 4: PR & Merge

- Create PR with description (use template)
- Address review feedback
- Merge when CI passes

---

## Commit Messages

We use [Conventional Commits](https://www.conventionalcommits.org/):

```
feat(auth): add password reset flow
fix(profile): resolve avatar upload bug
chore(deps): update dependencies
docs(readme): add setup instructions
```

Types: `feat`, `fix`, `chore`, `docs`, `refactor`, `style`, `test`

---

## Common Commands

```bash
npm run dev          # Start development server
npm run build        # Production build
npm run lint         # Check for linting errors
npm run lint:fix     # Auto-fix linting errors
npm run typecheck    # Check TypeScript types
npm run format       # Format code with Prettier
```

---

## Troubleshooting

### "Command not found: node"

Install Node.js 18+ from [nodejs.org](https://nodejs.org/)

### "MCP servers not working"

1. Check `~/.cursor/mcp.json` exists and has valid tokens
2. Restart Cursor completely (Cmd/Ctrl+Q, then reopen)

### "Environment variables not working"

1. Check `.env.local` exists in project root
2. Restart the dev server after changes

### "Git hooks not running"

```bash
npm run prepare  # Reinitialize husky
chmod +x .husky/*
```

### Re-run Setup

```bash
./scripts/setup.sh        # Full setup
./scripts/verify-setup.sh # Just verification
```

---

## Key Documentation

- [ARCHITECTURE.md](ARCHITECTURE.md) - Project structure and patterns
- [CONVENTIONS.md](CONVENTIONS.md) - Coding standards
- [AI Workflow Rules](../.cursor/rules/ai-workflow.mdc) - Full AI workflow guide

---

## Questions?

If you're stuck:

1. Ask Cursor: `@codebase How does [X] work in this project?`
2. Check the rules: `@folder .cursor/rules`
3. Read the docs: `@docs Next.js App Router`
