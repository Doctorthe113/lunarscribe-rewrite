import type {
  DOMConversionMap,
  DOMConversionOutput,
  EditorConfig,
  LexicalEditor,
  LexicalNode,
  NodeKey,
  SerializedLexicalNode,
  Spread,
} from "lexical";
import { $applyNodeReplacement, DecoratorNode } from "lexical";
import type { JSX } from "react";
import { lazy } from "react";

const MathBlockRenderer = lazy(() => import("./math-block-renderer"));

export type SerializedMathInlineNode = Spread<
  { equation: string },
  SerializedLexicalNode
>;

function convertInlineMathElement(
  domNode: HTMLElement,
): null | DOMConversionOutput {
  const equation = domNode.getAttribute("data-lexical-inline-math") ?? "";
  if (!equation) return null;
  return { node: $createMathInlineNode(equation) };
}

export class MathInlineNode extends DecoratorNode<JSX.Element> {
  __equation: string;

  static getType(): string {
    return "math-inline";
  }

  static clone(node: MathInlineNode): MathInlineNode {
    return new MathInlineNode(node.__equation, node.__key);
  }

  constructor(equation: string, key?: NodeKey) {
    super(key);
    this.__equation = equation;
  }

  static importJSON(serializedNode: SerializedMathInlineNode): MathInlineNode {
    return $createMathInlineNode(serializedNode.equation).updateFromJSON(
      serializedNode,
    );
  }

  exportJSON(): SerializedMathInlineNode {
    return {
      ...super.exportJSON(),
      equation: this.__equation,
    };
  }

  createDOM(): HTMLElement {
    const element = document.createElement("span");
    element.className = "editor-math-inline";
    return element;
  }

  updateDOM(): boolean {
    return false;
  }

  exportDOM() {
    const element = document.createElement("span");
    element.className = "editor-math-inline";
    element.setAttribute("data-lexical-inline-math", this.__equation);
    return { element };
  }

  static importDOM(): DOMConversionMap | null {
    return {
      span: (domNode: HTMLElement) => {
        if (!domNode.hasAttribute("data-lexical-inline-math")) return null;
        return {
          conversion: convertInlineMathElement,
          priority: 2,
        };
      },
    };
  }

  getTextContent(): string {
    return `$${this.__equation}$`;
  }

  getEquation(): string {
    return this.__equation;
  }

  setEquation(equation: string): void {
    const writable = this.getWritable();
    writable.__equation = equation;
  }

  decorate(editor: LexicalEditor, config: EditorConfig): JSX.Element {
    return (
      <MathBlockRenderer
        editor={editor}
        nodeKey={this.getKey()}
        equation={this.__equation}
        className={config.theme.text?.code ?? ""}
        inline={true}
      />
    );
  }
}

// biome-ignore lint/style/useNamingConvention: lexical helper
export function $createMathInlineNode(equation: string): MathInlineNode {
  return $applyNodeReplacement(new MathInlineNode(equation));
}

// biome-ignore lint/style/useNamingConvention: lexical helper
export function $isMathInlineNode(
  node: LexicalNode | null | undefined,
): node is MathInlineNode {
  return node instanceof MathInlineNode;
}
