import { VariantColors } from "../types";
import { getFont } from "../utils/fonts";
import { extractRelevantProperties } from "../utils/helpers";
import { createSectionTitle } from "../ui/table-builder";
import { createSectionContainer } from "./common";

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

  // First pass: calculate max height needed
  let maxCardHeight = 100;
  for (const variant of uniqueVariants) {
    const tempCard = figma.createFrame();
    tempCard.layoutMode = "VERTICAL";
    tempCard.primaryAxisSizingMode = "AUTO";
    tempCard.counterAxisSizingMode = "FIXED";
    tempCard.resize(cardWidth, 100);
    tempCard.paddingTop = CARD_PADDING;
    tempCard.paddingBottom = CARD_PADDING;
    tempCard.paddingLeft = CARD_PADDING;
    tempCard.paddingRight = CARD_PADDING;
    tempCard.itemSpacing = 16;

    const tempLabel = figma.createText();
    tempLabel.fontName = getFont("Regular");
    tempLabel.fontSize = 14;
    tempLabel.characters = `01. ${variant.name}`;
    tempCard.appendChild(tempLabel);

    const tempInstance = variant.node.createInstance();
    tempCard.appendChild(tempInstance);

    const calculatedHeight = tempCard.height;
    if (calculatedHeight > maxCardHeight) {
      maxCardHeight = calculatedHeight;
    }

    tempCard.remove();
  }

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
      card.resize(cardWidth, maxCardHeight); // Use max height
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