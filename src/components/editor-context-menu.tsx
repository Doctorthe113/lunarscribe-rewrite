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
import {
  $createParagraphNode,
  $createTextNode,
  $getSelection,
  $isRangeSelection,
  $nodesOfType,
  $setSelection,
  FORMAT_TEXT_COMMAND,
  type TextFormatType,
} from "lexical";
import {
  Bold,
  Check,
  ClipboardCopy,
  ClipboardPaste,
  Code,
  Heading1,
  Heading2,
  Heading3,
  Italic,
  ListOrdered,
  ListTodo,
  NotebookPen,
  Pi,
  Plus,
  Quote,
  Scissors,
  Strikethrough,
  Subscript,
  Superscript,
  Table,
  TableRowsSplit,
  Trash2,
  Underline,
} from "lucide-react";
import {
  type ReactNode,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuShortcut,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
} from "@/components/ui/context-menu";
import { Kbd, KbdGroup } from "@/components/ui/kbd";
import { MathBlockNode } from "@/lib/lexical-plugin/math/math-block-node";
import { MathInlineNode } from "@/lib/lexical-plugin/math/math-inline-node";
import { useMathRenderContext } from "@/lib/lexical-plugin/math/math-render-context";
import { useSourceModeContext } from "@/lib/lexical-plugin/source-mode-context";
import { useTableActions } from "@/lib/lexical-plugin/table-actions";
import { useThematicBreak } from "@/lib/lexical-plugin/thematic-break-plugin";
import { cn } from "@/lib/utils";

type BlockType = "paragraph" | "h1" | "h2" | "h3" | "quote";

const ACTIVE_ITEM =
  "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground [&_svg:not([class*='text-'])]:text-primary-foreground";

const DEFAULT_FORMATS = {
  bold: false,
  italic: false,
  underline: false,
  strikethrough: false,
  code: false,
  subscript: false,
  superscript: false,
};

// Hidden anchor element positioned at cursor
function useAnchorElement() {
  const ref = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const el = document.createElement("div");
    el.style.cssText = "position:fixed;width:0;height:0;pointer-events:none;";
    document.body.appendChild(el);
    ref.current = el;
    return () => el.remove();
  }, []);
  const moveTo = useCallback((x: number, y: number) => {
    if (!ref.current) return;
    ref.current.style.left = `${x}px`;
    ref.current.style.top = `${y}px`;
  }, []);
  return { anchorEl: ref, moveTo };
}

// Format item with optional active/destructive styling
function FormatItem({
  icon,
  label,
  active,
  destructive,
  onClick,
  shortcut,
  suffix,
}: {
  icon?: ReactNode;
  label: string;
  active?: boolean;
  destructive?: boolean;
  onClick?: () => void;
  shortcut?: ReactNode;
  suffix?: ReactNode;
}) {
  return (
    <ContextMenuItem
      className={cn(active && ACTIVE_ITEM)}
      onClick={onClick}
      variant={destructive ? "destructive" : "default"}
    >
      {icon}
      <span>{label}</span>
      {shortcut && <ContextMenuShortcut>{shortcut}</ContextMenuShortcut>}
      {suffix}
    </ContextMenuItem>
  );
}

