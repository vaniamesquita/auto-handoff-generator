// ========================================================================
// AUTO HANDOFF GENERATOR - SECTION GENERATORS
// ========================================================================

import type {
  VariantColors,
  ColorSpec,
  TextSpec,
  VariantProperty,
  AnnotationTracker,
} from "../types";
import {SIZE_ORDER, getTheme} from "../config/theme";
import {getFont} from "../utils/fonts";
import {
  hexToRgb,
  formatToken,
  extractRelevantProperties,
} from "../utils/helpers";
import {findTextNodes, resolveNodeName} from "../core/node-helpers";
import {
  createAutoLayoutSection,
  createSectionTitle,
  createTableAutoLayoutContainer,
  createVariantGridContainer,
  groupElementsAndAppend,
  createTableRowBackground,
  createText,
  createTableBuilder,
} from "../ui/table-builder";
import {
  annotateGapNew,
  annotatePaddingNew,
  annotateRadiusNew,
  annotateBorderNew,
  annotateDimensionNew,
  createSimpleAnnotation,
} from "../ui/annotations";

// ========================================
// HELPER FUNCTIONS
// ========================================

/**
 * Creates a section container with vertical layout.
 */
function createSectionContainer(
  name: string,
  itemSpacing: number = 24,
): FrameNode {
  const section = figma.createFrame();
  section.name = name;
  section.layoutMode = "VERTICAL";
  section.primaryAxisSizingMode = "AUTO";
  section.counterAxisSizingMode = "AUTO";
  section.itemSpacing = itemSpacing;
  section.fills = [];
  return section;
}

/**
 * Gets a formatted title for a variant.
 */
function getVariantTitle(variantColors: VariantColors): string {
  const {propertyMap} = variantColors;
  const priorityOrder = ["size", "type", "variant", "state", "status", "mode"];
  const titleParts: string[] = [];

  for (const prop of priorityOrder) {
    if (propertyMap[prop]) {
      titleParts.push(propertyMap[prop]);
    }
  }

  for (const [key, value] of Object.entries(propertyMap)) {
    if (!priorityOrder.includes(key) && value) {
      titleParts.push(value);
    }
  }

  if (titleParts.length > 0) {
    return titleParts.join(" / ").toUpperCase();
  }

  return variantColors.variantName || "DEFAULT";
}

/**
 * Sorts variants by size order.
 */
function sortVariantsBySize(variants: VariantColors[]): VariantColors[] {
  return [...variants].sort((a, b) => {
    const sizeA = (a.propertyMap.size || "").toLowerCase();
    const sizeB = (b.propertyMap.size || "").toLowerCase();
    const orderA = SIZE_ORDER[sizeA] ?? 99;
    const orderB = SIZE_ORDER[sizeB] ?? 99;
    return orderA - orderB;
  });
}

/**
 * Formats variant properties for table display.
 */
function formatVariantPropertiesForTable(
  propertyMap: Record<string, string>,
): string {
  const priorityOrder = ["size", "type", "variant", "state", "status", "mode"];
  const parts: string[] = [];

  for (const prop of priorityOrder) {
    if (propertyMap[prop]) {
      const label = prop.charAt(0).toUpperCase() + prop.slice(1);
      parts.push(`${label}: ${propertyMap[prop]}`);
    }
  }

  for (const [key, value] of Object.entries(propertyMap)) {
    if (!priorityOrder.includes(key) && value) {
      const label = key.charAt(0).toUpperCase() + key.slice(1);
      parts.push(`${label}: ${value}`);
    }
  }

  if (parts.length > 0) {
    return parts.join(" / ");
  }

  return "Default";
}

// ========================================
// FILTER AND DEDUPLICATION
// ========================================

/**
 * Filters variants for visualization based on selected properties.
 */
function filterVariantsForVisualization(
  variantColors: VariantColors[],
  selectedProperties: Record<string, string[]>,
): VariantColors[] {
  if (!selectedProperties || Object.keys(selectedProperties).length === 0) {
    return variantColors;
  }

  const hasAnySelection = Object.values(selectedProperties).some(
    (values) => values.length > 0,
  );
  if (!hasAnySelection) {
    return variantColors;
  }

  const filtered = variantColors.filter((vc) => {
    const variantProps = vc.propertyMap;

    for (const [propName, selectedValues] of Object.entries(
      selectedProperties,
    )) {
      if (selectedValues.length === 0) continue;

      const variantValue = variantProps[propName];
      if (!variantValue) continue;

      const isSelected = selectedValues.some(
        (v) => v.toLowerCase() === variantValue.toLowerCase(),
      );
      if (!isSelected) {
        return false;
      }
    }
    return true;
  });

  return deduplicateVariants(filtered, selectedProperties);
}

/**
 * Deduplicates variants prioritizing Default, Regular, Enabled.
 */
function deduplicateVariants(
  variants: VariantColors[],
  selectedProperties: Record<string, string[]>,
): VariantColors[] {
  const PRIORITY_VALUES = ["default", "regular", "enabled"];
  const selectedPropNames = Object.keys(selectedProperties).filter(
    (k) => selectedProperties[k].length > 0,
  );

  const groups = new Map<string, VariantColors[]>();

  for (const vc of variants) {
    const keyParts = selectedPropNames
      .map((prop) => `${prop}=${vc.propertyMap[prop] || ""}`)
      .sort();
    const key = keyParts.join("|");

    if (!groups.has(key)) {
      groups.set(key, []);
    }
    groups.get(key)!.push(vc);
  }

  const result: VariantColors[] = [];

  for (const groupVariants of groups.values()) {
    if (groupVariants.length === 1) {
      result.push(groupVariants[0]);
      continue;
    }

    const allPropNames = new Set<string>();
    for (const vc of groupVariants) {
      Object.keys(vc.propertyMap).forEach((k) => allPropNames.add(k));
    }
    const hiddenPropNames = [...allPropNames].filter(
      (p) => !selectedPropNames.includes(p),
    );

    let bestVariant = groupVariants[0];
    let bestScore = -1;

    for (const vc of groupVariants) {
      let score = 0;
      for (const prop of hiddenPropNames) {
        const value = (vc.propertyMap[prop] || "").toLowerCase();
        if (PRIORITY_VALUES.includes(value)) {
          score++;
        }
      }
      if (score > bestScore) {
        bestScore = score;
        bestVariant = vc;
      }
    }

    result.push(bestVariant);
  }

  return result;
}

// ========================================
// VARIANT GRID CREATION
// ========================================

interface VariantGridConfig {
  gridName: string;
  margin: number;
  minHeight?: number;
}

interface VariantAnnotationContext {
  variant: ComponentNode;
  instance: InstanceNode;
  vizFrame: FrameNode;
  vc: VariantColors;
  instanceBounds: {x: number; y: number; width: number; height: number};
  highlightMode: boolean;
}

type VariantAnnotationCallback = (
  ctx: VariantAnnotationContext,
) => Promise<void>;

/**
 * Creates a titled variant frame for visualizations.
 */
async function createTitledVariantFrame(
  variant: ComponentNode,
  title: string,
  frameWidth: number,
  frameHeight: number,
  highlightMode: boolean,
): Promise<{outerFrame: FrameNode; vizFrame: FrameNode; instance: InstanceNode}> {
  const outerFrame = figma.createFrame();
  outerFrame.name = `Variant: ${title}`;
  outerFrame.layoutMode = "VERTICAL";
  outerFrame.primaryAxisSizingMode = "AUTO";
  outerFrame.counterAxisSizingMode = "AUTO";
  outerFrame.itemSpacing = 12;
  outerFrame.fills = [];

  const titleText = figma.createText();
  titleText.fontName = getFont("Medium");
  titleText.fontSize = 14;
  titleText.characters = title;
  titleText.fills = [{type: "SOLID", color: {r: 0.4, g: 0.4, b: 0.4}}];
  outerFrame.appendChild(titleText);

  const vizFrame = figma.createFrame();
  vizFrame.name = "Visualization Frame";
  vizFrame.resize(frameWidth, frameHeight);
  const frameBgColor = highlightMode
    ? {r: 56 / 255, g: 83 / 255, b: 255 / 255}
    : {r: 0.98, g: 0.98, b: 0.98};
  vizFrame.fills = [{type: "SOLID", color: frameBgColor}];
  vizFrame.cornerRadius = 8;
  vizFrame.clipsContent = false;

  const instance = variant.createInstance();
  instance.x = frameWidth / 2 - instance.width / 2;
  instance.y = frameHeight / 2 - instance.height / 2;
  vizFrame.appendChild(instance);

  outerFrame.appendChild(vizFrame);

  return {outerFrame, vizFrame, instance};
}

/**
 * Creates a generic variant grid for visualizations.
 * Uses TWO-PASS pattern: first calculates max height, then renders with fixed height.
 */
