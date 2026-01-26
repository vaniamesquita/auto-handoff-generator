"use strict";
(() => {
  // src/utils/fonts.ts
  var FONT_CANDIDATES = ["BancoDoBrasil Textos", "Inter", "Roboto"];
  var FONT_STYLES = ["Regular", "Medium", "Bold"];
  var resolvedFontFamily = null;
  async function loadPluginFonts() {
    if (resolvedFontFamily) return resolvedFontFamily;
    for (const family of FONT_CANDIDATES) {
      try {
        for (const style of FONT_STYLES) {
          await figma.loadFontAsync({ family, style });
        }
        resolvedFontFamily = family;
        return family;
      } catch (e) {
      }
    }
    resolvedFontFamily = "Inter";
    try {
      for (const style of FONT_STYLES) {
        await figma.loadFontAsync({ family: "Inter", style });
      }
    } catch (e) {
    }
    return resolvedFontFamily;
  }
  function getResolvedFontFamily() {
    return resolvedFontFamily != null ? resolvedFontFamily : "Inter";
  }
  function getFont(style) {
    return { family: getResolvedFontFamily(), style };
  }

  // src/config/theme.ts
  var THEME_NORMAL = {
    gap: { r: 1, g: 0.2, b: 0.2 },
    // Red
    padding: { r: 0, g: 0.5, b: 1 },
    // Blue
    radius: { r: 1, g: 0.2, b: 0.2 },
    // Red
    border: { r: 0.6, g: 0.2, b: 0.6 },
    // Purple
    text: { r: 0.2, g: 0.6, b: 0.2 },
    // Green
    width: { r: 0.4, g: 0.4, b: 0.4 },
    // Gray
    height: { r: 0.85, g: 0.1, b: 0.1 },
    // Red
    effect: { r: 0.8, g: 0.5, b: 0.2 }
    // Orange
  };
  var THEME_HIGHLIGHT = {
    gap: { r: 255 / 255, g: 199 / 255, b: 203 / 255 },
    // #FFC7CB Light pink
    padding: { r: 98 / 255, g: 248 / 255, b: 79 / 255 },
    // #62F84F Bright green
    radius: { r: 255 / 255, g: 199 / 255, b: 203 / 255 },
    // #FFC7CB Light pink
    border: { r: 98 / 255, g: 248 / 255, b: 79 / 255 },
    // #62F84F Bright green
    text: { r: 98 / 255, g: 248 / 255, b: 79 / 255 },
    // #62F84F Bright green
    width: { r: 98 / 255, g: 248 / 255, b: 79 / 255 },
    // #62F84F Bright green
    height: { r: 98 / 255, g: 248 / 255, b: 79 / 255 },
    // #62F84F Bright green
    effect: { r: 255 / 255, g: 183 / 255, b: 77 / 255 }
    // #FFB74D Light orange
  };
  function getTheme(highlightMode) {
    return highlightMode ? THEME_HIGHLIGHT : THEME_NORMAL;
  }
  var IGNORED_PROPERTIES = ["size", "icon"];
  var SIZE_ORDER = {
    "x-small": 1,
    xsmall: 1,
    small: 2,
    semiregular: 3,
    regular: 4,
    medium: 5,
    large: 6,
    "x-large": 7,
    xlarge: 7
  };
  var SEMANTIC_ROLES = {
    label: "Label",
    hint: "Hint",
    placeholder: "Placeholder",
    icon: "Icon",
    border: "Border",
    background: "Background",
    input: "Input",
    container: "Container",
    text: "Text",
    error: "Error Message",
    helper: "Helper Text",
    description: "Description",
    initials: "Initials"
  };
  var TEXT_STYLE_PRESETS = {
    title: { fontSize: 32, fontStyle: "Bold" },
    subtitle: { fontSize: 24, fontStyle: "Bold" },
    heading: { fontSize: 18, fontStyle: "Medium" },
    body: { fontSize: 16, fontStyle: "Regular" },
    bodyBold: { fontSize: 16, fontStyle: "Bold" },
    small: { fontSize: 14, fontStyle: "Regular" },
    label: { fontSize: 12, fontStyle: "Regular" },
    caption: { fontSize: 10, fontStyle: "Regular" }
  };
  var TEXT_COLORS = {
    default: { r: 0, g: 0, b: 0 },
    secondary: { r: 0.4, g: 0.4, b: 0.4 },
    muted: { r: 0.6, g: 0.6, b: 0.6 },
    success: { r: 0.2, g: 0.6, b: 0.2 },
    error: { r: 0.85, g: 0.1, b: 0.1 },
    warning: { r: 0.8, g: 0.5, b: 0.2 },
    white: { r: 1, g: 1, b: 1 }
  };

  // src/utils/helpers.ts
  function formatToken(variableName) {
    return `$color-${variableName.toLowerCase().replace(/\//g, "-").replace(/\s+/g, "-")}`;
  }
  function formatSpaceToken(variableName) {
    return `$${variableName.toLowerCase().replace(/^(spacing|space|size)[-/]/g, "").replace(/\//g, "-").replace(/\s+/g, "-")}`;
  }
  function pad(str, length, char) {
    while (str.length < length) str = char + str;
    return str;
  }
  function rgbToHex(color) {
    const r = Math.round(color.r * 255);
    const g = Math.round(color.g * 255);
    const b = Math.round(color.b * 255);
    return `#${pad(r.toString(16), 2, "0")}${pad(g.toString(16), 2, "0")}${pad(b.toString(16), 2, "0")}`.toUpperCase();
  }
  function hexToRgb(hex) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16) / 255,
      g: parseInt(result[2], 16) / 255,
      b: parseInt(result[3], 16) / 255
    } : { r: 0, g: 0, b: 0 };
  }
  function extractRelevantProperties(variantName) {
    const parts = variantName.split(",").map((p) => p.trim());
    const props = {};
    for (const part of parts) {
      const match = part.match(/(.+?)=(.+)/);
      if (match) {
        const propName = match[1].trim().toLowerCase();
        const propValue = match[2].trim();
        if (!IGNORED_PROPERTIES.includes(propName)) {
          props[propName] = propValue;
        }
      }
    }
    return props;
  }
  function extractMainState(variantName) {
    const props = extractRelevantProperties(variantName);
    return props["state"] || props["status"] || props["type"] || props["style"] || Object.values(props)[0] || "Default";
  }
  function formatPropertiesForDisplay(variantName) {
    const props = extractRelevantProperties(variantName);
    return Object.values(props).join(" / ") || "Default";
  }
  function extractAllProperties(variantName) {
    const props = {};
    const parts = variantName.split(",").map((p) => p.trim());
    for (const part of parts) {
      const [key, value] = part.split("=").map((s) => s.trim());
      if (key && value) {
        props[key.toLowerCase()] = value;
      }
    }
    return props;
  }
  function resolveSpacingElement(node) {
    const name = node.name.toLowerCase();
    const keywords = ["label", "hint", "helper", "input", "field", "container"];
    for (const keyword of keywords) {
      if (name.includes(keyword)) {
        return keyword.charAt(0).toUpperCase() + keyword.slice(1);
      }
    }
    if (node.parent && "name" in node.parent) {
      return resolveSpacingElement(node.parent);
    }
    return node.name;
  }
  function formatEffectToken(variableName) {
    return `$effect-${variableName.toLowerCase().replace(/\//g, "-").replace(/\s+/g, "-")}`;
  }
  function formatEffectValue(effect) {
    if (effect.type === "DROP_SHADOW" || effect.type === "INNER_SHADOW") {
      const shadow = effect;
      const x = Math.round(shadow.offset.x);
      const y = Math.round(shadow.offset.y);
      const blur = Math.round(shadow.radius);
      const spread = Math.round(shadow.spread || 0);
      const color = shadow.color;
      const r = Math.round(color.r * 255);
      const g = Math.round(color.g * 255);
      const b = Math.round(color.b * 255);
      const a = Math.round((color.a || 1) * 100) / 100;
      return `${x}px ${y}px ${blur}px ${spread}px rgba(${r}, ${g}, ${b}, ${a})`;
    } else if (effect.type === "LAYER_BLUR") {
      const blur = effect;
      return `blur(${Math.round(blur.radius)}px)`;
    } else if (effect.type === "BACKGROUND_BLUR") {
      const blur = effect;
      return `backdrop-blur(${Math.round(blur.radius)}px)`;
    }
    return "Unknown effect";
  }

  // src/core/node-helpers.ts
  function isStructuralName(name) {
    return name.startsWith(".") || name.startsWith("-") || name.startsWith("_") || name.toLowerCase().startsWith(".asset/") || name.toLowerCase().startsWith(".asset");
  }
  function cleanStructuralName(name) {
    let cleaned = name;
    if (cleaned.toLowerCase().startsWith(".asset/")) {
      cleaned = cleaned.substring(7);
    } else if (cleaned.startsWith(".") || cleaned.startsWith("-") || cleaned.startsWith("_")) {
      cleaned = cleaned.substring(1);
    }
    return cleaned;
  }
  function isNodeVisible(node) {
    return !("visible" in node && !node.visible);
  }
  async function isStructuralInstance(instance) {
    const mainComp = await instance.getMainComponentAsync();
    if (!mainComp) return false;
    if (isStructuralName(mainComp.name)) {
      return true;
    }
    if (mainComp.parent && mainComp.parent.type === "COMPONENT_SET") {
      if (isStructuralName(mainComp.parent.name)) {
        return true;
      }
    }
    return false;
  }
  async function shouldSkipNestedInstance(node, isTopLevel) {
    if (node.type !== "INSTANCE") return false;
    if (isTopLevel) return false;
    return !await isStructuralInstance(node);
  }
  async function resolveNodeName(node) {
    let currentNode = node.parent;
    while (currentNode) {
      if (currentNode.type === "INSTANCE") {
        const instanceNode = currentNode;
        const mainComp = await instanceNode.getMainComponentAsync();
        if (mainComp) {
          if (isStructuralName(mainComp.name)) {
            return cleanStructuralName(mainComp.name);
          }
          if (mainComp.parent && mainComp.parent.type === "COMPONENT_SET") {
            if (isStructuralName(mainComp.parent.name)) {
              return cleanStructuralName(mainComp.parent.name);
            }
          }
        }
      }
      if (currentNode.type === "COMPONENT") {
        const componentNode = currentNode;
        if (isStructuralName(componentNode.name)) {
          return cleanStructuralName(componentNode.name);
        }
        if (componentNode.parent && componentNode.parent.type === "COMPONENT_SET") {
          if (isStructuralName(componentNode.parent.name)) {
            return cleanStructuralName(componentNode.parent.name);
          }
        }
      }
      currentNode = currentNode.parent;
    }
    if (node.type === "INSTANCE") {
      const mainComp = await node.getMainComponentAsync();
      if (mainComp && isStructuralName(mainComp.name)) {
        return cleanStructuralName(mainComp.name);
      }
    }
    if (node.type === "COMPONENT") {
      const componentNode = node;
      if (isStructuralName(componentNode.name)) {
        return cleanStructuralName(componentNode.name);
      }
      if (componentNode.parent && componentNode.parent.type === "COMPONENT_SET") {
        if (isStructuralName(componentNode.parent.name)) {
          return cleanStructuralName(componentNode.parent.name);
        }
      }
    }
    return node.name;
  }
  async function findTextNodes(node, isTopLevel = true) {
    const textNodes = [];
    if (!isNodeVisible(node)) {
      return textNodes;
    }
    if (node.type === "INSTANCE" && !isTopLevel) {
      if (!await isStructuralInstance(node)) {
        return textNodes;
      }
    }
    if (node.type === "TEXT") {
      textNodes.push(node);
    }
    if ("children" in node) {
      for (const child of node.children) {
        textNodes.push(...await findTextNodes(child, false));
      }
    }
    return textNodes;
  }
  function findVectorNode(node) {
    if (node.name === "Vector" || node.type === "VECTOR") {
      return node;
    }
    if ("children" in node) {
      for (const child of node.children) {
        const found = findVectorNode(child);
        if (found) return found;
      }
    }
    return null;
  }
  async function resolveBoundVariable(node, property, formatter) {
    if (!("boundVariables" in node) || !node.boundVariables) return null;
    if (!(property in node.boundVariables)) return null;
    const binding = node.boundVariables[property];
    if ((binding == null ? void 0 : binding.type) === "VARIABLE_ALIAS") {
      const variable = await figma.variables.getVariableByIdAsync(binding.id);
      if (variable) {
        return formatter ? formatter(variable.name) : variable.name;
      }
    }
    return null;
  }
  async function resolveBoundVariableAtIndex(node, property, index, formatter) {
    if (!("boundVariables" in node) || !node.boundVariables) return null;
    if (!(property in node.boundVariables)) return null;
    const bindings = node.boundVariables[property];
    if (!Array.isArray(bindings) || !bindings[index]) return null;
    const binding = bindings[index];
    if ((binding == null ? void 0 : binding.type) === "VARIABLE_ALIAS") {
      const variable = await figma.variables.getVariableByIdAsync(binding.id);
      if (variable) {
        return formatter ? formatter(variable.name) : variable.name;
      }
    }
    return null;
  }

  // src/core/traversal.ts
  function createEmptyCollectedData() {
    return {
      colors: [],
      textStyles: [],
      spacings: [],
      borders: [],
      effects: [],
      usedComponents: /* @__PURE__ */ new Map()
    };
  }
  async function extractIconColor(node, state, properties) {
    var _a;
    const vectorNode = findVectorNode(node);
    if (!vectorNode) return null;
    if ("fills" in vectorNode && Array.isArray(vectorNode.fills)) {
      for (const paint of vectorNode.fills) {
        if (paint.type === "SOLID" && paint.visible !== false) {
          const hex = rgbToHex(paint.color);
          let token = null;
          let varId = null;
          if ((_a = paint.boundVariables) == null ? void 0 : _a.color) {
            varId = paint.boundVariables.color.id;
            const variable = await figma.variables.getVariableByIdAsync(varId);
            if (variable) token = formatToken(variable.name);
          }
          const iconName = node.name || "Icon";
          return {
            element: `Icon (${iconName})`,
            state,
            token,
            colorHex: hex,
            colorVariableId: varId,
            properties
          };
        }
      }
    }
    return null;
  }
  async function collectNodeData(node, state, properties, data, isTopLevel = false) {
    var _a, _b, _c;
    if (!isNodeVisible(node)) return;
    if (node.type === "INSTANCE") {
      const mainComponent = await node.getMainComponentAsync();
      if (mainComponent) {
        const displayName = ((_a = mainComponent.parent) == null ? void 0 : _a.type) === "COMPONENT_SET" ? mainComponent.parent.name : mainComponent.name;
        if (displayName) {
          data.usedComponents.set(mainComponent.id, displayName);
        }
      }
      const iconColor = await extractIconColor(node, state, properties);
      if (iconColor) {
        data.colors.push(iconColor);
      }
      if (!isTopLevel && !await isStructuralInstance(node)) {
        return;
      }
    }
    if (await shouldSkipNestedInstance(node, isTopLevel)) return;
    const resolvedName = await resolveNodeName(node);
    const nodeName = resolvedName.toLowerCase();
    let semanticRole = null;
    for (const [key, value] of Object.entries(SEMANTIC_ROLES)) {
      if (nodeName.includes(key)) {
        semanticRole = value;
        break;
      }
    }
    const elementName = semanticRole || resolvedName;
    const spacingElementName = resolveSpacingElement(node);
    if ("fills" in node && Array.isArray(node.fills)) {
      for (const paint of node.fills) {
        if (paint.type === "SOLID") {
          const hex = rgbToHex(paint.color);
          let token = null;
          let varId = null;
          if ((_b = paint.boundVariables) == null ? void 0 : _b.color) {
            varId = paint.boundVariables.color.id;
            const variable = await figma.variables.getVariableByIdAsync(varId);
            if (variable) token = formatToken(variable.name);
          }
          data.colors.push({
            element: elementName,
            state,
            token,
            colorHex: hex,
            colorVariableId: varId,
            properties
          });
        }
      }
    }
    if ("strokes" in node && Array.isArray(node.strokes)) {
      for (const paint of node.strokes) {
        if (paint.type === "SOLID") {
          const hex = rgbToHex(paint.color);
          let token = null;
          let varId = null;
          if ((_c = paint.boundVariables) == null ? void 0 : _c.color) {
            varId = paint.boundVariables.color.id;
            const variable = await figma.variables.getVariableByIdAsync(varId);
            if (variable) token = formatToken(variable.name);
          }
          const element = semanticRole ? `${semanticRole} Border` : `${node.name} Border`;
          data.colors.push({
            element,
            state,
            token,
            colorHex: hex,
            colorVariableId: varId,
            properties
          });
        }
      }
    }
    if (node.type === "TEXT") {
      const textElement = semanticRole || resolvedName;
      let token = null;
      if (node.textStyleId && node.textStyleId !== "" && node.textStyleId !== figma.mixed) {
        const textStyle = await figma.getStyleByIdAsync(node.textStyleId);
        if (textStyle && textStyle.type === "TEXT") {
          token = textStyle.name.toLowerCase().replace(/\//g, "-").replace(/\s+/g, "-");
        }
      }
      const fontName = node.fontName !== figma.mixed ? node.fontName : { family: "Mixed", style: "Mixed" };
      const fontSize = node.fontSize !== figma.mixed ? node.fontSize : 0;
      const lineHeight = node.lineHeight !== figma.mixed ? typeof node.lineHeight === "object" && "value" in node.lineHeight ? `${Math.round(node.lineHeight.value)}${node.lineHeight.unit === "PIXELS" ? "px" : "%"}` : "Auto" : "Mixed";
      const letterSpacing = node.letterSpacing !== figma.mixed ? typeof node.letterSpacing === "object" && "value" in node.letterSpacing ? `${Math.round(node.letterSpacing.value * 100) / 100}${node.letterSpacing.unit === "PIXELS" ? "px" : "%"}` : "0%" : "Mixed";
      data.textStyles.push({
        element: textElement,
        state,
        token,
        fontFamily: fontName.family,
        fontWeight: fontName.style,
        fontSize,
        lineHeight,
        letterSpacing,
        properties: node.characters || textElement,
        nodeId: node.id
      });
    }
    if ("layoutMode" in node && node.layoutMode !== "NONE" && "itemSpacing" in node && node.itemSpacing > 0 && "children" in node && node.children.length >= 2) {
      const token = await resolveBoundVariable(
        node,
        "itemSpacing",
        formatSpaceToken
      );
      data.spacings.push({
        element: spacingElementName,
        property: "Gap",
        token,
        value: `${node.itemSpacing}px`,
        direction: node.layoutMode === "HORIZONTAL" ? "H" : "V",
        properties: spacingElementName,
        sourceNodeId: node.id
      });
    }
    if ("layoutMode" in node && node.layoutMode !== "NONE") {
      const paddings = [
        { prop: "paddingTop", label: "Padding Top", dir: "V" },
        { prop: "paddingBottom", label: "Padding Bottom", dir: "V" },
        { prop: "paddingLeft", label: "Padding Left", dir: "H" },
        { prop: "paddingRight", label: "Padding Right", dir: "H" }
      ];
      for (const pad2 of paddings) {
        const paddingValue = node[pad2.prop];
        if (paddingValue > 0) {
          const token = await resolveBoundVariable(
            node,
            pad2.prop,
            formatSpaceToken
          );
          data.spacings.push({
            element: spacingElementName,
            property: pad2.label,
            token,
            value: `${paddingValue}px`,
            direction: pad2.dir,
            properties,
            sourceNodeId: node.id
          });
        }
      }
    }
    if ("width" in node && "height" in node && isTopLevel) {
      const widthToken = await resolveBoundVariable(
        node,
        "width",
        formatSpaceToken
      );
      data.spacings.push({
        element: spacingElementName,
        property: "Width",
        token: widthToken,
        value: `${Math.round(node.width)}px`,
        properties,
        sourceNodeId: node.id
      });
      const heightToken = await resolveBoundVariable(
        node,
        "height",
        formatSpaceToken
      );
      data.spacings.push({
        element: spacingElementName,
        property: "Height",
        token: heightToken,
        value: `${Math.round(node.height)}px`,
        properties,
        sourceNodeId: node.id
      });
    }
    if ("strokeWeight" in node && typeof node.strokeWeight === "number" && node.strokeWeight > 0) {
      const strokeToken = await resolveBoundVariable(
        node,
        "strokeWeight",
        formatSpaceToken
      );
      data.spacings.push({
        element: spacingElementName,
        property: "Stroke Weight",
        token: strokeToken,
        value: `${node.strokeWeight}px`,
        properties,
        sourceNodeId: node.id
      });
    }
    if ("cornerRadius" in node) {
      const radii = [
        node.topLeftRadius,
        node.topRightRadius,
        node.bottomLeftRadius,
        node.bottomRightRadius
      ].filter((r) => typeof r === "number" && r > 0);
      if (radii.length > 0) {
        const radiusFormatter = (name) => `$${name.toLowerCase().replace(/\//g, "-").replace(/\s+/g, "-")}`;
        let token = null;
        for (const key of [
          "topLeftRadius",
          "topRightRadius",
          "bottomLeftRadius",
          "bottomRightRadius"
        ]) {
          token = await resolveBoundVariable(node, key, radiusFormatter);
          if (token) break;
        }
        data.spacings.push({
          element: spacingElementName,
          property: "Border Radius",
          token,
          value: `${radii[0]}px`,
          properties,
          sourceNodeId: node.id
        });
      }
    }
    const hasVisibleStrokes = "strokes" in node && Array.isArray(node.strokes) && node.strokes.length > 0 && node.strokes.some((stroke) => stroke.visible !== false);
    if (hasVisibleStrokes && "strokeWeight" in node) {
      let position = "Center";
      if ("strokeAlign" in node) {
        const align = node.strokeAlign;
        if (align === "INSIDE") position = "Inside";
        else if (align === "OUTSIDE") position = "Outside";
        else position = "Center";
      }
      const hasIndividualStrokes = "strokeTopWeight" in node || "strokeBottomWeight" in node || "strokeLeftWeight" in node || "strokeRightWeight" in node;
      if (hasIndividualStrokes) {
        const sides = [
          { prop: "strokeTopWeight", label: "Top", varKey: "strokeTopWeight" },
          {
            prop: "strokeBottomWeight",
            label: "Bottom",
            varKey: "strokeBottomWeight"
          },
          { prop: "strokeLeftWeight", label: "Left", varKey: "strokeLeftWeight" },
          {
            prop: "strokeRightWeight",
            label: "Right",
            varKey: "strokeRightWeight"
          }
        ];
        for (const side of sides) {
          const weight = node[side.prop];
          if (typeof weight === "number" && weight > 0) {
            const token = await resolveBoundVariable(
              node,
              side.varKey,
              formatSpaceToken
            );
            data.borders.push({
              element: spacingElementName,
              token,
              value: `${weight}px`,
              properties,
              sourceNodeId: node.id,
              side: side.label,
              position
            });
          }
        }
      } else if (typeof node.strokeWeight === "number" && node.strokeWeight > 0) {
        const token = await resolveBoundVariable(
          node,
          "strokeWeight",
          formatSpaceToken
        );
        data.borders.push({
          element: spacingElementName,
          token,
          value: `${node.strokeWeight}px`,
          properties,
          sourceNodeId: node.id,
          side: "All",
          position
        });
      }
    }
    if ("effects" in node && Array.isArray(node.effects) && node.effects.length > 0) {
      for (let i = 0; i < node.effects.length; i++) {
        const effect = node.effects[i];
        if (!effect.visible) continue;
        let token = null;
        if ("effectStyleId" in node && node.effectStyleId && node.effectStyleId !== "") {
          try {
            const effectStyle = await figma.getStyleByIdAsync(
              node.effectStyleId
            );
            if (effectStyle && effectStyle.type === "EFFECT") {
              token = formatEffectToken(effectStyle.name);
            }
          } catch (e) {
          }
        }
        if (!token) {
          token = await resolveBoundVariableAtIndex(
            node,
            "effects",
            i,
            formatEffectToken
          );
        }
        data.effects.push({
          element: spacingElementName,
          effectType: effect.type,
          token,
          value: formatEffectValue(effect),
          properties,
          sourceNodeId: node.id
        });
      }
    }
    if ("children" in node) {
      for (const child of node.children) {
        await collectNodeData(child, state, properties, data);
      }
    }
  }
  async function processComponent(component) {
    const results = [];
    const allColors = [];
    const allUsedComponents = /* @__PURE__ */ new Map();
    if (component.type === "INSTANCE") {
      const data = createEmptyCollectedData();
      await collectNodeData(component, "Default", "Instance", data, true);
      if (data.colors.length > 0 || data.textStyles.length > 0 || data.spacings.length > 0 || data.borders.length > 0 || data.effects.length > 0 || data.usedComponents.size > 0) {
        results.push({
          variantName: "Default",
          properties: "Instance",
          propertyMap: {},
          colors: data.colors,
          textStyles: data.textStyles,
          spacings: data.spacings,
          borders: data.borders,
          effects: data.effects,
          usedComponents: data.usedComponents
        });
      }
      if (results.length === 0) {
        results.push({
          variantName: "Default",
          properties: "Instance",
          propertyMap: {},
          colors: [],
          textStyles: [],
          spacings: [],
          borders: [],
          effects: [],
          usedComponents: /* @__PURE__ */ new Map()
        });
      }
      return results;
    }
    if (component.type === "COMPONENT_SET") {
      for (const variant of component.children) {
        if (variant.type !== "COMPONENT") continue;
        const stateName = extractMainState(variant.name);
        const displayProperties = formatPropertiesForDisplay(variant.name);
        const propertyMap = extractAllProperties(variant.name);
        const data = createEmptyCollectedData();
        await collectNodeData(variant, stateName, displayProperties, data);
        for (const color of data.colors) allColors.push(color);
        for (const [id, name] of data.usedComponents)
          allUsedComponents.set(id, name);
        results.push({
          variantName: variant.name,
          properties: displayProperties,
          propertyMap,
          colors: data.colors,
          textStyles: data.textStyles,
          spacings: data.spacings,
          borders: data.borders,
          effects: data.effects,
          usedComponents: data.usedComponents
        });
      }
    } else {
      const data = createEmptyCollectedData();
      await collectNodeData(component, "Default", "Default", data);
      if (data.colors.length > 0 || data.textStyles.length > 0 || data.effects.length > 0 || data.usedComponents.size > 0) {
        results.push({
          variantName: "Default",
          properties: "Default",
          propertyMap: {},
          colors: data.colors,
          textStyles: data.textStyles,
          spacings: data.spacings,
          borders: data.borders,
          effects: data.effects,
          usedComponents: data.usedComponents
        });
      }
    }
    return results;
  }

  // src/ui/table-builder.ts
  function createText(content, preset = "body", options) {
    const textNode = figma.createText();
    const style = typeof preset === "string" ? TEXT_STYLE_PRESETS[preset] : preset;
    textNode.fontName = getFont(style.fontStyle);
    textNode.fontSize = style.fontSize;
    textNode.characters = content;
    if (options == null ? void 0 : options.color) {
      const colorValue = typeof options.color === "string" ? TEXT_COLORS[options.color] : options.color;
      textNode.fills = [{ type: "SOLID", color: colorValue }];
    }
    if ((options == null ? void 0 : options.x) !== void 0) textNode.x = options.x;
    if ((options == null ? void 0 : options.y) !== void 0) textNode.y = options.y;
    return textNode;
  }
  function createSectionTitle(text, parent, fontSize = 32, style = "Bold") {
    const title = figma.createText();
    title.fontName = getFont(style);
    title.fontSize = fontSize;
    title.characters = text;
    parent.appendChild(title);
    return title;
  }
  function createTableAutoLayoutContainer(name, tableWidth, rowGap = 4) {
    const container = figma.createFrame();
    container.name = name;
    container.layoutMode = "VERTICAL";
    container.primaryAxisSizingMode = "AUTO";
    container.counterAxisSizingMode = "FIXED";
    container.resize(tableWidth, 100);
    container.itemSpacing = rowGap;
    container.fills = [];
    return container;
  }
  function groupElementsAndAppend(elements, groupName, container) {
    const tempFrame = figma.createFrame();
    tempFrame.name = "temp";
    tempFrame.fills = [];
    for (const el of elements) {
      tempFrame.appendChild(el);
    }
    const group = figma.group(elements, tempFrame);
    group.name = groupName;
    container.appendChild(group);
    tempFrame.remove();
    return group;
  }
  function createTableRowBackground(width, height = 44, cornerRadius = 4) {
    const rowBg = figma.createRectangle();
    rowBg.name = "Row Background";
    rowBg.resize(width, height);
    rowBg.fills = [{ type: "SOLID", color: { r: 1, g: 1, b: 1 } }];
    rowBg.cornerRadius = cornerRadius;
    rowBg.x = 0;
    rowBg.y = 0;
    return rowBg;
  }
  function createTableSpacer(width, height, container) {
    const spacer = figma.createFrame();
    spacer.name = "Spacer";
    spacer.resize(width, height);
    spacer.fills = [];
    container.appendChild(spacer);
  }
  var TableBuilder = class {
    constructor(name, tableWidth, columns, options) {
      var _a, _b;
      this.tableWidth = tableWidth;
      this.columns = columns;
      this.rowHeight = (_a = options == null ? void 0 : options.rowHeight) != null ? _a : 44;
      this.rowGap = (_b = options == null ? void 0 : options.rowGap) != null ? _b : 4;
      this.container = createTableAutoLayoutContainer(
        name,
        tableWidth,
        this.rowGap
      );
      this.createHeader();
    }
    /**
     * Creates the header row.
     */
    createHeader() {
      const headerElements = [];
      for (const col of this.columns) {
        const x = col.position <= 1 ? Math.floor(this.tableWidth * col.position) : col.position;
        const headerText = createText(col.header, "bodyBold", {
          color: "secondary",
          x,
          y: 0
        });
        headerElements.push(headerText);
      }
      groupElementsAndAppend(headerElements, "Header", this.container);
    }
    /**
     * Adds a data row to the table.
     * @param rowName - Row identifier name
     * @param cells - Cell data (must match columns)
     */
    addRow(rowName, cells) {
      const rowElements = [];
      rowElements.push(createTableRowBackground(this.tableWidth, this.rowHeight));
      for (let i = 0; i < this.columns.length && i < cells.length; i++) {
        const col = this.columns[i];
        const cell = cells[i];
        const x = col.position <= 1 ? Math.floor(this.tableWidth * col.position) + 16 : col.position + 16;
        let colorValue = TEXT_COLORS.default;
        if (cell.color) {
          colorValue = typeof cell.color === "string" ? TEXT_COLORS[cell.color] : cell.color;
        } else if (col.color) {
          colorValue = typeof col.color === "string" ? TEXT_COLORS[col.color] : col.color;
        }
        const textNode = createText(cell.text, "body", {
          color: colorValue,
          x,
          y: 12
        });
        rowElements.push(textNode);
        if (cell.extraElements) {
          for (const el of cell.extraElements) {
            rowElements.push(el);
          }
        }
      }
      groupElementsAndAppend(rowElements, rowName, this.container);
    }
    /**
     * Adds a spacer between row groups.
     * @param height - Spacer height (default: 12)
     */
    addSpacer(height = 12) {
      createTableSpacer(this.tableWidth, height, this.container);
    }
    /**
     * Returns the table container to be added to parent.
     */
    build() {
      return this.container;
    }
    /**
     * Adds the table to parent container.
     * @param parent - Parent frame
     */
    appendTo(parent) {
      parent.appendChild(this.container);
    }
  };
  function createTableBuilder(name, tableWidth, columns, options) {
    return new TableBuilder(name, tableWidth, columns, options);
  }

  // src/ui/annotations.ts
  function findFreeYPosition(existingPositions, preferredY, minSpacing = 20) {
    if (existingPositions.length === 0) return preferredY;
    const sorted = [...existingPositions].sort((a, b) => a - b);
    let collision = sorted.some((pos) => Math.abs(pos - preferredY) < minSpacing);
    if (!collision) return preferredY;
    let offset = minSpacing;
    for (let i = 0; i < 10; i++) {
      const belowY = preferredY + offset;
      collision = sorted.some((pos) => Math.abs(pos - belowY) < minSpacing);
      if (!collision) return belowY;
      const aboveY = preferredY - offset;
      collision = sorted.some((pos) => Math.abs(pos - aboveY) < minSpacing);
      if (!collision) return aboveY;
      offset += minSpacing;
    }
    return preferredY + offset;
  }
  function findFreeXPosition(existingPositions, preferredX, minSpacing = 80) {
    if (existingPositions.length === 0) return preferredX;
    const sorted = [...existingPositions].sort((a, b) => a - b);
    let collision = sorted.some((pos) => Math.abs(pos - preferredX) < minSpacing);
    if (!collision) return preferredX;
    let offset = minSpacing;
    for (let i = 0; i < 10; i++) {
      const rightX = preferredX + offset;
      collision = sorted.some((pos) => Math.abs(pos - rightX) < minSpacing);
      if (!collision) return rightX;
      const leftX = preferredX - offset;
      collision = sorted.some((pos) => Math.abs(pos - leftX) < minSpacing);
      if (!collision) return leftX;
      offset += minSpacing;
    }
    return preferredX + offset;
  }
  async function createSimpleAnnotation(container, startX, startY, endX, endY, label, color) {
    const DOT_SIZE = 8;
    const PADDING = 2;
    const deltaX = endX - startX;
    const deltaY = endY - startY;
    const isVertical = Math.abs(deltaY) >= Math.abs(deltaX);
    const group = figma.createFrame();
    group.name = label;
    group.fills = [];
    group.clipsContent = false;
    const dot = figma.createEllipse();
    dot.name = "Dot";
    dot.resize(DOT_SIZE, DOT_SIZE);
    dot.fills = [{ type: "SOLID", color }];
    const line = figma.createRectangle();
    line.name = "Line";
    line.fills = [{ type: "SOLID", color }];
    const text = figma.createText();
    text.name = "Label";
    text.fontName = getFont("Regular");
    text.fontSize = 10;
    text.characters = label;
    text.fills = [{ type: "SOLID", color }];
    if (isVertical) {
      const lineLength = Math.abs(deltaY);
      const goingDown = deltaY > 0;
      const frameWidth = Math.max(text.width, DOT_SIZE) + PADDING * 2;
      const frameHeight = DOT_SIZE + lineLength + text.height;
      group.resize(frameWidth, frameHeight);
      group.x = startX - frameWidth / 2;
      group.y = goingDown ? startY - DOT_SIZE / 2 : endY - text.height;
      if (goingDown) {
        dot.x = frameWidth / 2 - DOT_SIZE / 2;
        dot.y = 0;
        dot.constraints = { horizontal: "CENTER", vertical: "MIN" };
        line.resize(1, lineLength);
        line.x = frameWidth / 2 - 0.5;
        line.y = DOT_SIZE / 2;
        line.constraints = { horizontal: "CENTER", vertical: "STRETCH" };
        text.x = frameWidth / 2 - text.width / 2;
        text.y = frameHeight - text.height;
        text.constraints = { horizontal: "CENTER", vertical: "MAX" };
      } else {
        text.x = frameWidth / 2 - text.width / 2;
        text.y = 0;
        text.constraints = { horizontal: "CENTER", vertical: "MIN" };
        line.resize(1, lineLength);
        line.x = frameWidth / 2 - 0.5;
        line.y = text.height;
        line.constraints = { horizontal: "CENTER", vertical: "STRETCH" };
        dot.x = frameWidth / 2 - DOT_SIZE / 2;
        dot.y = frameHeight - DOT_SIZE;
        dot.constraints = { horizontal: "CENTER", vertical: "MAX" };
      }
    } else {
      const lineLength = Math.abs(deltaX);
      const goingRight = deltaX > 0;
      const frameWidth = DOT_SIZE + lineLength + text.width;
      const frameHeight = Math.max(text.height, DOT_SIZE);
      group.resize(frameWidth, frameHeight);
      group.x = goingRight ? startX - DOT_SIZE / 2 : endX - text.width;
      group.y = startY - frameHeight / 2;
      if (goingRight) {
        dot.x = 0;
        dot.y = frameHeight / 2 - DOT_SIZE / 2;
        dot.constraints = { horizontal: "MIN", vertical: "CENTER" };
        line.resize(lineLength, 1);
        line.x = DOT_SIZE / 2;
        line.y = frameHeight / 2 - 0.5;
        line.constraints = { horizontal: "STRETCH", vertical: "CENTER" };
        text.x = frameWidth - text.width;
        text.y = frameHeight / 2 - text.height / 2;
        text.constraints = { horizontal: "MAX", vertical: "CENTER" };
      } else {
        text.x = 0;
        text.y = frameHeight / 2 - text.height / 2;
        text.constraints = { horizontal: "MIN", vertical: "CENTER" };
        line.resize(lineLength, 1);
        line.x = text.width;
        line.y = frameHeight / 2 - 0.5;
        line.constraints = { horizontal: "STRETCH", vertical: "CENTER" };
        dot.x = frameWidth - DOT_SIZE;
        dot.y = frameHeight / 2 - DOT_SIZE / 2;
        dot.constraints = { horizontal: "MAX", vertical: "CENTER" };
      }
    }
    group.appendChild(dot);
    group.appendChild(line);
    group.appendChild(text);
    container.appendChild(group);
  }
  async function annotateGapNew(container, node, gapValue, direction, nodeX, nodeY, token = null, childIndex = 0, highlightMode = false, tracker) {
    if (!node.children || node.children.length < 2) return;
    if (childIndex >= node.children.length - 1) return;
    const isHorizontal = direction === "H";
    const currentChild = node.children[childIndex];
    const label = token ? `$${token}` : `${gapValue}px`;
    const color = getTheme(highlightMode).gap;
    const LINE_OFFSET = 40;
    let rectX, rectY, rectW, rectH;
    let startX, startY, endX, endY;
    if (isHorizontal) {
      rectX = nodeX + currentChild.x + currentChild.width;
      rectY = nodeY + currentChild.y;
      rectW = gapValue;
      rectH = currentChild.height;
      const preferredX = rectX + rectW / 2;
      const useTop = tracker ? tracker.gapPositions.length % 2 === 0 : true;
      if (useTop) {
        startX = preferredX;
        startY = rectY;
        endX = preferredX;
        endY = rectY - LINE_OFFSET;
      } else {
        startX = preferredX;
        startY = rectY + rectH;
        endX = preferredX;
        endY = rectY + rectH + LINE_OFFSET;
      }
      if (tracker) tracker.gapPositions.push(preferredX);
    } else {
      rectX = nodeX + currentChild.x;
      rectY = nodeY + currentChild.y + currentChild.height;
      rectW = currentChild.width;
      rectH = gapValue;
      const preferredY = rectY + rectH / 2;
      const useRight = tracker ? tracker.gapPositions.length % 2 === 0 : true;
      if (useRight) {
        startX = rectX + rectW;
        startY = preferredY;
        endX = rectX + rectW + LINE_OFFSET;
        endY = preferredY;
      } else {
        startX = rectX;
        startY = preferredY;
        endX = rectX - LINE_OFFSET;
        endY = preferredY;
      }
      if (tracker) tracker.gapPositions.push(preferredY);
    }
    const rect = figma.createRectangle();
    rect.x = rectX;
    rect.y = rectY;
    rect.resize(Math.max(rectW, 2), Math.max(rectH, 2));
    rect.fills = [{ type: "SOLID", color, opacity: 0.15 }];
    rect.strokes = [{ type: "SOLID", color, opacity: 0.5 }];
    rect.strokeWeight = 1;
    rect.dashPattern = [3, 3];
    container.appendChild(rect);
    await createSimpleAnnotation(
      container,
      startX,
      startY,
      endX,
      endY,
      label,
      color
    );
  }
  async function annotatePaddingNew(container, paddingValue, side, nodeX, nodeY, nodeW, nodeH, token = null, highlightMode = false, tracker) {
    const label = token ? `$${token}` : `${paddingValue}px`;
    const color = getTheme(highlightMode).padding;
    const LINE_OFFSET = 50;
    let startX, startY, endX, endY;
    let rectX, rectY, rectW, rectH;
    switch (side) {
      case "top": {
        rectX = nodeX;
        rectY = nodeY;
        rectW = nodeW;
        rectH = paddingValue;
        const preferredX = nodeX + nodeW / 2;
        const freeX = tracker ? findFreeXPosition(tracker.topPositions, preferredX, 100) : preferredX;
        if (tracker) tracker.topPositions.push(freeX);
        startX = freeX;
        startY = nodeY;
        endX = freeX;
        endY = nodeY - LINE_OFFSET;
        break;
      }
      case "bottom": {
        rectX = nodeX;
        rectY = nodeY + nodeH - paddingValue;
        rectW = nodeW;
        rectH = paddingValue;
        const preferredX = nodeX + nodeW / 2;
        const freeX = tracker ? findFreeXPosition(tracker.bottomPositions, preferredX, 100) : preferredX;
        if (tracker) tracker.bottomPositions.push(freeX);
        startX = freeX;
        startY = nodeY + nodeH;
        endX = freeX;
        endY = nodeY + nodeH + LINE_OFFSET;
        break;
      }
      case "left": {
        rectX = nodeX;
        rectY = nodeY;
        rectW = paddingValue;
        rectH = nodeH;
        const preferredY = nodeY + nodeH / 2;
        const freeY = tracker ? findFreeYPosition(tracker.leftPositions, preferredY, 25) : preferredY;
        if (tracker) tracker.leftPositions.push(freeY);
        startX = nodeX;
        startY = freeY;
        endX = nodeX - LINE_OFFSET;
        endY = freeY;
        break;
      }
      case "right": {
        rectX = nodeX + nodeW - paddingValue;
        rectY = nodeY;
        rectW = paddingValue;
        rectH = nodeH;
        const preferredY = nodeY + nodeH / 2;
        const freeY = tracker ? findFreeYPosition(tracker.rightPositions, preferredY, 25) : preferredY;
        if (tracker) tracker.rightPositions.push(freeY);
        startX = nodeX + nodeW;
        startY = freeY;
        endX = nodeX + nodeW + LINE_OFFSET;
        endY = freeY;
        break;
      }
    }
    const rect = figma.createRectangle();
    rect.x = rectX;
    rect.y = rectY;
    rect.resize(Math.max(rectW, 1), Math.max(rectH, 1));
    rect.fills = [{ type: "SOLID", color, opacity: 0.15 }];
    rect.strokes = [{ type: "SOLID", color, opacity: 0.5 }];
    rect.strokeWeight = 1;
    rect.dashPattern = [3, 3];
    container.appendChild(rect);
    await createSimpleAnnotation(
      container,
      startX,
      startY,
      endX,
      endY,
      label,
      color
    );
  }
  async function annotateRadiusNew(container, radius, nodeX, nodeY, _nodeW, _nodeH, token = null, highlightMode = false) {
    const label = token ? `$${token}` : `${radius}px`;
    const color = getTheme(highlightMode).radius;
    const circleSize = Math.max(20, Math.min(radius * 2, 32));
    const circle = figma.createEllipse();
    circle.x = nodeX - circleSize / 4;
    circle.y = nodeY - circleSize / 4;
    circle.resize(circleSize, circleSize);
    circle.fills = [];
    circle.strokes = [{ type: "SOLID", color }];
    circle.strokeWeight = 1.5;
    circle.dashPattern = [4, 4];
    container.appendChild(circle);
    const DOT_SIZE = 8;
    const dotX = nodeX;
    const dotY = nodeY;
    const LINE_LENGTH = 30;
    const lineEndX = dotX;
    const lineEndY = dotY - LINE_LENGTH;
    const dot = figma.createEllipse();
    dot.name = `Dot - ${label}`;
    dot.resize(DOT_SIZE, DOT_SIZE);
    dot.fills = [{ type: "SOLID", color }];
    dot.x = dotX - DOT_SIZE / 2;
    dot.y = dotY - DOT_SIZE / 2;
    const line = figma.createRectangle();
    line.name = `Line - ${label}`;
    line.fills = [{ type: "SOLID", color }];
    line.resize(1, LINE_LENGTH);
    line.x = dotX - 0.5;
    line.y = lineEndY;
    const text = figma.createText();
    text.name = `Label - ${label}`;
    text.fontName = getFont("Regular");
    text.fontSize = 10;
    text.characters = label;
    text.fills = [{ type: "SOLID", color }];
    text.x = lineEndX - text.width / 2;
    text.y = lineEndY - text.height - 2;
    const group = figma.createFrame();
    group.name = label;
    group.fills = [];
    group.clipsContent = false;
    const minX = Math.min(dot.x, line.x, text.x) - 2;
    const minY = Math.min(dot.y, line.y, text.y) - 2;
    const maxX = Math.max(dot.x + DOT_SIZE, text.x + text.width) + 2;
    const maxY = Math.max(dot.y + DOT_SIZE, text.y + text.height) + 2;
    group.x = minX;
    group.y = minY;
    group.resize(Math.max(maxX - minX, 10), Math.max(maxY - minY, 10));
    dot.x = dot.x - group.x;
    dot.y = dot.y - group.y;
    line.x = line.x - group.x;
    line.y = line.y - group.y;
    text.x = text.x - group.x;
    text.y = text.y - group.y;
    group.appendChild(dot);
    group.appendChild(line);
    group.appendChild(text);
    container.appendChild(group);
  }
  async function annotateBorderNew(container, strokeWeight, nodeX, nodeY, nodeW, nodeH, token = null, highlightMode = false, side = "All", position = "Center") {
    const positionSuffix = position !== "Center" ? ` (${position})` : "";
    const label = token ? `$${token}${positionSuffix}` : `${strokeWeight}px${positionSuffix}`;
    const color = getTheme(highlightMode).border;
    const borderLine = figma.createLine();
    borderLine.strokes = [{ type: "SOLID", color }];
    borderLine.strokeWeight = 2;
    borderLine.dashPattern = [4, 4];
    let startX, startY, endX, endY;
    if (side === "Top") {
      borderLine.x = nodeX;
      borderLine.y = nodeY;
      borderLine.resize(nodeW, 0);
      container.appendChild(borderLine);
      startX = nodeX + nodeW / 2;
      startY = nodeY;
      endX = startX;
      endY = nodeY - 35;
    } else if (side === "Bottom" || side === "All") {
      borderLine.x = nodeX;
      borderLine.y = nodeY + nodeH;
      borderLine.resize(nodeW, 0);
      container.appendChild(borderLine);
      startX = nodeX + nodeW / 2;
      startY = nodeY + nodeH;
      endX = startX;
      endY = nodeY + nodeH + 35;
    } else if (side === "Left") {
      borderLine.x = nodeX;
      borderLine.y = nodeY;
      borderLine.rotation = -90;
      borderLine.resize(nodeH, 0);
      container.appendChild(borderLine);
      startX = nodeX;
      startY = nodeY + nodeH / 2;
      endX = nodeX - 50;
      endY = startY;
    } else if (side === "Right") {
      borderLine.x = nodeX + nodeW;
      borderLine.y = nodeY;
      borderLine.rotation = -90;
      borderLine.resize(nodeH, 0);
      container.appendChild(borderLine);
      startX = nodeX + nodeW;
      startY = nodeY + nodeH / 2;
      endX = nodeX + nodeW + 50;
      endY = startY;
    } else {
      borderLine.x = nodeX;
      borderLine.y = nodeY + nodeH;
      borderLine.resize(nodeW, 0);
      container.appendChild(borderLine);
      startX = nodeX + nodeW / 2;
      startY = nodeY + nodeH;
      endX = startX;
      endY = nodeY + nodeH + 35;
    }
    await createSimpleAnnotation(
      container,
      startX,
      startY,
      endX,
      endY,
      label,
      color
    );
  }
  async function annotateDimensionNew(container, dimension, value, nodeX, nodeY, nodeW, nodeH, token = null, highlightMode = false) {
    const label = token ? `$${token}` : `${value}px`;
    const theme = getTheme(highlightMode);
    const color = dimension === "width" ? theme.width : theme.height;
    if (dimension === "width") {
      const lineY = nodeY + nodeH + 15;
      const MARKER_HEIGHT = 8;
      const text = figma.createText();
      text.name = "Label";
      text.fontName = getFont("Regular");
      text.fontSize = 12;
      text.characters = label;
      text.fills = [{ type: "SOLID", color }];
      const labelGap = 4;
      const frameWidth = nodeW;
      const frameHeight = MARKER_HEIGHT + labelGap + text.height;
      const widthFrame = figma.createFrame();
      widthFrame.name = label;
      widthFrame.fills = [];
      widthFrame.clipsContent = false;
      widthFrame.resize(frameWidth, frameHeight);
      widthFrame.x = nodeX;
      widthFrame.y = lineY - MARKER_HEIGHT / 2;
      const line = figma.createRectangle();
      line.name = "Horizontal Line";
      line.x = 0;
      line.y = MARKER_HEIGHT / 2 - 0.5;
      line.resize(frameWidth, 1);
      line.fills = [{ type: "SOLID", color }];
      line.strokes = [];
      line.constraints = { horizontal: "STRETCH", vertical: "MIN" };
      const leftMarker = figma.createRectangle();
      leftMarker.name = "Left Marker";
      leftMarker.x = -0.5;
      leftMarker.y = 0;
      leftMarker.resize(1, MARKER_HEIGHT);
      leftMarker.fills = [{ type: "SOLID", color }];
      leftMarker.strokes = [];
      leftMarker.constraints = { horizontal: "MIN", vertical: "MIN" };
      const rightMarker = figma.createRectangle();
      rightMarker.name = "Right Marker";
      rightMarker.x = frameWidth - 0.5;
      rightMarker.y = 0;
      rightMarker.resize(1, MARKER_HEIGHT);
      rightMarker.fills = [{ type: "SOLID", color }];
      rightMarker.strokes = [];
      rightMarker.constraints = { horizontal: "MAX", vertical: "MIN" };
      text.x = frameWidth / 2 - text.width / 2;
      text.y = MARKER_HEIGHT + labelGap;
      text.constraints = { horizontal: "CENTER", vertical: "MAX" };
      widthFrame.appendChild(line);
      widthFrame.appendChild(leftMarker);
      widthFrame.appendChild(rightMarker);
      widthFrame.appendChild(text);
      container.appendChild(widthFrame);
    } else {
      const lineX = nodeX + nodeW + 15;
      const MARKER_WIDTH = 8;
      const text = figma.createText();
      text.name = "Label";
      text.fontName = getFont("Bold");
      text.fontSize = 12;
      text.characters = label;
      const textColor = highlightMode ? { r: 0, g: 0, b: 0 } : { r: 1, g: 1, b: 1 };
      text.fills = [{ type: "SOLID", color: textColor }];
      const badgePadding = 6;
      const badgeWidth = text.width + badgePadding * 2;
      const badgeHeight = text.height + badgePadding * 2;
      const connectorLength = 8;
      const frameWidth = MARKER_WIDTH + connectorLength + badgeWidth;
      const frameHeight = nodeH;
      const heightFrame = figma.createFrame();
      heightFrame.name = label;
      heightFrame.fills = [];
      heightFrame.clipsContent = false;
      heightFrame.resize(frameWidth, frameHeight);
      heightFrame.x = lineX - MARKER_WIDTH / 2;
      heightFrame.y = nodeY;
      const line = figma.createRectangle();
      line.name = "Vertical Line";
      line.x = MARKER_WIDTH / 2 - 0.5;
      line.y = 0;
      line.resize(1, frameHeight);
      line.fills = [{ type: "SOLID", color }];
      line.strokes = [];
      line.constraints = { horizontal: "MIN", vertical: "STRETCH" };
      const topMarker = figma.createRectangle();
      topMarker.name = "Top Marker";
      topMarker.x = 0;
      topMarker.y = -0.5;
      topMarker.resize(MARKER_WIDTH, 1);
      topMarker.fills = [{ type: "SOLID", color }];
      topMarker.strokes = [];
      topMarker.constraints = { horizontal: "MIN", vertical: "MIN" };
      const bottomMarker = figma.createRectangle();
      bottomMarker.name = "Bottom Marker";
      bottomMarker.x = 0;
      bottomMarker.y = frameHeight - 0.5;
      bottomMarker.resize(MARKER_WIDTH, 1);
      bottomMarker.fills = [{ type: "SOLID", color }];
      bottomMarker.strokes = [];
      bottomMarker.constraints = { horizontal: "MIN", vertical: "MAX" };
      const connector = figma.createRectangle();
      connector.name = "Connector";
      connector.x = MARKER_WIDTH / 2;
      connector.y = frameHeight / 2 - 0.5;
      connector.resize(connectorLength, 1);
      connector.fills = [{ type: "SOLID", color }];
      connector.strokes = [];
      connector.constraints = { horizontal: "MIN", vertical: "CENTER" };
      const badge = figma.createFrame();
      badge.name = "Badge";
      badge.fills = [{ type: "SOLID", color }];
      badge.cornerRadius = 4;
      badge.resize(badgeWidth, badgeHeight);
      badge.x = MARKER_WIDTH / 2 + connectorLength;
      badge.y = frameHeight / 2 - badgeHeight / 2;
      badge.constraints = { horizontal: "MAX", vertical: "CENTER" };
      text.x = badgePadding;
      text.y = badgePadding;
      badge.appendChild(text);
      heightFrame.appendChild(line);
      heightFrame.appendChild(topMarker);
      heightFrame.appendChild(bottomMarker);
      heightFrame.appendChild(connector);
      heightFrame.appendChild(badge);
      container.appendChild(heightFrame);
    }
  }

  // src/features/generators.ts
  function createSectionContainer(name, itemSpacing = 24) {
    const section = figma.createFrame();
    section.name = name;
    section.layoutMode = "VERTICAL";
    section.primaryAxisSizingMode = "AUTO";
    section.counterAxisSizingMode = "AUTO";
    section.itemSpacing = itemSpacing;
    section.fills = [];
    return section;
  }
  function getVariantTitle(variantColors) {
    const { propertyMap } = variantColors;
    const priorityOrder = ["size", "type", "variant", "state", "status", "mode"];
    const titleParts = [];
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
  function sortVariantsBySize(variants) {
    return [...variants].sort((a, b) => {
      var _a, _b;
      const sizeA = (a.propertyMap.size || "").toLowerCase();
      const sizeB = (b.propertyMap.size || "").toLowerCase();
      const orderA = (_a = SIZE_ORDER[sizeA]) != null ? _a : 99;
      const orderB = (_b = SIZE_ORDER[sizeB]) != null ? _b : 99;
      return orderA - orderB;
    });
  }
  function formatVariantPropertiesForTable(propertyMap) {
    const priorityOrder = ["size", "type", "variant", "state", "status", "mode"];
    const parts = [];
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
  function filterVariantsForVisualization(variantColors, selectedProperties) {
    if (!selectedProperties || Object.keys(selectedProperties).length === 0) {
      return variantColors;
    }
    const hasAnySelection = Object.values(selectedProperties).some(
      (values) => values.length > 0
    );
    if (!hasAnySelection) {
      return variantColors;
    }
    const filtered = variantColors.filter((vc) => {
      const variantProps = vc.propertyMap;
      for (const [propName, selectedValues] of Object.entries(
        selectedProperties
      )) {
        if (selectedValues.length === 0) continue;
        const variantValue = variantProps[propName];
        if (!variantValue) continue;
        const isSelected = selectedValues.some(
          (v) => v.toLowerCase() === variantValue.toLowerCase()
        );
        if (!isSelected) {
          return false;
        }
      }
      return true;
    });
    return deduplicateVariants(filtered, selectedProperties);
  }
  function deduplicateVariants(variants, selectedProperties) {
    const PRIORITY_VALUES = ["default", "regular", "enabled"];
    const selectedPropNames = Object.keys(selectedProperties).filter(
      (k) => selectedProperties[k].length > 0
    );
    const groups = /* @__PURE__ */ new Map();
    for (const vc of variants) {
      const keyParts = selectedPropNames.map((prop) => `${prop}=${vc.propertyMap[prop] || ""}`).sort();
      const key = keyParts.join("|");
      if (!groups.has(key)) {
        groups.set(key, []);
      }
      groups.get(key).push(vc);
    }
    const result = [];
    for (const groupVariants of groups.values()) {
      if (groupVariants.length === 1) {
        result.push(groupVariants[0]);
        continue;
      }
      const allPropNames = /* @__PURE__ */ new Set();
      for (const vc of groupVariants) {
        Object.keys(vc.propertyMap).forEach((k) => allPropNames.add(k));
      }
      const hiddenPropNames = [...allPropNames].filter(
        (p) => !selectedPropNames.includes(p)
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
  async function createTitledVariantFrame(variant, title, frameWidth, frameHeight, highlightMode) {
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
    titleText.fills = [{ type: "SOLID", color: { r: 0.4, g: 0.4, b: 0.4 } }];
    outerFrame.appendChild(titleText);
    const vizFrame = figma.createFrame();
    vizFrame.name = "Visualization Frame";
    vizFrame.resize(frameWidth, frameHeight);
    const frameBgColor = highlightMode ? { r: 56 / 255, g: 83 / 255, b: 255 / 255 } : { r: 0.98, g: 0.98, b: 0.98 };
    vizFrame.fills = [{ type: "SOLID", color: frameBgColor }];
    vizFrame.cornerRadius = 8;
    vizFrame.clipsContent = false;
    const instance = variant.createInstance();
    instance.x = frameWidth / 2 - instance.width / 2;
    instance.y = frameHeight / 2 - instance.height / 2;
    vizFrame.appendChild(instance);
    outerFrame.appendChild(vizFrame);
    return { outerFrame, vizFrame, instance };
  }
  async function createGenericVariantGrid(parent, componentSet, variantColors, tableWidth, highlightMode, framesPerRow, config, annotationCallback) {
    var _a;
    const sortedVariants = sortVariantsBySize(variantColors);
    const minHeight = (_a = config.minHeight) != null ? _a : 250;
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
      (tableWidth - (numColumns - 1) * GRID_GAP) / numColumns
    );
    let maxFrameHeight = minHeight;
    for (const vc of sortedVariants) {
      const variant = componentSet.children.find(
        (c) => c.type === "COMPONENT" && c.name === vc.variantName
      );
      if (variant) {
        const candidateHeight = Math.max(
          minHeight,
          variant.height + config.margin * 2
        );
        if (candidateHeight > maxFrameHeight) {
          maxFrameHeight = candidateHeight;
        }
      }
    }
    for (const vc of sortedVariants) {
      const variant = componentSet.children.find(
        (c) => c.type === "COMPONENT" && c.name === vc.variantName
      );
      if (!variant) continue;
      const frameHeight = maxFrameHeight;
      const title = getVariantTitle(vc);
      const { outerFrame, vizFrame, instance } = await createTitledVariantFrame(
        variant,
        title,
        frameWidth,
        frameHeight,
        highlightMode
      );
      const instanceBounds = instance.absoluteBoundingBox;
      if (instanceBounds) {
        await annotationCallback({
          vc,
          variant,
          instance,
          vizFrame,
          instanceBounds,
          highlightMode
        });
      }
      gridContainer.appendChild(outerFrame);
    }
    parent.appendChild(gridContainer);
  }
  async function createColorSectionCombined(parent, variantColors, tableWidth) {
    const hasColors = variantColors.some((v) => v.colors.length > 0);
    if (!hasColors) return false;
    const section = createSectionContainer("Se\xE7\xE3o Cores");
    createSectionTitle("CORES", section);
    await createColorTableInSection(section, variantColors, tableWidth);
    parent.appendChild(section);
    return true;
  }
  async function createColorTableInSection(parent, variantColors, tableWidth) {
    const hasColors = variantColors.some((v) => v.colors.length > 0);
    if (!hasColors) return;
    const ROW_HEIGHT = 44;
    const ROW_GAP = 4;
    const GROUP_SPACING = 16;
    const tableContainer = createTableAutoLayoutContainer(
      "Tabela Cores",
      tableWidth,
      ROW_GAP
    );
    const headerElements = [];
    const headers = ["Elemento / Estado", "Token", "Refer\xEAncia"];
    const headerX = [
      0,
      Math.floor(tableWidth * 0.4),
      Math.floor(tableWidth * 0.8)
    ];
    for (let i = 0; i < headers.length; i++) {
      const headerText = figma.createText();
      headerText.fontName = getFont("Bold");
      headerText.fontSize = 16;
      headerText.characters = headers[i];
      headerText.fills = [{ type: "SOLID", color: { r: 0.4, g: 0.4, b: 0.4 } }];
      headerText.x = headerX[i];
      headerText.y = 0;
      headerElements.push(headerText);
    }
    groupElementsAndAppend(headerElements, "Header", tableContainer);
    const colorsByStatus = /* @__PURE__ */ new Map();
    for (const variant of variantColors) {
      for (const color of variant.colors) {
        const state = color.state || "Default";
        if (!colorsByStatus.has(state)) colorsByStatus.set(state, []);
        colorsByStatus.get(state).push({
          element: color.element,
          state,
          colorSpec: color
        });
      }
    }
    for (const [status, colors] of colorsByStatus) {
      const seen = /* @__PURE__ */ new Set();
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
      const colorRows = colorsByStatus.get(status);
      if (!isFirstStatus) {
        const spacer = figma.createFrame();
        spacer.name = "Spacer";
        spacer.resize(tableWidth, GROUP_SPACING - ROW_GAP);
        spacer.fills = [];
        tableContainer.appendChild(spacer);
      }
      isFirstStatus = false;
      for (const colorRow of colorRows) {
        const rowElements = [];
        const rowBg = figma.createRectangle();
        rowBg.name = "Row Background";
        rowBg.resize(tableWidth, ROW_HEIGHT);
        rowBg.fills = [{ type: "SOLID", color: { r: 1, g: 1, b: 1 } }];
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
        tokenText.characters = colorRow.colorSpec.token || colorRow.colorSpec.colorHex;
        tokenText.fills = [{ type: "SOLID", color: { r: 0.85, g: 0.1, b: 0.1 } }];
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
              color: { r: 0.5, g: 0.5, b: 0.5 },
              boundVariables: {
                color: {
                  type: "VARIABLE_ALIAS",
                  id: colorRow.colorSpec.colorVariableId
                }
              }
            }
          ];
        } else {
          colorCircle.fills = [
            { type: "SOLID", color: hexToRgb(colorRow.colorSpec.colorHex) }
          ];
        }
        colorCircle.strokes = [
          { type: "SOLID", color: { r: 0.85, g: 0.85, b: 0.85 } }
        ];
        colorCircle.strokeWeight = 1;
        rowElements.push(colorCircle);
        groupElementsAndAppend(
          rowElements,
          `${colorRow.state} / ${colorRow.element}`,
          tableContainer
        );
      }
    }
    parent.appendChild(tableContainer);
  }
  async function createTextSectionCombined(parent, variantColors, nodeToProcess, tableWidth, highlightMode, vizPropertyFilters, framesPerRow = 2, showTable = true, showViz = true) {
    const hasText = variantColors.some((v) => v.textStyles.length > 0);
    if (!hasText) return false;
    if (!showTable && !showViz) return false;
    const section = createSectionContainer("Se\xE7\xE3o Padr\xF5es de Texto");
    createSectionTitle("PADR\xD5ES DE TEXTO", section);
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
        framesPerRow
      );
    }
    parent.appendChild(section);
    return true;
  }
  async function createTextTableInSection(parent, variantColors, tableWidth) {
    var _a;
    const hasText = variantColors.some((v) => v.textStyles.length > 0);
    if (!hasText) return;
    const table = createTableBuilder("Tabela Tipografia", tableWidth, [
      { header: "Elemento", position: 0 },
      { header: "Componente", position: 0.45 }
    ]);
    const allTextRows = [];
    for (const variant of variantColors) {
      const size = variant.propertyMap.size || "Default";
      const sizeOrder = (_a = SIZE_ORDER[size.toLowerCase()]) != null ? _a : 99;
      for (const text of variant.textStyles) {
        allTextRows.push({
          sizeElement: `${size} / ${text.element}`,
          textSpec: text,
          sizeOrder
        });
      }
    }
    allTextRows.sort((a, b) => a.sizeOrder - b.sizeOrder);
    const seen = /* @__PURE__ */ new Set();
    const uniqueRows = allTextRows.filter((row) => {
      const key = `${row.sizeElement}-${row.textSpec.token || row.textSpec.fontFamily}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
    for (const textRow of uniqueRows) {
      const tokenValue = textRow.textSpec.token ? `$textstyle-${textRow.textSpec.token.replace(/\//g, "-")}` : `${textRow.textSpec.fontFamily} / ${textRow.textSpec.fontWeight} / ${textRow.textSpec.fontSize}px / LH: ${textRow.textSpec.lineHeight} / LS: ${textRow.textSpec.letterSpacing || "0%"}`;
      table.addRow(textRow.sizeElement, [
        { text: textRow.sizeElement },
        {
          text: tokenValue,
          color: textRow.textSpec.token ? "success" : "secondary"
        }
      ]);
    }
    table.appendTo(parent);
  }
  async function createTextVisualizationInSection(parent, component, variantColors, tableWidth, highlightMode, vizPropertyFilters, framesPerRow) {
    var _a;
    const hasText = variantColors.some((v) => v.textStyles.length > 0);
    if (!hasText) return;
    const filteredVariants = filterVariantsForVisualization(
      variantColors,
      vizPropertyFilters
    );
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
          margin: 80
        },
        async (ctx) => {
          if (ctx.vc.textStyles.length === 0) return;
          const allTextNodes2 = await findTextNodes(ctx.instance);
          const color = getTheme(ctx.highlightMode).text;
          const seenNames = /* @__PURE__ */ new Set();
          const uniqueTextNodes = [];
          for (const node of allTextNodes2) {
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
            const textNodeFontName = textNode.fontName !== figma.mixed ? textNode.fontName : { family: "Mixed", style: "Mixed" };
            const textNodeFontSize = textNode.fontSize !== figma.mixed ? textNode.fontSize : 0;
            let label = "";
            const specElementLower = (s) => s.toLowerCase();
            for (const spec of ctx.vc.textStyles) {
              const specEl = specElementLower(spec.element);
              if (specEl === nodeName || nodeName.includes(specEl) || specEl.includes(nodeName)) {
                label = spec.token ? `$textstyle-${spec.token.replace(/\//g, "-")}` : `${spec.fontFamily} / ${spec.fontWeight} / ${spec.fontSize}px / LH: ${spec.lineHeight}`;
                break;
              }
            }
            if (!label) {
              for (const spec of ctx.vc.textStyles) {
                if (spec.fontFamily === textNodeFontName.family && spec.fontWeight === textNodeFontName.style && spec.fontSize === textNodeFontSize) {
                  label = spec.token ? `$textstyle-${spec.token.replace(/\//g, "-")}` : `${spec.fontFamily} / ${spec.fontWeight} / ${spec.fontSize}px / LH: ${spec.lineHeight}`;
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
            const startY = isAbove ? textY - DOT_OFFSET : textY + nodeH + DOT_OFFSET;
            const endX = startX;
            const endY = isAbove ? textY - DOT_OFFSET - LINE_LENGTH : textY + nodeH + DOT_OFFSET + LINE_LENGTH;
            await createSimpleAnnotation(
              ctx.vizFrame,
              startX,
              startY,
              endX,
              endY,
              label,
              color
            );
          }
        }
      );
      return;
    }
    let baseComponent = null;
    if (component.type === "COMPONENT_SET") {
      baseComponent = component.children.find(
        (c) => c.type === "COMPONENT"
      );
    } else {
      baseComponent = component;
    }
    if (!baseComponent) return;
    const instance = baseComponent.type === "INSTANCE" ? baseComponent.clone() : baseComponent.createInstance();
    const MARGIN = 100;
    const frameHeight = Math.max(300, instance.height + MARGIN * 2);
    const vizContainer = figma.createFrame();
    vizContainer.name = "Visualiza\xE7\xE3o Textos";
    vizContainer.layoutMode = "VERTICAL";
    vizContainer.primaryAxisSizingMode = "AUTO";
    vizContainer.counterAxisSizingMode = "FIXED";
    vizContainer.resize(tableWidth, 100);
    vizContainer.itemSpacing = 16;
    vizContainer.fills = [];
    const subTitle = figma.createText();
    subTitle.fontName = getFont("Medium");
    subTitle.fontSize = 18;
    subTitle.characters = "Visualiza\xE7\xE3o";
    vizContainer.appendChild(subTitle);
    const vizFrame = figma.createFrame();
    vizFrame.name = "Text Visualization";
    vizFrame.resize(tableWidth, frameHeight);
    const frameBgColor = highlightMode ? { r: 56 / 255, g: 83 / 255, b: 255 / 255 } : { r: 0.98, g: 0.98, b: 0.98 };
    vizFrame.fills = [{ type: "SOLID", color: frameBgColor }];
    vizFrame.cornerRadius = 8;
    vizFrame.clipsContent = false;
    instance.x = tableWidth / 2 - instance.width / 2;
    instance.y = frameHeight / 2 - instance.height / 2;
    vizFrame.appendChild(instance);
    const allTextNodes = await findTextNodes(instance);
    const instanceBounds = instance.absoluteBoundingBox;
    if (instanceBounds) {
      const textStyles = ((_a = variantColors[0]) == null ? void 0 : _a.textStyles) || [];
      const color = getTheme(highlightMode).text;
      const seenNames = /* @__PURE__ */ new Set();
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
        const textNodeFontName = textNode.fontName !== figma.mixed ? textNode.fontName : { family: "Mixed", style: "Mixed" };
        const textNodeFontSize = textNode.fontSize !== figma.mixed ? textNode.fontSize : 0;
        let label = "";
        for (const spec of textStyles) {
          const specEl = spec.element.toLowerCase();
          if (specEl === nodeName || nodeName.includes(specEl) || specEl.includes(nodeName)) {
            label = spec.token ? `$textstyle-${spec.token.replace(/\//g, "-")}` : `${spec.fontFamily} / ${spec.fontWeight} / ${spec.fontSize}px / LH: ${spec.lineHeight}`;
            break;
          }
        }
        if (!label) {
          for (const spec of textStyles) {
            if (spec.fontFamily === textNodeFontName.family && spec.fontWeight === textNodeFontName.style && spec.fontSize === textNodeFontSize) {
              label = spec.token ? `$textstyle-${spec.token.replace(/\//g, "-")}` : `${spec.fontFamily} / ${spec.fontWeight} / ${spec.fontSize}px / LH: ${spec.lineHeight}`;
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
        const endY = isAbove ? textY - DOT_OFFSET - LINE_LENGTH : textY + nodeH + DOT_OFFSET + LINE_LENGTH;
        await createSimpleAnnotation(
          vizFrame,
          startX,
          startY,
          endX,
          endY,
          label,
          color
        );
      }
    }
    vizContainer.appendChild(vizFrame);
    parent.appendChild(vizContainer);
  }
  async function createSpacingSectionCombined(parent, variantColors, nodeToProcess, tableWidth, highlightMode, vizPropertyFilters, framesPerRow = 2, showTable = true, showViz = true) {
    const hasSpacings = variantColors.some(
      (v) => v.spacings.length > 0 || v.borders.length > 0
    );
    if (!hasSpacings) return false;
    if (!showTable && !showViz) return false;
    const section = createSectionContainer("Se\xE7\xE3o Medidas e Espa\xE7amentos");
    createSectionTitle("MEDIDAS E ESPA\xC7AMENTOS", section);
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
        framesPerRow
      );
      await createDimensionVisualizationInSection(
        section,
        nodeToProcess,
        variantColors,
        tableWidth,
        highlightMode,
        vizPropertyFilters,
        framesPerRow
      );
    }
    parent.appendChild(section);
    return true;
  }
  async function createSpacingTableInSection(parent, variantColors, tableWidth) {
    const hasSpacing = variantColors.some(
      (v) => v.spacings.length > 0 || v.borders.length > 0
    );
    if (!hasSpacing) return;
    const GROUP_SPACING = 20;
    const ROW_GAP = 4;
    const table = createTableBuilder("Tabela Espa\xE7amentos", tableWidth, [
      { header: "Medida", position: 0 },
      { header: "Token / Valor", position: 0.4, color: "error" },
      { header: "Refer\xEAncia", position: 0.75 }
    ]);
    const spacingsByProperty = /* @__PURE__ */ new Map();
    for (const variant of variantColors) {
      const variantLabel = formatVariantPropertiesForTable(variant.propertyMap);
      for (const spacing of variant.spacings) {
        if (!spacingsByProperty.has(spacing.property)) {
          spacingsByProperty.set(spacing.property, []);
        }
        const entries = spacingsByProperty.get(spacing.property);
        const existing = entries.find(
          (e) => (e.token || e.value) === (spacing.token || spacing.value)
        );
        if (existing) {
          if (!existing.variants.includes(variantLabel)) {
            existing.variants.push(variantLabel);
          }
        } else {
          entries.push({
            token: spacing.token,
            value: spacing.value,
            variants: [variantLabel]
          });
        }
      }
      for (const border of variant.borders) {
        const sideName = border.side && border.side !== "All" ? ` ${border.side}` : "";
        const positionName = border.position ? ` (${border.position})` : "";
        const propName = `Border${sideName}${positionName}`;
        if (!spacingsByProperty.has(propName)) {
          spacingsByProperty.set(propName, []);
        }
        const entries = spacingsByProperty.get(propName);
        const existing = entries.find(
          (e) => (e.token || e.value) === (border.token || border.value)
        );
        if (existing) {
          if (!existing.variants.includes(variantLabel)) {
            existing.variants.push(variantLabel);
          }
        } else {
          entries.push({
            token: border.token,
            value: border.value,
            variants: [variantLabel]
          });
        }
      }
    }
    const allDisplayEntries = [];
    const allVariantLabels = /* @__PURE__ */ new Set();
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
            value: entry.value
          });
        } else {
          const entryGroups = /* @__PURE__ */ new Set();
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
              value: entry.value
            });
          }
        }
      }
    }
    const entriesByPrefix = /* @__PURE__ */ new Map();
    for (const entry of allDisplayEntries) {
      if (!entriesByPrefix.has(entry.prefix)) {
        entriesByPrefix.set(entry.prefix, []);
      }
      entriesByPrefix.get(entry.prefix).push(entry);
    }
    const sortedPrefixes = Array.from(entriesByPrefix.keys()).sort((a, b) => {
      if (a === "Todos") return -1;
      if (b === "Todos") return 1;
      return a.localeCompare(b);
    });
    let isFirstGroup = true;
    for (const prefix of sortedPrefixes) {
      const groupEntries = entriesByPrefix.get(prefix);
      if (groupEntries.length === 0) continue;
      if (!isFirstGroup) {
        table.addSpacer(GROUP_SPACING - ROW_GAP);
      }
      isFirstGroup = false;
      for (const entry of groupEntries) {
        table.addRow(`Row - ${entry.displayText}`, [
          { text: entry.displayText },
          { text: entry.token || "-", color: "error" },
          { text: entry.value }
        ]);
      }
    }
    table.appendTo(parent);
  }
  async function createPaddingGapVisualizationInSection(parent, component, variantColors, tableWidth, highlightMode, vizPropertyFilters, framesPerRow) {
    const filteredVariants = filterVariantsForVisualization(
      variantColors,
      vizPropertyFilters
    );
    if (component.type === "COMPONENT_SET" && filteredVariants.length > 1) {
      await createGenericVariantGrid(
        parent,
        component,
        filteredVariants,
        tableWidth,
        highlightMode,
        framesPerRow,
        {
          gridName: "Grid Variantes - Espa\xE7amentos",
          margin: 100
        },
        async (ctx) => {
          await processSpacingNodeForViz(
            ctx.instance,
            ctx.vizFrame,
            ctx.instance.x,
            ctx.instance.y,
            ctx.instanceBounds,
            ctx.highlightMode
          );
        }
      );
    }
  }
  async function createDimensionVisualizationInSection(parent, component, variantColors, tableWidth, highlightMode, vizPropertyFilters, framesPerRow) {
    if (component.type !== "COMPONENT_SET") return;
    const filteredVariants = filterVariantsForVisualization(
      variantColors,
      vizPropertyFilters
    );
    if (filteredVariants.length <= 1) return;
    const vizContainer = figma.createFrame();
    vizContainer.name = "Visualiza\xE7\xE3o Dimens\xF5es e Bordas";
    vizContainer.layoutMode = "VERTICAL";
    vizContainer.primaryAxisSizingMode = "AUTO";
    vizContainer.counterAxisSizingMode = "AUTO";
    vizContainer.itemSpacing = 16;
    vizContainer.fills = [];
    const subTitle = figma.createText();
    subTitle.fontName = getFont("Bold");
    subTitle.fontSize = 32;
    subTitle.characters = "Visualiza\xE7\xE3o de Dimens\xF5es e Bordas";
    vizContainer.appendChild(subTitle);
    await createGenericVariantGrid(
      vizContainer,
      component,
      filteredVariants,
      tableWidth,
      highlightMode,
      framesPerRow,
      {
        gridName: "Grid Variantes - Dimens\xF5es",
        margin: 100
      },
      async (ctx) => {
        var _a;
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
          ctx.highlightMode
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
            ctx.highlightMode
          );
        }
        if (strokeInfo && strokeInfo.length > 0) {
          for (const stroke of strokeInfo) {
            let borderToken = null;
            const varKey = stroke.side === "All" ? "strokeWeight" : `stroke${stroke.side}Weight`;
            if (varKey in stroke.boundVars && ((_a = stroke.boundVars[varKey]) == null ? void 0 : _a.id)) {
              const variable = await figma.variables.getVariableByIdAsync(
                stroke.boundVars[varKey].id
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
              stroke.position
            );
          }
        }
      }
    );
    parent.appendChild(vizContainer);
  }
  function findCornerRadius(node) {
    if (!("cornerRadius" in node)) return null;
    const nodeWithRadius = node;
    if (nodeWithRadius.cornerRadius !== void 0 && nodeWithRadius.cornerRadius !== figma.mixed && nodeWithRadius.cornerRadius > 0) {
      return { value: nodeWithRadius.cornerRadius, isUniform: true };
    }
    if ("topLeftRadius" in node) {
      const nodeWithRadii = node;
      const radii = [
        nodeWithRadii.topLeftRadius,
        nodeWithRadii.topRightRadius,
        nodeWithRadii.bottomLeftRadius,
        nodeWithRadii.bottomRightRadius
      ];
      const nonZero = radii.filter((r) => r > 0);
      if (nonZero.length > 0) {
        return { value: Math.max(...nonZero), isUniform: false };
      }
    }
    return null;
  }
  async function findStrokeWeight(node) {
    if (!("strokes" in node) || !Array.isArray(node.strokes)) return null;
    if (node.strokes.length === 0) return null;
    const results = [];
    if ("strokeWeight" in node && typeof node.strokeWeight === "number") {
      const boundVars = "boundVariables" in node ? node.boundVariables : {};
      if (node.strokeWeight > 0) {
        const strokeAlign = "strokeAlign" in node ? String(node.strokeAlign) : "CENTER";
        const position = strokeAlign === "INSIDE" ? "Inside" : strokeAlign === "OUTSIDE" ? "Outside" : "Center";
        results.push({
          value: node.strokeWeight,
          side: "All",
          position,
          boundVars
        });
      }
    }
    return results.length > 0 ? results : null;
  }
  async function findHeightToken(node) {
    var _a;
    if (!("boundVariables" in node)) return null;
    const boundVars = node.boundVariables;
    if ((_a = boundVars.height) == null ? void 0 : _a.id) {
      const variable = await figma.variables.getVariableByIdAsync(
        boundVars.height.id
      );
      if (variable) return formatToken(variable.name);
    }
    return null;
  }
  async function findCornerRadiusToken(node) {
    var _a;
    if (!("boundVariables" in node)) return null;
    const boundVars = node.boundVariables;
    const radiusKeys = [
      "cornerRadius",
      "topLeftRadius",
      "topRightRadius",
      "bottomLeftRadius",
      "bottomRightRadius"
    ];
    for (const key of radiusKeys) {
      if ((_a = boundVars[key]) == null ? void 0 : _a.id) {
        const variable = await figma.variables.getVariableByIdAsync(
          boundVars[key].id
        );
        if (variable) return formatToken(variable.name);
      }
    }
    return null;
  }
  async function processSpacingNodeForViz(node, vizFrame, baseX, baseY, _instanceBounds, highlightMode) {
    var _a, _b;
    if (!("layoutMode" in node)) return;
    const frameNode = node;
    if (frameNode.layoutMode === "NONE") return;
    if (frameNode.itemSpacing > 0) {
      let gapToken = null;
      if ("boundVariables" in frameNode && frameNode.boundVariables && typeof frameNode.boundVariables === "object") {
        const bv = frameNode.boundVariables;
        if ((_a = bv.itemSpacing) == null ? void 0 : _a.id) {
          const variable = await figma.variables.getVariableByIdAsync(
            bv.itemSpacing.id
          );
          if (variable) gapToken = formatToken(variable.name);
        }
      }
      await annotateGapNew(
        vizFrame,
        frameNode,
        frameNode.itemSpacing,
        frameNode.layoutMode === "HORIZONTAL" ? "H" : "V",
        baseX,
        baseY,
        gapToken,
        0,
        highlightMode
      );
    }
    const paddings = [
      { value: frameNode.paddingTop, side: "top" },
      { value: frameNode.paddingBottom, side: "bottom" },
      { value: frameNode.paddingLeft, side: "left" },
      { value: frameNode.paddingRight, side: "right" }
    ];
    for (const pad2 of paddings) {
      if (pad2.value > 0) {
        let padToken = null;
        if ("boundVariables" in frameNode && frameNode.boundVariables && typeof frameNode.boundVariables === "object") {
          const bv = frameNode.boundVariables;
          const padKey = `padding${pad2.side.charAt(0).toUpperCase() + pad2.side.slice(1)}`;
          if ((_b = bv[padKey]) == null ? void 0 : _b.id) {
            const variable = await figma.variables.getVariableByIdAsync(
              bv[padKey].id
            );
            if (variable) padToken = formatToken(variable.name);
          }
        }
        await annotatePaddingNew(
          vizFrame,
          pad2.value,
          pad2.side,
          baseX,
          baseY,
          frameNode.width,
          frameNode.height,
          padToken,
          highlightMode
        );
      }
    }
    if ("children" in frameNode) {
      for (const child of frameNode.children) {
        if (child.type === "FRAME" || child.type === "INSTANCE") {
          const childBounds = child.absoluteBoundingBox;
          if (childBounds) {
            const childX = baseX + (childBounds.x - frameNode.absoluteBoundingBox.x);
            const childY = baseY + (childBounds.y - frameNode.absoluteBoundingBox.y);
            await processSpacingNodeForViz(
              child,
              vizFrame,
              childX,
              childY,
              _instanceBounds,
              highlightMode
            );
          }
        }
      }
    }
  }
  async function createEffectsSectionCombined(parent, variantColors, nodeToProcess, tableWidth, highlightMode, vizPropertyFilters, framesPerRow = 2, showTable = true, showViz = true) {
    const hasEffects = variantColors.some((v) => v.effects.length > 0);
    if (!hasEffects) return false;
    if (!showTable && !showViz) return false;
    const section = createSectionContainer("Se\xE7\xE3o Efeitos");
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
        framesPerRow
      );
    }
    parent.appendChild(section);
    return true;
  }
  async function createEffectsTableInSection(parent, variantColors, tableWidth) {
    const hasEffects = variantColors.some((v) => v.effects.length > 0);
    if (!hasEffects) return;
    const GROUP_SPACING = 20;
    const ROW_GAP = 4;
    const table = createTableBuilder("Tabela Efeitos", tableWidth, [
      { header: "Elemento", position: 0 },
      { header: "Tipo", position: 0.25 },
      { header: "Token", position: 0.4, color: "warning" },
      { header: "Valor", position: 0.65 }
    ]);
    const effectsByElement = /* @__PURE__ */ new Map();
    for (const variant of variantColors) {
      const variantLabel = formatVariantPropertiesForTable(variant.propertyMap);
      for (const effect of variant.effects) {
        const element = effect.element;
        if (!effectsByElement.has(element)) {
          effectsByElement.set(element, []);
        }
        const entries = effectsByElement.get(element);
        const existing = entries.find(
          (e) => e.effectType === effect.effectType && (e.token || e.value) === (effect.token || effect.value)
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
            variants: [variantLabel]
          });
        }
      }
    }
    let isFirstGroup = true;
    for (const [element, entries] of effectsByElement) {
      if (entries.length === 0) continue;
      if (!isFirstGroup) {
        table.addSpacer(GROUP_SPACING - ROW_GAP);
      }
      isFirstGroup = false;
      for (const entry of entries) {
        table.addRow(`Row - ${element}`, [
          { text: element },
          { text: entry.effectType },
          { text: entry.token || "-", color: "warning" },
          { text: entry.value }
        ]);
      }
    }
    table.appendTo(parent);
  }
  async function createEffectsVisualizationInSection(parent, component, variantColors, tableWidth, highlightMode, vizPropertyFilters, framesPerRow) {
    if (component.type !== "COMPONENT_SET") return;
    const hasEffects = variantColors.some((v) => v.effects.length > 0);
    if (!hasEffects) return;
    const filteredVariants = filterVariantsForVisualization(
      variantColors,
      vizPropertyFilters
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
          margin: 80
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
            let effectLabel = "Effect";
            for (const effectSpec of ctx.vc.effects) {
              if (effectSpec.element.toLowerCase().includes(node.name.toLowerCase())) {
                effectLabel = effectSpec.token || effectSpec.value;
                break;
              }
            }
            const isAbove = i % 2 === 0;
            const LINE_LENGTH = 20;
            const DOT_OFFSET = 15;
            const startX = nodeX + bounds.width / 2;
            const startY = isAbove ? nodeY - DOT_OFFSET : nodeY + bounds.height + DOT_OFFSET;
            const endX = startX;
            const endY = isAbove ? nodeY - DOT_OFFSET - LINE_LENGTH : nodeY + bounds.height + DOT_OFFSET + LINE_LENGTH;
            await createSimpleAnnotation(
              ctx.vizFrame,
              startX,
              startY,
              endX,
              endY,
              effectLabel,
              color
            );
          }
        }
      );
    }
  }
  function findNodesWithEffects(node) {
    const results = [];
    if ("effects" in node && Array.isArray(node.effects) && node.effects.length > 0) {
      const hasVisibleEffect = node.effects.some(
        (e) => e.visible !== false
      );
      if (hasVisibleEffect) {
        results.push(node);
      }
    }
    if ("children" in node) {
      for (const child of node.children) {
        results.push(...findNodesWithEffects(child));
      }
    }
    return results;
  }
  async function createEstadosSection(parent, component, _variantColors, tableWidth, highlightMode, framesPerRow = 4) {
    const variants = [];
    for (const child of component.children) {
      if (child.type === "COMPONENT") {
        const props = extractRelevantProperties(child.name);
        const stateName = props["state"] || props["status"] || props["type"] || props["style"] || Object.values(props)[0] || "Default";
        variants.push({ name: stateName, node: child });
      }
    }
    const uniqueVariants = [];
    const seenNames = /* @__PURE__ */ new Set();
    for (const v of variants) {
      if (!seenNames.has(v.name)) {
        seenNames.add(v.name);
        uniqueVariants.push(v);
      }
    }
    if (uniqueVariants.length === 0) {
      return false;
    }
    const section = createSectionContainer("Se\xE7\xE3o Estados");
    createSectionTitle("ESTADOS", section);
    const GRID_GAP = 16;
    const CARD_PADDING = 24;
    const COLUMNS = framesPerRow;
    const cardWidth = Math.floor(
      (tableWidth - GRID_GAP * (COLUMNS - 1)) / COLUMNS
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
        const cardBgColor = highlightMode ? { r: 56 / 255, g: 83 / 255, b: 255 / 255 } : { r: 0.98, g: 0.98, b: 0.98 };
        card.fills = [{ type: "SOLID", color: cardBgColor }];
        card.cornerRadius = 8;
        const label = figma.createText();
        label.fontName = getFont("Regular");
        label.fontSize = 14;
        label.characters = `${String(index).padStart(2, "0")}. ${variant.name}`;
        const labelColor = highlightMode ? { r: 98 / 255, g: 248 / 255, b: 79 / 255 } : { r: 0.4, g: 0.4, b: 0.4 };
        label.fills = [{ type: "SOLID", color: labelColor }];
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
  async function createPropertiesSection(parent, component, tableWidth) {
    if (!component.componentPropertyDefinitions) {
      return false;
    }
    const propDefs = component.componentPropertyDefinitions;
    const propKeys = Object.keys(propDefs);
    if (propKeys.length === 0) return false;
    const allPropsWithIndex = propKeys.map((key, index) => ({
      key,
      def: propDefs[key],
      originalIndex: index
    }));
    const variants = allPropsWithIndex.filter((p) => p.def.type === "VARIANT");
    const instanceSwaps = allPropsWithIndex.filter(
      (p) => p.def.type === "INSTANCE_SWAP"
    );
    const others = allPropsWithIndex.filter(
      (p) => p.def.type !== "VARIANT" && p.def.type !== "INSTANCE_SWAP"
    );
    others.sort((a, b) => {
      const aKeyLower = a.key.toLowerCase();
      const bKeyLower = b.key.toLowerCase();
      if (a.def.type === "BOOLEAN" && b.def.type === "TEXT") {
        if (bKeyLower.includes(aKeyLower) || bKeyLower.startsWith("text " + aKeyLower)) {
          return -1;
        }
      }
      if (b.def.type === "BOOLEAN" && a.def.type === "TEXT") {
        if (aKeyLower.includes(bKeyLower) || aKeyLower.startsWith("text " + bKeyLower)) {
          return 1;
        }
      }
      return a.originalIndex - b.originalIndex;
    });
    const allProps = [...variants, ...others, ...instanceSwaps].map(
      ({ key, def }) => ({ key, def })
    );
    const normalProps = allProps.filter((p) => p.def.type !== "INSTANCE_SWAP");
    const _nestedInstanceProps = allProps.filter(
      (p) => p.def.type === "INSTANCE_SWAP"
    );
    const section = createSectionContainer("Se\xE7\xE3o Propriedades", 32);
    section.paddingLeft = 32;
    section.paddingRight = 32;
    section.paddingTop = 32;
    section.paddingBottom = 32;
    section.fills = [{ type: "SOLID", color: { r: 1, g: 1, b: 1 } }];
    section.cornerRadius = 8;
    createSectionTitle(`\u2756 ${component.name} Properties`, section);
    const BLUE_COLOR = { r: 49 / 255, g: 53 / 255, b: 217 / 255 };
    const GRAY_COLOR = { r: 0.4, g: 0.4, b: 0.4 };
    const WHITE_COLOR = { r: 1, g: 1, b: 1 };
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
        Math.floor(innerTableWidth * 0.55)
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
        headerText.fills = [{ type: "SOLID", color: GRAY_COLOR }];
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
        row.strokes = [{ type: "SOLID", color: { r: 0.9, g: 0.9, b: 0.9 } }];
        row.strokeTopWeight = 1;
        row.strokeBottomWeight = 0;
        row.strokeLeftWeight = 0;
        row.strokeRightWeight = 0;
        row.fills = [{ type: "SOLID", color: { r: 1, g: 1, b: 1 } }];
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
        propText.fills = [{ type: "SOLID", color: { r: 0.2, g: 0.2, b: 0.2 } }];
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
        let typeIcon = "\u25C6";
        let typeName = "Variant";
        if (def.type === "BOOLEAN") {
          typeIcon = "\u2299";
          typeName = "Boolean";
        } else if (def.type === "TEXT") {
          typeIcon = "T";
          typeName = "Text";
        }
        const iconText = figma.createText();
        iconText.fontName = getFont("Regular");
        iconText.fontSize = 14;
        iconText.characters = typeIcon;
        iconText.fills = [{ type: "SOLID", color: BLUE_COLOR }];
        typeCell.appendChild(iconText);
        const typeNameText = figma.createText();
        typeNameText.fontName = getFont("Regular");
        typeNameText.fontSize = 14;
        typeNameText.characters = typeName;
        typeNameText.fills = [{ type: "SOLID", color: GRAY_COLOR }];
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
              badge.fills = [{ type: "SOLID", color: BLUE_COLOR }];
            } else {
              badge.fills = [];
              badge.strokes = [{ type: "SOLID", color: BLUE_COLOR }];
              badge.strokeWeight = 1;
            }
            const optionText = figma.createText();
            optionText.fontName = getFont("Medium");
            optionText.fontSize = 12;
            optionText.characters = option;
            optionText.fills = [
              { type: "SOLID", color: isDefault ? WHITE_COLOR : BLUE_COLOR }
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
              color: isTrue ? BLUE_COLOR : { r: 0.8, g: 0.8, b: 0.8 }
            }
          ];
          const knob = figma.createEllipse();
          knob.resize(16, 16);
          knob.x = isTrue ? 18 : 2;
          knob.y = 2;
          knob.fills = [{ type: "SOLID", color: WHITE_COLOR }];
          toggle.appendChild(knob);
          toggleContainer.appendChild(toggle);
          const boolText = figma.createText();
          boolText.fontName = getFont("Regular");
          boolText.fontSize = 14;
          boolText.characters = isTrue ? "True" : "False";
          boolText.fills = [{ type: "SOLID", color: GRAY_COLOR }];
          toggleContainer.appendChild(boolText);
          valueCell.appendChild(toggleContainer);
        } else if (def.type === "TEXT") {
          const textValue = figma.createText();
          textValue.fontName = getFont("Regular");
          textValue.fontSize = 14;
          textValue.characters = String(def.defaultValue || "");
          textValue.fills = [{ type: "SOLID", color: { r: 0.2, g: 0.2, b: 0.2 } }];
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
  async function createUsedComponentsSectionAutoLayout(parent, variantColors, tableWidth) {
    const componentMap = /* @__PURE__ */ new Map();
    for (const variant of variantColors) {
      for (const [compId, compName] of variant.usedComponents) {
        if (compName.startsWith(".") || compName.startsWith("_")) continue;
        componentMap.set(compId, compName);
      }
    }
    if (componentMap.size === 0) return false;
    const section = createSectionContainer("Se\xE7\xE3o Componentes Utilizados");
    createSectionTitle("COMPONENTES UTILIZADOS", section);
    const table = createTableBuilder("Tabela Componentes", tableWidth, [
      { header: "Componente", position: 0 },
      { header: "Origem", position: 0.6 }
    ]);
    const sortedComponents = Array.from(componentMap.entries()).sort(
      (a, b) => a[1].localeCompare(b[1])
    );
    for (const [_compId, compName] of sortedComponents) {
      table.addRow(`Row - ${compName}`, [
        { text: compName },
        { text: "Local", color: "secondary" }
      ]);
    }
    table.appendTo(section);
    parent.appendChild(section);
    return true;
  }
  function extractVariantProperties(componentSet) {
    const properties = [];
    const propDefs = componentSet.componentPropertyDefinitions;
    if (!propDefs) return properties;
    for (const [name, def] of Object.entries(propDefs)) {
      if (def.type === "VARIANT" && def.variantOptions) {
        const sizeOrder = SIZE_ORDER;
        const sortedValues = [...def.variantOptions].sort((a, b) => {
          var _a, _b;
          const aLower = a.toLowerCase();
          const bLower = b.toLowerCase();
          const aOrder = (_a = sizeOrder[aLower]) != null ? _a : 99;
          const bOrder = (_b = sizeOrder[bLower]) != null ? _b : 99;
          if (aOrder !== bOrder) return aOrder - bOrder;
          return a.localeCompare(b);
        });
        properties.push({ name, values: sortedValues });
      }
    }
    return properties;
  }

  // src/assets/marker-generator.ts
  function createAssetBadge(value, color) {
    const badge = figma.createFrame();
    badge.name = "Badge";
    badge.fills = [{ type: "SOLID", color }];
    badge.cornerRadius = 4;
    badge.layoutMode = "HORIZONTAL";
    badge.primaryAxisSizingMode = "AUTO";
    badge.counterAxisSizingMode = "AUTO";
    badge.paddingLeft = 8;
    badge.paddingRight = 8;
    badge.paddingTop = 4;
    badge.paddingBottom = 4;
    const badgeText = figma.createText();
    badgeText.fontName = getFont("Bold");
    badgeText.fontSize = 12;
    badgeText.characters = value;
    badgeText.fills = [{ type: "SOLID", color: { r: 1, g: 1, b: 1 } }];
    badge.appendChild(badgeText);
    return badge;
  }
  function createMeasureAssetResizable(value, color, direction, badgePosition) {
    const frame = figma.createFrame();
    frame.name = `Measure - ${value}`;
    frame.fills = [];
    frame.clipsContent = false;
    const SIZE = 100;
    const MARKER_SIZE = 12;
    if (direction === "horizontal") {
      frame.resize(SIZE, 45);
      const badge = createAssetBadge(value, color);
      const badgeHeight = badge.height;
      const lineFrame = figma.createFrame();
      lineFrame.name = "Line Frame";
      lineFrame.fills = [];
      lineFrame.resize(SIZE, MARKER_SIZE);
      if (badgePosition === "top") {
        lineFrame.y = badgeHeight + 5;
      } else if (badgePosition === "bottom") {
        lineFrame.y = 5;
      } else {
        lineFrame.y = (frame.height - MARKER_SIZE) / 2;
      }
      lineFrame.constraints = { horizontal: "STRETCH", vertical: "CENTER" };
      const leftMarker = figma.createRectangle();
      leftMarker.name = "Left Marker";
      leftMarker.resize(2, MARKER_SIZE);
      leftMarker.fills = [{ type: "SOLID", color }];
      leftMarker.x = 0;
      leftMarker.y = 0;
      leftMarker.constraints = { horizontal: "MIN", vertical: "STRETCH" };
      lineFrame.appendChild(leftMarker);
      const rightMarker = figma.createRectangle();
      rightMarker.name = "Right Marker";
      rightMarker.resize(2, MARKER_SIZE);
      rightMarker.fills = [{ type: "SOLID", color }];
      rightMarker.x = SIZE - 2;
      rightMarker.y = 0;
      rightMarker.constraints = { horizontal: "MAX", vertical: "STRETCH" };
      lineFrame.appendChild(rightMarker);
      const line = figma.createRectangle();
      line.name = "Line";
      line.resize(SIZE, 2);
      line.fills = [{ type: "SOLID", color }];
      line.x = 0;
      line.y = MARKER_SIZE / 2 - 1;
      line.constraints = { horizontal: "STRETCH", vertical: "CENTER" };
      lineFrame.appendChild(line);
      frame.appendChild(lineFrame);
      if (badgePosition === "top") {
        badge.x = SIZE / 2 - badge.width / 2;
        badge.y = 0;
        badge.constraints = { horizontal: "CENTER", vertical: "MIN" };
      } else if (badgePosition === "bottom") {
        badge.x = SIZE / 2 - badge.width / 2;
        badge.y = lineFrame.y + MARKER_SIZE + 5;
        badge.constraints = { horizontal: "CENTER", vertical: "MAX" };
      } else if (badgePosition === "left") {
        badge.x = -badge.width - 5;
        badge.y = frame.height / 2 - badge.height / 2;
        badge.constraints = { horizontal: "MIN", vertical: "CENTER" };
      } else {
        badge.x = SIZE + 5;
        badge.y = frame.height / 2 - badge.height / 2;
        badge.constraints = { horizontal: "MAX", vertical: "CENTER" };
      }
      frame.appendChild(badge);
    } else {
      frame.resize(60, SIZE);
      const badge = createAssetBadge(value, color);
      const badgeWidth = badge.width;
      const lineFrame = figma.createFrame();
      lineFrame.name = "Line Frame";
      lineFrame.fills = [];
      lineFrame.resize(MARKER_SIZE, SIZE);
      if (badgePosition === "left") {
        lineFrame.x = badgeWidth + 5;
      } else if (badgePosition === "right") {
        lineFrame.x = 5;
      } else {
        lineFrame.x = (frame.width - MARKER_SIZE) / 2;
      }
      lineFrame.constraints = { horizontal: "CENTER", vertical: "STRETCH" };
      const topMarker = figma.createRectangle();
      topMarker.name = "Top Marker";
      topMarker.resize(MARKER_SIZE, 2);
      topMarker.fills = [{ type: "SOLID", color }];
      topMarker.x = 0;
      topMarker.y = 0;
      topMarker.constraints = { horizontal: "STRETCH", vertical: "MIN" };
      lineFrame.appendChild(topMarker);
      const bottomMarker = figma.createRectangle();
      bottomMarker.name = "Bottom Marker";
      bottomMarker.resize(MARKER_SIZE, 2);
      bottomMarker.fills = [{ type: "SOLID", color }];
      bottomMarker.x = 0;
      bottomMarker.y = SIZE - 2;
      bottomMarker.constraints = { horizontal: "STRETCH", vertical: "MAX" };
      lineFrame.appendChild(bottomMarker);
      const line = figma.createRectangle();
      line.name = "Line";
      line.resize(2, SIZE);
      line.fills = [{ type: "SOLID", color }];
      line.x = MARKER_SIZE / 2 - 1;
      line.y = 0;
      line.constraints = { horizontal: "CENTER", vertical: "STRETCH" };
      lineFrame.appendChild(line);
      frame.appendChild(lineFrame);
      if (badgePosition === "left") {
        badge.x = 0;
        badge.y = SIZE / 2 - badge.height / 2;
        badge.constraints = { horizontal: "MIN", vertical: "CENTER" };
      } else if (badgePosition === "right") {
        badge.x = lineFrame.x + MARKER_SIZE + 5;
        badge.y = SIZE / 2 - badge.height / 2;
        badge.constraints = { horizontal: "MAX", vertical: "CENTER" };
      } else if (badgePosition === "top") {
        badge.x = frame.width / 2 - badge.width / 2;
        badge.y = -badge.height - 5;
        badge.constraints = { horizontal: "CENTER", vertical: "MIN" };
      } else {
        badge.x = frame.width / 2 - badge.width / 2;
        badge.y = SIZE + 5;
        badge.constraints = { horizontal: "CENTER", vertical: "MAX" };
      }
      frame.appendChild(badge);
    }
    return frame;
  }
  function createGapAssetResizable(value, color, direction, badgePosition) {
    const frame = figma.createFrame();
    frame.name = `Gap - ${value}`;
    frame.fills = [];
    frame.clipsContent = false;
    const SIZE = 80;
    const SECONDARY_SIZE = 40;
    if (direction === "horizontal") {
      frame.resize(SIZE, SECONDARY_SIZE + 30);
      const gapArea = figma.createRectangle();
      gapArea.name = "Gap Area";
      gapArea.resize(SIZE, SECONDARY_SIZE);
      gapArea.fills = [{ type: "SOLID", color, opacity: 0.15 }];
      gapArea.strokes = [{ type: "SOLID", color, opacity: 0.6 }];
      gapArea.strokeWeight = 1;
      gapArea.dashPattern = [4, 4];
      gapArea.y = badgePosition === "top" ? 25 : 0;
      gapArea.constraints = { horizontal: "STRETCH", vertical: "STRETCH" };
      frame.appendChild(gapArea);
      const badge = createAssetBadge(value, color);
      if (badgePosition === "top") {
        badge.x = SIZE / 2 - badge.width / 2;
        badge.y = 0;
        badge.constraints = { horizontal: "CENTER", vertical: "MIN" };
      } else if (badgePosition === "bottom") {
        badge.x = SIZE / 2 - badge.width / 2;
        badge.y = SECONDARY_SIZE + 5;
        badge.constraints = { horizontal: "CENTER", vertical: "MAX" };
      } else if (badgePosition === "left") {
        badge.x = -badge.width - 5;
        badge.y = SECONDARY_SIZE / 2 - badge.height / 2;
        badge.constraints = { horizontal: "MIN", vertical: "CENTER" };
      } else {
        badge.x = SIZE + 5;
        badge.y = SECONDARY_SIZE / 2 - badge.height / 2;
        badge.constraints = { horizontal: "MAX", vertical: "CENTER" };
      }
      frame.appendChild(badge);
    } else {
      frame.resize(SECONDARY_SIZE + 50, SIZE);
      const gapArea = figma.createRectangle();
      gapArea.name = "Gap Area";
      gapArea.resize(SECONDARY_SIZE, SIZE);
      gapArea.fills = [{ type: "SOLID", color, opacity: 0.15 }];
      gapArea.strokes = [{ type: "SOLID", color, opacity: 0.6 }];
      gapArea.strokeWeight = 1;
      gapArea.dashPattern = [4, 4];
      gapArea.x = badgePosition === "left" ? 45 : 0;
      gapArea.constraints = { horizontal: "STRETCH", vertical: "STRETCH" };
      frame.appendChild(gapArea);
      const badge = createAssetBadge(value, color);
      if (badgePosition === "left") {
        badge.x = 0;
        badge.y = SIZE / 2 - badge.height / 2;
        badge.constraints = { horizontal: "MIN", vertical: "CENTER" };
      } else if (badgePosition === "right") {
        badge.x = SECONDARY_SIZE + 5;
        badge.y = SIZE / 2 - badge.height / 2;
        badge.constraints = { horizontal: "MAX", vertical: "CENTER" };
      } else if (badgePosition === "top") {
        badge.x = SECONDARY_SIZE / 2 - badge.width / 2;
        badge.y = -badge.height - 5;
        badge.constraints = { horizontal: "CENTER", vertical: "MIN" };
      } else {
        badge.x = SECONDARY_SIZE / 2 - badge.width / 2;
        badge.y = SIZE + 5;
        badge.constraints = { horizontal: "CENTER", vertical: "MAX" };
      }
      frame.appendChild(badge);
    }
    return frame;
  }
  function createPointerAssetResizable(value, color, direction) {
    const frame = figma.createFrame();
    frame.name = `Pointer - ${direction} - ${value}`;
    frame.fills = [];
    frame.clipsContent = false;
    const DOT_SIZE = 8;
    const LINE_LENGTH = 30;
    const isVertical = direction === "top" || direction === "bottom";
    if (isVertical) {
      frame.resize(60, LINE_LENGTH + DOT_SIZE + 16);
      const dot = figma.createEllipse();
      dot.name = "Dot";
      dot.resize(DOT_SIZE, DOT_SIZE);
      dot.fills = [{ type: "SOLID", color }];
      const line = figma.createRectangle();
      line.name = "Line";
      line.resize(1, LINE_LENGTH);
      line.fills = [{ type: "SOLID", color }];
      const label = figma.createText();
      label.name = "Label";
      label.fontName = getFont("Regular");
      label.fontSize = 11;
      label.characters = value;
      label.fills = [{ type: "SOLID", color }];
      if (direction === "top") {
        dot.x = frame.width / 2 - DOT_SIZE / 2;
        dot.y = 0;
        dot.constraints = { horizontal: "CENTER", vertical: "MIN" };
        line.x = frame.width / 2 - 0.5;
        line.y = DOT_SIZE / 2;
        line.constraints = { horizontal: "CENTER", vertical: "STRETCH" };
        label.x = frame.width / 2 - label.width / 2;
        label.y = DOT_SIZE / 2 + LINE_LENGTH + 2;
        label.constraints = { horizontal: "CENTER", vertical: "MAX" };
      } else {
        label.x = frame.width / 2 - label.width / 2;
        label.y = 0;
        label.constraints = { horizontal: "CENTER", vertical: "MIN" };
        dot.x = frame.width / 2 - DOT_SIZE / 2;
        dot.y = frame.height - DOT_SIZE;
        dot.constraints = { horizontal: "CENTER", vertical: "MAX" };
        line.x = frame.width / 2 - 0.5;
        line.y = label.height + 2;
        line.resize(1, frame.height - label.height - 2 - DOT_SIZE / 2);
        line.constraints = { horizontal: "CENTER", vertical: "STRETCH" };
      }
      frame.appendChild(dot);
      frame.appendChild(line);
      frame.appendChild(label);
    } else {
      frame.resize(LINE_LENGTH + DOT_SIZE + 50, 30);
      const dot = figma.createEllipse();
      dot.name = "Dot";
      dot.resize(DOT_SIZE, DOT_SIZE);
      dot.fills = [{ type: "SOLID", color }];
      const line = figma.createRectangle();
      line.name = "Line";
      line.resize(LINE_LENGTH, 1);
      line.fills = [{ type: "SOLID", color }];
      const label = figma.createText();
      label.name = "Label";
      label.fontName = getFont("Regular");
      label.fontSize = 11;
      label.characters = value;
      label.fills = [{ type: "SOLID", color }];
      if (direction === "left") {
        dot.x = 0;
        dot.y = frame.height / 2 - DOT_SIZE / 2;
        dot.constraints = { horizontal: "MIN", vertical: "CENTER" };
        line.x = DOT_SIZE / 2;
        line.y = frame.height / 2 - 0.5;
        line.constraints = { horizontal: "STRETCH", vertical: "CENTER" };
        label.x = DOT_SIZE / 2 + LINE_LENGTH + 4;
        label.y = frame.height / 2 - label.height / 2;
        label.constraints = { horizontal: "MAX", vertical: "CENTER" };
      } else {
        label.x = 0;
        label.y = frame.height / 2 - label.height / 2;
        label.constraints = { horizontal: "MIN", vertical: "CENTER" };
        dot.x = frame.width - DOT_SIZE;
        dot.y = frame.height / 2 - DOT_SIZE / 2;
        dot.constraints = { horizontal: "MAX", vertical: "CENTER" };
        line.x = label.width + 4;
        line.y = frame.height / 2 - 0.5;
        line.resize(frame.width - label.width - 4 - DOT_SIZE / 2, 1);
        line.constraints = { horizontal: "STRETCH", vertical: "CENTER" };
      }
      frame.appendChild(dot);
      frame.appendChild(line);
      frame.appendChild(label);
    }
    return frame;
  }
  async function insertAssetIntoFigma(assetType, value, colorType, direction = "horizontal", badgePosition = "bottom", highlightMode = false) {
    await loadPluginFonts();
    const normalColors = {
      red: { r: 1, g: 0.2, b: 0.2 },
      // Red (measure/gap)
      blue: { r: 0, g: 0.5, b: 1 },
      // Blue (padding)
      pink: { r: 236 / 255, g: 72 / 255, b: 153 / 255 },
      // Pink
      green: { r: 0.2, g: 0.6, b: 0.2 }
      // Dark green (text)
    };
    const highlightColors = {
      red: { r: 255 / 255, g: 199 / 255, b: 203 / 255 },
      // #FFC7CB (light pink)
      blue: { r: 98 / 255, g: 248 / 255, b: 79 / 255 },
      // #62F84F (bright green)
      pink: { r: 255 / 255, g: 199 / 255, b: 203 / 255 },
      // #FFC7CB (light pink)
      green: { r: 98 / 255, g: 248 / 255, b: 79 / 255 }
      // #62F84F (bright green)
    };
    const colors = highlightMode ? highlightColors : normalColors;
    const color = colors[colorType] || colors.red;
    let assetFrame;
    switch (assetType) {
      case "measure":
        assetFrame = createMeasureAssetResizable(
          value,
          color,
          direction,
          badgePosition
        );
        break;
      case "gap":
        assetFrame = createGapAssetResizable(
          value,
          colors.pink,
          direction,
          badgePosition
        );
        break;
      case "padding":
        assetFrame = createGapAssetResizable(
          value,
          colors.blue,
          direction,
          badgePosition
        );
        assetFrame.name = `Padding - ${value}`;
        break;
      case "pointer-top":
        assetFrame = createPointerAssetResizable(value, color, "top");
        break;
      case "pointer-bottom":
        assetFrame = createPointerAssetResizable(value, color, "bottom");
        break;
      case "pointer-left":
        assetFrame = createPointerAssetResizable(value, color, "left");
        break;
      case "pointer-right":
        assetFrame = createPointerAssetResizable(value, color, "right");
        break;
      default:
        assetFrame = createMeasureAssetResizable(
          value,
          color,
          direction,
          badgePosition
        );
    }
    const viewport = figma.viewport.center;
    assetFrame.x = viewport.x - assetFrame.width / 2;
    assetFrame.y = viewport.y - assetFrame.height / 2;
    figma.currentPage.selection = [assetFrame];
    figma.viewport.scrollAndZoomIntoView([assetFrame]);
    figma.notify(`Asset "${assetType}" inserted!`);
  }

  // src/main.ts
  async function main() {
    var _a, _b;
    figma.showUI(__html__, { width: 320, height: 640 });
    const selection = figma.currentPage.selection;
    const validNodes = selection.filter(
      (node) => node.type === "COMPONENT" || node.type === "COMPONENT_SET" || node.type === "INSTANCE"
    );
    if (validNodes.length === 0) {
      figma.ui.postMessage({
        type: "init",
        componentName: "Nenhum componente selecionado",
        variantProperties: [],
        selectionCount: 0
      });
      return;
    }
    const componentNames = [];
    const allVariantProperties = /* @__PURE__ */ new Map();
    for (const node of validNodes) {
      let nodeName = node.name;
      let nodeVariantProperties = [];
      if (node.type === "COMPONENT_SET") {
        nodeVariantProperties = extractVariantProperties(node);
        nodeName = node.name;
      } else if (node.type === "INSTANCE") {
        const mainComponent = await node.getMainComponentAsync();
        if (((_a = mainComponent == null ? void 0 : mainComponent.parent) == null ? void 0 : _a.type) === "COMPONENT_SET") {
          nodeVariantProperties = extractVariantProperties(mainComponent.parent);
          nodeName = mainComponent.parent.name;
        } else {
          nodeName = (mainComponent == null ? void 0 : mainComponent.name) || node.name;
        }
      } else if (node.type === "COMPONENT") {
        if (((_b = node.parent) == null ? void 0 : _b.type) === "COMPONENT_SET") {
          nodeVariantProperties = extractVariantProperties(
            node.parent
          );
          nodeName = node.parent.name;
        }
      }
      componentNames.push(nodeName);
      for (const prop of nodeVariantProperties) {
        if (!allVariantProperties.has(prop.name)) {
          allVariantProperties.set(prop.name, /* @__PURE__ */ new Set());
        }
        for (const value of prop.values) {
          allVariantProperties.get(prop.name).add(value);
        }
      }
    }
    const mergedVariantProperties = [];
    for (const [name, values] of allVariantProperties) {
      mergedVariantProperties.push({ name, values: Array.from(values) });
    }
    const displayName = validNodes.length === 1 ? componentNames[0] : `${validNodes.length} componentes selecionados`;
    figma.ui.postMessage({
      type: "init",
      componentName: displayName,
      variantProperties: mergedVariantProperties,
      hasVariants: mergedVariantProperties.length > 0,
      selectionCount: validNodes.length
    });
  }
  async function addSectionDivider(parent, width) {
    const divider = figma.createFrame();
    divider.name = "Divider";
    divider.resize(width, 1);
    divider.fills = [{ type: "SOLID", color: { r: 0.85, g: 0.85, b: 0.85 } }];
    parent.appendChild(divider);
  }
  async function generateSpec(options) {
    var _a, _b, _c, _d, _e, _f, _g, _h, _i, _j, _k, _l;
    figma.ui.hide();
    const loadingNotification = figma.notify("\u{1F504} Gerando especifica\xE7\xE3o...", {
      timeout: 5e4
    });
    await loadPluginFonts();
    const selection = figma.currentPage.selection;
    const validNodes = [];
    const componentNames = [];
    for (const node of selection) {
      if (node.type === "INSTANCE") {
        const mainComp = await node.getMainComponentAsync();
        componentNames.push((mainComp == null ? void 0 : mainComp.name) || node.name);
        validNodes.push(node);
      } else if (node.type === "COMPONENT" || node.type === "COMPONENT_SET") {
        componentNames.push(node.name);
        validNodes.push(node);
      }
    }
    if (validNodes.length === 0) {
      loadingNotification.cancel();
      figma.notify(
        "\u274C Selecione um Component, Component Set ou Instance para gerar especifica\xE7\xF5es"
      );
      figma.ui.show();
      return;
    }
    const allVariantColors = [];
    for (const nodeToProcess of validNodes) {
      const variantColors = await processComponent(nodeToProcess);
      allVariantColors.push(...variantColors);
    }
    if (allVariantColors.length === 0) {
      figma.notify("\u26A0\uFE0F Nenhum dado encontrado nos componentes selecionados");
      figma.closePlugin();
      return;
    }
    const specTitle = componentNames.length === 1 ? componentNames[0] : `${componentNames.length} Componentes`;
    const firstNode = validNodes[0];
    const frameWidth = options.frameWidth || 1140;
    const paddingH = options.paddingHorizontal || 84;
    const sectionGap = options.sectionSpacingValue || 40;
    const tableWidth = frameWidth - paddingH * 2;
    const specFrame = figma.createFrame();
    specFrame.name = `${specTitle} \u2014 Especifica\xE7\xE3o`;
    specFrame.x = firstNode.x + firstNode.width + 100;
    specFrame.y = firstNode.y;
    const bgHex = options.bgColor || "F4F5F7";
    const bgR = parseInt(bgHex.substring(0, 2), 16) / 255;
    const bgG = parseInt(bgHex.substring(2, 4), 16) / 255;
    const bgB = parseInt(bgHex.substring(4, 6), 16) / 255;
    specFrame.fills = [{ type: "SOLID", color: { r: bgR, g: bgG, b: bgB } }];
    specFrame.layoutMode = "VERTICAL";
    specFrame.primaryAxisSizingMode = "AUTO";
    specFrame.counterAxisSizingMode = "FIXED";
    specFrame.resize(frameWidth, 100);
    specFrame.itemSpacing = sectionGap;
    specFrame.paddingLeft = paddingH;
    specFrame.paddingRight = paddingH;
    specFrame.paddingTop = 60;
    specFrame.paddingBottom = 60;
    const titleText = figma.createText();
    titleText.fontName = getFont("Bold");
    titleText.fontSize = 48;
    titleText.characters = `${specTitle} \u2014 Especifica\xE7\xF5es`;
    titleText.textAutoResize = "WIDTH_AND_HEIGHT";
    specFrame.appendChild(titleText);
    if (componentNames.length > 1) {
      const subtitleText = figma.createText();
      subtitleText.fontName = getFont("Regular");
      subtitleText.fontSize = 14;
      subtitleText.characters = componentNames.join(", ");
      subtitleText.fills = [{ type: "SOLID", color: { r: 0.4, g: 0.4, b: 0.4 } }];
      subtitleText.textAutoResize = "WIDTH_AND_HEIGHT";
      specFrame.appendChild(subtitleText);
    }
    let lastSectionCreated = false;
    if (options.sectionColors) {
      const hasContent = allVariantColors.some((v) => v.colors.length > 0);
      if (hasContent) {
        if (lastSectionCreated) await addSectionDivider(specFrame, tableWidth);
        const created = await createColorSectionCombined(
          specFrame,
          allVariantColors,
          tableWidth
        );
        if (created) lastSectionCreated = true;
      }
    }
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
          compTitle.fills = [{ type: "SOLID", color: { r: 0.2, g: 0.2, b: 0.2 } }];
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
          (_a = options.textShowTable) != null ? _a : true,
          (_b = options.textShowViz) != null ? _b : true
        );
        if (created) sectionCreated = true;
      }
      if (sectionCreated) lastSectionCreated = true;
    }
    if (options.sectionSpacing) {
      let sectionCreated = false;
      let dividerAdded = false;
      for (let i = 0; i < validNodes.length; i++) {
        const nodeToProcess = validNodes[i];
        const nodeVariantColors = await processComponent(nodeToProcess);
        const hasContent = nodeVariantColors.some(
          (v) => v.spacings.length > 0 || v.borders.length > 0
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
          compTitle.fills = [{ type: "SOLID", color: { r: 0.2, g: 0.2, b: 0.2 } }];
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
          (_c = options.spacingShowTable) != null ? _c : true,
          (_d = options.spacingShowViz) != null ? _d : true
        );
        if (created) sectionCreated = true;
      }
      if (sectionCreated) lastSectionCreated = true;
    }
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
          compTitle.fills = [{ type: "SOLID", color: { r: 0.2, g: 0.2, b: 0.2 } }];
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
          (_e = options.effectsShowTable) != null ? _e : true,
          (_f = options.effectsShowViz) != null ? _f : true
        );
        if (created) sectionCreated = true;
      }
      if (sectionCreated) lastSectionCreated = true;
    }
    if (options.sectionComponents) {
      const componentMap = /* @__PURE__ */ new Map();
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
          tableWidth
        );
        if (created) lastSectionCreated = true;
      }
    }
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
            compTitle.fills = [{ type: "SOLID", color: { r: 0.2, g: 0.2, b: 0.2 } }];
            specFrame.appendChild(compTitle);
          }
          let componentSet = null;
          if (nodeToProcess.type === "COMPONENT_SET") {
            componentSet = nodeToProcess;
          } else if (nodeToProcess.type === "COMPONENT" && ((_g = nodeToProcess.parent) == null ? void 0 : _g.type) === "COMPONENT_SET") {
            componentSet = nodeToProcess.parent;
          } else if (nodeToProcess.type === "INSTANCE") {
            const mainComp = await nodeToProcess.getMainComponentAsync();
            if (((_h = mainComp == null ? void 0 : mainComp.parent) == null ? void 0 : _h.type) === "COMPONENT_SET") {
              componentSet = mainComp.parent;
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
              options.gridDensity || 3
            );
            if (created) sectionCreated = true;
          }
        }
        if (sectionCreated) lastSectionCreated = true;
      }
    }
    if (options.sectionProperties) {
      let hasAnyProperties = false;
      for (const node of validNodes) {
        let componentSet = null;
        if (node.type === "COMPONENT_SET") {
          componentSet = node;
        } else if (node.type === "COMPONENT" && ((_i = node.parent) == null ? void 0 : _i.type) === "COMPONENT_SET") {
          componentSet = node.parent;
        } else if (node.type === "INSTANCE") {
          const mainComp = await node.getMainComponentAsync();
          if (((_j = mainComp == null ? void 0 : mainComp.parent) == null ? void 0 : _j.type) === "COMPONENT_SET") {
            componentSet = mainComp.parent;
          }
        }
        if ((componentSet == null ? void 0 : componentSet.componentPropertyDefinitions) && Object.keys(componentSet.componentPropertyDefinitions).length > 0) {
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
            compTitle.fills = [{ type: "SOLID", color: { r: 0.2, g: 0.2, b: 0.2 } }];
            specFrame.appendChild(compTitle);
          }
          let componentSet = null;
          if (nodeToProcess.type === "COMPONENT_SET") {
            componentSet = nodeToProcess;
          } else if (nodeToProcess.type === "COMPONENT" && ((_k = nodeToProcess.parent) == null ? void 0 : _k.type) === "COMPONENT_SET") {
            componentSet = nodeToProcess.parent;
          } else if (nodeToProcess.type === "INSTANCE") {
            const mainComp = await nodeToProcess.getMainComponentAsync();
            if (((_l = mainComp == null ? void 0 : mainComp.parent) == null ? void 0 : _l.type) === "COMPONENT_SET") {
              componentSet = mainComp.parent;
            }
          }
          if (componentSet) {
            const created = await createPropertiesSection(
              specFrame,
              componentSet,
              tableWidth
            );
            if (created) sectionCreated = true;
          }
        }
        if (sectionCreated) lastSectionCreated = true;
      }
    }
    figma.currentPage.appendChild(specFrame);
    figma.viewport.scrollAndZoomIntoView([specFrame]);
    loadingNotification.cancel();
    const successMsg = validNodes.length === 1 ? "\u2705 Especifica\xE7\xE3o gerada com sucesso!" : `\u2705 Especifica\xE7\xE3o gerada para ${validNodes.length} componentes!`;
    figma.notify(successMsg);
    figma.closePlugin();
  }
  figma.ui.onmessage = async (msg) => {
    if (msg.type === "generate" && msg.options) {
      await generateSpec(msg.options);
    } else if (msg.type === "insert-asset" && msg.assetType) {
      await insertAssetIntoFigma(
        msg.assetType,
        msg.value || "0px",
        msg.color || "red",
        msg.direction || "horizontal",
        msg.badgePosition || "bottom",
        msg.highlightMode || false
      );
    } else if (msg.type === "cancel") {
      figma.closePlugin();
    }
  };
  main();
})();
