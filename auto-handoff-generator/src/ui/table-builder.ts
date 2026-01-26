// ========================================================================
// AUTO HANDOFF GENERATOR - TABLE BUILDER
// ========================================================================

import type {TableColumnConfig, TableCellData, TableRowConfig} from "../types";
import {TEXT_STYLE_PRESETS, TEXT_COLORS, TextStylePreset} from "../config/theme";
import {getFont} from "../utils/fonts";

// ========================================
// TEXT CREATION HELPERS
// ========================================

/**
 * Creates a text node with configurable style.
 * @param content - The text content
 * @param preset - Style preset name or custom style object
 * @param options - Optional color and position
 * @returns Created TextNode
 */
export function createText(
  content: string,
  preset:
    | TextStylePreset
    | {fontSize: number; fontStyle: "Regular" | "Medium" | "Bold"} = "body",
  options?: {
    color?: RGB | keyof typeof TEXT_COLORS;
    x?: number;
    y?: number;
  },
): TextNode {
  const textNode = figma.createText();

  // Determine style (preset or custom)
  const style =
    typeof preset === "string" ? TEXT_STYLE_PRESETS[preset] : preset;

  textNode.fontName = getFont(style.fontStyle);
  textNode.fontSize = style.fontSize;
  textNode.characters = content;

  // Apply color
  if (options?.color) {
    const colorValue =
      typeof options.color === "string"
        ? TEXT_COLORS[options.color]
        : options.color;
    textNode.fills = [{type: "SOLID", color: colorValue}];
  }

  // Apply position
  if (options?.x !== undefined) textNode.x = options.x;
  if (options?.y !== undefined) textNode.y = options.y;

  return textNode;
}

/**
 * Creates a text node and adds it to a container.
 * @param content - The text content
 * @param preset - Style preset name or custom style object
 * @param container - The parent container
 * @param options - Optional color and position
 * @returns Created TextNode
 */
export function createTextInContainer(
  content: string,
  preset:
    | TextStylePreset
    | {fontSize: number; fontStyle: "Regular" | "Medium" | "Bold"} = "body",
  container: FrameNode,
  options?: {
    color?: RGB | keyof typeof TEXT_COLORS;
    x?: number;
    y?: number;
  },
): TextNode {
  const textNode = createText(content, preset, options);
  container.appendChild(textNode);
  return textNode;
}

// ========================================
// SECTION & CONTAINER HELPERS
// ========================================

/**
 * Creates an AutoLayout section frame.
 * @param name - Section name
 * @param width - Section width
 * @param itemSpacing - Spacing between items
 * @returns Created FrameNode
 */
export function createAutoLayoutSection(
  name: string,
  width: number,
  itemSpacing: number = 24,
): FrameNode {
  const section = figma.createFrame();
  section.name = name;
  section.layoutMode = "VERTICAL";
  section.primaryAxisSizingMode = "AUTO";
  section.counterAxisSizingMode = "FIXED";
  section.resize(width, 100);
  section.counterAxisSizingMode = "AUTO";
  section.itemSpacing = itemSpacing;
  section.fills = [];
  return section;
}

/**
 * Creates a section title.
 * @param text - Title text
 * @param parent - Parent frame
 * @param fontSize - Font size (default: 32)
 * @param style - Font style (default: "Bold")
 * @returns Created TextNode
 */
export function createSectionTitle(
  text: string,
  parent: FrameNode,
  fontSize: number = 32,
  style: "Bold" | "Medium" | "Regular" = "Bold",
): TextNode {
  const title = figma.createText();
  title.fontName = getFont(style);
  title.fontSize = fontSize;
  title.characters = text;
  parent.appendChild(title);
  return title;
}

/**
 * Creates a simple table container frame.
 * @param name - Container name
 * @returns Created FrameNode
 */
export function createTableContainer(name: string): FrameNode {
  const table = figma.createFrame();
  table.name = name;
  table.fills = [];
  return table;
}

/**
 * Creates a table container with vertical AutoLayout for rows.
 * @param name - Container name
 * @param tableWidth - Table width
 * @param rowGap - Gap between rows (default: 4)
 * @returns Created FrameNode
 */
export function createTableAutoLayoutContainer(
  name: string,
  tableWidth: number,
  rowGap: number = 4,
): FrameNode {
  const container = figma.createFrame();
  container.name = name;
  container.layoutMode = "VERTICAL";
  container.primaryAxisSizingMode = "AUTO";
  container.counterAxisSizingMode = "FIXED";
  container.resize(tableWidth, 100);
  container.itemSpacing = rowGap;
  container.fills = [];
  return container;
}