async function createGenericVariantGrid(
  parent: FrameNode,
  componentSet: ComponentSetNode,
  variantColors: VariantColors[],
  tableWidth: number,
  highlightMode: boolean,
  framesPerRow: number,
  config: VariantGridConfig,
  annotationCallback: VariantAnnotationCallback,
): Promise<void> {
  const sortedVariants = sortVariantsBySize(variantColors);
  const minHeight = config.minHeight ?? 250;
  const GRID_GAP = 24;

  // Container principal com wrap
  const gridContainer = figma.createFrame();
  gridContainer.name = config.gridName;
  gridContainer.layoutMode = "HORIZONTAL";
  gridContainer.layoutWrap = "WRAP";
  gridContainer.primaryAxisSizingMode = "FIXED";
  gridContainer.counterAxisSizingMode = "AUTO";
  gridContainer.resize(tableWidth, 100);
  gridContainer.itemSpacing = GRID_GAP;
  gridContainer.counterAxisSpacing = GRID_GAP;
  gridContainer.fills = [];

  // Calcular tamanho dos frames baseado no número de colunas
  const numColumns = framesPerRow;
  const frameWidth = Math.floor(
    (tableWidth - (numColumns - 1) * GRID_GAP) / numColumns,
  );

  // ========================================
  // LOOP 1: CÁLCULO - Calcular altura máxima de todas as variantes ANTES do loop de renderização
  // ========================================
  let maxFrameHeight = minHeight;
  for (const vc of sortedVariants) {
    const variant = componentSet.children.find(
      (c) => c.type === "COMPONENT" && c.name === vc.variantName,
    ) as ComponentNode | undefined;
    if (variant) {
      const candidateHeight = Math.max(
        minHeight,
        variant.height + config.margin * 2,
      );
      if (candidateHeight > maxFrameHeight) {
        maxFrameHeight = candidateHeight;
      }
    }
  }

  // ========================================
  // LOOP 2: RENDERIZAÇÃO - Processar cada variante com altura fixa
  // ========================================
  for (const vc of sortedVariants) {
    const variant = componentSet.children.find(
      (c) => c.type === "COMPONENT" && c.name === vc.variantName,
    ) as ComponentNode | undefined;

    if (!variant) continue;

    const frameHeight = maxFrameHeight; // Usar altura máxima calculada
    const title = getVariantTitle(vc);

    const {outerFrame, vizFrame, instance} = await createTitledVariantFrame(
      variant,
      title,
      frameWidth,
      frameHeight,
      highlightMode,
    );

    const instanceBounds = instance.absoluteBoundingBox;
    if (instanceBounds) {
      // Chamar callback de anotação com contexto completo
      await annotationCallback({
        vc,
        variant,
        instance,
        vizFrame,
        instanceBounds,
        highlightMode,
      });
    }

    gridContainer.appendChild(outerFrame);
  }

  parent.appendChild(gridContainer);
}

// ========================================
// COLOR SECTION
// ========================================

/**
 * Creates the combined colors section.
 */
export async function createColorSectionCombined(
  parent: FrameNode,
  variantColors: VariantColors[],
  tableWidth: number,
): Promise<boolean> {
  const hasColors = variantColors.some((v) => v.colors.length > 0);
  if (!hasColors) return false;

  const section = createSectionContainer("Seção Cores");
  createSectionTitle("CORES", section);

  await createColorTableInSection(section, variantColors, tableWidth);

  parent.appendChild(section);
  return true;
}

/**
 * Creates the color table with consolidation and deduplication.
 */
