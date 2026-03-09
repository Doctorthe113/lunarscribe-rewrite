import katex from "katex";
import { $getNodeByKey, type LexicalEditor, type NodeKey } from "lexical";
import { Code } from "lucide-react";
import type { JSX } from "react";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { $isMathBlockNode } from "./math-block-node";
import { $isMathInlineNode } from "./math-inline-node";
import { useMathRenderContext } from "./math-render-context";

type MathBlockRendererProps = {
  editor: LexicalEditor;
  nodeKey: NodeKey;
  equation: string;
  className: string;
  inline?: boolean;
};

// renders raw latex block
export default function MathBlockRenderer({
  editor,
  nodeKey,
  equation,
  className,
  inline = false,
}: MathBlockRendererProps): JSX.Element {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const previewRef = useRef<HTMLDivElement | null>(null);
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const { mathRenderEnabled, toggleMathRender } = useMathRenderContext();
  const [sourceValue, setSourceValue] = useState(equation);

  useEffect(() => {
    setSourceValue(equation);
  }, [equation]);

  const onToggleMathSource = () => {
    toggleMathRender();
  };

  const onChangeSource = (nextEquation: string) => {
    setSourceValue(nextEquation);
    editor.update(() => {
      const node = $getNodeByKey(nodeKey);
      if (!node) return;

      if (inline && $isMathInlineNode(node)) {
        node.setEquation(nextEquation);
        return;
      }

      if (!inline && $isMathBlockNode(node)) {
        node.setEquation(nextEquation);
      }
    });
  };

  useEffect(() => {
    if (!mathRenderEnabled) return;
    const container = containerRef.current;
    if (!container) return;
    katex.render(equation, container, {
      displayMode: !inline,
      throwOnError: false,
      strict: "warn",
      trust: false,
      output: "html",
      errorColor: "#cc0000",
    });
  }, [equation, inline, mathRenderEnabled]);

  useEffect(() => {
    if (mathRenderEnabled) return;
    if (inline) return;
    const preview = previewRef.current;
    if (!preview) return;
    katex.render(equation, preview, {
      displayMode: true,
      throwOnError: false,
      strict: "warn",
      trust: false,
      output: "html",
      errorColor: "#cc0000",
    });
  }, [equation, inline, mathRenderEnabled]);

  useEffect(() => {
    const wrapper = wrapperRef.current;
    if (!wrapper) return;

    const onContextMenu = (event: MouseEvent) => {
      event.preventDefault();
      event.stopPropagation();

      const editableRoot = wrapper.closest(
        '[contenteditable="true"]',
      ) as HTMLElement | null;
      const target = editableRoot ?? wrapper.parentElement;
      if (!target) return;

      target.dispatchEvent(
        new MouseEvent("contextmenu", {
          bubbles: true,
          cancelable: true,
          button: 2,
          clientX: event.clientX,
          clientY: event.clientY,
          screenX: event.screenX,
          screenY: event.screenY,
        }),
      );
    };

    wrapper.addEventListener("contextmenu", onContextMenu);
    return () => {
      wrapper.removeEventListener("contextmenu", onContextMenu);
    };
  }, []);

  if (!mathRenderEnabled) {
    const wrapperClassName = inline ? "inline-block" : "";
    return (
      <div className={wrapperClassName} ref={wrapperRef}>
        {inline ? (
          <span className="inline-flex items-center gap-1">
            <Button onClick={onToggleMathSource} size="xs" variant="outline">
              <Code />
            </Button>
            <Input
              className={cn(className, "font-mono")}
              onChange={(event) => onChangeSource(event.target.value)}
              value={sourceValue}
            />
          </span>
        ) : (
          <div>
            <div className="mb-2 flex justify-end">
              <Button onClick={onToggleMathSource} size="xs" variant="outline">
                <Code />
                Render Math
              </Button>
            </div>
            <Textarea
              className={cn(
                className,
                "min-h-48 w-full resize-y overscroll-contain font-mono",
              )}
              onChange={(event) => onChangeSource(event.target.value)}
              value={sourceValue}
            />
            <div
              aria-hidden={true}
              className={cn(
                "mt-2 rounded-md border p-3",
                "pointer-events-none",
                "select-none",
              )}
              contentEditable={false}
              ref={previewRef}
            />
          </div>
        )}
      </div>
    );
  }

  const wrapperClassName = inline ? "inline-block align-baseline" : "";

  return (
    // biome-ignore lint/a11y/noStaticElementInteractions: inline math needs quick double-click toggle to source mode in editor
    <div
      className={wrapperClassName}
      onDoubleClick={mathRenderEnabled ? () => toggleMathRender() : undefined}
      ref={wrapperRef}
    >
      {inline ? null : (
        <div className="mb-2 flex justify-end">
          <Button onClick={onToggleMathSource} size="xs" variant="outline">
            <Code />
            Source
          </Button>
        </div>
      )}
      <div
        className={cn(className, mathRenderEnabled && "cursor-pointer")}
        ref={containerRef}
      />
    </div>
  );
}
