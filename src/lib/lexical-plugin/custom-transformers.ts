import { CodeHighlightNode, CodeNode } from "@lexical/code";
import {
  $createHorizontalRuleNode,
  $isHorizontalRuleNode,
  HorizontalRuleNode,
} from "@lexical/extension";
import { LinkNode } from "@lexical/link";
import { ListItemNode, ListNode } from "@lexical/list";
import type {
  ElementTransformer,
  TextFormatTransformer,
} from "@lexical/markdown";
import {
  $convertFromMarkdownString,
  $convertToMarkdownString,
  BOLD_ITALIC_STAR,
  BOLD_STAR,
  CHECK_LIST,
  CODE,
  INLINE_CODE,
  ITALIC_STAR,
  LINK,
  ORDERED_LIST,
  QUOTE,
  STRIKETHROUGH,
  UNORDERED_LIST,
} from "@lexical/markdown";
import {
  $createHeadingNode,
  $isHeadingNode,
  HeadingNode,
  type HeadingTagType,
  QuoteNode,
} from "@lexical/rich-text";
import {
  $createTableCellNode,
  $createTableNode,
  $createTableRowNode,
  $isTableCellNode,
  $isTableNode,
  $isTableRowNode,
  TableCellHeaderStates,
  TableCellNode,
  TableNode,
  TableRowNode,
} from "@lexical/table";
import {
  $isParagraphNode,
  $isTextNode,
  type ElementNode,
  type LexicalNode,
  TextNode,
} from "lexical";

const createBlockNode = (
  createNode: (match: Array<string>) => ElementNode,
): ElementTransformer["replace"] => {
  return (parentNode, children, match, isImport) => {
    const node = createNode(match);
    node.append(...children);
    parentNode.replace(node);
    if (!isImport) {
      node.select(0, 0);
    }
  };
};

