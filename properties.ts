import { VariantProperty } from "../types";
import { getFont } from "../utils/fonts";
import { SIZE_ORDER } from "../config/theme";
import { createSectionTitle } from "../ui/table-builder";
import { createSectionContainer } from "./common";

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

  if (nestedInstanceProps.length > 0) {
    const nestedTitle = figma.createText();
    nestedTitle.fontName = getFont("Bold");
    nestedTitle.fontSize = 24;
    nestedTitle.characters = "◇ Nested Instances";
    section.appendChild(nestedTitle);

    const colWidths = [
      Math.floor(innerTableWidth * 0.25),
      Math.floor(innerTableWidth * 0.2),
      Math.floor(innerTableWidth * 0.55),
    ];

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

export function extractVariantProperties(
  componentSet: ComponentSetNode,
): VariantProperty[] {
  const properties: VariantProperty[] = [];
  const propDefs = componentSet.componentPropertyDefinitions;

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