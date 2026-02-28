import html2canvas from "html2canvas-pro";
import { jsPDF } from "jspdf";
import katex from "katex";
import { marked, type Token, type Tokens } from "marked";

const MARGIN_MM = 20;
const PAGE_HEIGHT_MM = 297;
const PAGE_WIDTH_MM = 210;
const CONTENT_WIDTH_MM = PAGE_WIDTH_MM - MARGIN_MM * 2;
const BASE_FONT_PT = 11;
const PT_TO_MM = 0.3528;
const LINE_HEIGHT_MULTIPLIER = 1.5;
const HTML_SCALE = 2;
const PX_TO_MM = 25.4 / 96;
const HEADING_SIZES_PT: Record<number, number> = {
  1: 26,
  2: 22,
  3: 18,
  4: 15,
  5: 13,
  6: BASE_FONT_PT,
};

type MathExpression = { source: string; display: boolean };
type InlineStyle = {
  bold: boolean;
  italic: boolean;
  mono: boolean;
  strike: boolean;
  superscript: boolean;
  subscript: boolean;
};
type TextSegment = { type: "text"; text: string; style: InlineStyle };
type MathSegment = { type: "math"; index: number };
type Segment = TextSegment | MathSegment;
type MathImage = { dataUrl: string; widthMm: number; heightMm: number };

const mathImageCache = new Map<string, Promise<MathImage>>();
let activeSubscriptTexts: string[] = [];

// compute line height millimeters
function lineHeightMm(sizePt: number) {
  return sizePt * PT_TO_MM * LINE_HEIGHT_MULTIPLIER;
}

// add page when overflowing
function ensurePageSpace(pdf: jsPDF, yMm: number, neededMm: number) {
  if (yMm + neededMm > PAGE_HEIGHT_MM - MARGIN_MM) {
    pdf.addPage();
    return MARGIN_MM;
  }
  return yMm;
}

