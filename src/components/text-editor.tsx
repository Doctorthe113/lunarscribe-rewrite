"use client";

import {
  $convertFromMarkdownString,
  $convertToMarkdownString,
} from "@lexical/markdown";
import { CheckListPlugin } from "@lexical/react/LexicalCheckListPlugin";
import { LexicalComposer } from "@lexical/react/LexicalComposer";
import { ContentEditable } from "@lexical/react/LexicalContentEditable";
import { EditorRefPlugin } from "@lexical/react/LexicalEditorRefPlugin";
import { LexicalErrorBoundary } from "@lexical/react/LexicalErrorBoundary";
import { HistoryPlugin } from "@lexical/react/LexicalHistoryPlugin";
import { ListPlugin } from "@lexical/react/LexicalListPlugin";
import { MarkdownShortcutPlugin } from "@lexical/react/LexicalMarkdownShortcutPlugin";
import { OnChangePlugin } from "@lexical/react/LexicalOnChangePlugin";
import { RichTextPlugin } from "@lexical/react/LexicalRichTextPlugin";
import { TabIndentationPlugin } from "@lexical/react/LexicalTabIndentationPlugin";
import { TablePlugin } from "@lexical/react/LexicalTablePlugin";
import type { EditorState, LexicalEditor } from "lexical";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { useDebouncedCallback } from "use-debounce";
import { Button } from "@/components/ui/button";
import { saveFile } from "@/lib/filesystem";
import { CodeHighlightPlugin } from "@/lib/lexical-plugin/code-highlight-plugin";
import EditorContextMenuPlugin from "@/lib/lexical-plugin/context-menu-plugin";
import {
  EDITOR_NODES,
  MARKDOWN_TRANSFORMERS,
} from "@/lib/lexical-plugin/custom-transformers";
import DecoratorNavigationPlugin from "@/lib/lexical-plugin/decorator-navigation-plugin";
import {
  MathRenderProvider,
  useMathRenderContext,
} from "@/lib/lexical-plugin/math/math-render-context";
import RawMathBlockPlugin from "@/lib/lexical-plugin/math/raw-math-block-plugin";
import {
  SourceModeProvider,
  useSourceModeContext,
} from "@/lib/lexical-plugin/source-mode-context";
import ThematicBreakPlugin from "@/lib/lexical-plugin/thematic-break-plugin";
import { useNoteStore } from "@/lib/note-zustand";
import "katex/dist/katex.css";

const THEME = {
  heading: {
    h1: "text-3xl font-bold mt-4 mb-2 text-primary",
    h2: "text-2xl font-bold mt-3 mb-1 text-blue-200",
    h3: "text-xl font-bold mt-2 mb-1 text-green-200",
  },
  text: {
    bold: "font-bold",
    italic: "italic",
    strikethrough: "line-through",
    underline: "underline",
    underlineStrikethrough: "underline line-through",
    code: "bg-muted px-1 rounded-sm font-mono text-sm",
  },
  quote: "italic border-l-3 border-primary px-2 bg-muted block",
  list: {
    nested: { listitem: "ml-4" },
    ol: "list-decimal list-inside pl-4",
    ul: "list-disc list-inside pl-4",
    listitem: "my-0.5 !outline-none",
    listitemChecked:
      "list-none relative ml-2 pl-6 cursor-text text-muted-foreground opacity-70 before:content-['✓'] before:absolute before:left-0 before:top-1/2 before:-translate-y-1/2 before:size-4 before:flex before:items-center before:justify-center before:rounded-sm before:border before:border-border before:bg-muted/40 before:text-[10px] before:leading-none before:cursor-pointer !ring-0 !border-0 !outline-none",
    listitemUnchecked:
      "list-none relative ml-2 pl-6 cursor-text before:content-[''] before:absolute before:left-0 before:top-1/2 before:-translate-y-1/2 before:size-4 before:rounded-sm before:border before:border-border before:bg-background before:cursor-pointer !ring-0 !border-0 !outline-none",
  },
  link: "text-primary underline cursor-pointer",
  code: "bg-muted block p-3 rounded-md font-mono text-sm overflow-x-auto my-2",
  codeHighlight: {
    atrule: "text-[#8839ef] dark:text-[#cba6f7]",
    attr: "text-[#1e66f5] dark:text-[#89b4fa]",
    boolean: "text-[#fe640b] dark:text-[#fab387]",
    builtin: "text-[#d20f39] dark:text-[#f38ba8]",
    comment: "text-[#9ca0b0] dark:text-[#6c7086]",
    constant: "text-[#fe640b] dark:text-[#fab387]",
    deleted: "text-[#d20f39] dark:text-[#f38ba8]",
    function: "text-[#1e66f5] dark:text-[#89b4fa]",
    important: "text-[#fe640b] dark:text-[#fab387]",
    inserted: "text-[#40a02b] dark:text-[#a6e3a1]",
    keyword: "text-[#8839ef] dark:text-[#cba6f7]",
    number: "text-[#fe640b] dark:text-[#fab387]",
    operator: "text-[#04a5e5] dark:text-[#89dceb]",
    property: "text-[#1e66f5] dark:text-[#89b4fa]",
    punctuation: "text-[#7c7f93] dark:text-[#9399b2]",
    regex: "text-[#df8e1d] dark:text-[#f9e2af]",
    selector: "text-[#04a5e5] dark:text-[#89dceb]",
    string: "text-[#40a02b] dark:text-[#a6e3a1]",
    tag: "text-[#1e66f5] dark:text-[#89b4fa]",
    variable: "text-[#df8e1d] dark:text-[#f9e2af]",
  },
  table: "border-collapse w-full my-2 block overflow-x-auto",
  tableCell: "border border-border p-2 text-left whitespace-nowrap",
  tableCellHeader:
    "border border-border p-2 font-bold bg-muted whitespace-nowrap",
};

