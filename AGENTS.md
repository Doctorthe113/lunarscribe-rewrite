# Lunarscribe — Agent Rules

Quick reference for AI agents working on this repo.

## Core & General Rules
- **Concision**: Be extremely concise and sacrifice grammar for the sake of concision. Do not use emoji.
- **Code Style**:
  1. Minimize verbosity.
  2. **Comments**: One-liners only (4-5 words max) on top of functions.
  3. **Variables**: Include units (e.g., `returnRatePercent` not `returnRate`).
  4. **Readability**: Make code readable and understandable.
- **Package Manager**: Use `bun`/`bunx` as first priority (not npm/yarn/npx).
- **Linting**: Using biomejs (not eslint). Do not try to bypass errors.
- **Platform Targeting**:
  - Ask if unclear whether native or web.
  - Keep platform-specific code in respective folders.
- **File Organization**:
  - Routes should be kebab-case (e.g., `/mutual-fund`).
  - Route-specific components → place in route folder (e.g., `signin-form.tsx` in `src/app/signin`).
  - Reusable components across multiple routes → place in `components` directory.

## React Guidelines
- **Avoid useEffect**:
  1. Do NOT use useEffect. Calculate during render instead.
  2. Use event handlers, not useEffect + state patterns.
  3. Only exception: external subscriptions (rare).
- **Data Fetching**:
  1. Prefer client-side fetching with React Query (`useQuery`).
  2. Fetch data in the component that uses it, not parent.
  3. If data needed by siblings → may fetch data on the parent or use zustand store or React Query cache.
  4. Never fetch in parent just to pass down to a single child.
- **Component Design**:
  1. **ONE component per file**. No exceptions.
  2. Use `components/ui` first (eg. `<Button/>`, `<Input/>`) for buttons, slider, input, dropdown etc. If missing, check shadcn first.
  3. Move constants/helpers outside component body.
  4. Use composition (children) over prop drilling.
- **Performance**:
  1. Only optimize after identifying real issues.
  2. `useMemo`: expensive calculations only.
  3. `useCallback`: prevent child re-renders.
  4. `React.memo`: components re-rendering with same props.
  5. Move heavy work to Web Workers.
- **State Management**:
  1. `useState`: local UI state only.
  2. Zustand store (`lib` folder): shared/global state.
  3. React Query: server state/caching.
  4. `useReducer`: complex interdependent state.
- **Code Splitting**:
  1. `React.lazy()` + Suspense for routes.
  2. Lazy load heavy dependencies.
  3. Hook order: useState → useRef → other hooks → (rarely) useEffect last.
- **Styling (Tailwind)**:
  - We use Tailwind v4 (CSS as config).
  - Use `size-n` instead of `h-n w-n`.
  - Use colors defined in `global.css` first.
  - *Example*:
    ```ts
    // Good: size-5
    // Bad:  h-5 w-5
    // Good: text-muted-foreground border
    // Bad: text-grey-200 border-slate-500
    ```

## Architecture & API
- **Imports**: Explicit imports (e.g., `import { useState } from React`, not `import * from React`).

## Utilities & Logic
- **Error Handling**: *STRICTLY USE* `tryCatch` wrapper from `@/lib/try-catch.ts` (DO NOT use try/catch blocks).
  - *Bad*:
    ```ts
    try {
      const data = await promise;
      return data;
    } catch (err) {
      throw new Error("Failed");
    }
    ```
  - *Good*:
    ```ts
    import { tryCatch } from "@/lib/try-catch";

    const { data, error } = await tryCatch(promise);

    if (error) {
      console.error("Contextual message", error);
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "User-facing message",
        cause: error
      });
    }

    return data;
    ```

---
applyTo: '**'