async function createColorTableInSection(
  parent: FrameNode,
  variantColors: VariantColors[],
  tableWidth: number,
): Promise<void> {
  const hasColors = variantColors.some((v) => v.colors.length > 0);
  if (!hasColors) return;

  const ROW_HEIGHT = 44;
  const ROW_GAP = 4;
  const GROUP_SPACING = 16;

  const tableContainer = createTableAutoLayoutContainer(
    "Tabela Cores",
    tableWidth,
    ROW_GAP,
  );

  // Header
  const headerElements: SceneNode[] = [];
  const headers = ["Elemento / Estado", "Token", "Referência"];
  const headerX = [
    0,
    Math.floor(tableWidth * 0.4),
    Math.floor(tableWidth * 0.8),
  ];

  for (let i = 0; i < headers.length; i++) {
    const headerText = figma.createText();
    headerText.fontName = getFont("Bold");
    headerText.fontSize = 16;
    headerText.characters = headers[i];
    headerText.fills = [{type: "SOLID", color: {r: 0.4, g: 0.4, b: 0.4}}];
    headerText.x = headerX[i];
    headerText.y = 0;
    headerElements.push(headerText);
  }
  groupElementsAndAppend(headerElements, "Header", tableContainer);

  // Group colors by state
  const colorsByStatus: Map<
    string,
    {element: string; state: string; colorSpec: ColorSpec}[]
  > = new Map();

  for (const variant of variantColors) {
    for (const color of variant.colors) {
      const state = color.state || "Default";
      if (!colorsByStatus.has(state)) colorsByStatus.set(state, []);
      colorsByStatus.get(state)!.push({
        element: color.element,
        state: state,
        colorSpec: color,
      });
    }
  }

  // Deduplicate colors within each status
  for (const [status, colors] of colorsByStatus) {
    const seen = new Set<string>();
    const uniqueColors = colors.filter((c) => {
      const key = `${c.element}-${c.colorSpec.token || c.colorSpec.colorHex}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
    colorsByStatus.set(status, uniqueColors);
  }

  const sortedStatuses = Array.from(colorsByStatus.keys()).sort();

  let isFirstStatus = true;
  for (const status of sortedStatuses) {
    const colorRows = colorsByStatus.get(status)!;

    if (!isFirstStatus) {
      const spacer = figma.createFrame();
      spacer.name = "Spacer";
      spacer.resize(tableWidth, GROUP_SPACING - ROW_GAP);
      spacer.fills = [];
      tableContainer.appendChild(spacer);
    }
    isFirstStatus = false;

    for (const colorRow of colorRows) {
      const rowElements: SceneNode[] = [];

      // Row background
      const rowBg = figma.createRectangle();
      rowBg.name = "Row Background";
      rowBg.resize(tableWidth, ROW_HEIGHT);
      rowBg.fills = [{type: "SOLID", color: {r: 1, g: 1, b: 1}}];
      rowBg.cornerRadius = 4;
      rowBg.x = 0;
      rowBg.y = 0;
      rowElements.push(rowBg);

      // Element / State text
      const elementText = figma.createText();
      elementText.fontName = getFont("Regular");
      elementText.fontSize = 16;
      elementText.characters = `${colorRow.state} / ${colorRow.element}`;
      elementText.x = 16;
      elementText.y = 12;
      rowElements.push(elementText);

      // Token text
      const tokenText = figma.createText();
      tokenText.fontName = getFont("Regular");
      tokenText.fontSize = 16;
      tokenText.characters =
        colorRow.colorSpec.token || colorRow.colorSpec.colorHex;
      tokenText.fills = [{type: "SOLID", color: {r: 0.85, g: 0.1, b: 0.1}}];
      tokenText.x = Math.floor(tableWidth * 0.4);
      tokenText.y = 12;
      rowElements.push(tokenText);

      // Color circle
      const colorCircle = figma.createEllipse();
      colorCircle.resize(32, 32);
      colorCircle.x = Math.floor(tableWidth * 0.8);
      colorCircle.y = 6;
      if (colorRow.colorSpec.colorVariableId) {
        colorCircle.fills = [
          {
            type: "SOLID",
            color: {r: 0.5, g: 0.5, b: 0.5},
            boundVariables: {
              color: {
                type: "VARIABLE_ALIAS",
                id: colorRow.colorSpec.colorVariableId,
              },
            },
          },
        ];
      } else {
        colorCircle.fills = [
          {type: "SOLID", color: hexToRgb(colorRow.colorSpec.colorHex)},
        ];
      }
      colorCircle.strokes = [
        {type: "SOLID", color: {r: 0.85, g: 0.85, b: 0.85}},
      ];
      colorCircle.strokeWeight = 1;
      rowElements.push(colorCircle);

      groupElementsAndAppend(
        rowElements,
        `${colorRow.state} / ${colorRow.element}`,
        tableContainer,
      );
    }
  }

  parent.appendChild(tableContainer);
}

// ========================================
// TEXT SECTION
// ========================================

/**
 * Creates the combined text patterns section.
 */
export async function createTextSectionCombined(
  parent: FrameNode,
  variantColors: VariantColors[],
  nodeToProcess: ComponentNode | ComponentSetNode | InstanceNode,
  tableWidth: number,
  highlightMode: boolean,
  vizPropertyFilters: Record<string, string[]>,
  framesPerRow: number = 2,
  showTable: boolean = true,
  showViz: boolean = true,
): Promise<boolean> {
  const hasText = variantColors.some((v) => v.textStyles.length > 0);
  if (!hasText) return false;

  if (!showTable && !showViz) return false;

  const section = createSectionContainer("Seção Padrões de Texto");
  createSectionTitle("PADRÕES DE TEXTO", section);

  if (showTable) {
    await createTextTableInSection(section, variantColors, tableWidth);
  }

  if (showViz) {
    await createTextVisualizationInSection(
      section,
      nodeToProcess,
      variantColors,
      tableWidth,
      highlightMode,
      vizPropertyFilters,
      framesPerRow,
    );
  }

  parent.appendChild(section);
  return true;
}

/**
 * Creates the text table with consolidation and deduplication.
 */
async function createTextTableInSection(
  parent: FrameNode,
  variantColors: VariantColors[],
  tableWidth: number,
): Promise<void> {
  const hasText = variantColors.some((v) => v.textStyles.length > 0);
  if (!hasText) return;

  const table = createTableBuilder("Tabela Tipografia", tableWidth, [
    {header: "Elemento", position: 0},
    {header: "Componente", position: 0.45},
  ]);

  // Collect all textStyles with Size / Element
  const allTextRows: {
    sizeElement: string;
    textSpec: TextSpec;
    sizeOrder: number;
  }[] = [];

  for (const variant of variantColors) {
    const size = variant.propertyMap.size || "Default";
    const sizeOrder = SIZE_ORDER[size.toLowerCase()] ?? 99;

    for (const text of variant.textStyles) {
      allTextRows.push({
        sizeElement: `${size} / ${text.element}`,
        textSpec: text,
        sizeOrder,
      });
    }
  }

  // Sort by size
  allTextRows.sort((a, b) => a.sizeOrder - b.sizeOrder);

  // Deduplicate by sizeElement + token
  const seen = new Set<string>();
  const uniqueRows = allTextRows.filter((row) => {
    const key = `${row.sizeElement}-${row.textSpec.token || row.textSpec.fontFamily}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  // Add rows using TableBuilder
  for (const textRow of uniqueRows) {
    const tokenValue = textRow.textSpec.token
      ? `$textstyle-${textRow.textSpec.token.replace(/\//g, "-")}`
      : `${textRow.textSpec.fontFamily} / ${textRow.textSpec.fontWeight} / ${textRow.textSpec.fontSize}px / LH: ${textRow.textSpec.lineHeight} / LS: ${textRow.textSpec.letterSpacing || "0%"}`;

    table.addRow(textRow.sizeElement, [
      {text: textRow.sizeElement},
      {
        text: tokenValue,
        color: textRow.textSpec.token ? "success" : "secondary",
      },
    ]);
  }

  table.appendTo(parent);
}

/**
 * Creates text visualization in section.
 */
async function createTextVisualizationInSection(
  parent: FrameNode,
  component: ComponentNode | ComponentSetNode | InstanceNode,
  variantColors: VariantColors[],
  tableWidth: number,
  highlightMode: boolean,
  vizPropertyFilters: Record<string, string[]>,
  framesPerRow: number,
): Promise<void> {
  const hasText = variantColors.some((v) => v.textStyles.length > 0);
  if (!hasText) return;

  const filteredVariants = filterVariantsForVisualization(
    variantColors,
    vizPropertyFilters,
  );

  // If it's a ComponentSet with multiple variants, use grid
  if (component.type === "COMPONENT_SET" && filteredVariants.length > 1) {
    await createGenericVariantGrid(
      parent,
      component,
      filteredVariants,
      tableWidth,
      highlightMode,
      framesPerRow,
      {
        gridName: "Grid Variantes - Texto",
        margin: 80,
      },
      async (ctx) => {
        if (ctx.vc.textStyles.length === 0) return;

        const allTextNodes = await findTextNodes(ctx.instance);
        const color = getTheme(ctx.highlightMode).text;

        const seenNames = new Set<string>();
        const uniqueTextNodes: TextNode[] = [];
        for (const node of allTextNodes) {
          const resolvedName = await resolveNodeName(node);
          const name = resolvedName.toLowerCase();
          if (!seenNames.has(name)) {
            seenNames.add(name);
            uniqueTextNodes.push(node);
          }
        }

        for (let i = 0; i < uniqueTextNodes.length; i++) {
          const textNode = uniqueTextNodes[i];
          const textBounds = textNode.absoluteBoundingBox;
          if (!textBounds) continue;

          const textRelX = textBounds.x - ctx.instanceBounds.x;
          const textRelY = textBounds.y - ctx.instanceBounds.y;
          const nodeW = textBounds.width;
          const nodeH = textBounds.height;

          const resolvedNodeName = await resolveNodeName(textNode);
          const nodeName = resolvedNodeName.toLowerCase();
          const textNodeFontName =
            textNode.fontName !== figma.mixed
              ? textNode.fontName
              : {family: "Mixed", style: "Mixed"};
          const textNodeFontSize =
            textNode.fontSize !== figma.mixed ? textNode.fontSize : 0;
          let label = "";

          const specElementLower = (s: string) => s.toLowerCase();
          for (const spec of ctx.vc.textStyles) {
            const specEl = specElementLower(spec.element);
            if (
              specEl === nodeName ||
              nodeName.includes(specEl) ||
              specEl.includes(nodeName)
            ) {
              label = spec.token
                ? `$textstyle-${spec.token.replace(/\//g, "-")}`
                : `${spec.fontFamily} / ${spec.fontWeight} / ${spec.fontSize}px / LH: ${spec.lineHeight}`;
              break;
            }
          }

          if (!label) {
            for (const spec of ctx.vc.textStyles) {
              if (
                spec.fontFamily === textNodeFontName.family &&
                spec.fontWeight === textNodeFontName.style &&
                spec.fontSize === textNodeFontSize
              ) {
                label = spec.token
                  ? `$textstyle-${spec.token.replace(/\//g, "-")}`
                  : `${spec.fontFamily} / ${spec.fontWeight} / ${spec.fontSize}px / LH: ${spec.lineHeight}`;
                break;
              }
            }
          }

          if (!label) {
            label = `${textNodeFontName.family} / ${textNodeFontName.style}`;
          }

          const textX = ctx.instance.x + textRelX;
          const textY = ctx.instance.y + textRelY;
          const isAbove = i % 2 === 0;
          const LINE_LENGTH = 20;
          const DOT_OFFSET = 15;

          const startX = textX + nodeW / 2;
          const startY = isAbove
            ? textY - DOT_OFFSET
            : textY + nodeH + DOT_OFFSET;
          const endX = startX;
          const endY = isAbove
            ? textY - DOT_OFFSET - LINE_LENGTH
            : textY + nodeH + DOT_OFFSET + LINE_LENGTH;

          await createSimpleAnnotation(
            ctx.vizFrame,
            startX,
            startY,
            endX,
            endY,
            label,
            color,
          );
        }
      },
    );
    return;
  }

  // Single instance visualization for non-ComponentSet or single variant
  let baseComponent: ComponentNode | InstanceNode | null = null;
  if (component.type === "COMPONENT_SET") {
    baseComponent = component.children.find(
      (c) => c.type === "COMPONENT",
    ) as ComponentNode;
  } else {
    baseComponent = component;
  }
  if (!baseComponent) return;

  const instance =
    baseComponent.type === "INSTANCE"
      ? (baseComponent.clone() as InstanceNode)
      : baseComponent.createInstance();

  const MARGIN = 100;
  const frameHeight = Math.max(300, instance.height + MARGIN * 2);

  const vizContainer = figma.createFrame();
  vizContainer.name = "Visualização Textos";
  vizContainer.layoutMode = "VERTICAL";
  vizContainer.primaryAxisSizingMode = "AUTO";
  vizContainer.counterAxisSizingMode = "FIXED";
  vizContainer.resize(tableWidth, 100);
  vizContainer.itemSpacing = 16;
  vizContainer.fills = [];

  const subTitle = figma.createText();
  subTitle.fontName = getFont("Medium");
  subTitle.fontSize = 18;
  subTitle.characters = "Visualização";
  vizContainer.appendChild(subTitle);

  const vizFrame = figma.createFrame();
  vizFrame.name = "Text Visualization";
  vizFrame.resize(tableWidth, frameHeight);
  const frameBgColor = highlightMode
    ? {r: 56 / 255, g: 83 / 255, b: 255 / 255}
    : {r: 0.98, g: 0.98, b: 0.98};
  vizFrame.fills = [{type: "SOLID", color: frameBgColor}];
  vizFrame.cornerRadius = 8;
  vizFrame.clipsContent = false;

  instance.x = tableWidth / 2 - instance.width / 2;
  instance.y = frameHeight / 2 - instance.height / 2;
  vizFrame.appendChild(instance);

  const allTextNodes = await findTextNodes(instance);
  const instanceBounds = instance.absoluteBoundingBox;

  if (instanceBounds) {
    const textStyles = variantColors[0]?.textStyles || [];
    const color = getTheme(highlightMode).text;

    const seenNames = new Set<string>();
    const uniqueTextNodes = allTextNodes.filter((node) => {
      const name = node.name.toLowerCase();
      if (seenNames.has(name)) return false;
      seenNames.add(name);
      return true;
    });

    for (let i = 0; i < uniqueTextNodes.length; i++) {
      const textNode = uniqueTextNodes[i];
      const textBounds = textNode.absoluteBoundingBox;
      if (!textBounds) continue;

      const textRelX = textBounds.x - instanceBounds.x;
      const textRelY = textBounds.y - instanceBounds.y;
      const nodeW = textBounds.width;
      const nodeH = textBounds.height;
      const nodeName = textNode.name.toLowerCase();
      const textNodeFontName =
        textNode.fontName !== figma.mixed
          ? textNode.fontName
          : {family: "Mixed", style: "Mixed"};
      const textNodeFontSize =
        textNode.fontSize !== figma.mixed ? textNode.fontSize : 0;

      let label = "";
      for (const spec of textStyles) {
        const specEl = spec.element.toLowerCase();
        if (
          specEl === nodeName ||
          nodeName.includes(specEl) ||
          specEl.includes(nodeName)
        ) {
          label = spec.token
            ? `$textstyle-${spec.token.replace(/\//g, "-")}`
            : `${spec.fontFamily} / ${spec.fontWeight} / ${spec.fontSize}px / LH: ${spec.lineHeight}`;
          break;
        }
      }

      if (!label) {
        for (const spec of textStyles) {
          if (
            spec.fontFamily === textNodeFontName.family &&
            spec.fontWeight === textNodeFontName.style &&
            spec.fontSize === textNodeFontSize
          ) {
            label = spec.token
              ? `$textstyle-${spec.token.replace(/\//g, "-")}`
              : `${spec.fontFamily} / ${spec.fontWeight} / ${spec.fontSize}px / LH: ${spec.lineHeight}`;
            break;
          }
        }
      }

      if (!label) {
        label = `${textNodeFontName.family} / ${textNodeFontName.style}`;
      }

      const textX = instance.x + textRelX;
      const textY = instance.y + textRelY;
      const isAbove = i % 2 === 0;
      const LINE_LENGTH = 20;
      const DOT_OFFSET = 15;

      const startX = textX + nodeW / 2;
      const startY = isAbove ? textY - DOT_OFFSET : textY + nodeH + DOT_OFFSET;
      const endX = startX;
      const endY = isAbove
        ? textY - DOT_OFFSET - LINE_LENGTH
        : textY + nodeH + DOT_OFFSET + LINE_LENGTH;

      await createSimpleAnnotation(
        vizFrame,
        startX,
        startY,
        endX,
        endY,
        label,
        color,
      );
    }
  }

  vizContainer.appendChild(vizFrame);
  parent.appendChild(vizContainer);
}

// ========================================
// SPACING SECTION
// ========================================

/**
 * Creates the combined spacing section.
 */
export async function createSpacingSectionCombined(
  parent: FrameNode,
  variantColors: VariantColors[],
  nodeToProcess: ComponentNode | ComponentSetNode | InstanceNode,
  tableWidth: number,
  highlightMode: boolean,
  vizPropertyFilters: Record<string, string[]>,
  framesPerRow: number = 2,
  showTable: boolean = true,
  showViz: boolean = true,
): Promise<boolean> {
  const hasSpacings = variantColors.some(
    (v) => v.spacings.length > 0 || v.borders.length > 0,
  );
  if (!hasSpacings) return false;

  if (!showTable && !showViz) return false;

  const section = createSectionContainer("Seção Medidas e Espaçamentos");
  createSectionTitle("MEDIDAS E ESPAÇAMENTOS", section);

  if (showTable) {
    await createSpacingTableInSection(section, variantColors, tableWidth);
  }

  if (showViz) {
    await createPaddingGapVisualizationInSection(
      section,
      nodeToProcess,
      variantColors,
      tableWidth,
      highlightMode,
      vizPropertyFilters,
      framesPerRow,
    );

    await createDimensionVisualizationInSection(
      section,
      nodeToProcess,
      variantColors,
      tableWidth,
      highlightMode,
      vizPropertyFilters,
      framesPerRow,
    );
  }

  parent.appendChild(section);
  return true;
}

/**
 * Creates the spacing table with consolidation.
 */
async function createSpacingTableInSection(
  parent: FrameNode,
  variantColors: VariantColors[],
  tableWidth: number,
): Promise<void> {
  const hasSpacing = variantColors.some(
    (v) => v.spacings.length > 0 || v.borders.length > 0,
  );
  if (!hasSpacing) return;

  const GROUP_SPACING = 20;
  const ROW_GAP = 4;

  const table = createTableBuilder("Tabela Espaçamentos", tableWidth, [
    {header: "Medida", position: 0},
    {header: "Token / Valor", position: 0.4, color: "error"},
    {header: "Referência", position: 0.75},
  ]);

  // Group by measure type (property) and collect unique tokens
  const spacingsByProperty: Map<
    string,
    {token: string | null; value: string; variants: string[]}[]
  > = new Map();

  for (const variant of variantColors) {
    const variantLabel = formatVariantPropertiesForTable(variant.propertyMap);

    for (const spacing of variant.spacings) {
      if (!spacingsByProperty.has(spacing.property)) {
        spacingsByProperty.set(spacing.property, []);
      }
      const entries = spacingsByProperty.get(spacing.property)!;
      const existing = entries.find(
        (e) => (e.token || e.value) === (spacing.token || spacing.value),
      );
      if (existing) {
        if (!existing.variants.includes(variantLabel)) {
          existing.variants.push(variantLabel);
        }
      } else {
        entries.push({
          token: spacing.token,
          value: spacing.value,
          variants: [variantLabel],
        });
      }
    }

    for (const border of variant.borders) {
      const sideName =
        border.side && border.side !== "All" ? ` ${border.side}` : "";
      const positionName = border.position ? ` (${border.position})` : "";
      const propName = `Border${sideName}${positionName}`;

      if (!spacingsByProperty.has(propName)) {
        spacingsByProperty.set(propName, []);
      }
      const entries = spacingsByProperty.get(propName)!;
      const existing = entries.find(
        (e) => (e.token || e.value) === (border.token || border.value),
      );
      if (existing) {
        if (!existing.variants.includes(variantLabel)) {
          existing.variants.push(variantLabel);
        }
      } else {
        entries.push({
          token: border.token,
          value: border.value,
          variants: [variantLabel],
        });
      }
    }
  }

  // Create display entries list
  interface DisplayEntry {
    prefix: string;
    displayText: string;
    token: string | null;
    value: string;
  }
  const allDisplayEntries: DisplayEntry[] = [];

  const allVariantLabels = new Set<string>();
  for (const variant of variantColors) {
    const variantLabel = formatVariantPropertiesForTable(variant.propertyMap);
    allVariantLabels.add(variantLabel);
  }
  const totalVariants = allVariantLabels.size;

  for (const [property, entries] of spacingsByProperty) {
    for (const entry of entries) {
      const isUsedByAllVariants = entry.variants.length === totalVariants;

      if (isUsedByAllVariants && totalVariants > 1) {
        allDisplayEntries.push({
          prefix: "Todos",
          displayText: `Todos / ${property}`,
          token: entry.token,
          value: entry.value,
        });
      } else {
        const entryGroups = new Set<string>();
        for (const variantLabel of entry.variants) {
          const firstPart = variantLabel.split(" / ")[0];
          const groupValue = firstPart.split(": ")[1] || firstPart;
          entryGroups.add(groupValue);
        }

        for (const group of entryGroups) {
          allDisplayEntries.push({
            prefix: group,
            displayText: `${group} / ${property}`,
            token: entry.token,
            value: entry.value,
          });
        }
      }
    }
  }

  // Group by semantic prefix
  const entriesByPrefix: Map<string, DisplayEntry[]> = new Map();
  for (const entry of allDisplayEntries) {
    if (!entriesByPrefix.has(entry.prefix)) {
      entriesByPrefix.set(entry.prefix, []);
    }
    entriesByPrefix.get(entry.prefix)!.push(entry);
  }

  // Sort prefixes: "Todos" first, then alphabetically
  const sortedPrefixes = Array.from(entriesByPrefix.keys()).sort((a, b) => {
    if (a === "Todos") return -1;
    if (b === "Todos") return 1;
    return a.localeCompare(b);
  });

  // Render grouped by prefix
  let isFirstGroup = true;
  for (const prefix of sortedPrefixes) {
    const groupEntries = entriesByPrefix.get(prefix)!;
    if (groupEntries.length === 0) continue;

    if (!isFirstGroup) {
      table.addSpacer(GROUP_SPACING - ROW_GAP);
    }
    isFirstGroup = false;

    for (const entry of groupEntries) {
      table.addRow(`Row - ${entry.displayText}`, [
        {text: entry.displayText},
        {text: entry.token || "-", color: "error"},
        {text: entry.value},
      ]);
    }
  }

  table.appendTo(parent);
}

/**
 * Creates padding/gap visualization in section.
 */
async function createPaddingGapVisualizationInSection(
  parent: FrameNode,
  component: ComponentNode | ComponentSetNode | InstanceNode,
  variantColors: VariantColors[],
  tableWidth: number,
  highlightMode: boolean,
  vizPropertyFilters: Record<string, string[]>,
  framesPerRow: number,
): Promise<void> {
  const filteredVariants = filterVariantsForVisualization(
    variantColors,
    vizPropertyFilters,
  );

  // Se ComponentSet com múltiplas variantes, usar grid
  if (component.type === "COMPONENT_SET" && filteredVariants.length > 1) {
    await createGenericVariantGrid(
      parent,
      component,
      filteredVariants,
      tableWidth,
      highlightMode,
      framesPerRow,
      {
        gridName: "Grid Variantes - Espaçamentos",
        margin: 100,
      },
      async (ctx) => {
        await processSpacingNodeForViz(
          ctx.instance,
          ctx.vizFrame,
          ctx.instance.x,
          ctx.instance.y,
          ctx.instanceBounds,
          ctx.highlightMode,
        );
      },
    );
    return;
  }

  // Fallback: single variant visualization
  let baseComponent: ComponentNode | InstanceNode | null = null;
  if (component.type === "COMPONENT_SET") {
    baseComponent = component.children.find(
      (c) => c.type === "COMPONENT",
    ) as ComponentNode;
  } else {
    baseComponent = component;
  }
  if (!baseComponent) return;

  const instance =
    baseComponent.type === "INSTANCE"
      ? (baseComponent.clone() as InstanceNode)
      : baseComponent.createInstance();

  const vizContainer = figma.createFrame();
  vizContainer.name = "Visualização Paddings e Gaps";
  vizContainer.layoutMode = "VERTICAL";
  vizContainer.primaryAxisSizingMode = "AUTO";
  vizContainer.counterAxisSizingMode = "FIXED";
  vizContainer.resize(tableWidth, 100);
  vizContainer.itemSpacing = 16;
  vizContainer.fills = [];

  const subTitle = figma.createText();
  subTitle.fontName = getFont("Medium");
  subTitle.fontSize = 18;
  subTitle.characters = "Visualização de Paddings e Gaps";
  vizContainer.appendChild(subTitle);

  const MARGIN = 120;
  const frameWidth = tableWidth;
  const frameHeight = Math.max(300, instance.height + MARGIN * 2);

  const frame = figma.createFrame();
  frame.name = "Spacing Visualization";
  frame.resize(frameWidth, frameHeight);
  const frameBgColor = highlightMode
    ? {r: 56 / 255, g: 83 / 255, b: 255 / 255}
    : {r: 0.98, g: 0.98, b: 0.98};
  frame.fills = [{type: "SOLID", color: frameBgColor}];
  frame.cornerRadius = 8;
  frame.clipsContent = false;

  instance.x = frameWidth / 2 - instance.width / 2;
  instance.y = frameHeight / 2 - instance.height / 2;
  frame.appendChild(instance);

  const instanceBounds = instance.absoluteBoundingBox;
  if (instanceBounds) {
    await processSpacingNodeForViz(
      instance,
      frame,
      instance.x,
      instance.y,
      instanceBounds,
      highlightMode,
    );
  }

  vizContainer.appendChild(frame);
  parent.appendChild(vizContainer);
}

/**
 * Creates dimension visualization in section.
 */
async function createDimensionVisualizationInSection(
  parent: FrameNode,
  component: ComponentNode | ComponentSetNode | InstanceNode,
  variantColors: VariantColors[],
  tableWidth: number,
  highlightMode: boolean,
  vizPropertyFilters: Record<string, string[]>,
  framesPerRow: number,
): Promise<void> {
  const filteredVariants = filterVariantsForVisualization(
    variantColors,
    vizPropertyFilters,
  );

  // Se ComponentSet com múltiplas variantes, usar grid
  if (component.type === "COMPONENT_SET" && filteredVariants.length > 1) {
    const vizContainer = figma.createFrame();
    vizContainer.name = "Visualização Dimensões e Bordas";
    vizContainer.layoutMode = "VERTICAL";
    vizContainer.primaryAxisSizingMode = "AUTO";
    vizContainer.counterAxisSizingMode = "AUTO";
    vizContainer.itemSpacing = 16;
    vizContainer.fills = [];

    const subTitle = figma.createText();
    subTitle.fontName = getFont("Bold");
    subTitle.fontSize = 32;
    subTitle.characters = "Visualização de Dimensões e Bordas";
    vizContainer.appendChild(subTitle);

    await createGenericVariantGrid(
      vizContainer,
      component,
      filteredVariants,
      tableWidth,
      highlightMode,
      framesPerRow,
      {
        gridName: "Grid Variantes - Dimensões",
        margin: 100,
      },
      async (ctx) => {
        const instX = ctx.instance.x;
        const instY = ctx.instance.y;
        const instW = ctx.instance.width;
        const instH = ctx.instance.height;

        const heightToken = await findHeightToken(ctx.variant);
        const radiusInfo = findCornerRadius(ctx.variant);
        const strokeInfo = await findStrokeWeight(ctx.instance);

        await annotateDimensionNew(
          ctx.vizFrame,
          "height",
          instH,
          instX,
          instY,
          instW,
          instH,
          heightToken,
          ctx.highlightMode,
        );

        if (radiusInfo) {
          const radiusToken = await findCornerRadiusToken(ctx.variant);
          await annotateRadiusNew(
            ctx.vizFrame,
            radiusInfo.value,
            instX,
            instY,
            instW,
            instH,
            radiusToken,
            ctx.highlightMode,
          );
        }

        if (strokeInfo && strokeInfo.length > 0) {
          for (const stroke of strokeInfo) {
            let borderToken: string | null = null;
            const varKey =
              stroke.side === "All"
                ? "strokeWeight"
                : `stroke${stroke.side}Weight`;
            if (varKey in stroke.boundVars && stroke.boundVars[varKey]?.id) {
              const variable = await figma.variables.getVariableByIdAsync(
                stroke.boundVars[varKey].id,
              );
              if (variable) borderToken = variable.name.replace(/\//g, "-");
            }
            await annotateBorderNew(
              ctx.vizFrame,
              stroke.value,
              instX,
              instY,
              instW,
              instH,
              borderToken,
              ctx.highlightMode,
              stroke.side,
              stroke.position,
            );
          }
        }
      },
    );

    parent.appendChild(vizContainer);
    return;
  }

  // Fallback: single variant visualization
  let baseComponent: ComponentNode | InstanceNode | null = null;
  if (component.type === "COMPONENT_SET") {
    baseComponent = component.children.find(
      (c) => c.type === "COMPONENT",
    ) as ComponentNode;
  } else {
    baseComponent = component;
  }
  if (!baseComponent) return;

  const instance =
    baseComponent.type === "INSTANCE"
      ? (baseComponent.clone() as InstanceNode)
      : baseComponent.createInstance();

  const vizContainer = figma.createFrame();
  vizContainer.name = "Visualização Dimensões e Bordas";
  vizContainer.layoutMode = "VERTICAL";
  vizContainer.primaryAxisSizingMode = "AUTO";
  vizContainer.counterAxisSizingMode = "FIXED";
  vizContainer.resize(tableWidth, 100);
  vizContainer.itemSpacing = 16;
  vizContainer.fills = [];

  const subTitle = figma.createText();
  subTitle.fontName = getFont("Medium");
  subTitle.fontSize = 18;
  subTitle.characters = "Visualização de Dimensões e Bordas";
  vizContainer.appendChild(subTitle);

  const MARGIN = 120;
  const frameWidth = tableWidth;
  const frameHeight = Math.max(300, instance.height + MARGIN * 2);

  const frame = figma.createFrame();
  frame.name = "Dimension Visualization";
  frame.resize(frameWidth, frameHeight);
  const frameBgColor = highlightMode
    ? {r: 56 / 255, g: 83 / 255, b: 255 / 255}
    : {r: 0.98, g: 0.98, b: 0.98};
  frame.fills = [{type: "SOLID", color: frameBgColor}];
  frame.cornerRadius = 8;
  frame.clipsContent = false;

  instance.x = frameWidth / 2 - instance.width / 2;
  instance.y = frameHeight / 2 - instance.height / 2;
  frame.appendChild(instance);

  const instX = instance.x;
  const instY = instance.y;
  const instW = instance.width;
  const instH = instance.height;

  // Border radius annotation
  const radiusInfo = findCornerRadius(baseComponent);
  if (radiusInfo) {
    const radiusToken = await findCornerRadiusToken(baseComponent);
    await annotateRadiusNew(
      frame,
      radiusInfo.value,
      instX,
      instY,
      instW,
      instH,
      radiusToken,
      highlightMode,
    );
  }

  // Border/stroke annotations
  const strokeInfo = await findStrokeWeight(instance);
  if (strokeInfo && strokeInfo.length > 0) {
    for (const stroke of strokeInfo) {
      let borderToken: string | null = null;
      const varKey =
        stroke.side === "All" ? "strokeWeight" : `stroke${stroke.side}Weight`;
      if (varKey in stroke.boundVars && stroke.boundVars[varKey]?.id) {
        const variable = await figma.variables.getVariableByIdAsync(
          stroke.boundVars[varKey].id,
        );
        if (variable) borderToken = variable.name.replace(/\//g, "-");
      }
      await annotateBorderNew(
        frame,
        stroke.value,
        instX,
        instY,
        instW,
        instH,
        borderToken,
        highlightMode,
        stroke.side,
        stroke.position,
      );
    }
  }

  // Height annotation
  const heightToken = await findHeightToken(baseComponent);
  await annotateDimensionNew(
    frame,
    "height",
    instH,
    instX,
    instY,
    instW,
    instH,
    heightToken,
    highlightMode,
  );

  vizContainer.appendChild(frame);
  parent.appendChild(vizContainer);
}

// ========================================
// HELPER FUNCTIONS FOR DIMENSIONS
// ========================================

function findCornerRadius(
  node: SceneNode,
): {value: number; isUniform: boolean} | null {
  if (!("cornerRadius" in node)) return null;

  const nodeWithRadius = node as SceneNode & {cornerRadius?: number | typeof figma.mixed};
  if (
    nodeWithRadius.cornerRadius !== undefined &&
    nodeWithRadius.cornerRadius !== figma.mixed &&
    nodeWithRadius.cornerRadius > 0
  ) {
    return {value: nodeWithRadius.cornerRadius, isUniform: true};
  }

  if ("topLeftRadius" in node) {
    const nodeWithRadii = node as SceneNode & {
      topLeftRadius: number;
      topRightRadius: number;
      bottomLeftRadius: number;
      bottomRightRadius: number;
    };
    const radii = [
      nodeWithRadii.topLeftRadius,
      nodeWithRadii.topRightRadius,
      nodeWithRadii.bottomLeftRadius,
      nodeWithRadii.bottomRightRadius,
    ];
    const nonZero = radii.filter((r) => r > 0);
    if (nonZero.length > 0) {
      return {value: Math.max(...nonZero), isUniform: false};
    }
  }

  return null;
}

interface StrokeInfo {
  value: number;
  side: "Top" | "Bottom" | "Left" | "Right" | "All";
  position: "Inside" | "Outside" | "Center";
  boundVars: Record<string, {id: string} | undefined>;
}

async function findStrokeWeight(node: SceneNode): Promise<StrokeInfo[] | null> {
  if (!("strokes" in node) || !Array.isArray(node.strokes)) return null;
  if (node.strokes.length === 0) return null;

  const results: StrokeInfo[] = [];

  if ("strokeWeight" in node && typeof node.strokeWeight === "number") {
    const boundVars =
      "boundVariables" in node
        ? (node.boundVariables as Record<string, {id: string} | undefined>)
        : {};

    if (node.strokeWeight > 0) {
      const strokeAlign =
        "strokeAlign" in node ? String(node.strokeAlign) : "CENTER";
      const position: "Inside" | "Outside" | "Center" =
        strokeAlign === "INSIDE"
          ? "Inside"
          : strokeAlign === "OUTSIDE"
            ? "Outside"
            : "Center";
      results.push({
        value: node.strokeWeight,
        side: "All",
        position,
        boundVars,
      });
    }
  }

  return results.length > 0 ? results : null;
}

async function findHeightToken(node: SceneNode): Promise<string | null> {
  if (!("boundVariables" in node)) return null;

  const boundVars = node.boundVariables as Record<
    string,
    {id: string} | undefined
  >;
  if (boundVars.height?.id) {
    const variable = await figma.variables.getVariableByIdAsync(
      boundVars.height.id,
    );
    if (variable) return formatToken(variable.name);
  }

  return null;
}

async function findCornerRadiusToken(node: SceneNode): Promise<string | null> {
  if (!("boundVariables" in node)) return null;

  const boundVars = node.boundVariables as Record<
    string,
    {id: string} | undefined
  >;

  const radiusKeys = [
    "cornerRadius",
    "topLeftRadius",
    "topRightRadius",
    "bottomLeftRadius",
    "bottomRightRadius",
  ];

  for (const key of radiusKeys) {
    if (boundVars[key]?.id) {
      const variable = await figma.variables.getVariableByIdAsync(
        boundVars[key]!.id,
      );
      if (variable) return formatToken(variable.name);
    }
  }

  return null;
}

/**
 * Processes spacing node for visualization.
 * Estrutura IDÊNTICA ao original code.ts (linhas 6080-6211)
 */
async function processSpacingNodeForViz(
  node: SceneNode,
  container: FrameNode,
  baseX: number,
  baseY: number,
  instanceBounds: {x: number; y: number; width: number; height: number},
  highlightMode: boolean = false,
  tracker?: AnnotationTracker,
): Promise<void> {
  // Ignorar nós ocultos
  if ("visible" in node && !node.visible) return;

  // Criar tracker se não existir (primeira chamada)
  if (!tracker) {
    tracker = {
      rightPositions: [],
      leftPositions: [],
      topPositions: [],
      bottomPositions: [],
      gapPositions: [],
    };
  }

  // Processar gaps e paddings APENAS se tiver layoutMode
  if ("layoutMode" in node && node.layoutMode !== "NONE") {
    const n = node as FrameNode;
    const nodeBounds = n.absoluteBoundingBox;
    if (!nodeBounds) return;

    const nodeRelX = nodeBounds.x - instanceBounds.x;
    const nodeRelY = nodeBounds.y - instanceBounds.y;
    const nodeX = baseX + nodeRelX;
    const nodeY = baseY + nodeRelY;
    const nodeW = nodeBounds.width;
    const nodeH = nodeBounds.height;

    const boundVars = n.boundVariables || {};

    // Gap
    if (
      n.itemSpacing &&
      n.itemSpacing > 0 &&
      n.children &&
      n.children.length >= 2
    ) {
      let gapToken: string | null = null;
      if ("itemSpacing" in boundVars) {
        const binding = (boundVars as Record<string, {id: string} | undefined>).itemSpacing;
        if (binding?.id) {
          const variable = await figma.variables.getVariableByIdAsync(binding.id);
          if (variable) {
            gapToken = variable.name
              .replace(/^[Ss]pacing\//i, "")
              .replace(/\//g, "-");
          }
        }
      }

      const visibleChildren = n.children.filter((child) =>
        "visible" in child ? child.visible : true,
      );
      const isHorizontal = n.layoutMode === "HORIZONTAL";

      for (let i = 0; i < visibleChildren.length - 1; i++) {
        await annotateGapNew(
          container,
          n,
          n.itemSpacing,
          isHorizontal ? "H" : "V",
          nodeX,
          nodeY,
          gapToken,
          i,
          highlightMode,
          tracker,
        );
      }
    }

    // Paddings
    const paddingProps = [
      {key: "paddingTop" as const, side: "top" as const},
      {key: "paddingBottom" as const, side: "bottom" as const},
      {key: "paddingLeft" as const, side: "left" as const},
      {key: "paddingRight" as const, side: "right" as const},
    ];

    for (const {key, side} of paddingProps) {
      const paddingValue = n[key];
      if (paddingValue > 0) {
        let paddingToken: string | null = null;
        if (key in boundVars) {
          const binding = (boundVars as Record<string, {id: string} | undefined>)[key];
          if (binding?.id) {
            const variable = await figma.variables.getVariableByIdAsync(binding.id);
            if (variable) {
              paddingToken = variable.name
                .replace(/^[Ss]pacing\//i, "")
                .replace(/\//g, "-");
            }
          }
        }

        await annotatePaddingNew(
          container,
          paddingValue,
          side,
          nodeX,
          nodeY,
          nodeW,
          nodeH,
          paddingToken,
          highlightMode,
          tracker,
        );
      }
    }
  }

  // SEMPRE processar filhos (independente de ter layoutMode ou não)
  if ("children" in node) {
    for (const child of node.children) {
      await processSpacingNodeForViz(
        child,
        container,
        baseX,
        baseY,
        instanceBounds,
        highlightMode,
        tracker,
      );
    }
  }
}


// ========================================
// EFFECTS SECTION
// ========================================

/**
 * Creates the combined effects section.
 */
export async function createEffectsSectionCombined(
  parent: FrameNode,
  variantColors: VariantColors[],
  nodeToProcess: ComponentNode | ComponentSetNode | InstanceNode,
  tableWidth: number,
  highlightMode: boolean,
  vizPropertyFilters: Record<string, string[]>,
  framesPerRow: number = 2,
  showTable: boolean = true,
  showViz: boolean = true,
): Promise<boolean> {
  const hasEffects = variantColors.some((v) => v.effects.length > 0);
  if (!hasEffects) return false;

  if (!showTable && !showViz) return false;

  const section = createSectionContainer("Seção Efeitos");
  createSectionTitle("EFEITOS", section);

  if (showTable) {
    await createEffectsTableInSection(section, variantColors, tableWidth);
  }

  if (showViz) {
    await createEffectsVisualizationInSection(
      section,
      nodeToProcess,
      variantColors,
      tableWidth,
      highlightMode,
      vizPropertyFilters,
      framesPerRow,
    );
  }

  parent.appendChild(section);
  return true;
}

/**
 * Creates effects table in section.
 */
async function createEffectsTableInSection(
  parent: FrameNode,
  variantColors: VariantColors[],
  tableWidth: number,
): Promise<void> {
  const hasEffects = variantColors.some((v) => v.effects.length > 0);
  if (!hasEffects) return;

  const GROUP_SPACING = 20;
  const ROW_GAP = 4;

  const table = createTableBuilder("Tabela Efeitos", tableWidth, [
    {header: "Elemento", position: 0},
    {header: "Tipo", position: 0.25},
    {header: "Token", position: 0.4, color: "warning"},
    {header: "Valor", position: 0.65},
  ]);

  // Group effects by element
  const effectsByElement: Map<
    string,
    {
      effectType: string;
      token: string | null;
      value: string;
      variants: string[];
    }[]
  > = new Map();

  for (const variant of variantColors) {
    const variantLabel = formatVariantPropertiesForTable(variant.propertyMap);

    for (const effect of variant.effects) {
      const element = effect.element;
      if (!effectsByElement.has(element)) {
        effectsByElement.set(element, []);
      }

      const entries = effectsByElement.get(element)!;
      const existing = entries.find(
        (e) =>
          e.effectType === effect.effectType &&
          (e.token || e.value) === (effect.token || effect.value),
      );

      if (existing) {
        if (!existing.variants.includes(variantLabel)) {
          existing.variants.push(variantLabel);
        }
      } else {
        entries.push({
          effectType: effect.effectType,
          token: effect.token,
          value: effect.value,
          variants: [variantLabel],
        });
      }
    }
  }

  // Render grouped
  let isFirstGroup = true;
  for (const [element, entries] of effectsByElement) {
    if (entries.length === 0) continue;

    if (!isFirstGroup) {
      table.addSpacer(GROUP_SPACING - ROW_GAP);
    }
    isFirstGroup = false;

    for (const entry of entries) {
      table.addRow(`Row - ${element}`, [
        {text: element},
        {text: entry.effectType},
        {text: entry.token || "-", color: "warning"},
        {text: entry.value},
      ]);
    }
  }

  table.appendTo(parent);
}

/**
 * Creates effects visualization in section.
 */
async function createEffectsVisualizationInSection(
  parent: FrameNode,
  component: ComponentNode | ComponentSetNode | InstanceNode,
  variantColors: VariantColors[],
  tableWidth: number,
  highlightMode: boolean,
  vizPropertyFilters: Record<string, string[]>,
  framesPerRow: number,
): Promise<void> {
  if (component.type !== "COMPONENT_SET") return;

  const hasEffects = variantColors.some((v) => v.effects.length > 0);
  if (!hasEffects) return;

  const filteredVariants = filterVariantsForVisualization(
    variantColors,
    vizPropertyFilters,
  );

  if (filteredVariants.length > 1) {
    await createGenericVariantGrid(
      parent,
      component,
      filteredVariants,
      tableWidth,
      highlightMode,
      framesPerRow,
      {
        gridName: "Grid Variantes - Efeitos",
        margin: 80,
      },
      async (ctx) => {
        if (ctx.vc.effects.length === 0) return;

        const nodesWithEffects = findNodesWithEffects(ctx.instance);
        const color = getTheme(ctx.highlightMode).effect;

        for (let i = 0; i < nodesWithEffects.length; i++) {
          const node = nodesWithEffects[i];
          const bounds = node.absoluteBoundingBox;
          if (!bounds) continue;

          const relX = bounds.x - ctx.instanceBounds.x;
          const relY = bounds.y - ctx.instanceBounds.y;

          const nodeX = ctx.instance.x + relX;
          const nodeY = ctx.instance.y + relY;

          // Find matching effect spec
          let effectLabel = "Effect";
          for (const effectSpec of ctx.vc.effects) {
            if (
              effectSpec.element.toLowerCase().includes(node.name.toLowerCase())
            ) {
              effectLabel = effectSpec.token || effectSpec.value;
              break;
            }
          }

          const isAbove = i % 2 === 0;
          const LINE_LENGTH = 20;
          const DOT_OFFSET = 15;

          const startX = nodeX + bounds.width / 2;
          const startY = isAbove
            ? nodeY - DOT_OFFSET
            : nodeY + bounds.height + DOT_OFFSET;
          const endX = startX;
          const endY = isAbove
            ? nodeY - DOT_OFFSET - LINE_LENGTH
            : nodeY + bounds.height + DOT_OFFSET + LINE_LENGTH;

          await createSimpleAnnotation(
            ctx.vizFrame,
            startX,
            startY,
            endX,
            endY,
            effectLabel,
            color,
          );
        }
      },
    );
  }
}

function findNodesWithEffects(node: SceneNode): SceneNode[] {
  const results: SceneNode[] = [];

  if ("effects" in node && Array.isArray(node.effects) && node.effects.length > 0) {
    const hasVisibleEffect = node.effects.some(
      (e) => e.visible !== false,
    );
    if (hasVisibleEffect) {
      results.push(node);
    }
  }

  if ("children" in node) {
    for (const child of (node as FrameNode).children) {
      results.push(...findNodesWithEffects(child));
    }
  }

  return results;
}

// ========================================
// ESTADOS SECTION
// ========================================

/**
 * Creates the estados (states) section.
 */
export async function createEstadosSection(
  parent: FrameNode,
  component: ComponentSetNode,
  _variantColors: VariantColors[],
  tableWidth: number,
  highlightMode: boolean,
  framesPerRow: number = 4,
): Promise<boolean> {
  const variants: {name: string; node: ComponentNode}[] = [];

  for (const child of component.children) {
    if (child.type === "COMPONENT") {
      const props = extractRelevantProperties(child.name);
      const stateName =
        props["state"] ||
        props["status"] ||
        props["type"] ||
        props["style"] ||
        Object.values(props)[0] ||
        "Default";
      variants.push({name: stateName, node: child});
    }
  }

  // Remove duplicates based on state name
  const uniqueVariants: {name: string; node: ComponentNode}[] = [];
  const seenNames = new Set<string>();
  for (const v of variants) {
    if (!seenNames.has(v.name)) {
      seenNames.add(v.name);
      uniqueVariants.push(v);
    }
  }

  if (uniqueVariants.length === 0) {
    return false;
  }

  const section = createSectionContainer("Seção Estados");
  createSectionTitle("ESTADOS", section);

  const GRID_GAP = 16;
  const CARD_PADDING = 24;
  const COLUMNS = framesPerRow;
  const cardWidth = Math.floor(
    (tableWidth - GRID_GAP * (COLUMNS - 1)) / COLUMNS,
  );

  const gridContainer = figma.createFrame();
  gridContainer.name = "Grid Estados";
  gridContainer.layoutMode = "VERTICAL";
  gridContainer.primaryAxisSizingMode = "AUTO";
  gridContainer.counterAxisSizingMode = "AUTO";
  gridContainer.itemSpacing = GRID_GAP;
  gridContainer.fills = [];

  for (let i = 0; i < uniqueVariants.length; i += COLUMNS) {
    const row = figma.createFrame();
    row.name = `Row ${Math.floor(i / COLUMNS) + 1}`;
    row.layoutMode = "HORIZONTAL";
    row.primaryAxisSizingMode = "AUTO";
    row.counterAxisSizingMode = "AUTO";
    row.itemSpacing = GRID_GAP;
    row.fills = [];

    for (let j = 0; j < COLUMNS && i + j < uniqueVariants.length; j++) {
      const variant = uniqueVariants[i + j];
      const index = i + j + 1;

      const card = figma.createFrame();
      card.name = `Estado ${index}`;
      card.layoutMode = "VERTICAL";
      card.primaryAxisSizingMode = "AUTO";
      card.counterAxisSizingMode = "FIXED";
      card.resize(cardWidth, 100);
      card.paddingTop = CARD_PADDING;
      card.paddingBottom = CARD_PADDING;
      card.paddingLeft = CARD_PADDING;
      card.paddingRight = CARD_PADDING;
      card.itemSpacing = 16;
      const cardBgColor = highlightMode
        ? {r: 56 / 255, g: 83 / 255, b: 255 / 255}
        : {r: 0.98, g: 0.98, b: 0.98};
      card.fills = [{type: "SOLID", color: cardBgColor}];
      card.cornerRadius = 8;

      const label = figma.createText();
      label.fontName = getFont("Regular");
      label.fontSize = 14;
      label.characters = `${String(index).padStart(2, "0")}. ${variant.name}`;
      const labelColor = highlightMode
        ? {r: 98 / 255, g: 248 / 255, b: 79 / 255}
        : {r: 0.4, g: 0.4, b: 0.4};
      label.fills = [{type: "SOLID", color: labelColor}];
      card.appendChild(label);

      const instance = variant.node.createInstance();
      card.appendChild(instance);

      row.appendChild(card);
    }

    gridContainer.appendChild(row);
  }

  section.appendChild(gridContainer);
  parent.appendChild(section);
  return true;
}

// ========================================
// PROPERTIES SECTION
// ========================================

/**
 * Creates the properties section.
 */
export async function createPropertiesSection(
  parent: FrameNode,
  component: ComponentSetNode,
  tableWidth: number,
): Promise<boolean> {
  if (!component.componentPropertyDefinitions) {
    return false;
  }

  const propDefs = component.componentPropertyDefinitions;
  const propKeys = Object.keys(propDefs);
  if (propKeys.length === 0) return false;

  const allPropsWithIndex = propKeys.map((key, index) => ({
    key,
    def: propDefs[key],
    originalIndex: index,
  }));

  const variants = allPropsWithIndex.filter((p) => p.def.type === "VARIANT");
  const instanceSwaps = allPropsWithIndex.filter(
    (p) => p.def.type === "INSTANCE_SWAP",
  );
  const others = allPropsWithIndex.filter(
    (p) => p.def.type !== "VARIANT" && p.def.type !== "INSTANCE_SWAP",
  );

  others.sort((a, b) => {
    const aKeyLower = a.key.toLowerCase();
    const bKeyLower = b.key.toLowerCase();

    if (a.def.type === "BOOLEAN" && b.def.type === "TEXT") {
      if (
        bKeyLower.includes(aKeyLower) ||
        bKeyLower.startsWith("text " + aKeyLower)
      ) {
        return -1;
      }
    }
    if (b.def.type === "BOOLEAN" && a.def.type === "TEXT") {
      if (
        aKeyLower.includes(bKeyLower) ||
        aKeyLower.startsWith("text " + bKeyLower)
      ) {
        return 1;
      }
    }

    return a.originalIndex - b.originalIndex;
  });

  const allProps = [...variants, ...others, ...instanceSwaps].map(
    ({key, def}) => ({key, def}),
  );

  const normalProps = allProps.filter((p) => p.def.type !== "INSTANCE_SWAP");
  const _nestedInstanceProps = allProps.filter(
    (p) => p.def.type === "INSTANCE_SWAP",
  );

  const section = createSectionContainer("Seção Propriedades", 32);
  section.paddingLeft = 32;
  section.paddingRight = 32;
  section.paddingTop = 32;
  section.paddingBottom = 32;
  section.fills = [{type: "SOLID", color: {r: 1, g: 1, b: 1}}];
  section.cornerRadius = 8;
  createSectionTitle(`❖ ${component.name} Properties`, section);

  const BLUE_COLOR: RGB = {r: 49 / 255, g: 53 / 255, b: 217 / 255};
  const GRAY_COLOR: RGB = {r: 0.4, g: 0.4, b: 0.4};
  const WHITE_COLOR: RGB = {r: 1, g: 1, b: 1};

  const innerTableWidth = tableWidth - 64;

  if (normalProps.length > 0) {
    const tableContainer = figma.createFrame();
    tableContainer.name = "Properties Table";
    tableContainer.layoutMode = "VERTICAL";
    tableContainer.primaryAxisSizingMode = "AUTO";
    tableContainer.counterAxisSizingMode = "FIXED";
    tableContainer.resize(innerTableWidth, 100);
    tableContainer.itemSpacing = 0;
    tableContainer.fills = [];

    const headerRow = figma.createFrame();
    headerRow.name = "Header Row";
    headerRow.layoutMode = "HORIZONTAL";
    headerRow.primaryAxisSizingMode = "FIXED";
    headerRow.counterAxisSizingMode = "AUTO";
    headerRow.resize(innerTableWidth, 40);
    headerRow.paddingTop = 12;
    headerRow.paddingBottom = 12;
    headerRow.fills = [];

    const colWidths = [
      Math.floor(innerTableWidth * 0.25),
      Math.floor(innerTableWidth * 0.2),
      Math.floor(innerTableWidth * 0.55),
    ];
    const headers = ["PROPERTY", "TYPE", "DEFAULT / OPTIONS"];

    for (let i = 0; i < headers.length; i++) {
      const headerCell = figma.createFrame();
      headerCell.name = `Header ${headers[i]}`;
      headerCell.layoutMode = "HORIZONTAL";
      headerCell.primaryAxisSizingMode = "FIXED";
      headerCell.counterAxisSizingMode = "AUTO";
      headerCell.resize(colWidths[i], 20);
      headerCell.fills = [];

      const headerText = figma.createText();
      headerText.fontName = getFont("Bold");
      headerText.fontSize = 12;
      headerText.characters = headers[i];
      headerText.fills = [{type: "SOLID", color: GRAY_COLOR}];
      headerCell.appendChild(headerText);
      headerRow.appendChild(headerCell);
    }
    tableContainer.appendChild(headerRow);

    for (const prop of normalProps) {
      const def = prop.def;
      const propName = prop.key.split("#")[0];

      const row = figma.createFrame();
      row.name = `Row ${propName}`;
      row.layoutMode = "HORIZONTAL";
      row.primaryAxisSizingMode = "FIXED";
      row.counterAxisSizingMode = "AUTO";
      row.counterAxisAlignItems = "MIN";
      row.minWidth = innerTableWidth;
      row.maxWidth = innerTableWidth;
      row.paddingTop = 12;
      row.paddingBottom = 12;
      row.strokes = [{type: "SOLID", color: {r: 0.9, g: 0.9, b: 0.9}}];
      row.strokeTopWeight = 1;
      row.strokeBottomWeight = 0;
      row.strokeLeftWeight = 0;
      row.strokeRightWeight = 0;
      row.fills = [{type: "SOLID", color: {r: 1, g: 1, b: 1}}];

      // Property column
      const propCell = figma.createFrame();
      propCell.name = "Property Cell";
      propCell.layoutMode = "HORIZONTAL";
      propCell.primaryAxisSizingMode = "FIXED";
      propCell.counterAxisSizingMode = "AUTO";
      propCell.minWidth = colWidths[0];
      propCell.maxWidth = colWidths[0];
      propCell.fills = [];
      propCell.itemSpacing = 8;

      const propText = figma.createText();
      propText.fontName = getFont("Regular");
      propText.fontSize = 14;
      propText.characters = propName;
      propText.fills = [{type: "SOLID", color: {r: 0.2, g: 0.2, b: 0.2}}];
      propCell.appendChild(propText);
      row.appendChild(propCell);

      // Type column
      const typeCell = figma.createFrame();
      typeCell.name = "Type Cell";
      typeCell.layoutMode = "HORIZONTAL";
      typeCell.primaryAxisSizingMode = "FIXED";
      typeCell.counterAxisSizingMode = "AUTO";
      typeCell.counterAxisAlignItems = "CENTER";
      typeCell.minWidth = colWidths[1];
      typeCell.maxWidth = colWidths[1];
      typeCell.fills = [];
      typeCell.itemSpacing = 6;

      let typeIcon = "◆";
      let typeName = "Variant";
      if (def.type === "BOOLEAN") {
        typeIcon = "⊙";
        typeName = "Boolean";
      } else if (def.type === "TEXT") {
        typeIcon = "T";
        typeName = "Text";
      }

      const iconText = figma.createText();
      iconText.fontName = getFont("Regular");
      iconText.fontSize = 14;
      iconText.characters = typeIcon;
      iconText.fills = [{type: "SOLID", color: BLUE_COLOR}];
      typeCell.appendChild(iconText);

      const typeNameText = figma.createText();
      typeNameText.fontName = getFont("Regular");
      typeNameText.fontSize = 14;
      typeNameText.characters = typeName;
      typeNameText.fills = [{type: "SOLID", color: GRAY_COLOR}];
      typeCell.appendChild(typeNameText);
      row.appendChild(typeCell);

      // Value column
      const valueCell = figma.createFrame();
      valueCell.name = "Value Cell";
      valueCell.layoutMode = "HORIZONTAL";
      valueCell.primaryAxisSizingMode = "FIXED";
      valueCell.counterAxisSizingMode = "AUTO";
      valueCell.counterAxisAlignItems = "MIN";
      valueCell.minWidth = colWidths[2];
      valueCell.maxWidth = colWidths[2];
      valueCell.fills = [];
      valueCell.itemSpacing = 8;
      valueCell.layoutWrap = "WRAP";
      valueCell.counterAxisSpacing = 8;

      if (def.type === "VARIANT" && def.variantOptions) {
        for (const option of def.variantOptions) {
          const isDefault = option === def.defaultValue;

          const badge = figma.createFrame();
          badge.name = `Option ${option}`;
          badge.layoutMode = "HORIZONTAL";
          badge.primaryAxisSizingMode = "AUTO";
          badge.counterAxisSizingMode = "AUTO";
          badge.paddingLeft = 12;
          badge.paddingRight = 12;
          badge.paddingTop = 6;
          badge.paddingBottom = 6;
          badge.cornerRadius = 4;

          if (isDefault) {
            badge.fills = [{type: "SOLID", color: BLUE_COLOR}];
          } else {
            badge.fills = [];
            badge.strokes = [{type: "SOLID", color: BLUE_COLOR}];
            badge.strokeWeight = 1;
          }

          const optionText = figma.createText();
          optionText.fontName = getFont("Medium");
          optionText.fontSize = 12;
          optionText.characters = option;
          optionText.fills = [
            {type: "SOLID", color: isDefault ? WHITE_COLOR : BLUE_COLOR},
          ];
          badge.appendChild(optionText);
          valueCell.appendChild(badge);
        }
      } else if (def.type === "BOOLEAN") {
        const toggleContainer = figma.createFrame();
        toggleContainer.name = "Boolean Toggle";
        toggleContainer.layoutMode = "HORIZONTAL";
        toggleContainer.primaryAxisSizingMode = "AUTO";
        toggleContainer.counterAxisSizingMode = "AUTO";
        toggleContainer.counterAxisAlignItems = "CENTER";
        toggleContainer.itemSpacing = 8;
        toggleContainer.fills = [];

        const isTrue = def.defaultValue === true;

        const toggle = figma.createFrame();
        toggle.name = "Toggle";
        toggle.resize(36, 20);
        toggle.cornerRadius = 10;
        toggle.fills = [
          {
            type: "SOLID",
            color: isTrue ? BLUE_COLOR : {r: 0.8, g: 0.8, b: 0.8},
          },
        ];

        const knob = figma.createEllipse();
        knob.resize(16, 16);
        knob.x = isTrue ? 18 : 2;
        knob.y = 2;
        knob.fills = [{type: "SOLID", color: WHITE_COLOR}];
        toggle.appendChild(knob);
        toggleContainer.appendChild(toggle);

        const boolText = figma.createText();
        boolText.fontName = getFont("Regular");
        boolText.fontSize = 14;
        boolText.characters = isTrue ? "True" : "False";
        boolText.fills = [{type: "SOLID", color: GRAY_COLOR}];
        toggleContainer.appendChild(boolText);

        valueCell.appendChild(toggleContainer);
      } else if (def.type === "TEXT") {
        const textValue = figma.createText();
        textValue.fontName = getFont("Regular");
        textValue.fontSize = 14;
        textValue.characters = String(def.defaultValue || "");
        textValue.fills = [{type: "SOLID", color: {r: 0.2, g: 0.2, b: 0.2}}];
        valueCell.appendChild(textValue);
      }

      row.appendChild(valueCell);
      tableContainer.appendChild(row);
    }

    section.appendChild(tableContainer);
  }

  parent.appendChild(section);
  return true;
}

// ========================================
// USED COMPONENTS SECTION
// ========================================

/**
 * Creates the used components section.
 */
export async function createUsedComponentsSectionAutoLayout(
  parent: FrameNode,
  variantColors: VariantColors[],
  tableWidth: number,
): Promise<boolean> {
  const componentMap = new Map<string, string>();
  for (const variant of variantColors) {
    for (const [compId, compName] of variant.usedComponents) {
      // Blacklist anatomia (Seção 3.3): excluir da lista visual componentes privados
      if (compName.startsWith(".") || compName.startsWith("_")) continue;
      componentMap.set(compId, compName);
    }
  }

  if (componentMap.size === 0) return false;

  const section = createSectionContainer("Seção Componentes Utilizados");
  createSectionTitle("COMPONENTES UTILIZADOS", section);

  const table = createTableBuilder("Tabela Componentes", tableWidth, [
    {header: "Componente", position: 0},
    {header: "Origem", position: 0.6},
  ]);

  const sortedComponents = Array.from(componentMap.entries()).sort((a, b) =>
    a[1].localeCompare(b[1]),
  );

  for (const [_compId, compName] of sortedComponents) {
    table.addRow(`Row - ${compName}`, [
      {text: compName},
      {text: "Local", color: "secondary"},
    ]);
  }

  table.appendTo(section);
  parent.appendChild(section);
  return true;
}

// ========================================
// EXTRACT VARIANT PROPERTIES
// ========================================

/**
 * Extracts variant properties from a ComponentSet.
 */
export function extractVariantProperties(
  componentSet: ComponentSetNode,
): VariantProperty[] {
  const properties: VariantProperty[] = [];
  const propDefs = componentSet.componentPropertyDefinitions;

  if (!propDefs) return properties;

  for (const [name, def] of Object.entries(propDefs)) {
    if (def.type === "VARIANT" && def.variantOptions) {
      const sizeOrder: Record<string, number> = SIZE_ORDER;
      const sortedValues = [...def.variantOptions].sort((a, b) => {
        const aLower = a.toLowerCase();
        const bLower = b.toLowerCase();
        const aOrder = sizeOrder[aLower] ?? 99;
        const bOrder = sizeOrder[bLower] ?? 99;
        if (aOrder !== bOrder) return aOrder - bOrder;
        return a.localeCompare(b);
      });
      properties.push({name, values: sortedValues});
    }
  }

  return properties;
}
