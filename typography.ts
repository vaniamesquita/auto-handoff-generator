import { VariantColors, TextSpec } from "../types";
import { SIZE_ORDER, getTheme } from "../config/theme";
import { getFont } from "../utils/fonts";
import { resolveNodeName, findTextNodes } from "../core/node-helpers";
import { createTableBuilder, createSectionTitle } from "../ui/table-builder";
import { createSimpleAnnotation } from "../ui/annotations";
import { createSectionContainer, filterVariantsForVisualization, createGenericVariantGrid } from "./common";

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

  allTextRows.sort((a, b) => a.sizeOrder - b.sizeOrder);

  const seen = new Set<string>();
  const uniqueRows = allTextRows.filter((row) => {
    const key = `${row.sizeElement}-${row.textSpec.token || row.textSpec.fontFamily}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

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
        isAbove ? "pointer-top" : "pointer-bottom",
        "green",
        highlightMode,
      );
    }
  }

  vizContainer.appendChild(vizFrame);
  parent.appendChild(vizContainer);
}

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
          isAbove ? "pointer-top" : "pointer-bottom",
          "green",
          ctx.highlightMode,
        );
      }
    },
  );
}