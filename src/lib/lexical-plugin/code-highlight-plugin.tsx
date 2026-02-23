import { registerCodeHighlighting } from "@lexical/code";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import type { JSX } from "react";
import { useRef } from "react";

// registers code syntax highlighting
export function CodeHighlightPlugin(): JSX.Element | null {
  const [editor] = useLexicalComposerContext();
  const cleanupRef = useRef<(() => void) | null>(null);

  if (!cleanupRef.current) {
    cleanupRef.current = registerCodeHighlighting(editor);
  }

  return null;
}
