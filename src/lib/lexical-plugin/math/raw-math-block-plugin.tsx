import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import {
  $createTextNode,
  $getNodeByKey,
  $getRoot,
  $isElementNode,
  $isParagraphNode,
  $isTextNode,
  $setSelection,
  type LexicalNode,
} from "lexical";
import { useEffect, useRef } from "react";
import { $createMathBlockNode } from "./math-block-node";
import { $createMathInlineNode, $isMathInlineNode } from "./math-inline-node";

type Replacement = {
  startNodeKey: string;
  endNodeKey: string;
  equation: string;
};

type InlineSegment =
  | { type: "text"; value: string }
  | { type: "math"; value: string };

type InlineReplacement = {
  paragraphKey: string;
  segments: InlineSegment[];
};

const BLOCK_MARKER_RE = /^\$\$\s*$/;
const SINGLE_LINE_BLOCK_RE = /^\$\$\s*([\s\S]*?)\s*\$\$\s*$/;
const INLINE_MATH_RE = /\$([^$\n]+?)\$/g;

function getMathReplacements(): Replacement[] {
  const replacements: Replacement[] = [];
  const children = $getRoot().getChildren();

  for (let index = 0; index < children.length; index++) {
    const node = children[index];
    if (!$isParagraphNode(node)) continue;

    const text = node.getTextContent();
    const singleMatch = text.match(SINGLE_LINE_BLOCK_RE);
    if (singleMatch?.[1] !== undefined) {
      replacements.push({
        startNodeKey: node.getKey(),
        endNodeKey: node.getKey(),
        equation: singleMatch[1],
      });
      continue;
    }

    if (!BLOCK_MARKER_RE.test(text.trim())) continue;

    for (let endIndex = index + 1; endIndex < children.length; endIndex++) {
      const endNode = children[endIndex];
      if (!$isParagraphNode(endNode)) continue;
      if (!BLOCK_MARKER_RE.test(endNode.getTextContent().trim())) continue;

      const equationLines: string[] = [];
      for (let lineIndex = index + 1; lineIndex < endIndex; lineIndex++) {
        equationLines.push(children[lineIndex].getTextContent());
      }

      replacements.push({
        startNodeKey: node.getKey(),
        endNodeKey: endNode.getKey(),
        equation: equationLines.join("\n"),
      });
      index = endIndex;
      break;
    }
  }

  return replacements;
}

function getInlineMathReplacements(): InlineReplacement[] {
  const replacements: InlineReplacement[] = [];
  const children = $getRoot().getChildren();

  for (const node of children) {
    if (!$isParagraphNode(node)) continue;

    let hasInlineMathNode = false;
    for (const child of node.getChildren()) {
      if ($isMathInlineNode(child)) {
        hasInlineMathNode = true;
        break;
      }
      if (!$isTextNode(child)) {
        hasInlineMathNode = true;
        break;
      }
    }
    if (hasInlineMathNode) continue;

    const text = node.getTextContent();
    if (!text || text.includes("$$")) continue;

    const matches = Array.from(text.matchAll(INLINE_MATH_RE));
    if (matches.length === 0) continue;

    const segments: InlineSegment[] = [];
    let cursorIndex = 0;

    for (const match of matches) {
      const fullMatch = match[0];
      const equation = match[1];
      const matchIndex = match.index ?? -1;

      if (matchIndex < 0 || !equation) continue;

      if (cursorIndex < matchIndex) {
        segments.push({
          type: "text",
          value: text.slice(cursorIndex, matchIndex),
        });
      }

      segments.push({
        type: "math",
        value: equation,
      });
      cursorIndex = matchIndex + fullMatch.length;
    }

    if (cursorIndex < text.length) {
      segments.push({
        type: "text",
        value: text.slice(cursorIndex),
      });
    }

    if (!segments.some((segment) => segment.type === "math")) continue;

    replacements.push({
      paragraphKey: node.getKey(),
      segments,
    });
  }

  return replacements;
}

// converts raw latex blocks
export default function RawMathBlockPlugin() {
  const [editor] = useLexicalComposerContext();
  const isApplyingRef = useRef(false);

  useEffect(() => {
    return editor.registerUpdateListener(({ editorState, tags }) => {
      if (isApplyingRef.current) return;
      if (tags.has("math-toggle")) return;
      if (tags.has("math-auto-convert")) return;

      const { blockReplacements, inlineReplacements } = editorState.read(() => {
        const fullText = $getRoot().getTextContent();
        if (!fullText.includes("$")) {
          return { blockReplacements: [], inlineReplacements: [] };
        }

        return {
          blockReplacements: getMathReplacements(),
          inlineReplacements: getInlineMathReplacements(),
        };
      });

      if (blockReplacements.length === 0 && inlineReplacements.length === 0) {
        return;
      }

      isApplyingRef.current = true;
      try {
        editor.update(
          () => {
            $setSelection(null);

            for (const replacement of blockReplacements) {
              const startNode = $getNodeByKey(replacement.startNodeKey);
              const endNode = $getNodeByKey(replacement.endNodeKey);
              if (!startNode || !endNode) continue;

              if (startNode === endNode) {
                startNode.replace($createMathBlockNode(replacement.equation));
                continue;
              }

              const nodesToRemove: LexicalNode[] = [];
              let cursor: LexicalNode | null = startNode;

              while (cursor) {
                nodesToRemove.push(cursor);
                if (cursor === endNode) break;
                cursor = cursor.getNextSibling();
              }

              startNode.replace($createMathBlockNode(replacement.equation));
              for (
                let removeIndex = 1;
                removeIndex < nodesToRemove.length;
                removeIndex++
              ) {
                nodesToRemove[removeIndex].remove();
              }
            }

            for (const replacement of inlineReplacements) {
              const paragraphNode = $getNodeByKey(replacement.paragraphKey);
              if (!paragraphNode || !$isElementNode(paragraphNode)) continue;

              const children = paragraphNode.getChildren();
              for (const child of children) {
                child.remove();
              }

              for (const segment of replacement.segments) {
                if (segment.type === "math") {
                  paragraphNode.append($createMathInlineNode(segment.value));
                  continue;
                }

                if (segment.value.length > 0) {
                  paragraphNode.append($createTextNode(segment.value));
                }
              }
            }
          },
          { tag: "math-auto-convert" },
        );
      } finally {
        isApplyingRef.current = false;
      }
    });
  }, [editor]);

  return null;
}
