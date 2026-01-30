import { VariantColors } from "../types";
import { SIZE_ORDER, getTheme } from "../config/theme";
import { getFont } from "../utils/fonts";

// Interfaces locais para grids
export interface VariantGridConfig {
  gridName: string;
  margin: number;
  minHeight?: number;
}

export interface VariantAnnotationContext {
  variant: ComponentNode;
  instance: InstanceNode;
  vizFrame: FrameNode;
  vc: VariantColors;
  instanceBounds: {x: number; y: number; width: number; height: number};
  highlightMode: boolean;
}

export type VariantAnnotationCallback = (
  ctx: VariantAnnotationContext,
) => Promise<void>;

/**
 * Creates a section container with vertical layout.
 */
export function createSectionContainer(
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
export function getVariantTitle(variantColors: VariantColors): string {
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
export function sortVariantsBySize(variants: VariantColors[]): VariantColors[] {
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
export function formatVariantPropertiesForTable(
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

/**
 * Filters variants for visualization based on selected properties.
 */
export function filterVariantsForVisualization(
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

  return deduplicateVariants(filtered, selectedProperties);
}

/**
 * Deduplicates variants prioritizing Default, Regular, Enabled.
 */
export function deduplicateVariants(
  variants: VariantColors[],
  selectedProperties: Record<string, string[]>,
): VariantColors[] {
  const PRIORITY_VALUES = ["default", "regular", "enabled"];
  const selectedPropNames = Object.keys(selectedProperties).filter(
    (k) => selectedProperties[k].length > 0,
  );

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

/**
 * Creates a titled variant frame for visualizations.
 */
export async function createTitledVariantFrame(
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
 */
export async function createGenericVariantGrid(
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

  const numColumns = framesPerRow;
  const frameWidth = Math.floor(
    (tableWidth - (numColumns - 1) * GRID_GAP) / numColumns,
  );

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

  for (const vc of sortedVariants) {
    const variant = componentSet.children.find(
      (c) => c.type === "COMPONENT" && c.name === vc.variantName,
    ) as ComponentNode | undefined;

    if (!variant) continue;

    const frameHeight = maxFrameHeight;
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