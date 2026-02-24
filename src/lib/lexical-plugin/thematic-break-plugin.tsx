import {
  $createHorizontalRuleNode,
  HorizontalRuleNode,
  INSERT_HORIZONTAL_RULE_COMMAND,
} from "@lexical/extension";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { $insertNodeToNearestRoot } from "@lexical/utils";
import {
  $getSelection,
  $isRangeSelection,
  COMMAND_PRIORITY_EDITOR,
} from "lexical";
import { useRef } from "react";

export function useThematicBreak() {
  const [editor] = useLexicalComposerContext();
  return () => {
    editor.dispatchCommand(INSERT_HORIZONTAL_RULE_COMMAND, undefined);
  };
}

// inserts horizontal rule on command
export default function ThematicBreakPlugin(): null {
  const [editor] = useLexicalComposerContext();
  const registeredRef = useRef(false);

  if (!registeredRef.current) {
    if (!editor.hasNodes([HorizontalRuleNode])) {
      throw new Error(
        "ThematicBreakPlugin: HorizontalRuleNode must be registered",
      );
    }

    editor.registerCommand(
      INSERT_HORIZONTAL_RULE_COMMAND,
      () => {
        editor.update(() => {
          const selection = $getSelection();
          if ($isRangeSelection(selection)) {
            $insertNodeToNearestRoot($createHorizontalRuleNode());
          }
        });
        return true;
      },
      COMMAND_PRIORITY_EDITOR,
    );

    registeredRef.current = true;
  }

  return null;
}

export { INSERT_HORIZONTAL_RULE_COMMAND };
