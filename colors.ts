// src/features/colors.ts

import { VariantColors, ColorSpec } from "../types";
import { getFont } from "../utils/fonts";
import { hexToRgb } from "../utils/helpers";
import { createSectionTitle, createTableAutoLayoutContainer, groupElementsAndAppend } from "../ui/table-builder";
import { createSectionContainer } from "./common";

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

  // CRIA O CONTAINER (FrameNode)
  const tableContainer = createTableAutoLayoutContainer(
    "Tabela Cores",
    tableWidth,
    ROW_GAP,
  );

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

      const rowBg = figma.createRectangle();
      rowBg.name = "Row Background";
      rowBg.resize(tableWidth, ROW_HEIGHT);
      rowBg.fills = [{type: "SOLID", color: {r: 1, g: 1, b: 1}}];
      rowBg.cornerRadius = 4;
      rowBg.x = 0;
      rowBg.y = 0;
      rowElements.push(rowBg);

      const elementText = figma.createText();
      elementText.fontName = getFont("Regular");
      elementText.fontSize = 16;
      elementText.characters = `${colorRow.state} / ${colorRow.element}`;
      elementText.x = 16;
      elementText.y = 12;
      rowElements.push(elementText);

      const tokenText = figma.createText();
      tokenText.fontName = getFont("Regular");
      tokenText.fontSize = 16;
      tokenText.characters =
        colorRow.colorSpec.token || colorRow.colorSpec.colorHex;
      tokenText.fills = [{type: "SOLID", color: {r: 0.85, g: 0.1, b: 0.1}}];
      tokenText.x = Math.floor(tableWidth * 0.4);
      tokenText.y = 12;
      rowElements.push(tokenText);

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

  // CORREÇÃO AQUI: Em vez de 'table.appendTo(parent)', usamos:
  parent.appendChild(tableContainer);
}