const HEADING: ElementTransformer = {
  dependencies: [HeadingNode],
  export: (node, exportChildren) => {
    if (!$isHeadingNode(node)) return null;
    const level = Number(node.getTag().slice(1));
    return `${"#".repeat(level)} ${exportChildren(node)}`;
  },
  regExp: /^(#{1,3})\s/,
  replace: createBlockNode((match) => {
    const tag = `h${match[1].length}` as HeadingTagType;
    return $createHeadingNode(tag);
  }),
  type: "element",
};

const UNDERLINE_TRANSFORMER: TextFormatTransformer = {
  format: ["underline"],
  tag: "__",
  type: "text-format",
};

const THEMATIC_BREAK_TRANSFORMER: ElementTransformer = {
  dependencies: [HorizontalRuleNode],
  export: (node) => {
    if (!$isHorizontalRuleNode(node)) return null;
    return "---";
  },
  regExp: /^---\s*$/,
  replace: (parentNode, _1, _2, isImport) => {
    const line = $createHorizontalRuleNode();
    if (isImport || parentNode.getNextSibling()) {
      parentNode.replace(line);
    } else {
      parentNode.insertBefore(line);
    }
    line.selectNext();
  },
  type: "element",
};

// table markdown transformer
const TABLE_TRANSFORMER: ElementTransformer = {
  dependencies: [TableNode, TableRowNode, TableCellNode],
  export: (node: LexicalNode) => {
    if (!$isTableNode(node)) return null;
    const output: string[] = [];

    const cellToMarkdown = (cellNode: TableCellNode) =>
      $convertToMarkdownString(MARKDOWN_TRANSFORMERS, cellNode, true)
        .replace(/\n/g, "\\n")
        .trim();

    for (const row of node.getChildren()) {
      if (!$isTableRowNode(row)) continue;
      const rowOutput: string[] = [];
      let isHeaderRow = false;

      for (const cell of row.getChildren()) {
        if ($isTableCellNode(cell)) {
          rowOutput.push(cellToMarkdown(cell));
          if (cell.getHeaderStyles() === TableCellHeaderStates.ROW) {
            isHeaderRow = true;
          }
        }
      }

      output.push(`| ${rowOutput.join(" | ")} |`);
      if (isHeaderRow) {
        output.push(`| ${rowOutput.map(() => "---").join(" | ")} |`);
      }
    }
    return output.join("\n");
  },
  regExp: /^(?:\|)(.+)(?:\|)\s*$/,
  replace: (parentNode, _1, match) => {
    const TABLE_ROW_RE = /^(?:\|)(.+)(?:\|)\s*$/;
    const DIVIDER_RE = /^(\| ?:?-*:? ?)+\|\s*$/;

    const CreateCell = (text: string): TableCellNode => {
      const cell = $createTableCellNode(TableCellHeaderStates.NO_STATUS);
      $convertFromMarkdownString(
        text.replace(/\\n/g, "\n"),
        MARKDOWN_TRANSFORMERS,
        cell,
        true,
      );
      return cell;
    };

    const mapToCells = (text: string): TableCellNode[] | null => {
      const rowMatch = text.match(TABLE_ROW_RE);
      if (!rowMatch?.[1]) return null;
      return rowMatch[1].split("|").map((t) => CreateCell(t.trim()));
    };

    if (DIVIDER_RE.test(match[0])) {
      const table = parentNode.getPreviousSibling();
      if (!table || !$isTableNode(table)) return;
      const lastRow = table.getLastChild();
      if (!lastRow || !$isTableRowNode(lastRow)) return;
      for (const cell of lastRow.getChildren()) {
        if ($isTableCellNode(cell)) {
          cell.setHeaderStyles(TableCellHeaderStates.ROW);
        }
      }
      parentNode.remove();
      return;
    }

    const initialCells = mapToCells(match[0]);
    if (!initialCells) return;

    const rows: TableCellNode[][] = [initialCells];
    let sibling: LexicalNode | null = parentNode.getPreviousSibling();
    let maxCells = initialCells.length;

    while (sibling) {
      if (!$isParagraphNode(sibling) || sibling.getChildrenSize() !== 1) break;
      const firstChild = sibling.getFirstChild();
      if (!$isTextNode(firstChild)) break;
      const cells = mapToCells(firstChild.getTextContent());
      if (!cells) break;
      maxCells = Math.max(maxCells, cells.length);
      rows.unshift(cells);
      const prev = sibling.getPreviousSibling();
      sibling.remove();
      sibling = prev;
    }

    const tableNode = $createTableNode();
    for (const rowCells of rows) {
      const tableRow = $createTableRowNode();
      tableNode.append(tableRow);
      for (let i = 0; i < maxCells; i++) {
        tableRow.append(i < rowCells.length ? rowCells[i] : CreateCell(""));
      }
    }

    const prevTable = parentNode.getPreviousSibling();
    if ($isTableNode(prevTable)) {
      const prevCols = prevTable.getFirstChild();
      const colCount = $isTableRowNode(prevCols)
        ? prevCols.getChildrenSize()
        : 0;
      if (colCount === maxCells) {
        prevTable.append(...tableNode.getChildren());
        parentNode.remove();
        return;
      }
    }
    parentNode.replace(tableNode);
    tableNode.selectEnd();
  },
  type: "element",
};

const SUBSCRIPT_TRANSFORMER: TextFormatTransformer = {
  format: ["subscript"],
  tag: "~",
  type: "text-format",
};

const SUPERSCRIPT_TRANSFORMER: TextFormatTransformer = {
  format: ["superscript"],
  tag: "^",
  type: "text-format",
};

export const MARKDOWN_TRANSFORMERS = [
  CHECK_LIST,
  INLINE_CODE,
  CODE,
  UNDERLINE_TRANSFORMER,
  SUBSCRIPT_TRANSFORMER,
  SUPERSCRIPT_TRANSFORMER,
  BOLD_ITALIC_STAR,
  BOLD_STAR,
  ITALIC_STAR,
  STRIKETHROUGH,
  HEADING,
  ORDERED_LIST,
  UNORDERED_LIST,
  QUOTE,
  LINK,
  TABLE_TRANSFORMER,
  THEMATIC_BREAK_TRANSFORMER,
];

export const EDITOR_NODES = [
  HeadingNode,
  ListItemNode,
  ListNode,
  CodeNode,
  QuoteNode,
  LinkNode,
  HorizontalRuleNode,
  CodeHighlightNode,
  TextNode,
  TableCellNode,
  TableNode,
  TableRowNode,
];
