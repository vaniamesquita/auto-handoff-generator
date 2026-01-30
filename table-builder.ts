// src/ui/table-builder.ts

import { getFont } from "../utils/fonts";
import { TEXT_COLORS, TextStylePreset } from "../config/theme";

// ========================================
// TEXT HELPERS
// ========================================

export function createText(
  characters: string,
  preset: TextStylePreset = "body",
  color: RGB = { r: 0, g: 0, b: 0 }
): TextNode {
  const node = figma.createText();
  node.fontName = getFont("Regular");
  node.fontSize = 14;
  node.characters = characters;
  node.fills = [{ type: "SOLID", color }];
  return node;
}

// ========================================
// SECTION & CONTAINER HELPERS
// ========================================

export function createSectionTitle(title: string, parent: FrameNode): void {
  const text = figma.createText();
  text.fontName = getFont("Bold");
  text.fontSize = 32;
  text.characters = title;
  text.fills = [{ type: "SOLID", color: { r: 0.2, g: 0.2, b: 0.2 } }];
  text.letterSpacing = { value: 0, unit: "PIXELS" };
  parent.appendChild(text);
}

export function createAutoLayoutSection(
  name: string,
  spacing: number = 24
): FrameNode {
  const frame = figma.createFrame();
  frame.name = name;
  frame.layoutMode = "VERTICAL";
  frame.primaryAxisSizingMode = "AUTO"; // Height: Hug
  frame.counterAxisSizingMode = "FIXED"; // Width: Fixed
  frame.itemSpacing = spacing;
  frame.fills = [];
  return frame;
}

export function createTableAutoLayoutContainer(
  name: string,
  width: number,
  rowGap: number = 4 // Padrão: 4px entre linhas
): FrameNode {
  const frame = figma.createFrame();
  frame.name = name;
  frame.layoutMode = "VERTICAL";
  frame.primaryAxisSizingMode = "AUTO"; // Height: Hug
  frame.counterAxisSizingMode = "FIXED";
  frame.resize(width, 100);
  frame.itemSpacing = rowGap;
  frame.fills = [];
  return frame;
}

export function createVariantGridContainer(
  name: string,
  width: number,
  gap: number = 24
): FrameNode {
  const frame = figma.createFrame();
  frame.name = name;
  frame.layoutMode = "HORIZONTAL";
  frame.layoutWrap = "WRAP";
  frame.primaryAxisSizingMode = "FIXED";
  frame.counterAxisSizingMode = "AUTO";
  frame.resize(width, 100);
  frame.itemSpacing = gap;
  frame.counterAxisSpacing = gap;
  frame.fills = [];
  return frame;
}

export function groupElementsAndAppend(
  elements: SceneNode[],
  name: string,
  parent: FrameNode
): GroupNode {
  const group = figma.group(elements, parent);
  group.name = name;
  return group;
}

export function createTableRowBackground(
  width: number,
  height: number,
  color: RGB = { r: 1, g: 1, b: 1 },
  opacity: number = 1
): RectangleNode {
  const rect = figma.createRectangle();
  rect.resize(width, height);
  rect.fills = [{ type: "SOLID", color, opacity }];
  rect.cornerRadius = 4;
  return rect;
}

// ========================================
// TABLE BUILDER CLASS
// ========================================

interface ColumnConfig {
  header: string;
  position: number; // 0 a 1 (início da coluna em %)
  color?: keyof typeof TEXT_COLORS;
}

interface CellData {
  text: string;
  color?: keyof typeof TEXT_COLORS;
}

export class TableBuilder {
  private container: FrameNode;
  private width: number;
  private columns: ColumnConfig[];
  private themeColor = { r: 0.2, g: 0.2, b: 0.2 };

  constructor(name: string, width: number, columns: ColumnConfig[]) {
    this.width = width;
    this.columns = columns;

    // Inicializa com gap de 4px padrão para linhas normais
    this.container = createTableAutoLayoutContainer(name, width, 4);
    this.renderHeader();
  }

  private getColumnWidth(index: number): number {
    const startPct = this.columns[index].position;
    const endPct = this.columns[index + 1] ? this.columns[index + 1].position : 1.0;
    const width = (endPct - startPct) * this.width;
    return Math.max(width, 10);
  }

