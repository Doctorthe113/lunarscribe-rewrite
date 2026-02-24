# Math Plugin Suite

This folder implements a lightweight math subsystem for the editor.  It converts
raw LaTeX surrounded by `$...$` (inline) or `$$...$$` (block) into
**DecoratorNodes** that render via KaTeX.  The approach avoids escaping issues
with markdown export and keeps the math content editable when rendering is
disabled.

## Modules

- `math-block-node.tsx` – block‑level `MathBlockNode` decorator.  Stores the
  equation string and returns `$$\n…\n$$` for exports.  Decorates itself using
  `MathBlockRenderer`.
- `math-inline-node.tsx` – inline `MathInlineNode` with the same rendering
  component; wraps its contents in a `<span>` for proper behaviour.
- `math-block-renderer.tsx` – React component that calls `katex.render`
  and supports
  * `inline` prop (display mode on/off)
  * forwarding `contextmenu` events to the editor so custom menus work
  * toggling off math rendering via the context provider
- `raw-math-block-plugin.tsx` – Lexical plugin that watches text nodes and
  replaces matched delimiters with the corresponding decorator nodes.  It also
  handles multiline block variants.
- `math-render-context.tsx` – React context storing a boolean toggle.  The
  context menu item flips this flag and (when disabling) converts all existing
  math nodes back to raw text.

## How it Works
1. **Typing** – User enters `$a+b$` or `$$a^2$$` in the editor.  The update
   listener in `raw-math-block-plugin` detects the pattern and replaces it.
2. **Rendering** – The node’s `decorate` method lazy‑loads
   `MathBlockRenderer`, which calls KaTeX.  If rendering is disabled via context,
   the raw text is shown in plain `<div>` or `<span>` so it can be edited.
3. **Export/Import** – `getTextContent()` on each node returns the original
   delimiters, so markdown conversion produces the correct LaTeX.  Import back
   through the plugin logic when the text is re‑inserted.
4. **Toggle** – The context menu offers “Show math” / “Hide math.”  When hiding,
   the provider iterates over all math nodes and replaces them with
   `$createParagraphNode().append($createTextNode(raw))` (block) or a text node
   (inline).  New raw syntax will be converted again if “Show math” is flipped
   back on.

## Adding Support
The plugin is already wired into `TextEditor` and enabled by default.  To
disable at startup you can wrap `TextEditor` in `<MathRenderProvider>` and
call `toggleMathRender(false)` from a parent component.

## Extending
To support new delimiters or custom rendering, adjust
`raw-math-block-plugin.tsx`’s regexes and provide additional properties to the
nodes.  The renderer can also be replaced or extended with an editor command
if more control is needed.
