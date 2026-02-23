import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import {
  $deleteTableColumnAtSelection,
  $deleteTableRowAtSelection,
  $insertTableColumnAtSelection,
  $insertTableRowAtSelection,
} from "@lexical/table";

export function useTableActions() {
  const [editor] = useLexicalComposerContext();

  return {
    insertRowAbove: () => {
      editor.update(() => {
        $insertTableRowAtSelection(true);
      });
    },
    insertRowBelow: () => {
      editor.update(() => {
        $insertTableRowAtSelection(false);
      });
    },
    insertColumnLeft: () => {
      editor.update(() => {
        $insertTableColumnAtSelection(true);
      });
    },
    insertColumnRight: () => {
      editor.update(() => {
        $insertTableColumnAtSelection(false);
      });
    },
    deleteRow: () => {
      editor.update(() => {
        $deleteTableRowAtSelection();
      });
    },
    deleteColumn: () => {
      editor.update(() => {
        $deleteTableColumnAtSelection();
      });
    },
  };
}
