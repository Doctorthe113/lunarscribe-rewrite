"use client";

import {
  INSERT_CHECK_LIST_COMMAND,
  INSERT_ORDERED_LIST_COMMAND,
} from "@lexical/list";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { $createHeadingNode, $createQuoteNode } from "@lexical/rich-text";
import { $setBlocksType } from "@lexical/selection";
import { INSERT_TABLE_COMMAND } from "@lexical/table";
import {
  $getSelection,
  $isRangeSelection,
  FORMAT_TEXT_COMMAND,
  type TextFormatType,
} from "lexical";
import {
  Bold,
  Code,
  Heading1,
  Heading2,
  Heading3,
  Italic,
  ListOrdered,
  ListTodo,
  Plus,
  Quote,
  Strikethrough,
  Subscript,
  Superscript,
  Table,
  TableRowsSplit,
  Trash2,
  Underline,
} from "lucide-react";
import type { ReactNode } from "react";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuGroup,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuShortcut,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { useTableActions } from "@/lib/lexical-plugin/table-actions";
import { useThematicBreak } from "@/lib/lexical-plugin/thematic-break-plugin";

interface EditorContextMenuProps {
  children: ReactNode;
}

export function EditorContextMenu({ children }: EditorContextMenuProps) {
  const [editor] = useLexicalComposerContext();
  const insertThematicBreak = useThematicBreak();
  const tableActions = useTableActions();

  const formatText = (format: TextFormatType) => {
    editor.dispatchCommand(FORMAT_TEXT_COMMAND, format);
  };

  const formatBlock = (blockType: "h1" | "h2" | "h3" | "quote") => {
    editor.update(() => {
      const selection = $getSelection();
      if ($isRangeSelection(selection)) {
        if (blockType === "quote") {
          $setBlocksType(selection, () => $createQuoteNode());
        } else {
          $setBlocksType(selection, () => $createHeadingNode(blockType));
        }
      }
    });
  };

  const insertTable = () => {
    editor.dispatchCommand(INSERT_TABLE_COMMAND, {
      columns: "3",
      rows: "3",
      includeHeaders: true,
    });
  };

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>{children}</ContextMenuTrigger>
      <ContextMenuContent className="w-64">
        <ContextMenuGroup>
          <ContextMenuItem onClick={() => formatText("bold")}>
            <Bold className="mr-2 size-4" />
            <span>Bold</span>
            <ContextMenuShortcut>⌘B</ContextMenuShortcut>
          </ContextMenuItem>
          <ContextMenuItem onClick={() => formatText("italic")}>
            <Italic className="mr-2 size-4" />
            <span>Italic</span>
            <ContextMenuShortcut>⌘I</ContextMenuShortcut>
          </ContextMenuItem>
          <ContextMenuItem onClick={() => formatText("underline")}>
            <Underline className="mr-2 size-4" />
            <span>Underline</span>
            <ContextMenuShortcut>⌘U</ContextMenuShortcut>
          </ContextMenuItem>
          <ContextMenuItem onClick={() => formatText("strikethrough")}>
            <Strikethrough className="mr-2 size-4" />
            <span>Strikethrough</span>
          </ContextMenuItem>
          <ContextMenuItem onClick={() => formatText("code")}>
            <Code className="mr-2 size-4" />
            <span>Code</span>
          </ContextMenuItem>
        </ContextMenuGroup>

        <ContextMenuSeparator />

        <ContextMenuGroup>
          <ContextMenuItem onClick={() => formatText("subscript")}>
            <Subscript className="mr-2 size-4" />
            <span>Subscript</span>
          </ContextMenuItem>
          <ContextMenuItem onClick={() => formatText("superscript")}>
            <Superscript className="mr-2 size-4" />
            <span>Superscript</span>
          </ContextMenuItem>
        </ContextMenuGroup>

        <ContextMenuSeparator />

        <ContextMenuSub>
          <ContextMenuSubTrigger>
            <Heading1 className="mr-2 size-4" />
            <span>Headings</span>
          </ContextMenuSubTrigger>
          <ContextMenuSubContent className="w-48">
            <ContextMenuItem onClick={() => formatBlock("h1")}>
              <Heading1 className="mr-2 size-4" />
              <span>Heading 1</span>
            </ContextMenuItem>
            <ContextMenuItem onClick={() => formatBlock("h2")}>
              <Heading2 className="mr-2 size-4" />
              <span>Heading 2</span>
            </ContextMenuItem>
            <ContextMenuItem onClick={() => formatBlock("h3")}>
              <Heading3 className="mr-2 size-4" />
              <span>Heading 3</span>
            </ContextMenuItem>
          </ContextMenuSubContent>
        </ContextMenuSub>

        <ContextMenuItem onClick={() => formatBlock("quote")}>
          <Quote className="mr-2 size-4" />
          <span>Quote</span>
        </ContextMenuItem>

        <ContextMenuSeparator />

        <ContextMenuGroup>
          <ContextMenuItem
            onClick={() =>
              editor.dispatchCommand(INSERT_CHECK_LIST_COMMAND, undefined)
            }
          >
            <ListTodo className="mr-2 size-4" />
            <span>Todo List</span>
          </ContextMenuItem>
          <ContextMenuItem
            onClick={() =>
              editor.dispatchCommand(INSERT_ORDERED_LIST_COMMAND, undefined)
            }
          >
            <ListOrdered className="mr-2 size-4" />
            <span>Ordered List</span>
          </ContextMenuItem>
        </ContextMenuGroup>

        <ContextMenuSeparator />

        <ContextMenuSub>
          <ContextMenuSubTrigger>
            <Table className="mr-2 size-4" />
            <span>Table</span>
          </ContextMenuSubTrigger>
          <ContextMenuSubContent className="w-56">
            <ContextMenuItem onClick={insertTable}>
              <Plus className="mr-2 size-4" />
              <span>Insert Table (3x3)</span>
            </ContextMenuItem>
            <ContextMenuSeparator />
            <ContextMenuItem onClick={tableActions.insertRowAbove}>
              <span>Insert Row Above</span>
            </ContextMenuItem>
            <ContextMenuItem onClick={tableActions.insertRowBelow}>
              <span>Insert Row Below</span>
            </ContextMenuItem>
            <ContextMenuItem onClick={tableActions.insertColumnLeft}>
              <span>Insert Column Left</span>
            </ContextMenuItem>
            <ContextMenuItem onClick={tableActions.insertColumnRight}>
              <span>Insert Column Right</span>
            </ContextMenuItem>
            <ContextMenuSeparator />
            <ContextMenuItem
              onClick={tableActions.deleteRow}
              className="text-destructive"
            >
              <Trash2 className="mr-2 size-4" />
              <span>Delete Row</span>
            </ContextMenuItem>
            <ContextMenuItem
              onClick={tableActions.deleteColumn}
              className="text-destructive"
            >
              <Trash2 className="mr-2 size-4" />
              <span>Delete Column</span>
            </ContextMenuItem>
          </ContextMenuSubContent>
        </ContextMenuSub>

        <ContextMenuItem onClick={insertThematicBreak}>
          <TableRowsSplit className="mr-2 size-4" />
          <span>Horizontal Rule</span>
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
}
