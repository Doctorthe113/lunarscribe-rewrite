# Lunarscribe — Agent Rules

Quick reference for AI agents working on this repo.

## Core & General Rules
- **Concision**: Be extremely concise, sacrifice grammar. No emoji.
- **Comments**: One-liners only (4-5 words max) on functions.
- **Variables**: Include units (e.g., `returnRatePercent` not `returnRate`).
- **Type Safety**: Avoid `any`. Use `type` over `interface`.
- **Package Manager**: `bun`/`bunx` only (not npm/yarn/npx).
- **Linting**: Biomejs (not eslint). Do not bypass errors.
- **Naming**:
  - Components/helpers: kebab-case filenames.

## React Guidelines

Follow the [vercel-react-best-practices](.agent/skills/vercel-react-best-practices/SKILL.md) skill for performance patterns (waterfalls, bundle size, SSR, re-renders, etc.).

Key project-specific rules:
- **ONE component per file**. No exceptions.
- Use `components/ui` first (shadcn). If missing, check [shadcn-ui skill](.agents/skills/shadcn-ui/SKILL.md).
- **Avoid useEffect**. Calculate during render, use event handlers. Only exception: external subscriptions.
- **Data Fetching**: React Query (`useQuery`) client-side. Fetch in component that uses it, not parent.
- **State**: `useState` local UI | Zustand (`lib/`) shared | React Query server | `useReducer` complex.
- **Styling (Tailwind v4)**: CSS as config. Use `size-n` not `h-n w-n`. Use `global.css` colors first.
  ```
  Good: size-5, text-muted-foreground, border
  Bad:  h-5 w-5, text-grey-200, border-slate-500
  ```
- **Verification**: Periodically run [react-doctor](.agents/react-doctor/SKILL.md) to catch issues. Not after every single change, but after finishing a feature or meaningful chunk of work.

## Architecture & API
- **Imports**: Explicit (e.g., `import { useState } from "react"`).
- **Component Imports**:
  - Frontend: `import { Button } from "src/components/ui/button";`

## Utilities & Logic
- **Error Handling**: *STRICTLY* use `tryCatch` from `@lib`. No try/catch blocks.
  ```ts
  import { tryCatch } from "@lib/try-catch";
  const { data, error } = await tryCatch(promise);
  if (error) {
    console.error("Contextual message", error);
    throw new Error({ code: "INTERNAL_SERVER_ERROR", message: "User-facing message", cause: error });
  }
  return data;
  ```

---
applyTo: '**'
