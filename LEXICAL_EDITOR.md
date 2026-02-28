# Lexical Editor Reference

## Installation
```bash
bun add lexical @lexical/react @lexical/markdown @lexical/rich-text
```

## Initial Config
Basic setup with theme and nodes.
```typescript
import { LexicalComposer } from "@lexical/react/LexicalComposer";
import { HeadingNode } from "@lexical/rich-text";

const initialConfig = {
  namespace: "TextEditor",
  theme: THEME,
  onError: (error: Error) => console.error(error),
  nodes: [HeadingNode],
};
```

## Setting Initial Text Content
Use `editorState` in config to prepopulate the editor.

### Plain text
```typescript
import { $createParagraphNode, $createTextNode, $getRoot } from "lexical";

const initialConfig = {
  namespace: "TextEditor",
  theme: THEME,
  onError,
  nodes: [HeadingNode],
  editorState: (editor: LexicalEditor) => {
    const root = $getRoot();
    const paragraph = $createParagraphNode();
    paragraph.append($createTextNode("Initial text here"));
    root.append(paragraph);
  },
};
```

### From markdown string
```typescript
import { $convertFromMarkdownString } from "@lexical/markdown";

const initialConfig = {
  editorState: () =>
    $convertFromMarkdownString(markdownString, TRANSFORMERS, undefined, true),
  // ...rest
};
```

## Getting Editor Content

### Raw text (no markdown)
Use `$getRoot().getTextContent()` to get plain text.
```typescript
import { $getRoot } from "lexical";
import { EditorRefPlugin } from "@lexical/react/LexicalEditorRefPlugin";

const editorRef = useRef<LexicalEditor | null>(null);

// inside JSX
<EditorRefPlugin editorRef={editorRef} />

// in save handler
const handleSave = () => {
  if (!editorRef.current) return;
  editorRef.current.read(() => {
    const rawText = $getRoot().getTextContent();
    // rawText is plain string, no markdown formatting
  });
};
```

### As markdown string
```typescript
import { $convertToMarkdownString } from "@lexical/markdown";

editorRef.current.read(() => {
  const markdown = $convertToMarkdownString(TRANSFORMERS, undefined, true);
});
```

## OnChangePlugin
Fires on every editor state change. Use `ignoreSelectionChange` to skip cursor-only changes.
```typescript
import { OnChangePlugin } from "@lexical/react/LexicalOnChangePlugin";

<OnChangePlugin onChange={handleSave} ignoreSelectionChange={true} />
```

## Useful Plugins
| Plugin | Purpose |
| :--- | :--- |
| `RichTextPlugin` | Rich text editing with formatting |
| `PlainTextPlugin` | Plain text only (source mode) |
| `HistoryPlugin` | Undo/redo support |
| `MarkdownShortcutPlugin` | Markdown shortcuts while typing |
| `AutoFocusPlugin` | Auto-focus editor on mount |
| `TabIndentationPlugin` | Tab key indentation |
| `EditorRefPlugin` | Exposes editor instance via ref |
| `OnChangePlugin` | Callback on editor state change |
| `CheckListPlugin` | Checkbox lists |
| `ListPlugin` | Ordered/unordered lists |
| `TablePlugin` | Table support |

## Theme
Tailwind classes applied to editor nodes.
```typescript
const THEME = {
  heading: {
    h1: "text-3xl font-bold mt-4 mb-2",
    h2: "text-2xl font-bold mt-3 mb-1",
    h3: "text-xl font-bold mt-2 mb-1",
  },
  text: {
    bold: "font-bold",
    italic: "italic",
    strikethrough: "line-through",
    underline: "underline",
  },
};
```