// normalize lexical paragraph newlines
function normalizeMarkdown(markdown: string) {
  return markdown.replace(/\n(?!\n)/g, (_, offset: number) => {
    const before = markdown.slice(0, offset);
    const after = markdown.slice(offset + 1);
    const fenceCount = (before.match(/^```/gm) || []).length;
    if (fenceCount % 2 === 1) return "\n";
    if (/^(\s*[-*+>]|\s*\d+\.|\s*#{1,6}\s|---|\|)/.test(after)) return "\n";
    return "\n\n";
  });
}

// extract and placeholder math
function extractMath(markdown: string) {
  const expressions: MathExpression[] = [];
  let index = 0;

  const normalizedMarkdown = markdown.replace(
    /(\$\$[\s\S]+?\$\$|\\\[[\s\S]+?\\\]|\\\([\s\S]+?\\\)|\$[^$\n]+\$)/g,
    (fullMatch: string) => {
      const display =
        (fullMatch.startsWith("$$") && fullMatch.endsWith("$$")) ||
        (fullMatch.startsWith("\\[") && fullMatch.endsWith("\\]"));

      let source = fullMatch;
      if (fullMatch.startsWith("$$") && fullMatch.endsWith("$$"))
        source = fullMatch.slice(2, -2);
      else if (fullMatch.startsWith("\\[") && fullMatch.endsWith("\\]"))
        source = fullMatch.slice(2, -2);
      else if (fullMatch.startsWith("\\(") && fullMatch.endsWith("\\)"))
        source = fullMatch.slice(2, -2);
      else if (fullMatch.startsWith("$") && fullMatch.endsWith("$"))
        source = fullMatch.slice(1, -1);

      expressions.push({ source: source.trim(), display });
      const placeholder = `@@MATH_${index}@@`;
      index += 1;
      return placeholder;
    },
  );

  return { normalizedMarkdown, expressions };
}

// extract and placeholder subscripts
function extractSubscripts(markdown: string) {
  const subscriptTexts: string[] = [];
  let index = 0;

  const normalizedMarkdown = markdown.replace(
    /(^|[^~])~([^~\s][^~]*?)~(?!~)/g,
    (_, prefix: string, content: string) => {
      subscriptTexts.push(content);
      const placeholder = `@@SUB_${index}@@`;
      index += 1;
      return `${prefix}${placeholder}`;
    },
  );

  return { normalizedMarkdown, subscriptTexts };
}

// split text into segments
function splitTextWithMath(text: string, style: InlineStyle): Segment[] {
  const segments: Segment[] = [];
  const regex = /(@@MATH_(\d+)@@|@@SUB_(\d+)@@)/g;
  let last = 0;

  // parse inline superscript markers
  const pushStyledText = (value: string, baseStyle: InlineStyle) => {
    const styleRegex = /(\^[^^\s][^^]*\^)/g;
    let styleLast = 0;

    for (const styledMatch of value.matchAll(styleRegex)) {
      const matchIndex = styledMatch.index ?? 0;
      if (matchIndex > styleLast) {
        segments.push({
          type: "text",
          text: value.slice(styleLast, matchIndex),
          style: baseStyle,
        });
      }

      const token = styledMatch[0];
      const innerText = token.slice(1, -1);
      if (innerText) {
        segments.push({
          type: "text",
          text: innerText,
          style: { ...baseStyle, superscript: true, subscript: false },
        });
      }

      styleLast = matchIndex + token.length;
    }

    if (styleLast < value.length) {
      segments.push({
        type: "text",
        text: value.slice(styleLast),
        style: baseStyle,
      });
    }
  };

  for (const match of text.matchAll(regex)) {
    const index = match.index ?? 0;
    if (index > last) pushStyledText(text.slice(last, index), style);
    const mathIndex = match[2] ? Number.parseInt(match[2], 10) : Number.NaN;
    const subIndex = match[3] ? Number.parseInt(match[3], 10) : Number.NaN;

    if (!Number.isNaN(mathIndex)) {
      segments.push({ type: "math", index: mathIndex });
    } else if (!Number.isNaN(subIndex)) {
      const subText = activeSubscriptTexts[subIndex];
      if (subText) {
        segments.push({
          type: "text",
          text: subText,
          style: { ...style, subscript: true, superscript: false },
        });
      }
    }

    last = index + match[0].length;
  }

  if (last < text.length) pushStyledText(text.slice(last), style);
  if (segments.length === 0) pushStyledText(text, style);
  return segments;
}

// flatten marked inline tokens
function flattenInline(tokens: Token[], style: InlineStyle): Segment[] {
  const out: Segment[] = [];

  for (const token of tokens) {
    switch (token.type) {
      case "text":
        out.push(...splitTextWithMath(token.text, style));
        break;
      case "strong":
        out.push(
          ...flattenInline((token as Tokens.Strong).tokens, {
            ...style,
            bold: true,
          }),
        );
        break;
      case "em":
        out.push(
          ...flattenInline((token as Tokens.Em).tokens, {
            ...style,
            italic: true,
          }),
        );
        break;
      case "codespan":
        out.push({
          type: "text",
          text: (token as Tokens.Codespan).text,
          style: { ...style, mono: true },
        });
        break;
      case "del":
        out.push(
          ...flattenInline((token as Tokens.Del).tokens, {
            ...style,
            strike: true,
          }),
        );
        break;
      case "link":
        out.push(...flattenInline((token as Tokens.Link).tokens, style));
        break;
      case "br":
        out.push({ type: "text", text: "\n", style });
        break;
      default:
        if ("text" in token && typeof token.text === "string")
          out.push(...splitTextWithMath(token.text, style));
        break;
    }
  }

  return out;
}

// apply text font styling
function setFont(pdf: jsPDF, style: InlineStyle, sizePt: number) {
  const family = style.mono ? "courier" : "helvetica";
  const fontStyle =
    style.bold && style.italic
      ? "bolditalic"
      : style.bold
        ? "bold"
        : style.italic
          ? "italic"
          : "normal";
  const actualSizePt =
    style.superscript || style.subscript ? sizePt * 0.78 : sizePt;
  pdf.setFont(family, fontStyle);
  pdf.setFontSize(actualSizePt);
}

// replace math placeholders for fallback
function replaceMathPlaceholders(text: string, expressions: MathExpression[]) {
  return text.replace(
    /@@MATH_(\d+)@@/g,
    (match: string, indexValue: string) => {
      const expressionIndex = Number.parseInt(indexValue, 10);
      const expression = expressions[expressionIndex];
      if (!expression) return match;
      return expression.source;
    },
  );
}

// render katex to cached image
async function getMathImage(expression: MathExpression): Promise<MathImage> {
  const key = `${expression.display ? "D" : "I"}:${expression.source}:black`;
  const cached = mathImageCache.get(key);
  if (cached) return cached;

  const promise = (async () => {
    const container = document.createElement("div");
    container.style.cssText = [
      "position:fixed",
      "left:-99999px",
      "top:-99999px",
      "background:#ffffff",
      `padding:${expression.display ? "10px 14px" : "1px 2px"}`,
      `font-size:${expression.display ? "18px" : "14px"}`,
      expression.display ? "display:block" : "display:inline-block",
      "white-space:nowrap",
      "color:#000000",
    ].join(";");

    document.body.appendChild(container);

    katex.render(expression.source, container, {
      throwOnError: false,
      strict: "ignore",
      displayMode: expression.display,
    });

    for (const element of container.querySelectorAll(".katex, .katex *")) {
      (element as HTMLElement).style.color = "#000000";
    }

    const canvas = await html2canvas(container, {
      scale: HTML_SCALE,
      backgroundColor: "#ffffff",
      logging: false,
    });

    container.remove();

    return {
      dataUrl: canvas.toDataURL("image/png"),
      widthMm: (canvas.width / HTML_SCALE) * PX_TO_MM,
      heightMm: (canvas.height / HTML_SCALE) * PX_TO_MM,
    };
  })();

  mathImageCache.set(key, promise);
  return promise;
}

// render markdown table token
function renderTable(
  pdf: jsPDF,
  table: Tokens.Table,
  startYMm: number,
  expressions: MathExpression[],
) {
  const fontSizePt = BASE_FONT_PT - 1;
  const lineMm = lineHeightMm(fontSizePt);
  const columnCount = Math.max(1, table.header.length);
  const columnWidthMm = CONTENT_WIDTH_MM / columnCount;
  let currentYMm = startYMm;

  // render one table row
  const renderRow = (cells: Tokens.TableCell[], isHeader: boolean) => {
    const cellLines = cells.map((cell) => {
      const plainText = replaceMathPlaceholders(cell.text, expressions);
      return pdf.splitTextToSize(plainText, columnWidthMm - 2);
    });

    const maxLineCount = Math.max(1, ...cellLines.map((lines) => lines.length));
    const rowHeightMm = maxLineCount * lineMm + 2;
    currentYMm = ensurePageSpace(pdf, currentYMm, rowHeightMm + 1);

    if (isHeader) {
      pdf.setFillColor(240, 240, 240);
      pdf.rect(
        MARGIN_MM,
        currentYMm - lineMm + 1,
        CONTENT_WIDTH_MM,
        rowHeightMm,
        "F",
      );
    }

    for (let columnIndex = 0; columnIndex < cells.length; columnIndex++) {
      const drawX = MARGIN_MM + columnIndex * columnWidthMm + 1;
      const lines = cellLines[columnIndex] ?? [""];
      pdf.setFont("helvetica", isHeader ? "bold" : "normal");
      pdf.setFontSize(fontSizePt);

      let drawY = currentYMm;
      for (const line of lines) {
        pdf.text(String(line), drawX, drawY);
        drawY += lineMm;
      }
    }

    pdf.setDrawColor(220, 220, 220);
    pdf.setLineWidth(0.1);
    for (let columnIndex = 0; columnIndex <= columnCount; columnIndex++) {
      const x = MARGIN_MM + columnIndex * columnWidthMm;
      pdf.line(
        x,
        currentYMm - lineMm + 1,
        x,
        currentYMm - lineMm + 1 + rowHeightMm,
      );
    }
    pdf.line(
      MARGIN_MM,
      currentYMm - lineMm + 1,
      MARGIN_MM + CONTENT_WIDTH_MM,
      currentYMm - lineMm + 1,
    );
    pdf.line(
      MARGIN_MM,
      currentYMm - lineMm + 1 + rowHeightMm,
      MARGIN_MM + CONTENT_WIDTH_MM,
      currentYMm - lineMm + 1 + rowHeightMm,
    );

    currentYMm += rowHeightMm;
  };

  renderRow(table.header, true);
  for (const row of table.rows) renderRow(row, false);

  return currentYMm + 1;
}

// render mixed text and math
async function renderSegments(
  pdf: jsPDF,
  segments: Segment[],
  expressions: MathExpression[],
  startXMm: number,
  startYMm: number,
  maxWidthMm: number,
  fontSizePt: number,
) {
  const lineMm = lineHeightMm(fontSizePt);
  let xMm = startXMm;
  let yMm = startYMm;

  // move cursor to newline
  const newLine = () => {
    xMm = startXMm;
    yMm += lineMm;
    yMm = ensurePageSpace(pdf, yMm, lineMm);
  };

  for (const segment of segments) {
    if (segment.type === "math") {
      const expression = expressions[segment.index];
      if (!expression) continue;
      const image = await getMathImage(expression);

      if (expression.display) {
        if (xMm !== startXMm) newLine();
        const maxDisplayWidth = CONTENT_WIDTH_MM * 0.94;
        const scale = Math.min(1, maxDisplayWidth / image.widthMm);
        const widthMm = image.widthMm * scale;
        const heightMm = image.heightMm * scale;

        yMm = ensurePageSpace(pdf, yMm, heightMm + 5);
        const drawX = MARGIN_MM + (CONTENT_WIDTH_MM - widthMm) / 2;
        pdf.addImage(image.dataUrl, "PNG", drawX, yMm + 1, widthMm, heightMm);
        yMm += heightMm + 3;
        xMm = startXMm;
      } else {
        const scale = Math.min(1, (lineMm * 1.25) / image.heightMm);
        const widthMm = image.widthMm * scale;
        const heightMm = image.heightMm * scale;

        if (xMm + widthMm > startXMm + maxWidthMm && xMm > startXMm) newLine();

        yMm = ensurePageSpace(pdf, yMm, lineMm);
        const topMm = yMm - lineMm + Math.max(0, (lineMm - heightMm) * 0.45);
        pdf.addImage(image.dataUrl, "PNG", xMm, topMm, widthMm, heightMm);
        xMm += widthMm + 0.6;
      }

      continue;
    }

    const text = segment.text;
    setFont(pdf, segment.style, fontSizePt);
    const chunks = text.split("\n");

    for (let i = 0; i < chunks.length; i++) {
      if (i > 0) newLine();
      const words = chunks[i].split(/(\s+)/);

      for (const word of words) {
        if (!word) continue;
        const widthMm = pdf.getTextWidth(word);
        if (xMm + widthMm > startXMm + maxWidthMm && xMm > startXMm) newLine();

        yMm = ensurePageSpace(pdf, yMm, lineMm);
        const yOffsetMm = segment.style.superscript
          ? -lineMm * 0.28
          : segment.style.subscript
            ? lineMm * 0.16
            : 0;
        pdf.text(word, xMm, yMm + yOffsetMm);

        if (segment.style.strike && word.trim()) {
          const strikeY = yMm + yOffsetMm - lineMm * 0.32;
          pdf.setDrawColor(80, 80, 80);
          pdf.setLineWidth(0.2);
          pdf.line(xMm, strikeY, xMm + widthMm, strikeY);
        }

        xMm += widthMm;
      }
    }
  }

  return yMm + lineMm;
}

// render one markdown token
async function renderToken(
  pdf: jsPDF,
  token: Token,
  yMm: number,
  expressions: MathExpression[],
  indentMm = 0,
): Promise<number> {
  const xMm = MARGIN_MM + indentMm;
  const widthMm = CONTENT_WIDTH_MM - indentMm;
  let currentYMm = yMm;

  switch (token.type) {
    case "heading": {
      const heading = token as Tokens.Heading;
      const size = HEADING_SIZES_PT[heading.depth] ?? BASE_FONT_PT;
      currentYMm = ensurePageSpace(pdf, currentYMm, lineHeightMm(size) * 2);
      const segs = flattenInline(heading.tokens, {
        bold: true,
        italic: false,
        mono: false,
        strike: false,
        superscript: false,
        subscript: false,
      });
      return (
        (await renderSegments(
          pdf,
          segs,
          expressions,
          xMm,
          currentYMm,
          widthMm,
          size,
        )) + 0.8
      );
    }

    case "paragraph": {
      const paragraph = token as Tokens.Paragraph;
      const segs = flattenInline(paragraph.tokens, {
        bold: false,
        italic: false,
        mono: false,
        strike: false,
        superscript: false,
        subscript: false,
      });
      currentYMm = ensurePageSpace(pdf, currentYMm, lineHeightMm(BASE_FONT_PT));
      return (
        (await renderSegments(
          pdf,
          segs,
          expressions,
          xMm,
          currentYMm,
          widthMm,
          BASE_FONT_PT,
        )) + 0.6
      );
    }

    case "code": {
      const code = token as Tokens.Code;
      const sizePt = BASE_FONT_PT - 1;
      const lineMm = lineHeightMm(sizePt);
      const lines = code.text.split("\n");
      const blockMm = Math.max(lineMm + 3, lines.length * lineMm + 4);
      currentYMm = ensurePageSpace(pdf, currentYMm, blockMm + 2);

      pdf.setFillColor(245, 245, 245);
      pdf.roundedRect(
        MARGIN_MM - 1,
        currentYMm - lineMm + 1.8,
        CONTENT_WIDTH_MM + 2,
        blockMm,
        1.3,
        1.3,
        "F",
      );
      pdf.setFont("courier", "normal");
      pdf.setFontSize(sizePt);
      pdf.setTextColor(38, 38, 38);

      let drawY = currentYMm;
      for (const line of lines) {
        const wrapped = pdf.splitTextToSize(line, CONTENT_WIDTH_MM - 4);
        for (const wrappedLine of wrapped) {
          drawY = ensurePageSpace(pdf, drawY, lineMm);
          pdf.text(wrappedLine, MARGIN_MM + 1.4, drawY);
          drawY += lineMm;
        }
      }

      pdf.setTextColor(0, 0, 0);
      return drawY + 1;
    }

    case "blockquote": {
      const blockquote = token as Tokens.Blockquote;
      const startY = currentYMm;
      for (const child of blockquote.tokens) {
        if (child.type === "paragraph") {
          const paragraph = child as Tokens.Paragraph;
          const segs = flattenInline(paragraph.tokens, {
            bold: false,
            italic: true,
            mono: false,
            strike: false,
            superscript: false,
            subscript: false,
          });
          const quoteTextX = MARGIN_MM + indentMm + 6;
          const quoteTextWidth = CONTENT_WIDTH_MM - (indentMm + 6);
          currentYMm = ensurePageSpace(
            pdf,
            currentYMm,
            lineHeightMm(BASE_FONT_PT),
          );
          currentYMm =
            (await renderSegments(
              pdf,
              segs,
              expressions,
              quoteTextX,
              currentYMm,
              quoteTextWidth,
              BASE_FONT_PT,
            )) + 0.6;
        } else {
          currentYMm = await renderToken(
            pdf,
            child,
            currentYMm,
            expressions,
            indentMm + 6,
          );
        }
      }
      const baseLineMm = lineHeightMm(BASE_FONT_PT);
      const quoteTopY = startY - baseLineMm + 1;
      const quoteBottomY = currentYMm - baseLineMm * 0.25;
      pdf.setDrawColor(225, 225, 225);
      pdf.setLineWidth(1.05);
      pdf.line(xMm + 0.8, quoteTopY, xMm + 0.8, quoteBottomY);
      return currentYMm;
    }

    case "list": {
      const list = token as Tokens.List;
      for (let i = 0; i < list.items.length; i++) {
        const item = list.items[i];
        currentYMm = ensurePageSpace(
          pdf,
          currentYMm,
          lineHeightMm(BASE_FONT_PT),
        );

        const marker = item.task
          ? item.checked
            ? "[x]"
            : "[ ]"
          : list.ordered
            ? `${(list.start as number) + i}.`
            : "•";
        pdf.setFont("helvetica", "normal");
        pdf.setFontSize(BASE_FONT_PT);
        pdf.text(marker, xMm, currentYMm);
        const markerWidth = pdf.getTextWidth(`${marker} `);

        for (const child of item.tokens) {
          if (child.type === "text" && "tokens" in child && child.tokens) {
            const segs = flattenInline(child.tokens as Token[], {
              bold: false,
              italic: false,
              mono: false,
              strike: false,
              superscript: false,
              subscript: false,
            });
            currentYMm = await renderSegments(
              pdf,
              segs,
              expressions,
              xMm + markerWidth,
              currentYMm,
              widthMm - markerWidth,
              BASE_FONT_PT,
            );
          } else {
            currentYMm = await renderToken(
              pdf,
              child,
              currentYMm,
              expressions,
              indentMm + markerWidth + 1.5,
            );
          }
        }

        currentYMm += 0.4;
      }
      return currentYMm;
    }

    case "hr": {
      currentYMm = ensurePageSpace(pdf, currentYMm, 5);
      currentYMm += 2;
      pdf.setDrawColor(200, 200, 200);
      pdf.setLineWidth(0.35);
      pdf.line(MARGIN_MM, currentYMm, MARGIN_MM + CONTENT_WIDTH_MM, currentYMm);
      return currentYMm + 3;
    }

    case "table": {
      return renderTable(pdf, token as Tokens.Table, currentYMm, expressions);
    }

    case "space":
      return currentYMm + lineHeightMm(BASE_FONT_PT) * 0.5;

    default:
      return currentYMm;
  }
}

// export markdown as pdf file
export async function downloadMarkdownPdf(
  markdown: string,
  fileName: string,
): Promise<boolean> {
  const { normalizedMarkdown, expressions } = extractMath(markdown);
  const { normalizedMarkdown: normalizedWithSubscripts, subscriptTexts } =
    extractSubscripts(normalizedMarkdown);
  activeSubscriptTexts = subscriptTexts;
  const normalized = normalizeMarkdown(normalizedWithSubscripts);
  const tokens = marked.lexer(normalized, { gfm: true, breaks: false });

  const pdf = new jsPDF({ unit: "mm", format: "a4" });
  let yMm = MARGIN_MM;
  for (const token of tokens)
    yMm = await renderToken(pdf, token, yMm, expressions);

  const blob = pdf.output("blob");
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `${fileName}.pdf`;
  anchor.style.display = "none";
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 120);
  activeSubscriptTexts = [];

  return true;
}