/**
 * Creates a variant grid container with wrap.
 * @param name - Grid name
 * @param tableWidth - Grid width
 * @param itemSpacing - Item spacing (default: 24)
 * @returns Created FrameNode
 */
export function createVariantGridContainer(
  name: string,
  tableWidth: number,
  itemSpacing: number = 24,
): FrameNode {
  const grid = figma.createFrame();
  grid.name = name;
  grid.layoutMode = "HORIZONTAL";
  grid.layoutWrap = "WRAP";
  grid.primaryAxisSizingMode = "FIXED";
  grid.counterAxisSizingMode = "AUTO";
  grid.resize(tableWidth, 100);
  grid.itemSpacing = itemSpacing;
  grid.counterAxisSpacing = itemSpacing;
  grid.fills = [];
  return grid;
}

// ========================================
// ROW & CELL HELPERS
// ========================================

/**
 * Converts elements into a Group and adds to container.
 * @param elements - Scene nodes to group
 * @param groupName - Name for the group
 * @param container - Parent container
 * @returns Created GroupNode
 */
export function groupElementsAndAppend(
  elements: SceneNode[],
  groupName: string,
  container: FrameNode,
): GroupNode {
  // Create temporary frame WITHOUT AutoLayout to preserve positions
  const tempFrame = figma.createFrame();
  tempFrame.name = "temp";
  tempFrame.fills = [];

  // Add elements to temporary frame (preserves x/y)
  for (const el of elements) {
    tempFrame.appendChild(el);
  }

  // Group elements inside temporary frame
  const group = figma.group(elements, tempFrame);
  group.name = groupName;

  // Move group to final container (AutoLayout)
  container.appendChild(group);

  // Remove temporary frame
  tempFrame.remove();

  return group;
}

/**
 * Creates a table row background rectangle.
 * @param width - Row width
 * @param height - Row height (default: 44)
 * @param cornerRadius - Corner radius (default: 4)
 * @returns Created RectangleNode
 */
export function createTableRowBackground(
  width: number,
  height: number = 44,
  cornerRadius: number = 4,
): RectangleNode {
  const rowBg = figma.createRectangle();
  rowBg.name = "Row Background";
  rowBg.resize(width, height);
  rowBg.fills = [{type: "SOLID", color: {r: 1, g: 1, b: 1}}];
  rowBg.cornerRadius = cornerRadius;
  rowBg.x = 0;
  rowBg.y = 0;
  return rowBg;
}

/**
 * Creates a text cell for a table.
 * @param config - Cell configuration
 * @returns Created TextNode
 */
export function createTableTextCell(config: {
  text: string;
  x: number;
  y?: number;
  fontSize?: number;
  fontStyle?: "Regular" | "Bold" | "Medium";
  color?: RGB;
}): TextNode {
  const {
    text,
    x,
    y = 12,
    fontSize = 16,
    fontStyle = "Regular",
    color = {r: 0, g: 0, b: 0},
  } = config;

  const textNode = figma.createText();
  textNode.fontName = getFont(fontStyle);
  textNode.fontSize = fontSize;
  textNode.characters = text;
  textNode.fills = [{type: "SOLID", color}];
  textNode.x = x;
  textNode.y = y;
  return textNode;
}

/**
 * Creates a table header row.
 * @param headers - Header texts
 * @param positions - X positions for each header
 * @param tableContainer - Parent container
 */
export function createTableHeader(
  headers: string[],
  positions: number[],
  tableContainer: FrameNode,
): void {
  const headerElements: SceneNode[] = [];

  for (let i = 0; i < headers.length; i++) {
    const headerText = createTableTextCell({
      text: headers[i],
      x: positions[i],
      y: 0,
      fontStyle: "Bold",
      color: {r: 0.4, g: 0.4, b: 0.4},
    });
    headerElements.push(headerText);
  }

  groupElementsAndAppend(headerElements, "Header", tableContainer);
}

/**
 * Creates a complete table row and adds it to container.
 * @param config - Row configuration
 * @param container - Parent container
 * @returns Created GroupNode
 */
