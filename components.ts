import { VariantColors } from "../types";
import { getFont } from "../utils/fonts";
import { createSectionTitle } from "../ui/table-builder";
import { createSectionContainer } from "./common";

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