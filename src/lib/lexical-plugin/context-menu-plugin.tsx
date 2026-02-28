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
  ChevronRight,
  ClipboardCopy,
  ClipboardPaste,
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
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import { Kbd, KbdGroup } from "@/components/ui/kbd";
import { MathBlockNode } from "@/lib/lexical-plugin/math/math-block-node";
import { MathInlineNode } from "@/lib/lexical-plugin/math/math-inline-node";
import { useMathRenderContext } from "@/lib/lexical-plugin/math/math-render-context";
import { useTableActions } from "@/lib/lexical-plugin/table-actions";
import { useThematicBreak } from "@/lib/lexical-plugin/thematic-break-plugin";
import { cn } from "@/lib/utils";

type BlockType = "paragraph" | "h1" | "h2" | "h3" | "quote";

const ITEM =
  "relative flex w-full cursor-pointer select-none items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground [&_svg:not([class*='size-'])]:size-4 [&_svg:not([class*='text-'])]:text-muted-foreground [&_svg]:shrink-0";
const ACTIVE =
  "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground [&_svg:not([class*='text-'])]:text-primary-foreground";
const DESTRUCTIVE =
  "text-destructive hover:bg-destructive/10 hover:text-destructive [&_svg]:!text-destructive";
const SEP = "-mx-1 my-1 h-px bg-border";
const VIEWPORT_GUTTER_PX = 8;

function MenuItem({
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
    <button
      type="button"
      className={cn(ITEM, active && ACTIVE, destructive && DESTRUCTIVE)}
      onClick={onClick}
    >
      {icon}
      <span>{label}</span>
      {shortcut && (
        <span className="ml-auto text-muted-foreground text-xs">
          {shortcut}
        </span>
      )}
      {suffix}
    </button>
  );
}

function SubMenu({
  icon,
  label,
  isOpen,
  onEnter,
  onLeave,
  children,
}: {
  icon: ReactNode;
  label: string;
  isOpen: boolean;
  onEnter: () => void;
  onLeave: () => void;
  children: ReactNode;
}) {
  const triggerRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const [panelPosition, setPanelPosition] = useState<{
    leftPx: number;
    topPx: number;
  } | null>(null);

  useLayoutEffect(() => {
    if (!isOpen || !triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    setPanelPosition({ leftPx: rect.right + 4, topPx: rect.top });
  }, [isOpen]);

  useLayoutEffect(() => {
    if (!isOpen || !panelRef.current || !panelPosition) return;
    const rect = panelRef.current.getBoundingClientRect();
    const maxLeftPx = window.innerWidth - rect.width - VIEWPORT_GUTTER_PX;
    const maxTopPx = window.innerHeight - rect.height - VIEWPORT_GUTTER_PX;
    const leftPx = Math.max(
      VIEWPORT_GUTTER_PX,
      Math.min(panelPosition.leftPx, maxLeftPx),
    );
    const topPx = Math.max(
      VIEWPORT_GUTTER_PX,
      Math.min(panelPosition.topPx, maxTopPx),
    );
    if (leftPx !== panelPosition.leftPx || topPx !== panelPosition.topPx) {
      setPanelPosition({ leftPx, topPx });
    }
  }, [isOpen, panelPosition]);

  return (
    <div
      ref={triggerRef}
      className="relative"
      onMouseEnter={onEnter}
      onMouseLeave={onLeave}
      role="menuitem"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") onEnter();
      }}
    >
      <div className={ITEM}>
        {icon}
        <span>{label}</span>
        <ChevronRight className="ml-auto size-4" />
      </div>
      {isOpen &&
        panelPosition &&
        createPortal(
          // biome-ignore lint/a11y/noStaticElementInteractions: <needs to be a div>
          <div
            ref={panelRef}
            className="fixed z-50 min-w-48 rounded-md border bg-popover p-1 text-popover-foreground shadow-lg"
            style={{ left: panelPosition.leftPx + 4, top: panelPosition.topPx }}
            onMouseEnter={onEnter}
            onMouseLeave={onLeave}
          >
            {children}
          </div>,
          document.body,
        )}
    </div>
  );
}

