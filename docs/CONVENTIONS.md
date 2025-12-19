# Coding Conventions

Quick reference for consistent code across the team and AI tools.

## Naming Conventions

| Type               | Convention      | Example                               |
| ------------------ | --------------- | ------------------------------------- |
| Components         | PascalCase      | `UserProfile`, `AuthButton`           |
| Files (components) | kebab-case      | `user-profile.tsx`, `auth-button.tsx` |
| Files (utils/lib)  | kebab-case      | `format-date.ts`, `use-auth.ts`       |
| Functions          | camelCase       | `getUserById`, `formatCurrency`       |
| Constants          | SCREAMING_SNAKE | `MAX_RETRIES`, `API_BASE_URL`         |
| Types/Interfaces   | PascalCase      | `UserProfile`, `AuthState`            |
| CSS variables      | kebab-case      | `--primary`, `--background`           |

## File Organization

### Components

```typescript
// 1. Imports (external → internal → relative)
import * as React from 'react';
import { cn } from '@/lib/utils';
import { Button } from './button';

// 2. Types/Interfaces
interface ComponentProps {
  // ...
}

// 3. Component definition
export function Component({ prop }: ComponentProps) {
  // ...
}
```

### Server Actions

```typescript
// actions.ts
'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

export async function createPost(formData: FormData) {
  const supabase = await createClient();

  // Validate input
  const title = formData.get('title') as string;
  if (!title) {
    return { success: false, error: 'Title is required' };
  }

  // Perform action
  const { error } = await supabase.from('posts').insert({ title });

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath('/posts');
  return { success: true };
}
```

## TypeScript Rules

```typescript
// ✅ Do: Explicit types for function parameters and returns
function calculateTotal(items: CartItem[]): number {
  return items.reduce((sum, item) => sum + item.price, 0);
}

// ✅ Do: Use const assertions for literal types
const STATUSES = ['pending', 'active', 'completed'] as const;
type Status = (typeof STATUSES)[number];

// ❌ Don't: Use `any`
function process(data: any) {} // Bad

// ✅ Do: Use `unknown` and narrow
function process(data: unknown) {
  if (typeof data === 'string') {
    // data is string here
  }
}
```

## React Patterns

### Prefer Server Components

```typescript
// ✅ Default: Server Component (no directive needed)
export default async function Page() {
  const data = await fetchData();
  return <div>{data}</div>;
}

// ✅ Only when needed: Client Component
'use client';
export function InteractiveWidget() {
  const [state, setState] = useState();
  // ...
}
```

### Props Pattern

```typescript
// ✅ Extend HTML attributes for flexibility
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary';
  isLoading?: boolean;
}
```

## Tailwind Patterns

```typescript
// ✅ Always use cn() for merging classes
<div className={cn(
  'base-styles',
  isActive && 'active-styles',
  className
)} />

// ✅ Group related utilities
<div className={cn(
  // Layout
  'flex items-center justify-between',
  // Spacing
  'px-4 py-2 gap-3',
  // Visual
  'bg-background border rounded-lg',
  // Interactive
  'hover:bg-accent transition-colors'
)} />
```

## Error Handling

```typescript
// ✅ Handle errors at boundaries
const { data, error } = await supabase.from('posts').select();

if (error) {
  // Log for debugging
  console.error('Failed to fetch posts:', error);
  // Return user-friendly error
  throw new Error('Unable to load posts. Please try again.');
}

// ✅ Use try-catch for async operations in actions
export async function submitForm(formData: FormData) {
  try {
    // ... operation
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
```

## Git Commit Messages

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```
feat: add user profile page
fix: resolve login redirect loop
chore: update dependencies
docs: add API documentation
refactor: extract auth logic to hook
style: format code with prettier
test: add unit tests for utils
```

## PR Checklist

Before requesting review:

- [ ] Code follows conventions in this document
- [ ] No TypeScript errors (`npm run build`)
- [ ] No ESLint warnings (`npm run lint`)
- [ ] Tested locally (auth flows, data mutations)
- [ ] UI works in both light and dark modes
- [ ] No console.log statements
- [ ] Commit messages follow convention
