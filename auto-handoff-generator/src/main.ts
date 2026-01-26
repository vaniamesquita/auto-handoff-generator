// ========================================================================
// AUTO HANDOFF GENERATOR - MAIN ENTRY POINT
// ========================================================================

import type {GenerationOptions, VariantColors, VariantProperty} from "./types";
import {loadPluginFonts, getFont} from "./utils/fonts";
import {processComponent} from "./core/traversal";
import {
  createColorSectionCombined,
  createTextSectionCombined,
  createSpacingSectionCombined,
  createEffectsSectionCombined,
  createEstadosSection,
  createPropertiesSection,
  createUsedComponentsSectionAutoLayout,
  extractVariantProperties,
} from "./features/generators";
import {insertAssetIntoFigma} from "./assets/marker-generator";

// ========================================
// MAIN INITIALIZATION
// ========================================

/**
 * Main initialization function.
 * Shows UI and sends component data.
 */
async function main(): Promise<void> {
  // Always show UI (even without selection)
  figma.showUI(__html__, {width: 320, height: 640});

  // Check selection
  const selection = figma.currentPage.selection;

  // Filter valid nodes
  const validNodes = selection.filter(
    (node) =>
      node.type === "COMPONENT" ||
      node.type === "COMPONENT_SET" ||
      node.type === "INSTANCE",
  );

  // If no valid selection, just show UI without component data
  if (validNodes.length === 0) {
    figma.ui.postMessage({
      type: "init",
      componentName: "Nenhum componente selecionado",
      variantProperties: [],
      selectionCount: 0,
    });
    return;
  }

  // Collect names and variant properties from all nodes
  const componentNames: string[] = [];
  const allVariantProperties: Map<string, Set<string>> = new Map();

  for (const node of validNodes) {
    let nodeName = node.name;
    let nodeVariantProperties: VariantProperty[] = [];

    if (node.type === "COMPONENT_SET") {
      nodeVariantProperties = extractVariantProperties(node);
      nodeName = node.name;
    } else if (node.type === "INSTANCE") {
      const mainComponent = await (
        node as InstanceNode
      ).getMainComponentAsync();
      if (mainComponent?.parent?.type === "COMPONENT_SET") {
        nodeVariantProperties = extractVariantProperties(mainComponent.parent);
        nodeName = mainComponent.parent.name;
      } else {
        nodeName = mainComponent?.name || node.name;
      }
    } else if (node.type === "COMPONENT") {
      if (node.parent?.type === "COMPONENT_SET") {
        nodeVariantProperties = extractVariantProperties(
          node.parent as ComponentSetNode,
        );
        nodeName = node.parent.name;
      }
    }

    componentNames.push(nodeName);

    // Merge variant properties
    for (const prop of nodeVariantProperties) {
      if (!allVariantProperties.has(prop.name)) {
        allVariantProperties.set(prop.name, new Set());
      }
      for (const value of prop.values) {
        allVariantProperties.get(prop.name)!.add(value);
      }
    }
  }

  // Convert Map to VariantProperty array
  const mergedVariantProperties: VariantProperty[] = [];
  for (const [name, values] of allVariantProperties) {
    mergedVariantProperties.push({name, values: Array.from(values)});
  }

  // Determine name to display in UI
  const displayName =
    validNodes.length === 1
      ? componentNames[0]
      : `${validNodes.length} componentes selecionados`;

  // Send info to UI
  figma.ui.postMessage({
    type: "init",
    componentName: displayName,
    variantProperties: mergedVariantProperties,
    hasVariants: mergedVariantProperties.length > 0,
    selectionCount: validNodes.length,
  });
}

// ========================================
// SECTION DIVIDER
// ========================================

/**
 * Adds a section divider.
 */
async function addSectionDivider(
  parent: FrameNode,
  width: number,
): Promise<void> {
  const divider = figma.createFrame();
  divider.name = "Divider";
  divider.resize(width, 1);
  divider.fills = [{type: "SOLID", color: {r: 0.85, g: 0.85, b: 0.85}}];
  parent.appendChild(divider);
}

