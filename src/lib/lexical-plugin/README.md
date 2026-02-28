# Lexical Plugin Library

This directory contains a collection of custom plugins and utilities that extend the
**Lexical** editor used throughout the app. The goal is to keep reusable editor
logic in one place and make it easy to mount features from `TextEditor`.

## Available Modules

| File | Purpose |
|------|---------|
| `decorator-navigation-plugin.tsx` | Handles arrow‑key navigation between any decorator nodes (math blocks, horizontal rules, etc.).  Moves the cursor correctly when decorators touch. |
| `thematic-break-plugin.tsx` | Simple command for inserting a horizontal rule.  Arrow‑key logic has been removed in favor of the generic decorator navigator. |
| `code-highlight-plugin.tsx` | Registers Lexical’s built‑in syntax highlighting for `<code>` nodes. Mounted during editor setup. |
| `table-actions.ts` | React hook providing helpers for table row/column insertion and deletion.  Used by UI controls to manipulate tables. |
| `custom-transformers.ts` | Exports the list of node constructors and transformers passed to the markdown shortcut
  plugin.  Math nodes are included here so they round‑trip through markdown conversion. |

### Usage
Import whichever plugins/hooks you need in `TextEditor` or other components.  Most are
wire‑and‑forget so they just return `null` once registered.

```tsx
import DecoratorNavigationPlugin from "@/lib/lexical-plugin/decorator-navigation-plugin";
import ThematicBreakPlugin from "@/lib/lexical-plugin/thematic-break-plugin";
import { CodeHighlightPlugin } from "@/lib/lexical-plugin/code-highlight-plugin";
import { useTableActions } from "@/lib/lexical-plugin/table-actions";

// in <TextEditor /> JSX:
<DecoratorNavigationPlugin />
<ThematicBreakPlugin />
<CodeHighlightPlugin />
```

## Math-specific helpers
The `math/` subfolder contains a self‑contained system for rendering
KaTeX equations.  See `math/README.md` for documentation and implementation details.