  private renderHeader() {
    const headerRow = figma.createFrame();
    headerRow.name = "Header";
    headerRow.layoutMode = "HORIZONTAL";
    headerRow.primaryAxisSizingMode = "FIXED";
    headerRow.counterAxisSizingMode = "AUTO"; 
    headerRow.resize(this.width, 32);
    headerRow.fills = [];
    headerRow.itemSpacing = 0; 
    headerRow.paddingTop = 12;
    headerRow.paddingBottom = 12; // Header mais espaçado

    this.columns.forEach((col, index) => {
      const isFirst = index === 0;
      
      const cell = figma.createFrame();
      cell.name = `Header-${col.header}`;
      cell.layoutMode = "VERTICAL";
      cell.primaryAxisSizingMode = "AUTO"; 
      
      if (isFirst) {
        cell.layoutGrow = 1;
        cell.counterAxisSizingMode = "FIXED"; 
      } else {
        const colWidth = this.getColumnWidth(index);
        cell.counterAxisSizingMode = "FIXED"; 
        cell.resize(colWidth, 20);
        cell.layoutGrow = 0;
      }
      cell.fills = [];
      
      if (isFirst) {
        cell.paddingLeft = 16;
        cell.paddingRight = 16;
      } else {
        cell.paddingLeft = 0;
        cell.paddingRight = 16;
      }

      const text = figma.createText();
      text.fontName = getFont("Bold");
      text.fontSize = 12;
      text.characters = col.header.toUpperCase();
      text.fills = [{ type: "SOLID", color: { r: 0.5, g: 0.5, b: 0.5 } }];
      text.textAutoResize = "HEIGHT";
      text.layoutAlign = "STRETCH";
      
      cell.appendChild(text);
      headerRow.appendChild(cell);
    });
    
    this.container.appendChild(headerRow);
    
    const divider = figma.createRectangle();
    divider.name = "Header Divider";
    divider.resize(this.width, 1);
    divider.fills = [{type: 'SOLID', color: {r: 0.9, g: 0.9, b: 0.9}}];
    this.container.appendChild(divider);
  }

  public addRow(rowName: string, cells: (string | CellData)[]) {
    const row = figma.createFrame();
    row.name = rowName;
    row.layoutMode = "HORIZONTAL";
    row.primaryAxisSizingMode = "FIXED"; 
    row.counterAxisSizingMode = "AUTO"; 
    row.resize(this.width, 40); 
    // CORREÇÃO: Fundo Branco na Linha
    row.fills = [{type: 'SOLID', color: {r:1, g:1, b:1}}]; 
    row.cornerRadius = 4; // Opcional: leve arredondamento se desejar
    row.itemSpacing = 0; 
    
    row.counterAxisAlignItems = "CENTER"; 
    
    row.paddingTop = 12;
    row.paddingBottom = 12;

    this.columns.forEach((colConfig, index) => {
      const cellData = cells[index];
      const textContent = typeof cellData === "string" ? cellData : (cellData?.text || "");
      const isFirst = index === 0;

      const cellFrame = figma.createFrame();
      cellFrame.name = `Cell-${colConfig.header}`;
      cellFrame.layoutMode = "VERTICAL";
      cellFrame.primaryAxisSizingMode = "AUTO"; 
      
      if (isFirst) {
        cellFrame.layoutGrow = 1;
        cellFrame.counterAxisSizingMode = "FIXED"; 
      } else {
        const colWidth = this.getColumnWidth(index);
        cellFrame.counterAxisSizingMode = "FIXED";
        cellFrame.resize(colWidth, 20);
        cellFrame.layoutGrow = 0;
      }
      
      cellFrame.fills = [];
      
      if (isFirst) {
        cellFrame.paddingLeft = 16;
        cellFrame.paddingRight = 16;
      } else {
        cellFrame.paddingLeft = 0;
        cellFrame.paddingRight = 16; 
      }
      
      const textNode = figma.createText();
      textNode.fontName = getFont("Regular");
      textNode.fontSize = 14;
      textNode.characters = textContent;
      
      let textColor = this.themeColor;
      if (typeof cellData !== "string" && cellData?.color) {
        textColor = TEXT_COLORS[cellData.color] || this.themeColor;
      } else if (colConfig.color) {
        textColor = TEXT_COLORS[colConfig.color] || this.themeColor;
      }
      textNode.fills = [{ type: "SOLID", color: textColor }];

      textNode.layoutAlign = "STRETCH"; 
      textNode.textAutoResize = "HEIGHT"; 
      
      cellFrame.appendChild(textNode);
      row.appendChild(cellFrame);
    });

    // CORREÇÃO: Adicionar diretamente ao container (que tem gap de 4px)
    // Sem wrapper, sem borda extra.
    this.container.appendChild(row);
  }

  public addSpacer(height: number) {
    // Spacer transparente para separar grupos
    const spacer = figma.createFrame();
    spacer.name = "Spacer";
    spacer.layoutMode = "VERTICAL"; // Importante para não bugar o autolayout pai
    spacer.resize(this.width, height);
    spacer.fills = []; 
    this.container.appendChild(spacer);
  }

  public appendTo(parent: FrameNode) {
    parent.appendChild(this.container);
  }
}

export function createTableBuilder(name: string, width: number, columns: ColumnConfig[]) {
  return new TableBuilder(name, width, columns);
}