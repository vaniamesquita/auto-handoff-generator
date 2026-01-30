import { VariantColors, AnnotationTracker } from "../types";
import { getFont } from "../utils/fonts";
import { formatSpaceToken } from "../utils/helpers";
import { createTableBuilder, createSectionTitle } from "../ui/table-builder";
import { annotateGapNew, annotatePaddingNew, annotateRadiusNew, annotateBorderNew, annotateDimensionNew } from "../ui/annotations";
import { createSectionContainer, filterVariantsForVisualization, createGenericVariantGrid, formatVariantPropertiesForTable } from "./common";

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

    // Group borders by position and check if all sides are equal
    const bordersByPosition: Map<string, typeof variant.borders> = new Map();
    for (const border of variant.borders) {
      const position = border.position || "Center";
      if (!bordersByPosition.has(position)) {
        bordersByPosition.set(position, []);
      }
      bordersByPosition.get(position)!.push(border);
    }

    // Process each position group
    for (const [position, bordersInPosition] of bordersByPosition) {
      const sides = bordersInPosition.filter(b => b.side && b.side !== "All");
      const allSide = bordersInPosition.find(b => b.side === "All");

      if (allSide || (sides.length === 4 && sides.every(b => b.value === sides[0].value && (b.token || null) === (sides[0].token || null)))) {
        // All sides have same value - add both Stroke Position and Border (with token)
        const firstBorder = allSide || sides[0];

        // 1. Add Stroke Position entry
        const positionProp = "Stroke Position";
        if (!spacingsByProperty.has(positionProp)) {
          spacingsByProperty.set(positionProp, []);
        }
        const positionEntries = spacingsByProperty.get(positionProp)!;
        const existingPosition = positionEntries.find(
          (e) => e.value === position,
        );
        if (existingPosition) {
          if (!existingPosition.variants.includes(variantLabel)) {
            existingPosition.variants.push(variantLabel);
          }
        } else {
          positionEntries.push({
            token: null,
            value: position,
            variants: [variantLabel],
          });
        }

        // 2. Add Border (stroke weight with token from borders)
        const borderProp = "Border";
        if (!spacingsByProperty.has(borderProp)) {
          spacingsByProperty.set(borderProp, []);
        }
        const borderEntries = spacingsByProperty.get(borderProp)!;
        const existingBorder = borderEntries.find(
          (e) => (e.token || e.value) === (firstBorder.token || firstBorder.value),
        );
        if (existingBorder) {
          if (!existingBorder.variants.includes(variantLabel)) {
            existingBorder.variants.push(variantLabel);
          }
        } else {
          borderEntries.push({
            token: firstBorder.token,
            value: firstBorder.value,
            variants: [variantLabel],
          });
        }
      } else {
        // Different values on different sides - add each side separately
        for (const border of bordersInPosition) {
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
    }
  }

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

  const entriesByPrefix: Map<string, DisplayEntry[]> = new Map();
  for (const entry of allDisplayEntries) {
    if (!entriesByPrefix.has(entry.prefix)) {
      entriesByPrefix.set(entry.prefix, []);
    }
    entriesByPrefix.get(entry.prefix)!.push(entry);
  }

  const sortedPrefixes = Array.from(entriesByPrefix.keys()).sort((a, b) => {
    if (a === "Todos") return -1;
    if (b === "Todos") return 1;
    return a.localeCompare(b);
  });

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

  const heightToken = await findHeightToken(baseComponent);
  // Only show height annotation if there's a token applied
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

// === GRID HELPERS ===

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

// === HELPER FUNCTIONS FOR DIMENSIONS ===

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

async function processSpacingNodeForViz(
  node: SceneNode,
  container: FrameNode,
  baseX: number,
  baseY: number,
  instanceBounds: {x: number; y: number; width: number; height: number},
  highlightMode: boolean = false,
  tracker?: AnnotationTracker,
): Promise<void> {
  if ("visible" in node && !node.visible) return;

  if (!tracker) {
    tracker = {
      rightPositions: [],
      leftPositions: [],
      topPositions: [],
      bottomPositions: [],
      gapPositions: [],
    };
  }

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