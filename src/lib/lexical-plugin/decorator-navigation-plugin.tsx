// Arrow-key navigation across decorator nodes
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import {
  $createNodeSelection,
  $getSelection,
  $isDecoratorNode,
  $isElementNode,
  $isNodeSelection,
  $isRangeSelection,
  $setSelection,
  COMMAND_PRIORITY_HIGH,
  KEY_ARROW_DOWN_COMMAND,
  KEY_ARROW_UP_COMMAND,
  type LexicalNode,
  type RangeSelection,
} from "lexical";
import { useRef } from "react";

const isCollapsedAtStart = (sel: RangeSelection) =>
  sel.isCollapsed() && sel.anchor.offset === 0;

const isCollapsedAtEnd = (sel: RangeSelection) => {
  if (!sel.isCollapsed()) return false;
  const node = sel.anchor.getNode();
  if (sel.anchor.type === "element" && $isElementNode(node)) {
    return sel.anchor.offset === node.getChildrenSize();
  }
  return sel.anchor.offset === node.getTextContentSize();
};

const selectNode = (node: LexicalNode) => {
  const ns = $createNodeSelection();
  ns.add(node.getKey());
  $setSelection(ns);
};

export default function DecoratorNavigationPlugin(): null {
  const [editor] = useLexicalComposerContext();
  const registeredRef = useRef(false);

  if (!registeredRef.current) {
    editor.registerCommand(
      KEY_ARROW_UP_COMMAND,
      (event) => {
        const selection = $getSelection();

        if ($isNodeSelection(selection)) {
          const nodes = selection.getNodes();
          if (nodes.length !== 1) return false;
          const node = nodes[0];
          if (!$isDecoratorNode(node)) return false;

          event?.preventDefault();
          const prev = node.getPreviousSibling();
          if (prev && $isDecoratorNode(prev)) {
            selectNode(prev);
          } else {
            node.selectPrevious();
          }
          return true;
        }

        if (!$isRangeSelection(selection) || !isCollapsedAtStart(selection))
          return false;

        const topLevel = selection.anchor.getNode().getTopLevelElement();
        if (!topLevel) return false;
        const prev = topLevel.getPreviousSibling();
        if (!prev || !$isDecoratorNode(prev)) return false;

        event?.preventDefault();
        selectNode(prev);
        return true;
      },
      COMMAND_PRIORITY_HIGH,
    );

    editor.registerCommand(
      KEY_ARROW_DOWN_COMMAND,
      (event) => {
        const selection = $getSelection();

        if ($isNodeSelection(selection)) {
          const nodes = selection.getNodes();
          if (nodes.length !== 1) return false;
          const node = nodes[0];
          if (!$isDecoratorNode(node)) return false;

          event?.preventDefault();
          const next = node.getNextSibling();
          if (next && $isDecoratorNode(next)) {
            selectNode(next);
          } else {
            node.selectNext();
          }
          return true;
        }

        if (!$isRangeSelection(selection) || !isCollapsedAtEnd(selection))
          return false;

        const topLevel = selection.anchor.getNode().getTopLevelElement();
        if (!topLevel) return false;
        const next = topLevel.getNextSibling();
        if (!next || !$isDecoratorNode(next)) return false;

        event?.preventDefault();
        selectNode(next);
        return true;
      },
      COMMAND_PRIORITY_HIGH,
    );

    registeredRef.current = true;
  }

  return null;
}
