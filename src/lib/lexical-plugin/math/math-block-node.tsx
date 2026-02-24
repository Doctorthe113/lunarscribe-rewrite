import type {
  DOMConversionMap,
  DOMConversionOutput,
  EditorConfig,
  LexicalNode,
  NodeKey,
  SerializedLexicalNode,
  Spread,
} from "lexical";
import { $applyNodeReplacement, DecoratorNode } from "lexical";
import type { JSX } from "react";
import { lazy } from "react";

const MathBlockRenderer = lazy(() => import("./math-block-renderer"));

export type SerializedMathBlockNode = Spread<
  { equation: string },
  SerializedLexicalNode
>;

function convertMathElement(domNode: HTMLElement): null | DOMConversionOutput {
  const equation = domNode.getAttribute("data-lexical-math") ?? "";
  if (!equation) return null;
  return { node: $createMathBlockNode(equation) };
}

export class MathBlockNode extends DecoratorNode<JSX.Element> {
  __equation: string;

  static getType(): string {
    return "math-block";
  }

  static clone(node: MathBlockNode): MathBlockNode {
    return new MathBlockNode(node.__equation, node.__key);
  }

  constructor(equation: string, key?: NodeKey) {
    super(key);
    this.__equation = equation;
  }

  static importJSON(serializedNode: SerializedMathBlockNode): MathBlockNode {
    return $createMathBlockNode(serializedNode.equation).updateFromJSON(
      serializedNode,
    );
  }

  exportJSON(): SerializedMathBlockNode {
    return {
      ...super.exportJSON(),
      equation: this.__equation,
    };
  }

  createDOM(): HTMLElement {
    const element = document.createElement("div");
    element.className = "editor-math-block";
    return element;
  }

  updateDOM(): boolean {
    return false;
  }

  exportDOM() {
    const element = document.createElement("div");
    element.className = "editor-math-block";
    element.setAttribute("data-lexical-math", this.__equation);
    return { element };
  }

  static importDOM(): DOMConversionMap | null {
    return {
      div: (domNode: HTMLElement) => {
        if (!domNode.hasAttribute("data-lexical-math")) return null;
        return {
          conversion: convertMathElement,
          priority: 2,
        };
      },
    };
  }

  getEquation(): string {
    return this.__equation;
  }

  getTextContent(): string {
    return `$$\n${this.__equation}\n$$`;
  }

  decorate(_editor: unknown, config: EditorConfig): JSX.Element {
    return (
      <MathBlockRenderer
        equation={this.__equation}
        className={config.theme.code ?? ""}
      />
    );
  }
}

// biome-ignore lint/style/useNamingConvention: lexical helper
export function $createMathBlockNode(equation: string): MathBlockNode {
  return $applyNodeReplacement(new MathBlockNode(equation));
}

// biome-ignore lint/style/useNamingConvention: lexical helper
export function $isMathBlockNode(
  node: LexicalNode | null | undefined,
): node is MathBlockNode {
  return node instanceof MathBlockNode;
}