export default function EditorContextMenuPlugin() {
  const [editor] = useLexicalComposerContext();
  const insertThematicBreak = useThematicBreak();
  const tableActions = useTableActions();
  const { mathRenderEnabled, toggleMathRender } = useMathRenderContext();

  const [position, setPosition] = useState<{ x: number; y: number } | null>(
    null,
  );
  const [activeSubmenu, setActiveSubmenu] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const subTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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

  const isOpen = position !== null;

  const closeMenu = useCallback(() => {
    setPosition(null);
    setActiveSubmenu(null);
  }, []);

  // intercept contextmenu on editor root
  useEffect(() => {
    let currentRoot: HTMLElement | null = null;
    const handler = (e: Event) => {
      e.preventDefault();
      const me = e as MouseEvent;
      setPosition({ x: me.clientX, y: me.clientY });
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
  }, [editor]);

  // read format state on open
  useEffect(() => {
    if (!isOpen) return;
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
  }, [isOpen, editor]);

  // close on click outside or escape
  useEffect(() => {
    if (!isOpen) return;
    const onMouseDown = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node))
        closeMenu();
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeMenu();
    };
    document.addEventListener("mousedown", onMouseDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onMouseDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [isOpen, closeMenu]);

  // keep within viewport
  useLayoutEffect(() => {
    if (!menuRef.current || !position) return;
    const el = menuRef.current;

    const placeWithinViewport = () => {
      const rect = el.getBoundingClientRect();
      const maxLeftPx = window.innerWidth - rect.width - VIEWPORT_GUTTER_PX;
      const maxTopPx = window.innerHeight - rect.height - VIEWPORT_GUTTER_PX;
      const leftPx = Math.max(
        VIEWPORT_GUTTER_PX,
        Math.min(position.x, maxLeftPx),
      );
      const topPx = Math.max(
        VIEWPORT_GUTTER_PX,
        Math.min(position.y, maxTopPx),
      );

      el.style.left = `${leftPx}px`;
      el.style.top = `${topPx}px`;
    };

    placeWithinViewport();
  }, [position]);

  useEffect(() => {
    return () => {
      if (subTimerRef.current) clearTimeout(subTimerRef.current);
    };
  }, []);

  const act = (fn: () => void) => {
    fn();
    closeMenu();
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
    closeMenu();
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

  const openSub = (key: string) => {
    if (subTimerRef.current) clearTimeout(subTimerRef.current);
    setActiveSubmenu(key);
  };
  const closeSub = () => {
    subTimerRef.current = setTimeout(() => setActiveSubmenu(null), 150);
  };

  if (!isOpen) return null;

  return createPortal(
    <div
      ref={menuRef}
      className="fade-in-0 zoom-in-95 fixed z-50 max-h-[95vh] w-64 animate-in overflow-y-auto rounded-md border bg-popover p-1 text-popover-foreground shadow-md"
      style={{ left: position.x, top: position.y }}
    >
      <MenuItem
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
      <MenuItem
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
      <MenuItem
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
      <MenuItem
        icon={<Strikethrough />}
        label="Strikethrough"
        active={activeFormats.strikethrough}
        onClick={() => formatText("strikethrough")}
      />
      <MenuItem
        icon={<Code />}
        label="Code"
        active={activeFormats.code}
        onClick={() => formatText("code")}
      />

      <div className={SEP} />

      <MenuItem
        icon={<Subscript />}
        label="Subscript"
        active={activeFormats.subscript}
        onClick={() => formatText("subscript")}
      />
      <MenuItem
        icon={<Superscript />}
        label="Superscript"
        active={activeFormats.superscript}
        onClick={() => formatText("superscript")}
      />

      <div className={SEP} />

      <SubMenu
        icon={<Heading1 />}
        label="Headings"
        isOpen={activeSubmenu === "headings"}
        onEnter={() => openSub("headings")}
        onLeave={closeSub}
      >
        <MenuItem
          icon={<Heading1 />}
          label="Heading 1"
          active={activeBlockType === "h1"}
          onClick={() => formatBlock("h1")}
        />
        <MenuItem
          icon={<Heading2 />}
          label="Heading 2"
          active={activeBlockType === "h2"}
          onClick={() => formatBlock("h2")}
        />
        <MenuItem
          icon={<Heading3 />}
          label="Heading 3"
          active={activeBlockType === "h3"}
          onClick={() => formatBlock("h3")}
        />
      </SubMenu>

      <MenuItem
        icon={<Quote />}
        label="Quote"
        active={activeBlockType === "quote"}
        onClick={() => formatBlock("quote")}
      />

      <div className={SEP} />

      <MenuItem
        icon={<ListTodo />}
        label="Todo List"
        onClick={() =>
          act(() =>
            editor.dispatchCommand(INSERT_CHECK_LIST_COMMAND, undefined),
          )
        }
      />
      <MenuItem
        icon={<ListOrdered />}
        label="Ordered List"
        onClick={() =>
          act(() =>
            editor.dispatchCommand(INSERT_ORDERED_LIST_COMMAND, undefined),
          )
        }
      />

      <div className={SEP} />

      <SubMenu
        icon={<Table />}
        label="Table"
        isOpen={activeSubmenu === "table"}
        onEnter={() => openSub("table")}
        onLeave={closeSub}
      >
        <MenuItem
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
        <div className={SEP} />
        <MenuItem
          label="Insert Row Above"
          onClick={() => act(tableActions.insertRowAbove)}
        />
        <MenuItem
          label="Insert Row Below"
          onClick={() => act(tableActions.insertRowBelow)}
        />
        <MenuItem
          label="Insert Column Left"
          onClick={() => act(tableActions.insertColumnLeft)}
        />
        <MenuItem
          label="Insert Column Right"
          onClick={() => act(tableActions.insertColumnRight)}
        />
        <div className={SEP} />
        <MenuItem
          icon={<Trash2 />}
          label="Delete Row"
          destructive
          onClick={() => act(tableActions.deleteRow)}
        />
        <MenuItem
          icon={<Trash2 />}
          label="Delete Column"
          destructive
          onClick={() => act(tableActions.deleteColumn)}
        />
      </SubMenu>

      <MenuItem
        icon={<TableRowsSplit />}
        label="Horizontal Rule"
        onClick={() => act(insertThematicBreak)}
      />

      <div className={SEP} />

      <MenuItem
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
      <MenuItem
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
      <MenuItem
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

      <div className={SEP} />

      <MenuItem
        icon={<Pi />}
        label="Math Rendering"
        active={mathRenderEnabled}
        onClick={onToggleMath}
        suffix={mathRenderEnabled ? <Check className="ml-auto size-4" /> : null}
      />
    </div>,
    document.body,
  );
}