const onError = (error: Error) => {
  toast.error(error.message, {
    action: {
      label: "Copy",
      onClick: () => {
        void navigator.clipboard.writeText(error.message);
      },
    },
  });
};

function TextEditorContent() {
  const { currentFile, updateNote } = useNoteStore();
  const editorRef = useRef<LexicalEditor | null>(null);
  const { mathRenderEnabled } = useMathRenderContext();
  const {
    sourceModeEnabled,
    toggleSourceMode,
    sourceScrollTopPx,
    setSourceScrollTopPx,
  } = useSourceModeContext();
  const [sourceMarkdownText, setSourceMarkdownText] = useState(
    currentFile.content || "",
  );

  useEffect(() => {
    setSourceMarkdownText(currentFile.content || "");
  }, [currentFile.content]);

  useLayoutEffect(() => {
    const scrollSelector = sourceModeEnabled
      ? "[data-editor-scroll-container='source']"
      : "[data-editor-scroll-container='editor']";
    const frameId = requestAnimationFrame(() => {
      const scrollContainer = document.querySelector(
        scrollSelector,
      ) as HTMLElement | null;
      if (!scrollContainer) return;
      scrollContainer.scrollTop = sourceScrollTopPx;
    });
    return () => cancelAnimationFrame(frameId);
  }, [sourceModeEnabled, sourceScrollTopPx]);

  const initialConfig = {
    namespace: "TextEditor",
    theme: THEME,
    onError,
    nodes: EDITOR_NODES,
    editorState: () =>
      $convertFromMarkdownString(
        currentFile.content || "",
        MARKDOWN_TRANSFORMERS,
        undefined,
        true,
      ),
  };

  // saves as markdown to store
  const debouncedSave = useDebouncedCallback(async (markdown: string) => {
    updateNote(currentFile.filename, markdown, currentFile.type);
    await saveFile(currentFile.filename, currentFile.type, markdown);
  }, 300);

  const onChange = (editorState: EditorState) => {
    const markdown = editorState.read(() =>
      $convertToMarkdownString(MARKDOWN_TRANSFORMERS, undefined, true),
    );
    setSourceMarkdownText(markdown);
    void debouncedSave(markdown);
  };

  if (!currentFile) return null;

  if (sourceModeEnabled) {
    return (
      <div className="relative flex h-full w-full flex-col">
        <div className="absolute top-2 right-2 z-10">
          <Button onClick={toggleSourceMode} size="sm" variant="secondary">
            Exit Source Mode
          </Button>
        </div>
        <pre
          data-editor-scroll-container="source"
          className="wrap-break-word h-full overflow-y-auto whitespace-pre-wrap p-4 font-mono text-sm leading-6"
          onScroll={(event) =>
            setSourceScrollTopPx(event.currentTarget.scrollTop)
          }
        >
          {sourceMarkdownText}
        </pre>
      </div>
    );
  }

  return (
    <LexicalComposer initialConfig={initialConfig} key={currentFile.filename}>
      <EditorRefPlugin editorRef={editorRef} />
      <RichTextPlugin
        contentEditable={
          <ContentEditable
            data-editor-scroll-container="editor"
            className="flex-1 overflow-y-auto outline-none"
            onScroll={(event) =>
              setSourceScrollTopPx(event.currentTarget.scrollTop)
            }
          />
        }
        placeholder={
          <div className="pointer-events-none absolute top-0 left-0 opacity-50">
            Start typing...
          </div>
        }
        ErrorBoundary={LexicalErrorBoundary}
      />

      <HistoryPlugin />
      <OnChangePlugin onChange={onChange} ignoreSelectionChange />
      <MarkdownShortcutPlugin transformers={MARKDOWN_TRANSFORMERS} />
      <ListPlugin />
      <CheckListPlugin />
      <TablePlugin />
      <CodeHighlightPlugin />
      {mathRenderEnabled ? <RawMathBlockPlugin /> : null}
      <ThematicBreakPlugin />
      <DecoratorNavigationPlugin />
      <TabIndentationPlugin />
      <EditorContextMenuPlugin />
    </LexicalComposer>
  );
}

export default function TextEditor() {
  return (
    <div className="relative flex h-full w-full flex-col overflow-hidden">
      <SourceModeProvider>
        <MathRenderProvider>
          <TextEditorContent />
        </MathRenderProvider>
      </SourceModeProvider>
    </div>
  );
}
