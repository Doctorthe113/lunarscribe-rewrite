"use client";

import {
  INSERT_CHECK_LIST_COMMAND,
  INSERT_ORDERED_LIST_COMMAND,
} from "@lexical/list";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import {
  $createHeadingNode,
  $createQuoteNode,
  $isHeadingNode,
  $isQuoteNode,
} from "@lexical/rich-text";
import { $setBlocksType } from "@lexical/selection";
import { INSERT_TABLE_COMMAND } from "@lexical/table";
import { mergeRegister } from "@lexical/utils";
import {
  $createParagraphNode,
  $createTextNode,
  $getSelection,
  $isRangeSelection,
  $nodesOfType,
  $setSelection,
  FORMAT_TEXT_COMMAND,
  SELECTION_CHANGE_COMMAND,
  type TextFormatType,
} from "lexical";
import {
  Bold,
  Check,
  Code,
  Heading1,
  Heading2,
  Heading3,
  Italic,
  ListOrdered,
  ListTodo,
  Pi,
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
import { type ReactNode, useCallback, useEffect, useState } from "react";
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
import { Kbd, KbdGroup } from "@/components/ui/kbd";
import { MathBlockNode } from "@/lib/lexical-plugin/math/math-block-node";
import { MathInlineNode } from "@/lib/lexical-plugin/math/math-inline-node";
import { useMathRenderContext } from "@/lib/lexical-plugin/math/math-render-context";
import { useTableActions } from "@/lib/lexical-plugin/table-actions";
import { useThematicBreak } from "@/lib/lexical-plugin/thematic-break-plugin";

interface EditorContextMenuProps {
  children: ReactNode;
}

type BlockType = "paragraph" | "h1" | "h2" | "h3" | "quote";

export function EditorContextMenu({ children }: EditorContextMenuProps) {
  const [editor] = useLexicalComposerContext();
  const insertThematicBreak = useThematicBreak();
  const tableActions = useTableActions();
  const { mathRenderEnabled, toggleMathRender } = useMathRenderContext();
  const [activeFormats, setActiveFormats] = useState({
    bold: false,
    italic: false,
    underline: false,
    strikethrough: false,
    code: false,
    subscript: false,
    superscript: false,
  });
  const [activeBlockType, setActiveBlockType] =
    useState<BlockType>("paragraph");

  const updateFormatState = useCallback(() => {
    editor.getEditorState().read(() => {
      const selection = $getSelection();
      if (!$isRangeSelection(selection)) {
        setActiveFormats({
          bold: false,
          italic: false,
          underline: false,
          strikethrough: false,
          code: false,
          subscript: false,
          superscript: false,
        });
        setActiveBlockType("paragraph");
        return;
      }

      setActiveFormats({
        bold: selection.hasFormat("bold"),
        italic: selection.hasFormat("italic"),
        underline: selection.hasFormat("underline"),
        strikethrough: selection.hasFormat("strikethrough"),
        code: selection.hasFormat("code"),
        subscript: selection.hasFormat("subscript"),
        superscript: selection.hasFormat("superscript"),
      });

      const anchorNode = selection.anchor.getNode();
      const topLevel = anchorNode.getTopLevelElement();
      if (!topLevel) {
        setActiveBlockType("paragraph");
        return;
      }

      if ($isHeadingNode(topLevel)) {
        const headingTag = topLevel.getTag();
        if (headingTag === "h1" || headingTag === "h2" || headingTag === "h3") {
          setActiveBlockType(headingTag);
          return;
        }
      }

      if ($isQuoteNode(topLevel)) {
        setActiveBlockType("quote");
        return;
      }

      setActiveBlockType("paragraph");
    });
  }, [editor]);

  useEffect(() => {
    return mergeRegister(
      editor.registerUpdateListener(() => {
        updateFormatState();
      }),
      editor.registerCommand(
        SELECTION_CHANGE_COMMAND,
        () => {
          updateFormatState();
          return false;
        },
        1,
      ),
    );
  }, [editor, updateFormatState]);

  const formatText = (format: TextFormatType) => {
    editor.dispatchCommand(FORMAT_TEXT_COMMAND, format);
  };

  const formatBlock = (blockType: "h1" | "h2" | "h3" | "quote") => {
    editor.update(() => {
      const selection = $getSelection();
      if ($isRangeSelection(selection)) {
        if (activeBlockType === blockType) {
          $setBlocksType(selection, () => $createParagraphNode());
          return;
        }

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

  const onToggleMathRendering = () => {
    if (!mathRenderEnabled) {
      toggleMathRender();
      return;
    }

    const scrollContainer = document.querySelector(
      '[class*="overflow-y-auto"]',
    ) as HTMLElement | null;
    const scrollTop = scrollContainer?.scrollTop ?? 0;

    editor.update(
      () => {
        const inlineNodes = $nodesOfType(MathInlineNode);
        for (const inlineNode of inlineNodes) {
          inlineNode.replace($createTextNode(inlineNode.getTextContent()));
        }

        const blockNodes = $nodesOfType(MathBlockNode);
        for (const blockNode of blockNodes) {
          const paragraphNode = $createParagraphNode();
          paragraphNode.append($createTextNode(blockNode.getTextContent()));
          blockNode.replace(paragraphNode);
        }

        $setSelection(null);
      },
      { tag: "math-toggle" },
    );

    toggleMathRender();

    requestAnimationFrame(() => {
      scrollContainer?.scrollTo(0, scrollTop);
    });
  };

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>{children}</ContextMenuTrigger>
      <ContextMenuContent className="w-64">
        <ContextMenuGroup>
          <ContextMenuItem
            onClick={() => formatText("bold")}
            className={activeFormats.bold ? "bg-accent" : undefined}
          >
            <Bold className="mr-2 size-4" />
            <span>Bold</span>
            <ContextMenuShortcut>
              <KbdGroup>
                <Kbd>⌘</Kbd>
                <Kbd>B</Kbd>
              </KbdGroup>
            </ContextMenuShortcut>
          </ContextMenuItem>
          <ContextMenuItem
            onClick={() => formatText("italic")}
            className={activeFormats.italic ? "bg-accent" : undefined}
          >
            <Italic className="mr-2 size-4" />
            <span>Italic</span>
            <ContextMenuShortcut>
              <KbdGroup>
                <Kbd>⌘</Kbd>
                <Kbd>I</Kbd>
              </KbdGroup>
            </ContextMenuShortcut>
          </ContextMenuItem>
          <ContextMenuItem
            onClick={() => formatText("underline")}
            className={activeFormats.underline ? "bg-accent" : undefined}
          >
            <Underline className="mr-2 size-4" />
            <span>Underline</span>
            <ContextMenuShortcut>
              <KbdGroup>
                <Kbd>⌘</Kbd>
                <Kbd>U</Kbd>
              </KbdGroup>
            </ContextMenuShortcut>
          </ContextMenuItem>
          <ContextMenuItem
            onClick={() => formatText("strikethrough")}
            className={activeFormats.strikethrough ? "bg-accent" : undefined}
          >
            <Strikethrough className="mr-2 size-4" />
            <span>Strikethrough</span>
          </ContextMenuItem>
          <ContextMenuItem
            onClick={() => formatText("code")}
            className={activeFormats.code ? "bg-accent" : undefined}
          >
            <Code className="mr-2 size-4" />
            <span>Code</span>
          </ContextMenuItem>
        </ContextMenuGroup>

        <ContextMenuSeparator />

        <ContextMenuGroup>
          <ContextMenuItem
            onClick={() => formatText("subscript")}
            className={activeFormats.subscript ? "bg-accent" : undefined}
          >
            <Subscript className="mr-2 size-4" />
            <span>Subscript</span>
          </ContextMenuItem>
          <ContextMenuItem
            onClick={() => formatText("superscript")}
            className={activeFormats.superscript ? "bg-accent" : undefined}
          >
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
            <ContextMenuItem
              onClick={() => formatBlock("h1")}
              className={activeBlockType === "h1" ? "bg-accent" : undefined}
            >
              <Heading1 className="mr-2 size-4" />
              <span>Heading 1</span>
            </ContextMenuItem>
            <ContextMenuItem
              onClick={() => formatBlock("h2")}
              className={activeBlockType === "h2" ? "bg-accent" : undefined}
            >
              <Heading2 className="mr-2 size-4" />
              <span>Heading 2</span>
            </ContextMenuItem>
            <ContextMenuItem
              onClick={() => formatBlock("h3")}
              className={activeBlockType === "h3" ? "bg-accent" : undefined}
            >
              <Heading3 className="mr-2 size-4" />
              <span>Heading 3</span>
            </ContextMenuItem>
          </ContextMenuSubContent>
        </ContextMenuSub>

        <ContextMenuItem
          onClick={() => formatBlock("quote")}
          className={activeBlockType === "quote" ? "bg-accent" : undefined}
        >
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

        <ContextMenuSeparator />

        <ContextMenuItem onClick={onToggleMathRendering}>
          <Pi className="mr-2 size-4" />
          <span>Math Rendering</span>
          {mathRenderEnabled ? <Check className="ml-auto size-4" /> : null}
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
}