export function createTableRow(
  config: TableRowConfig,
  container: FrameNode,
): GroupNode {
  const rowElements: SceneNode[] = [];

  // Row background
  rowElements.push(createTableRowBackground(config.width, config.height ?? 44));

  // Text cells
  for (const cell of config.cells) {
    rowElements.push(createTableTextCell({
      text: cell.text,
      x: cell.x,
      color: cell.color,
    }));
  }

  return groupElementsAndAppend(rowElements, config.name, container);
}

/**
 * Creates a spacer between table row groups.
 * @param width - Spacer width
 * @param height - Spacer height
 * @param container - Parent container
 */
export function createTableSpacer(
  width: number,
  height: number,
  container: FrameNode,
): void {
  const spacer = figma.createFrame();
  spacer.name = "Spacer";
  spacer.resize(width, height);
  spacer.fills = [];
  container.appendChild(spacer);
}

// ========================================
// TABLE BUILDER CLASS
// ========================================

/**
 * TableBuilder class for simplified table creation.
 * Automates container, header, and row creation.
 */
export class TableBuilder {
  private container: FrameNode;
  private columns: TableColumnConfig[];
  private tableWidth: number;
  private rowHeight: number;
  private rowGap: number;

  constructor(
    name: string,
    tableWidth: number,
    columns: TableColumnConfig[],
    options?: {
      rowHeight?: number;
      rowGap?: number;
    },
  ) {
    this.tableWidth = tableWidth;
    this.columns = columns;
    this.rowHeight = options?.rowHeight ?? 44;
    this.rowGap = options?.rowGap ?? 4;

    // Create main container
    this.container = createTableAutoLayoutContainer(
      name,
      tableWidth,
      this.rowGap,
    );

    // Create header automatically
    this.createHeader();
  }

  /**
   * Creates the header row.
   */
  private createHeader(): void {
    const headerElements: SceneNode[] = [];

    for (const col of this.columns) {
      const x =
        col.position <= 1
          ? Math.floor(this.tableWidth * col.position)
          : col.position;

      const headerText = createText(col.header, "bodyBold", {
        color: "secondary",
        x,
        y: 0,
      });
      headerElements.push(headerText);
    }

    groupElementsAndAppend(headerElements, "Header", this.container);
  }

  /**
   * Adds a data row to the table.
   * @param rowName - Row identifier name
   * @param cells - Cell data (must match columns)
   */
  addRow(rowName: string, cells: TableCellData[]): void {
    const rowElements: SceneNode[] = [];

    // Row background
    rowElements.push(createTableRowBackground(this.tableWidth, this.rowHeight));

    // Cells
    for (let i = 0; i < this.columns.length && i < cells.length; i++) {
      const col = this.columns[i];
      const cell = cells[i];

      const x =
        col.position <= 1
          ? Math.floor(this.tableWidth * col.position) + 16 // internal padding
          : col.position + 16;

      // Resolve color
      let colorValue: RGB = TEXT_COLORS.default;
      if (cell.color) {
        colorValue =
          typeof cell.color === "string"
            ? TEXT_COLORS[cell.color as keyof typeof TEXT_COLORS]
            : cell.color;
      } else if (col.color) {
        colorValue =
          typeof col.color === "string"
            ? TEXT_COLORS[col.color as keyof typeof TEXT_COLORS]
            : col.color;
      }

      const textNode = createText(cell.text, "body", {
        color: colorValue,
        x,
        y: 12,
      });
      rowElements.push(textNode);

      // Extra elements
      if (cell.extraElements) {
        for (const el of cell.extraElements) {
          rowElements.push(el);
        }
      }
    }

    groupElementsAndAppend(rowElements, rowName, this.container);
  }

  /**
   * Adds a spacer between row groups.
   * @param height - Spacer height (default: 12)
   */
  addSpacer(height: number = 12): void {
    createTableSpacer(this.tableWidth, height, this.container);
  }

  /**
   * Returns the table container to be added to parent.
   */
  build(): FrameNode {
    return this.container;
  }

  /**
   * Adds the table to parent container.
   * @param parent - Parent frame
   */
  appendTo(parent: FrameNode): void {
    parent.appendChild(this.container);
  }
}

/**
 * Factory function to create TableBuilder with simplified config.
 * @param name - Table name
 * @param tableWidth - Table width
 * @param columns - Column configurations
 * @param options - Optional row height and gap
 * @returns New TableBuilder instance
 */
export function createTableBuilder(
  name: string,
  tableWidth: number,
  columns: TableColumnConfig[],
  options?: {rowHeight?: number; rowGap?: number},
): TableBuilder {
  return new TableBuilder(name, tableWidth, columns, options);
}