// Editor context menu with floating submenus
export default function EditorContextMenu() {
  const [editor] = useLexicalComposerContext();
  const insertThematicBreak = useThematicBreak();
  const tableActions = useTableActions();
  const { mathRenderEnabled, toggleMathRender } = useMathRenderContext();
  const { sourceModeEnabled, toggleSourceMode, setSourceScrollTopPx } =
    useSourceModeContext();

  const [open, setOpen] = useState(false);
  const { anchorEl, moveTo } = useAnchorElement();

  const [activeFormats, setActiveFormats] = useState(DEFAULT_FORMATS);
  const [activeBlockType, setActiveBlockType] =
    useState<BlockType>("paragraph");

  // Intercept right-click on editor root
  useEffect(() => {
    let currentRoot: HTMLElement | null = null;
    const handler = (e: Event) => {
      e.preventDefault();
      const me = e as MouseEvent;
      moveTo(me.clientX, me.clientY);
      setOpen(true);
    };
    const unregister = editor.registerRootListener((root, prev) => {
      prev?.removeEventListener("contextmenu", handler);
      root?.addEventListener("contextmenu", handler);
      currentRoot = root;
    });
    return () => {
      unregister();
      currentRoot?.removeEventListener("contextmenu", handler);
    };
  }, [editor, moveTo]);

  // Read format state on open
  useEffect(() => {
    if (!open) return;
    editor.getEditorState().read(() => {
      const selection = $getSelection();
      if (!$isRangeSelection(selection)) {
        setActiveFormats(DEFAULT_FORMATS);
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
      const topLevel = selection.anchor.getNode().getTopLevelElement();
      if (!topLevel) {
        setActiveBlockType("paragraph");
        return;
      }
      if ($isHeadingNode(topLevel)) {
        const tag = topLevel.getTag();
        if (tag === "h1" || tag === "h2" || tag === "h3") {
          setActiveBlockType(tag);
          return;
        }
      }
      if ($isQuoteNode(topLevel)) {
        setActiveBlockType("quote");
        return;
      }
      setActiveBlockType("paragraph");
    });
  }, [open, editor]);

  const act = (fn: () => void) => {
    fn();
    setOpen(false);
    editor.focus();
  };

  const formatText = (format: TextFormatType) =>
    act(() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, format));

  const formatBlock = (blockType: "h1" | "h2" | "h3" | "quote") =>
    act(() =>
      editor.update(() => {
        const selection = $getSelection();
        if (!$isRangeSelection(selection)) return;
        if (activeBlockType === blockType) {
          $setBlocksType(selection, () => $createParagraphNode());
          return;
        }
        if (blockType === "quote")
          $setBlocksType(selection, () => $createQuoteNode());
        else $setBlocksType(selection, () => $createHeadingNode(blockType));
      }),
    );

  const onCopy = () =>
    act(() => {
      const text = editor
        .getEditorState()
        .read(() => $getSelection()?.getTextContent() || "");
      navigator.clipboard.writeText(text);
    });

  const onCut = () =>
    act(() => {
      const text = editor
        .getEditorState()
        .read(() => $getSelection()?.getTextContent() || "");
      navigator.clipboard.writeText(text);
      editor.update(() => {
        const selection = $getSelection();
        if ($isRangeSelection(selection)) selection.removeText();
      });
    });

  const onPaste = () => {
    setOpen(false);
    navigator.clipboard.readText().then((text) => {
      editor.update(() => {
        const selection = $getSelection();
        if ($isRangeSelection(selection)) selection.insertRawText(text);
      });
      editor.focus();
    });
  };

  const onToggleMath = () =>
    act(() => {
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
          for (const n of $nodesOfType(MathInlineNode))
            n.replace($createTextNode(n.getTextContent()));
          for (const n of $nodesOfType(MathBlockNode)) {
            const p = $createParagraphNode();
            p.append($createTextNode(n.getTextContent()));
            n.replace(p);
          }
          $setSelection(null);
        },
        { tag: "math-toggle" },
      );
      toggleMathRender();
      requestAnimationFrame(() => scrollContainer?.scrollTo(0, scrollTop));
    });

  const onToggleSourceMode = () =>
    act(() => {
      const scrollContainer = document.querySelector(
        "[data-editor-scroll-container]",
      ) as HTMLElement | null;
      setSourceScrollTopPx(scrollContainer?.scrollTop ?? 0);
      toggleSourceMode();
    });

  if (!open) return null;

  return (
    <ContextMenu open={open} onOpenChange={setOpen}>
      <ContextMenuContent
        className="w-64"
        anchor={anchorEl.current}
        side="bottom"
        align="start"
        sideOffset={0}
        collisionPadding={8}
      >
        <FormatItem
          icon={<Bold />}
          label="Bold"
          active={activeFormats.bold}
          onClick={() => formatText("bold")}
          shortcut={
            <KbdGroup>
              <Kbd>⌘</Kbd>
              <Kbd>B</Kbd>
            </KbdGroup>
          }
        />
        <FormatItem
          icon={<Italic />}
          label="Italic"
          active={activeFormats.italic}
          onClick={() => formatText("italic")}
          shortcut={
            <KbdGroup>
              <Kbd>⌘</Kbd>
              <Kbd>I</Kbd>
            </KbdGroup>
          }
        />
        <FormatItem
          icon={<Underline />}
          label="Underline"
          active={activeFormats.underline}
          onClick={() => formatText("underline")}
          shortcut={
            <KbdGroup>
              <Kbd>⌘</Kbd>
              <Kbd>U</Kbd>
            </KbdGroup>
          }
        />
        <FormatItem
          icon={<Strikethrough />}
          label="Strikethrough"
          active={activeFormats.strikethrough}
          onClick={() => formatText("strikethrough")}
        />
        <FormatItem
          icon={<Code />}
          label="Code"
          active={activeFormats.code}
          onClick={() => formatText("code")}
        />

        <ContextMenuSeparator />

        <FormatItem
          icon={<Subscript />}
          label="Subscript"
          active={activeFormats.subscript}
          onClick={() => formatText("subscript")}
        />
        <FormatItem
          icon={<Superscript />}
          label="Superscript"
          active={activeFormats.superscript}
          onClick={() => formatText("superscript")}
        />

        <ContextMenuSeparator />

        {/* Headings submenu */}
        <ContextMenuSub>
          <ContextMenuSubTrigger>
            <Heading1 />
            <span>Headings</span>
          </ContextMenuSubTrigger>
          <ContextMenuSubContent>
            <FormatItem
              icon={<Heading1 />}
              label="Heading 1"
              active={activeBlockType === "h1"}
              onClick={() => formatBlock("h1")}
            />
            <FormatItem
              icon={<Heading2 />}
              label="Heading 2"
              active={activeBlockType === "h2"}
              onClick={() => formatBlock("h2")}
            />
            <FormatItem
              icon={<Heading3 />}
              label="Heading 3"
              active={activeBlockType === "h3"}
              onClick={() => formatBlock("h3")}
            />
          </ContextMenuSubContent>
        </ContextMenuSub>

        <FormatItem
          icon={<Quote />}
          label="Quote"
          active={activeBlockType === "quote"}
          onClick={() => formatBlock("quote")}
        />

        <ContextMenuSeparator />

        <FormatItem
          icon={<ListTodo />}
          label="Todo List"
          onClick={() =>
            act(() =>
              editor.dispatchCommand(INSERT_CHECK_LIST_COMMAND, undefined),
            )
          }
        />
        <FormatItem
          icon={<ListOrdered />}
          label="Ordered List"
          onClick={() =>
            act(() =>
              editor.dispatchCommand(INSERT_ORDERED_LIST_COMMAND, undefined),
            )
          }
        />

        <ContextMenuSeparator />

        {/* Table submenu */}
        <ContextMenuSub>
          <ContextMenuSubTrigger>
            <Table />
            <span>Table</span>
          </ContextMenuSubTrigger>
          <ContextMenuSubContent>
            <FormatItem
              icon={<Plus />}
              label="Insert Table (3x3)"
              onClick={() =>
                act(() =>
                  editor.dispatchCommand(INSERT_TABLE_COMMAND, {
                    columns: "3",
                    rows: "3",
                    includeHeaders: true,
                  }),
                )
              }
            />
            <ContextMenuSeparator />
            <FormatItem
              label="Insert Row Above"
              onClick={() => act(tableActions.insertRowAbove)}
            />
            <FormatItem
              label="Insert Row Below"
              onClick={() => act(tableActions.insertRowBelow)}
            />
            <FormatItem
              label="Insert Column Left"
              onClick={() => act(tableActions.insertColumnLeft)}
            />
            <FormatItem
              label="Insert Column Right"
              onClick={() => act(tableActions.insertColumnRight)}
            />
            <ContextMenuSeparator />
            <FormatItem
              icon={<Trash2 />}
              label="Delete Row"
              destructive
              onClick={() => act(tableActions.deleteRow)}
            />
            <FormatItem
              icon={<Trash2 />}
              label="Delete Column"
              destructive
              onClick={() => act(tableActions.deleteColumn)}
            />
          </ContextMenuSubContent>
        </ContextMenuSub>

        <FormatItem
          icon={<TableRowsSplit />}
          label="Horizontal Rule"
          onClick={() => act(insertThematicBreak)}
        />

        <ContextMenuSeparator />

        <FormatItem
          icon={<Scissors />}
          label="Cut"
          onClick={onCut}
          shortcut={
            <KbdGroup>
              <Kbd>⌘</Kbd>
              <Kbd>X</Kbd>
            </KbdGroup>
          }
        />
        <FormatItem
          icon={<ClipboardCopy />}
          label="Copy"
          onClick={onCopy}
          shortcut={
            <KbdGroup>
              <Kbd>⌘</Kbd>
              <Kbd>C</Kbd>
            </KbdGroup>
          }
        />
        <FormatItem
          icon={<ClipboardPaste />}
          label="Paste"
          onClick={onPaste}
          shortcut={
            <KbdGroup>
              <Kbd>⌘</Kbd>
              <Kbd>V</Kbd>
            </KbdGroup>
          }
        />

        <ContextMenuSeparator />

        <FormatItem
          icon={<Pi />}
          label="Math Rendering"
          active={mathRenderEnabled}
          onClick={onToggleMath}
          suffix={
            mathRenderEnabled ? <Check className="ml-auto size-4" /> : null
          }
        />
        <FormatItem
          icon={<NotebookPen />}
          label="Source Mode"
          active={sourceModeEnabled}
          onClick={onToggleSourceMode}
          suffix={
            sourceModeEnabled ? <Check className="ml-auto size-4" /> : null
          }
        />
      </ContextMenuContent>
    </ContextMenu>
  );
}