// ========================================
// SPEC GENERATION
// ========================================

/**
 * Generates the specification based on user options.
 */
async function generateSpec(options: GenerationOptions): Promise<void> {
  // Hide UI first so notification appears immediately
  figma.ui.hide();

  // Notify user that plugin is running
  const loadingNotification = figma.notify("🔄 Gerando especificação...", {
    timeout: 50000,
  });

  await loadPluginFonts();

  const selection = figma.currentPage.selection;

  // Filter only supported nodes (Instance, Component, ComponentSet)
  const validNodes: (ComponentNode | ComponentSetNode | InstanceNode)[] = [];
  const componentNames: string[] = [];

  for (const node of selection) {
    if (node.type === "INSTANCE") {
      const mainComp = await node.getMainComponentAsync();
      componentNames.push(mainComp?.name || node.name);
      validNodes.push(node);
    } else if (node.type === "COMPONENT" || node.type === "COMPONENT_SET") {
      componentNames.push(node.name);
      validNodes.push(node);
    }
  }

  if (validNodes.length === 0) {
    loadingNotification.cancel();
    figma.notify(
      "❌ Selecione um Component, Component Set ou Instance para gerar especificações",
    );
    figma.ui.show();
    return;
  }

  // Process all nodes and aggregate variantColors
  const allVariantColors: VariantColors[] = [];
  for (const nodeToProcess of validNodes) {
    const variantColors = await processComponent(nodeToProcess);
    allVariantColors.push(...variantColors);
  }

  // Validation - generate spec even if only has spacings or visualizations
  if (allVariantColors.length === 0) {
    figma.notify("⚠️ Nenhum dado encontrado nos componentes selecionados");
    figma.closePlugin();
    return;
  }

  // Determine spec name (single or multiple)
  const specTitle =
    componentNames.length === 1
      ? componentNames[0]
      : `${componentNames.length} Componentes`;

  // Use first node for positioning and visualizations (fallback)
  const firstNode = validNodes[0];

  // Use custom settings or default values
  const frameWidth = options.frameWidth || 1140;
  const paddingH = options.paddingHorizontal || 84;
  const sectionGap = options.sectionSpacingValue || 40;
  const tableWidth = frameWidth - paddingH * 2;

  // Main frame WITH AUTO-LAYOUT - Customizable background
  const specFrame = figma.createFrame();
  specFrame.name = `${specTitle} — Especificação`;
  specFrame.x = firstNode.x + firstNode.width + 100;
  specFrame.y = firstNode.y;

  // Convert hex to RGB
  const bgHex = options.bgColor || "F4F5F7";
  const bgR = parseInt(bgHex.substring(0, 2), 16) / 255;
  const bgG = parseInt(bgHex.substring(2, 4), 16) / 255;
  const bgB = parseInt(bgHex.substring(4, 6), 16) / 255;
  specFrame.fills = [{type: "SOLID", color: {r: bgR, g: bgG, b: bgB}}];

  // Configure vertical auto-layout with customizable spacing
  specFrame.layoutMode = "VERTICAL";
  specFrame.primaryAxisSizingMode = "AUTO";
  specFrame.counterAxisSizingMode = "FIXED";
  specFrame.resize(frameWidth, 100);
  specFrame.itemSpacing = sectionGap;
  specFrame.paddingLeft = paddingH;
  specFrame.paddingRight = paddingH;
  specFrame.paddingTop = 60;
  specFrame.paddingBottom = 60;

  // Title
  const titleText = figma.createText();
  titleText.fontName = getFont("Bold");
  titleText.fontSize = 48;
  titleText.characters = `${specTitle} — Especificações`;
  titleText.textAutoResize = "WIDTH_AND_HEIGHT";
  specFrame.appendChild(titleText);

  // Subtitle with component list (if multiple)
  if (componentNames.length > 1) {
    const subtitleText = figma.createText();
    subtitleText.fontName = getFont("Regular");
    subtitleText.fontSize = 14;
    subtitleText.characters = componentNames.join(", ");
    subtitleText.fills = [{type: "SOLID", color: {r: 0.4, g: 0.4, b: 0.4}}];
    subtitleText.textAutoResize = "WIDTH_AND_HEIGHT";
    specFrame.appendChild(subtitleText);
  }

  // Track sections created to add dividers correctly
  let lastSectionCreated = false;

  // COLORS SECTION (table only, consolidated data from all components)
  if (options.sectionColors) {
    const hasContent = allVariantColors.some((v) => v.colors.length > 0);
    if (hasContent) {
      if (lastSectionCreated) await addSectionDivider(specFrame, tableWidth);
      const created = await createColorSectionCombined(
        specFrame,
        allVariantColors,
        tableWidth,
      );
      if (created) lastSectionCreated = true;
    }
  }

  // TEXT PATTERNS SECTION (table + visualization for each component)
  if (options.sectionText) {
    let sectionCreated = false;
    let dividerAdded = false;
    for (let i = 0; i < validNodes.length; i++) {
      const nodeToProcess = validNodes[i];
      const nodeVariantColors = await processComponent(nodeToProcess);
      const hasContent = nodeVariantColors.some((v) => v.textStyles.length > 0);
      if (!hasContent) continue;
      if (!dividerAdded && lastSectionCreated) {
        await addSectionDivider(specFrame, tableWidth);
        dividerAdded = true;
      }
      if (sectionCreated) {
        const compTitle = figma.createText();
        compTitle.fontName = getFont("Medium");
        compTitle.fontSize = 18;
        compTitle.characters = componentNames[i];
        compTitle.fills = [{type: "SOLID", color: {r: 0.2, g: 0.2, b: 0.2}}];
        specFrame.appendChild(compTitle);
      }
      const created = await createTextSectionCombined(
        specFrame,
        nodeVariantColors,
        nodeToProcess,
        tableWidth,
        options.highlightMode,
        options.textVizProperties,
        options.textFramesPerRow || 2,
        options.textShowTable ?? true,
        options.textShowViz ?? true,
      );
      if (created) sectionCreated = true;
    }
    if (sectionCreated) lastSectionCreated = true;
  }

  // SPACING SECTION (table + visualizations for each component)
  if (options.sectionSpacing) {
    let sectionCreated = false;
    let dividerAdded = false;
    for (let i = 0; i < validNodes.length; i++) {
      const nodeToProcess = validNodes[i];
      const nodeVariantColors = await processComponent(nodeToProcess);
      const hasContent = nodeVariantColors.some(
        (v) => v.spacings.length > 0 || v.borders.length > 0,
      );
      if (!hasContent) continue;
      if (!dividerAdded && lastSectionCreated) {
        await addSectionDivider(specFrame, tableWidth);
        dividerAdded = true;
      }
      if (sectionCreated) {
        const compTitle = figma.createText();
        compTitle.fontName = getFont("Medium");
        compTitle.fontSize = 18;
        compTitle.characters = componentNames[i];
        compTitle.fills = [{type: "SOLID", color: {r: 0.2, g: 0.2, b: 0.2}}];
        specFrame.appendChild(compTitle);
      }
      const created = await createSpacingSectionCombined(
        specFrame,
        nodeVariantColors,
        nodeToProcess,
        tableWidth,
        options.highlightMode,
        options.spacingVizProperties,
        options.spacingFramesPerRow || 2,
        options.spacingShowTable ?? true,
        options.spacingShowViz ?? true,
      );
      if (created) sectionCreated = true;
    }
    if (sectionCreated) lastSectionCreated = true;
  }

  // EFFECTS SECTION (Shadows, Blur, etc.)
  if (options.sectionEffects) {
    let sectionCreated = false;
    let dividerAdded = false;
    for (let i = 0; i < validNodes.length; i++) {
      const nodeToProcess = validNodes[i];
      const nodeVariantColors = await processComponent(nodeToProcess);
      const hasContent = nodeVariantColors.some((v) => v.effects.length > 0);
      if (!hasContent) continue;
      if (!dividerAdded && lastSectionCreated) {
        await addSectionDivider(specFrame, tableWidth);
        dividerAdded = true;
      }
      if (sectionCreated) {
        const compTitle = figma.createText();
        compTitle.fontName = getFont("Medium");
        compTitle.fontSize = 18;
        compTitle.characters = componentNames[i];
        compTitle.fills = [{type: "SOLID", color: {r: 0.2, g: 0.2, b: 0.2}}];
        specFrame.appendChild(compTitle);
      }
      const created = await createEffectsSectionCombined(
        specFrame,
        nodeVariantColors,
        nodeToProcess,
        tableWidth,
        options.highlightMode,
        options.effectsVizProperties || {},
        options.effectsFramesPerRow || 2,
        options.effectsShowTable ?? true,
        options.effectsShowViz ?? true,
      );
      if (created) sectionCreated = true;
    }
    if (sectionCreated) lastSectionCreated = true;
  }

  // USED COMPONENTS SECTION (consolidated from all)
  if (options.sectionComponents) {
    const componentMap = new Map<string, string>();
    for (const variant of allVariantColors) {
      for (const [compId, compName] of variant.usedComponents) {
        componentMap.set(compId, compName);
      }
    }
    if (componentMap.size > 0) {
      if (lastSectionCreated) await addSectionDivider(specFrame, tableWidth);
      const created = await createUsedComponentsSectionAutoLayout(
        specFrame,
        allVariantColors,
        tableWidth,
      );
      if (created) lastSectionCreated = true;
    }
  }

  // ESTADOS SECTION (show variants of each component)
  if (options.sectionEstados) {
    let hasAnyEstados = false;
    for (const node of validNodes) {
      if (node.type === "COMPONENT_SET" && node.children.length > 0) {
        hasAnyEstados = true;
        break;
      } else if (node.type === "COMPONENT" || node.type === "INSTANCE") {
        hasAnyEstados = true;
        break;
      }
    }
    if (hasAnyEstados) {
      let sectionCreated = false;
      let dividerAdded = false;
      for (let i = 0; i < validNodes.length; i++) {
        const nodeToProcess = validNodes[i];
        if (!dividerAdded && lastSectionCreated) {
          await addSectionDivider(specFrame, tableWidth);
          dividerAdded = true;
        }
        if (sectionCreated && validNodes.length > 1) {
          const compTitle = figma.createText();
          compTitle.fontName = getFont("Medium");
          compTitle.fontSize = 18;
          compTitle.characters = `Estados: ${componentNames[i]}`;
          compTitle.fills = [{type: "SOLID", color: {r: 0.2, g: 0.2, b: 0.2}}];
          specFrame.appendChild(compTitle);
        }
        // Get component set for estados section
        let componentSet: ComponentSetNode | null = null;
        if (nodeToProcess.type === "COMPONENT_SET") {
          componentSet = nodeToProcess;
        } else if (
          nodeToProcess.type === "COMPONENT" &&
          nodeToProcess.parent?.type === "COMPONENT_SET"
        ) {
          componentSet = nodeToProcess.parent as ComponentSetNode;
        } else if (nodeToProcess.type === "INSTANCE") {
          const mainComp = await nodeToProcess.getMainComponentAsync();
          if (mainComp?.parent?.type === "COMPONENT_SET") {
            componentSet = mainComp.parent as ComponentSetNode;
          }
        }
        if (componentSet) {
          const nodeVariantColors = await processComponent(componentSet);
          const created = await createEstadosSection(
            specFrame,
            componentSet,
            nodeVariantColors,
            tableWidth,
            options.highlightMode,
            options.gridDensity || 3,
          );
          if (created) sectionCreated = true;
        }
      }
      if (sectionCreated) lastSectionCreated = true;
    }
  }

  // PROPERTIES SECTION (for each component)
  if (options.sectionProperties) {
    let hasAnyProperties = false;
    for (const node of validNodes) {
      let componentSet: ComponentSetNode | null = null;
      if (node.type === "COMPONENT_SET") {
        componentSet = node;
      } else if (
        node.type === "COMPONENT" &&
        node.parent?.type === "COMPONENT_SET"
      ) {
        componentSet = node.parent as ComponentSetNode;
      } else if (node.type === "INSTANCE") {
        const mainComp = await node.getMainComponentAsync();
        if (mainComp?.parent?.type === "COMPONENT_SET") {
          componentSet = mainComp.parent as ComponentSetNode;
        }
      }
      if (
        componentSet?.componentPropertyDefinitions &&
        Object.keys(componentSet.componentPropertyDefinitions).length > 0
      ) {
        hasAnyProperties = true;
        break;
      }
    }
    if (hasAnyProperties) {
      let sectionCreated = false;
      let dividerAdded = false;
      for (let i = 0; i < validNodes.length; i++) {
        const nodeToProcess = validNodes[i];
        if (!dividerAdded && lastSectionCreated) {
          await addSectionDivider(specFrame, tableWidth);
          dividerAdded = true;
        }
        if (sectionCreated && validNodes.length > 1) {
          const compTitle = figma.createText();
          compTitle.fontName = getFont("Medium");
          compTitle.fontSize = 18;
          compTitle.characters = `Propriedades: ${componentNames[i]}`;
          compTitle.fills = [{type: "SOLID", color: {r: 0.2, g: 0.2, b: 0.2}}];
          specFrame.appendChild(compTitle);
        }
        // Get component set for properties section
        let componentSet: ComponentSetNode | null = null;
        if (nodeToProcess.type === "COMPONENT_SET") {
          componentSet = nodeToProcess;
        } else if (
          nodeToProcess.type === "COMPONENT" &&
          nodeToProcess.parent?.type === "COMPONENT_SET"
        ) {
          componentSet = nodeToProcess.parent as ComponentSetNode;
        } else if (nodeToProcess.type === "INSTANCE") {
          const mainComp = await nodeToProcess.getMainComponentAsync();
          if (mainComp?.parent?.type === "COMPONENT_SET") {
            componentSet = mainComp.parent as ComponentSetNode;
          }
        }
        if (componentSet) {
          const created = await createPropertiesSection(
            specFrame,
            componentSet,
            tableWidth,
          );
          if (created) sectionCreated = true;
        }
      }
      if (sectionCreated) lastSectionCreated = true;
    }
  }

  figma.currentPage.appendChild(specFrame);
  figma.viewport.scrollAndZoomIntoView([specFrame]);

  // Cancel loading notification and show success
  loadingNotification.cancel();
  const successMsg =
    validNodes.length === 1
      ? "✅ Especificação gerada com sucesso!"
      : `✅ Especificação gerada para ${validNodes.length} componentes!`;
  figma.notify(successMsg);
  figma.closePlugin();
}

// ========================================
// UI MESSAGE HANDLER
// ========================================

figma.ui.onmessage = async (msg: {
  type: string;
  options?: GenerationOptions;
  assetType?: string;
  value?: string;
  color?: string;
  direction?: string;
  badgePosition?: string;
  highlightMode?: boolean;
}) => {
  if (msg.type === "generate" && msg.options) {
    await generateSpec(msg.options);
  } else if (msg.type === "insert-asset" && msg.assetType) {
    await insertAssetIntoFigma(
      msg.assetType,
      msg.value || "0px",
      msg.color || "red",
      (msg.direction as "horizontal" | "vertical") || "horizontal",
      (msg.badgePosition as "top" | "bottom" | "left" | "right") || "bottom",
      msg.highlightMode || false,
    );
  } else if (msg.type === "cancel") {
    figma.closePlugin();
  }
};

// ========================================
// RUN MAIN
// ========================================

main();
