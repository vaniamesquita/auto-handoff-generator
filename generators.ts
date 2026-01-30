// src/features/generators.ts

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
  formatSpaceToken,
  extractRelevantProperties,
  getEffectTypeLabel, // <--- ADICIONADO AQUI
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
  // Se não há filtros ou está vazio, retornar todas
  if (!selectedProperties || Object.keys(selectedProperties).length === 0) {
    return variantColors;
  }

  // Verificar se há pelo menos uma propriedade com valores selecionados
  const hasAnySelection = Object.values(selectedProperties).some(
    (values) => values.length > 0,
  );
  if (!hasAnySelection) {
    return variantColors;
  }

  // Filtrar variantes que correspondem aos critérios selecionados
  const filtered = variantColors.filter((vc) => {
    const variantProps = vc.propertyMap;

    for (const [propName, selectedValues] of Object.entries(
      selectedProperties,
    )) {
      if (selectedValues.length === 0) continue;

      // CRITICAL FIX: propertyMap keys are lowercase, but UI sends mixed case
      const propKey = propName.toLowerCase();
      const variantValue = variantProps[propKey];
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

  // Deduplicar: agrupar por propriedades selecionadas e pegar a melhor variante
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

  // Se não há filtros ativos, retornar TODAS as variantes sem deduplicação
  if (selectedPropNames.length === 0) {
    return sortVariantsBySize(variants);
  }

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

  return sortVariantsBySize(result);
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

// ========================================
// MULTI-VARIANT GRID WRAPPERS
// ========================================

/**
 * Creates multi-variant text grid.
 */
async function createMultiVariantTextGrid(
  parent: FrameNode,
  componentSet: ComponentSetNode,
  variantColors: VariantColors[],
  tableWidth: number,
  highlightMode: boolean,
  framesPerRow: number = 2,
): Promise<void> {
  await createGenericVariantGrid(
    parent,
    componentSet,
    variantColors,
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
}

/**
 * Creates multi-variant spacing grid.
 */
async function createMultiVariantSpacingGrid(
  parent: FrameNode,
  componentSet: ComponentSetNode,
  variantColors: VariantColors[],
  tableWidth: number,
  highlightMode: boolean,
  framesPerRow: number = 2,
): Promise<void> {
  await createGenericVariantGrid(
    parent,
    componentSet,
    variantColors,
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
}

/**
 * Creates multi-variant effects grid.
 */
async function createMultiVariantEffectsGrid(
  parent: FrameNode,
  componentSet: ComponentSetNode,
  variantColors: VariantColors[],
  tableWidth: number,
  highlightMode: boolean,
  framesPerRow: number = 2,
): Promise<void> {
  await createGenericVariantGrid(
    parent,
    componentSet,
    variantColors,
    tableWidth,
    highlightMode,
    framesPerRow,
    {
      gridName: "Grid Variantes - Efeitos",
      margin: 80,
    },
    async (ctx) => {
      if (ctx.vc.effects.length === 0) return;

      const color = getTheme(ctx.highlightMode).effect;
      const nodesWithEffects = findNodesWithEffects(ctx.instance);

      for (let i = 0; i < nodesWithEffects.length; i++) {
        const node = nodesWithEffects[i];
        const nodeBounds = node.absoluteBoundingBox;
        if (!nodeBounds) continue;

        const nodeRelX = nodeBounds.x - ctx.instanceBounds.x;
        const nodeRelY = nodeBounds.y - ctx.instanceBounds.y;
        const nodeW = nodeBounds.width;
        const nodeH = nodeBounds.height;

        let label = "";
        for (const spec of ctx.vc.effects) {
          label = spec.token ? spec.token : getEffectTypeLabel(spec.effectType);
          break;
        }

        if (
          !label &&
          "effects" in node &&
          Array.isArray(node.effects) &&
          node.effects.length > 0
        ) {
          const firstEffect = node.effects.find((e: Effect) => e.visible);
          if (firstEffect) {
            label = getEffectTypeLabel(firstEffect.type);
          }
        }

        if (label) {
          const nodeX = ctx.instance.x + nodeRelX;
          const nodeY = ctx.instance.y + nodeRelY;
          const isAbove = i % 2 === 0;
          const LINE_LENGTH = 25;

          const startX = nodeX + nodeW / 2;
          const startY = isAbove ? nodeY : nodeY + nodeH;
          const endX = startX;
          const endY = isAbove
            ? nodeY - LINE_LENGTH
            : nodeY + nodeH + LINE_LENGTH;

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
      }
    },
  );
}

/**
 * Creates multi-variant dimension grid.
 */
async function createMultiVariantDimensionGrid(
  parent: FrameNode,
  componentSet: ComponentSetNode,
  variantColors: VariantColors[],
  tableWidth: number,
  highlightMode: boolean,
  framesPerRow: number = 2,
): Promise<void> {
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
    componentSet,
    variantColors,
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

      // Only show height annotation if there's a token applied
      if (heightToken) {
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
      }

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

          // When side is "All", Figma may store individual stroke weights
          // Try strokeWeight first, then fall back to strokeTopWeight (they should all be the same)
          let varKey = stroke.side === "All" ? "strokeWeight" : `stroke${stroke.side}Weight`;

          // If strokeWeight doesn't exist but individual sides do, use strokeTopWeight
          if (stroke.side === "All" && !(varKey in stroke.boundVars) && "strokeTopWeight" in stroke.boundVars) {
            varKey = "strokeTopWeight";
          }

          if (varKey in stroke.boundVars && stroke.boundVars[varKey]?.id) {
            const variable = await figma.variables.getVariableByIdAsync(
              stroke.boundVars[varKey].id,
            );
            if (variable) borderToken = formatSpaceToken(variable.name);
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
}

// ========================================
// TEXT SECTION
// ========================================

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

  // If it's a ComponentSet with variants, use grid
  if (component.type === "COMPONENT_SET" && filteredVariants.length > 1) {
    await createMultiVariantTextGrid(
      parent,
      component,
      filteredVariants,
      tableWidth,
      highlightMode,
      framesPerRow,
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
        {text: entry.token || entry.value, color: entry.token ? "error" : undefined},
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

  // Se ComponentSet com variantes, usar grid
  if (component.type === "COMPONENT_SET" && filteredVariants.length > 1) {
    await createMultiVariantSpacingGrid(
      parent,
      component,
      filteredVariants,
      tableWidth,
      highlightMode,
      framesPerRow,
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

  // Se ComponentSet com variantes, usar grid
  if (component.type === "COMPONENT_SET" && filteredVariants.length > 1) {
    await createMultiVariantDimensionGrid(
      parent,
      component,
      filteredVariants,
      tableWidth,
      highlightMode,
      framesPerRow,
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

      // When side is "All", Figma may store individual stroke weights
      // Try strokeWeight first, then fall back to strokeTopWeight (they should all be the same)
      let varKey = stroke.side === "All" ? "strokeWeight" : `stroke${stroke.side}Weight`;

      // If strokeWeight doesn't exist but individual sides do, use strokeTopWeight
      if (stroke.side === "All" && !(varKey in stroke.boundVars) && "strokeTopWeight" in stroke.boundVars) {
        varKey = "strokeTopWeight";
      }

      if (varKey in stroke.boundVars && stroke.boundVars[varKey]?.id) {
        const variable = await figma.variables.getVariableByIdAsync(
          stroke.boundVars[varKey].id,
        );
        if (variable) borderToken = formatSpaceToken(variable.name);
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

  // Height annotation - only show if there's a token applied
  const heightToken = await findHeightToken(baseComponent);
  if (heightToken) {
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
  }

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
    if (variable) return formatSpaceToken(variable.name);
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
      if (variable) return formatSpaceToken(variable.name);
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
    {header: "Token / Valor", position: 0.45, color: "warning"},
    {header: "Referência", position: 0.75},
  ]);

  const effectsGrouped = new Map<
    string,
    {
      element: string;
      effectType: string;
      token: string | null;
      value: string;
      variants: string[];
    }
  >();

  for (const variant of variantColors) {
    const variantLabel = formatVariantPropertiesForTable(variant.propertyMap);

    for (const effect of variant.effects) {
      const key = `${effect.element}|${effect.effectType}|${effect.token || ""}|${effect.value}`;

      if (!effectsGrouped.has(key)) {
        effectsGrouped.set(key, {
          element: effect.element,
          effectType: effect.effectType,
          token: effect.token,
          value: effect.value,
          variants: [],
        });
      }

      const entry = effectsGrouped.get(key)!;
      if (!entry.variants.includes(variantLabel)) {
        entry.variants.push(variantLabel);
      }
    }
  }

  const sortedEntries = Array.from(effectsGrouped.values()).sort((a, b) =>
    a.element.localeCompare(b.element),
  );

  const totalVariants = new Set(
    variantColors.map((v) => formatVariantPropertiesForTable(v.propertyMap)),
  ).size;

  let lastElement = "";
  for (const entry of sortedEntries) {
    if (entry.element !== lastElement && lastElement !== "") {
      table.addSpacer(GROUP_SPACING - ROW_GAP);
    }
    lastElement = entry.element;

    const isAllVariants =
      entry.variants.length === totalVariants && totalVariants > 1;
    const refText = isAllVariants ? "Todos" : entry.variants.join(", ");

    const displayValue = entry.token ? entry.token : entry.value;
    const isToken = !!entry.token;

    // USANDO A FUNÇÃO IMPORTADA CORRETAMENTE
    const typeLabel = getEffectTypeLabel(entry.effectType);

    table.addRow(`Row - ${entry.element}`, [
      {text: entry.element},
      {text: typeLabel},
      {text: displayValue, color: isToken ? "warning" : undefined},
      {text: refText},
    ]);
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

  // Filtrar apenas variantes que TÊM efeitos
  const variantsWithEffects = variantColors.filter((v) => v.effects.length > 0);
  if (variantsWithEffects.length === 0) return;

  // Aplicar filtro de propriedades para visualização (se definido)
  let filteredVariants = filterVariantsForVisualization(
    variantsWithEffects,
    vizPropertyFilters,
  );

  // Se o filtro removeu tudo, usar todas as variantes com efeitos
  if (filteredVariants.length === 0) {
    filteredVariants = variantsWithEffects;
  }

  if (component.type === "COMPONENT_SET" && filteredVariants.length > 1) {
    await createMultiVariantEffectsGrid(
      parent,
      component,
      filteredVariants,
      tableWidth,
      highlightMode,
      framesPerRow,
    );
    return;
  }

  if (filteredVariants.length > 1) {
    await createGenericVariantGrid(
      parent,
      component as ComponentSetNode,
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
  const nestedInstanceProps = allProps.filter(
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

  // Seção Nested Instances
  if (nestedInstanceProps.length > 0) {
    const nestedTitle = figma.createText();
    nestedTitle.fontName = getFont("Bold");
    nestedTitle.fontSize = 24;
    nestedTitle.characters = "◇ Nested Instances";
    section.appendChild(nestedTitle);

    const nestedTable = figma.createFrame();
    nestedTable.name = "Nested Instances Table";
    nestedTable.layoutMode = "VERTICAL";
    nestedTable.primaryAxisSizingMode = "AUTO";
    nestedTable.counterAxisSizingMode = "FIXED";
    nestedTable.resize(innerTableWidth, 100);
    nestedTable.itemSpacing = 0;
    nestedTable.fills = [];

    const headerRow = figma.createFrame();
    headerRow.name = "Header Row";
    headerRow.layoutMode = "HORIZONTAL";
    headerRow.primaryAxisSizingMode = "FIXED";
    headerRow.counterAxisSizingMode = "AUTO";
    headerRow.resize(innerTableWidth, 40);
    headerRow.paddingTop = 12;
    headerRow.paddingBottom = 12;
    headerRow.fills = [];

    const headers = ["PROPERTY", "TYPE", "DEFAULT / OPTIONS"];
    for (let i = 0; i < headers.length; i++) {
      const headerCell = figma.createFrame();
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
    nestedTable.appendChild(headerRow);

    for (const prop of nestedInstanceProps) {
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

      // Property name
      const propCell = figma.createFrame();
      propCell.layoutMode = "HORIZONTAL";
      propCell.primaryAxisSizingMode = "FIXED";
      propCell.counterAxisSizingMode = "AUTO";
      propCell.minWidth = colWidths[0];
      propCell.maxWidth = colWidths[0];
      propCell.fills = [];

      const propText = figma.createText();
      propText.fontName = getFont("Regular");
      propText.fontSize = 14;
      propText.characters = propName;
      propText.fills = [{type: "SOLID", color: {r: 0.2, g: 0.2, b: 0.2}}];
      propCell.appendChild(propText);
      row.appendChild(propCell);

      // Type
      const typeCell = figma.createFrame();
      typeCell.layoutMode = "HORIZONTAL";
      typeCell.primaryAxisSizingMode = "FIXED";
      typeCell.counterAxisSizingMode = "AUTO";
      typeCell.counterAxisAlignItems = "CENTER";
      typeCell.minWidth = colWidths[1];
      typeCell.maxWidth = colWidths[1];
      typeCell.fills = [];
      typeCell.itemSpacing = 6;

      const iconText = figma.createText();
      iconText.fontName = getFont("Regular");
      iconText.fontSize = 14;
      iconText.characters = "◇";
      iconText.fills = [{type: "SOLID", color: BLUE_COLOR}];
      typeCell.appendChild(iconText);

      const typeNameText = figma.createText();
      typeNameText.fontName = getFont("Regular");
      typeNameText.fontSize = 14;
      typeNameText.characters = "Variant";
      typeNameText.fills = [{type: "SOLID", color: GRAY_COLOR}];
      typeCell.appendChild(typeNameText);
      row.appendChild(typeCell);

      // Options (preferred values)
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

      if (def.preferredValues && def.preferredValues.length > 0) {
        let isFirst = true;
        for (const pv of def.preferredValues) {
          if (pv.type === "COMPONENT" || pv.type === "COMPONENT_SET") {
            let compName = "Component";
            try {
              const compNode = await figma.importComponentByKeyAsync(pv.key);
              if (compNode) {
                compName = compNode.name;
              }
            } catch {
              try {
                const node = await figma.getNodeByIdAsync(pv.key);
                if (node && "name" in node) {
                  compName = node.name;
                }
              } catch {}
            }

            const badge = figma.createFrame();
            badge.layoutMode = "HORIZONTAL";
            badge.primaryAxisSizingMode = "AUTO";
            badge.counterAxisSizingMode = "AUTO";
            badge.paddingLeft = 12;
            badge.paddingRight = 12;
            badge.paddingTop = 6;
            badge.paddingBottom = 6;
            badge.cornerRadius = 4;

            if (isFirst) {
              badge.fills = [{type: "SOLID", color: BLUE_COLOR}];
            } else {
              badge.fills = [];
              badge.strokes = [{type: "SOLID", color: BLUE_COLOR}];
              badge.strokeWeight = 1;
            }

            const optionText = figma.createText();
            optionText.fontName = getFont("Medium");
            optionText.fontSize = 12;
            optionText.characters = compName;
            optionText.fills = [
              {type: "SOLID", color: isFirst ? WHITE_COLOR : BLUE_COLOR},
            ];
            badge.appendChild(optionText);
            valueCell.appendChild(badge);

            isFirst = false;
          }
        }
      }

      row.appendChild(valueCell);
      nestedTable.appendChild(row);
    }

    section.appendChild(nestedTable);
  }

  parent.appendChild(section);
  return true;
}

// ========================================
// COMPONENT ANATOMY VISUALIZATION
// ========================================

/**
 * Creates component anatomy visualization showing pointers to used components.
 */
async function createComponentAnatomyVisualization(
  parent: FrameNode,
  mainComponent: ComponentNode | ComponentSetNode | InstanceNode,
  componentMap: Map<string, string>,
  tableWidth: number,
  highlightMode: boolean = false,
): Promise<void> {
  if (componentMap.size === 0) return;

  const bgColor: RGB = highlightMode
    ? {r: 56 / 255, g: 83 / 255, b: 255 / 255}
    : {r: 1, g: 1, b: 1};

  const pointerColor: RGB = highlightMode
    ? {r: 98 / 255, g: 248 / 255, b: 79 / 255}
    : {r: 0.9, g: 0.2, b: 0.2};

  const textColor: RGB = highlightMode
    ? {r: 1, g: 1, b: 1}
    : {r: 0.2, g: 0.2, b: 0.2};

  const anatomyContainer = figma.createFrame();
  anatomyContainer.name = "Anatomia do Componente";
  anatomyContainer.layoutMode = "VERTICAL";
  anatomyContainer.primaryAxisSizingMode = "AUTO";
  anatomyContainer.counterAxisSizingMode = "FIXED";
  anatomyContainer.resize(tableWidth, 100);
  anatomyContainer.itemSpacing = 24;
  anatomyContainer.paddingTop = 24;
  anatomyContainer.paddingBottom = 32;
  anatomyContainer.paddingLeft = 32;
  anatomyContainer.paddingRight = 32;
  anatomyContainer.fills = [{type: "SOLID", color: bgColor}];
  anatomyContainer.cornerRadius = 8;

  const subtitle = figma.createText();
  subtitle.fontName = getFont("Medium");
  subtitle.fontSize = 28;
  subtitle.characters = "Anatomia do Componente";
  subtitle.fills = [{type: "SOLID", color: textColor}];
  anatomyContainer.appendChild(subtitle);

  const variationsContainer = figma.createFrame();
  variationsContainer.name = "Variations Container";
  variationsContainer.layoutMode = "HORIZONTAL";
  variationsContainer.layoutWrap = "WRAP";
  variationsContainer.primaryAxisSizingMode = "FIXED";
  variationsContainer.counterAxisSizingMode = "AUTO";
  variationsContainer.resize(tableWidth - 64, 100);
  variationsContainer.itemSpacing = 32;
  variationsContainer.counterAxisSpacing = 32;
  variationsContainer.fills = [];
  variationsContainer.clipsContent = false;

  const variants: ComponentNode[] = [];
  if (mainComponent.type === "COMPONENT_SET") {
    for (const child of mainComponent.children) {
      if (child.type === "COMPONENT") {
        variants.push(child);
      }
    }
  } else if (mainComponent.type === "COMPONENT") {
    variants.push(mainComponent);
  } else if (mainComponent.type === "INSTANCE") {
    const mainComp = await mainComponent.getMainComponentAsync();
    if (mainComp) {
      variants.push(mainComp);
    }
  }

  if (variants.length === 0) {
    anatomyContainer.remove();
    variationsContainer.remove();
    return;
  }

  const componentsShown = new Set<string>();

  async function variantContainsComponent(
    variant: ComponentNode,
    targetComponentId: string,
  ): Promise<{found: boolean; x: number; y: number; w: number; h: number}> {
    const result = {found: false, x: 0, y: 0, w: 0, h: 0};

    async function searchInNode(
      node: SceneNode,
      offsetX: number,
      offsetY: number,
    ): Promise<boolean> {
      if (node.type === "INSTANCE") {
        const mainComp = await node.getMainComponentAsync();
        if (mainComp && mainComp.id === targetComponentId) {
          result.found = true;
          result.x = offsetX + node.x;
          result.y = offsetY + node.y;
          result.w = node.width;
          result.h = node.height;
          return true;
        }
      }
      if ("children" in node) {
        for (const child of (node as FrameNode).children) {
          const newOffsetX =
            node.type === "INSTANCE" ? offsetX : offsetX + node.x;
          const newOffsetY =
            node.type === "INSTANCE" ? offsetY : offsetY + node.y;
          if (await searchInNode(child, newOffsetX, newOffsetY)) {
            return true;
          }
        }
      }
      return false;
    }

    for (const child of variant.children) {
      if (await searchInNode(child, 0, 0)) break;
    }
    return result;
  }

  for (const [compId, compName] of componentMap) {
    if (componentsShown.has(compId)) continue;

    let foundVariant: ComponentNode | null = null;
    let componentPosition = {found: false, x: 0, y: 0, w: 0, h: 0};

    for (const variant of variants) {
      const pos = await variantContainsComponent(variant, compId);
      if (pos.found) {
        foundVariant = variant;
        componentPosition = pos;
        break;
      }
    }

    if (!foundVariant) continue;

    const vizFrame = figma.createFrame();
    vizFrame.name = `Anatomia - ${compName}`;
    vizFrame.fills = [];
    vizFrame.cornerRadius = 8;
    vizFrame.clipsContent = false;

    const instance = foundVariant.createInstance();

    const maxSize = 300;
    let scale = 1;
    if (instance.width > maxSize || instance.height > maxSize) {
      scale = Math.min(maxSize / instance.width, maxSize / instance.height);
      instance.rescale(scale);
    }

    const DOT_SIZE = 8;
    const PADDING = 2;
    const marginBottom = 10;

    const labelText = figma.createText();
    labelText.name = "Label";
    labelText.fontName = getFont("Medium");
    labelText.fontSize = 11;
    labelText.characters = compName;
    labelText.fills = [{type: "SOLID", color: textColor}];

    const scaledW = componentPosition.w * scale;
    const pointerSpaceAbove = labelText.height + PADDING * 2 + 10;
    const marginTop = Math.max(pointerSpaceAbove, 30);
    instance.x = 20;
    instance.y = marginTop;
    vizFrame.appendChild(instance);

    const scaledX = 20 + componentPosition.x * scale;
    const scaledY = marginTop + componentPosition.y * scale;

    const dotX = scaledX + scaledW / 2;
    const dotY = scaledY;

    const lineLength = dotY - PADDING;
    const pointerFrameWidth = Math.max(labelText.width, DOT_SIZE) + PADDING * 2;
    const pointerFrameHeight = lineLength + DOT_SIZE;

    const pointerFrame = figma.createFrame();
    pointerFrame.name = compName;
    pointerFrame.fills = [];
    pointerFrame.clipsContent = false;
    pointerFrame.resize(pointerFrameWidth, pointerFrameHeight);
    pointerFrame.x = dotX - pointerFrameWidth / 2;
    pointerFrame.y = PADDING;

    const dot = figma.createEllipse();
    dot.name = "Dot";
    dot.resize(DOT_SIZE, DOT_SIZE);
    dot.fills = [{type: "SOLID", color: pointerColor}];
    dot.x = pointerFrameWidth / 2 - DOT_SIZE / 2;
    dot.y = pointerFrameHeight - DOT_SIZE;
    dot.constraints = {horizontal: "CENTER", vertical: "MAX"};

    const actualLineLength =
      pointerFrameHeight - labelText.height - PADDING - DOT_SIZE;
    const line = figma.createRectangle();
    line.name = "Line";
    line.fills = [{type: "SOLID", color: pointerColor}];
    line.resize(1, Math.max(actualLineLength, 10));
    line.x = pointerFrameWidth / 2 - 0.5;
    line.y = labelText.height + PADDING;
    line.constraints = {horizontal: "CENTER", vertical: "STRETCH"};

    labelText.x = pointerFrameWidth / 2 - labelText.width / 2;
    labelText.y = 0;
    labelText.constraints = {horizontal: "CENTER", vertical: "MIN"};

    pointerFrame.appendChild(labelText);
    pointerFrame.appendChild(line);
    pointerFrame.appendChild(dot);
    vizFrame.appendChild(pointerFrame);

    const frameWidth = Math.max(instance.width + 40, labelText.width + 40);
    const frameHeight = marginTop + instance.height + marginBottom;
    vizFrame.resize(frameWidth, frameHeight);

    pointerFrame.x = frameWidth / 2 - pointerFrameWidth / 2;

    variationsContainer.appendChild(vizFrame);
    componentsShown.add(compId);
  }

  if (componentsShown.size === 0) {
    anatomyContainer.remove();
    variationsContainer.remove();
    return;
  }

  anatomyContainer.appendChild(variationsContainer);
  parent.appendChild(anatomyContainer);
}

// ========================================
// USED COMPONENTS SECTION
// ========================================

/**
 * Creates the used components section with visualizations and anatomy.
 */
export async function createUsedComponentsSectionAutoLayout(
  parent: FrameNode,
  variantColors: VariantColors[],
  tableWidth: number,
  mainComponents: (ComponentNode | ComponentSetNode | InstanceNode)[] = [],
  highlightMode: boolean = false,
): Promise<boolean> {
  const componentMap = new Map<string, string>();
  for (const variant of variantColors) {
    for (const [compId, compName] of variant.usedComponents) {
      if (compName.startsWith(".") || compName.startsWith("_")) {
        continue;
      }
      componentMap.set(compId, compName);
    }
  }
  if (componentMap.size === 0) return false;

  const section = createSectionContainer("Seção Componentes Utilizados");
  createSectionTitle("COMPONENTES E ÍCONES UTILIZADOS", section);

  const componentsContainer = figma.createFrame();
  componentsContainer.name = "Components Container";
  componentsContainer.layoutMode = "HORIZONTAL";
  componentsContainer.layoutWrap = "WRAP";
  componentsContainer.primaryAxisSizingMode = "FIXED";
  componentsContainer.counterAxisSizingMode = "AUTO";
  componentsContainer.resize(tableWidth, 100);
  componentsContainer.itemSpacing = 48;
  componentsContainer.counterAxisSpacing = 40;
  componentsContainer.paddingLeft = 32;
  componentsContainer.paddingRight = 32;
  componentsContainer.paddingTop = 32;
  componentsContainer.paddingBottom = 32;
  componentsContainer.fills = [
    {type: "SOLID", color: {r: 0.98, g: 0.98, b: 0.98}},
  ];
  componentsContainer.cornerRadius = 8;

  const MAX_COMPONENTS_TO_SHOW = 100;
  const componentEntries = Array.from(componentMap.entries()).slice(
    0,
    MAX_COMPONENTS_TO_SHOW,
  );

  if (componentMap.size > MAX_COMPONENTS_TO_SHOW) {
    const warningText = figma.createText();
    warningText.fontName = getFont("Regular");
    warningText.fontSize = 12;
    warningText.characters = `Mostrando ${MAX_COMPONENTS_TO_SHOW} de ${componentMap.size} componentes`;
    warningText.fills = [{type: "SOLID", color: {r: 0.5, g: 0.5, b: 0.5}}];
    section.appendChild(warningText);
  }

  for (const [compId, displayName] of componentEntries) {
    const card = figma.createFrame();
    card.name = `Card: ${displayName}`;
    card.layoutMode = "VERTICAL";
    card.primaryAxisSizingMode = "AUTO";
    card.counterAxisSizingMode = "AUTO";
    card.primaryAxisAlignItems = "CENTER";
    card.counterAxisAlignItems = "CENTER";
    card.itemSpacing = 8;
    card.fills = [];

    let foundComponent: ComponentNode | null = null;
    try {
      const node = await figma.getNodeByIdAsync(compId);
      if (node && node.type === "COMPONENT") {
        foundComponent = node;
      }
    } catch {
      // Component might be from external library or deleted
    }

    if (foundComponent) {
      try {
        const instance = foundComponent.createInstance();
        const maxSize = 180;

        if (instance.width > maxSize || instance.height > maxSize) {
          const scale = Math.min(
            maxSize / instance.width,
            maxSize / instance.height,
          );
          instance.rescale(scale);
        }
        card.appendChild(instance);
      } catch {
        const placeholder = figma.createRectangle();
        placeholder.resize(80, 80);
        placeholder.fills = [{type: "SOLID", color: {r: 0.9, g: 0.9, b: 0.9}}];
        placeholder.cornerRadius = 8;
        card.appendChild(placeholder);
      }
    } else {
      const placeholder = figma.createRectangle();
      placeholder.resize(80, 80);
      placeholder.fills = [{type: "SOLID", color: {r: 0.9, g: 0.9, b: 0.9}}];
      placeholder.cornerRadius = 8;
      card.appendChild(placeholder);
    }

    const nameText = figma.createText();
    nameText.fontName = getFont("Medium");
    nameText.fontSize = 12;
    nameText.characters = displayName;
    nameText.textAlignHorizontal = "CENTER";
    nameText.fills = [{type: "SOLID", color: {r: 0.2, g: 0.6, b: 0.2}}];
    card.appendChild(nameText);

    componentsContainer.appendChild(card);
  }

  section.appendChild(componentsContainer);

  if (mainComponents.length > 0) {
    await createComponentAnatomyVisualization(
      section,
      mainComponents[0],
      componentMap,
      tableWidth,
      highlightMode,
    );
  }

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

  // 1. Tentar usar API moderna de propriedades
  if (propDefs && Object.keys(propDefs).length > 0) {
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
        properties.push({name: name.toLowerCase(), values: sortedValues});
      }
    }
  }

  // 2. CORREÇÃO: Fallback para componentes antigos ou sem definições formais
  // Se não encontrou propriedades via API, parsear os nomes dos filhos
  if (properties.length === 0) {
    const propertiesMap: Map<string, Set<string>> = new Map();

    for (const child of componentSet.children) {
      if (child.type !== "COMPONENT") continue;

      const parts = child.name.split(",").map((p) => p.trim());
      for (const part of parts) {
        const [key, value] = part.split("=").map((s) => s.trim());
        if (key && value) {
          const normalizedKey = key.toLowerCase();
          if (!propertiesMap.has(normalizedKey)) {
            propertiesMap.set(normalizedKey, new Set());
          }
          propertiesMap.get(normalizedKey)!.add(value);
        }
      }
    }

    for (const [name, values] of propertiesMap) {
      const sortedValues = Array.from(values).sort((a, b) => {
        const sizeOrder: Record<string, number> = SIZE_ORDER;
        const aLower = a.toLowerCase();
        const bLower = b.toLowerCase();
        const orderA = sizeOrder[aLower] ?? 99;
        const orderB = sizeOrder[bLower] ?? 99;
        if (orderA !== orderB) return orderA - orderB;
        return a.localeCompare(b);
      });
      properties.push({name, values: sortedValues});
    }
  }

  return properties;
}