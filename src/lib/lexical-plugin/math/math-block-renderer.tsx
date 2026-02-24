import katex from "katex";
import type { JSX } from "react";
import { useEffect, useRef } from "react";
import { useMathRenderContext } from "./math-render-context";

type MathBlockRendererProps = {
  equation: string;
  className: string;
  inline?: boolean;
};

// renders raw latex block
export default function MathBlockRenderer({
  equation,
  className,
  inline = false,
}: MathBlockRendererProps): JSX.Element {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const { mathRenderEnabled } = useMathRenderContext();

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
          <span className={className}>{`$${equation}$`}</span>
        ) : (
          <div className={className}>
            <pre className="whitespace-pre-wrap">{`$$\n${equation}\n$$`}</pre>
          </div>
        )}
      </div>
    );
  }

  const wrapperClassName = inline ? "inline-block align-baseline" : "";

  return (
    <div className={wrapperClassName} ref={wrapperRef}>
      <div className={className} ref={containerRef} />
    </div>
  );
}
