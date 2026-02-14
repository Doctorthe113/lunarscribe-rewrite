"use client";

import {
  $convertFromMarkdownString,
  BOLD_ITALIC_STAR,
  BOLD_ITALIC_UNDERSCORE,
  BOLD_STAR,
  BOLD_UNDERSCORE,
  HEADING,
  ITALIC_STAR,
  ITALIC_UNDERSCORE,
  STRIKETHROUGH,
} from "@lexical/markdown";
import { AutoFocusPlugin } from "@lexical/react/LexicalAutoFocusPlugin";
import { LexicalComposer } from "@lexical/react/LexicalComposer";
import { ContentEditable } from "@lexical/react/LexicalContentEditable";
import { EditorRefPlugin } from "@lexical/react/LexicalEditorRefPlugin";
import { LexicalErrorBoundary } from "@lexical/react/LexicalErrorBoundary";
import { HistoryPlugin } from "@lexical/react/LexicalHistoryPlugin";
import { MarkdownShortcutPlugin } from "@lexical/react/LexicalMarkdownShortcutPlugin";
import { OnChangePlugin } from "@lexical/react/LexicalOnChangePlugin";
import { RichTextPlugin } from "@lexical/react/LexicalRichTextPlugin";
import { TabIndentationPlugin } from "@lexical/react/LexicalTabIndentationPlugin";
import { HeadingNode } from "@lexical/rich-text";
import { $getRoot, type LexicalEditor } from "lexical";
import { useRef } from "react";
import { toast } from "sonner";
import { useNoteStore } from "@/lib/note-zustand";

const THEME = {
  heading: {
    h1: "text-3xl font-bold mt-4 mb-2",
    h2: "text-2xl font-bold mt-3 mb-1",
    h3: "text-xl font-bold mt-2 mb-1",
  },
  text: {
    bold: "font-bold",
    italic: "italic",
    strikethrough: "line-through",
    underline: "underline",
  },
};

const TRANSFORMERS = [
  HEADING,
  BOLD_ITALIC_STAR,
  BOLD_ITALIC_UNDERSCORE,
  BOLD_STAR,
  BOLD_UNDERSCORE,
  ITALIC_STAR,
  ITALIC_UNDERSCORE,
  STRIKETHROUGH,
];

const onError = (error: Error) => {
  toast.error(error.message);
};

export default function TextEditor() {
  const { currentFile, updateNote } = useNoteStore();
  const editorRef = useRef<LexicalEditor | null>(null);

  const initialConfig = {
    namespace: "TextEditor",
    theme: THEME,
    onError,
    nodes: [HeadingNode],
    editorState: () =>
      $convertFromMarkdownString(
        currentFile.content || "",
        TRANSFORMERS,
        undefined,
        true,
      ),
  };

  // saves content to store on change
  const handleSave = () => {
    if (!editorRef.current) return;
    editorRef.current.read(() => {
      const rawText = $getRoot().getTextContent();
      updateNote(currentFile.filename, rawText, currentFile.type);
      console.log(rawText);
    });
  };

  if (!currentFile) return null;

  return (
    <div className="relative w-full max-w-3xl">
      <LexicalComposer initialConfig={initialConfig} key={currentFile.filename}>
        <EditorRefPlugin editorRef={editorRef} />
        <RichTextPlugin
          contentEditable={<ContentEditable className="outline-none" />}
          placeholder={
            <div className="pointer-events-none absolute top-0 left-0 opacity-50">
              Start typing...
            </div>
          }
          ErrorBoundary={LexicalErrorBoundary}
        />
        <HistoryPlugin />
        <OnChangePlugin onChange={handleSave} ignoreSelectionChange />
        <MarkdownShortcutPlugin transformers={TRANSFORMERS} />
        <AutoFocusPlugin />
        <TabIndentationPlugin />
      </LexicalComposer>
    </div>
  );
}
