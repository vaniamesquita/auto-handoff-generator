// ========================================================================
// AUTO HANDOFF GENERATOR - UTILITY HELPERS
// ========================================================================

import {IGNORED_PROPERTIES} from "../config/theme";

// ========================================
// STRING FORMATTING
// ========================================

/**
 * Formats a color variable name into a token string.
 * @param variableName - The variable name to format
 * @returns Formatted color token string
 */
export function formatToken(variableName: string): string {
  return `$color-${variableName.toLowerCase().replace(/\//g, "-").replace(/\s+/g, "-")}`;
}

/**
 * Formats a spacing/size variable name into a token string.
 * @param variableName - The variable name to format
 * @returns Formatted space token string
 */
export function formatSpaceToken(variableName: string): string {
  return `$${variableName
    .toLowerCase()
    .replace(/^(spacing|space|size)[-/]/g, "")
    .replace(/\//g, "-")
    .replace(/\s+/g, "-")}`;
}

/**
 * Pads a string to a specified length with a character.
 * @param str - The string to pad
 * @param length - Target length
 * @param char - Character to use for padding
 * @returns Padded string
 */
export function pad(str: string, length: number, char: string): string {
  while (str.length < length) str = char + str;
  return str;
}

// ========================================
// COLOR CONVERSION
// ========================================

/**
 * Converts an RGB color object to a hex string.
 * @param color - RGB color object with values 0-1
 * @returns Hex color string (e.g., "#FF0000")
 */
export function rgbToHex(color: RGB): string {
  const r = Math.round(color.r * 255);
  const g = Math.round(color.g * 255);
  const b = Math.round(color.b * 255);
  return `#${pad(r.toString(16), 2, "0")}${pad(g.toString(16), 2, "0")}${pad(b.toString(16), 2, "0")}`.toUpperCase();
}

/**
 * Converts a hex color string to an RGB object.
 * @param hex - Hex color string (e.g., "#FF0000" or "FF0000")
 * @returns RGB color object with values 0-1
 */
export function hexToRgb(hex: string): RGB {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16) / 255,
        g: parseInt(result[2], 16) / 255,
        b: parseInt(result[3], 16) / 255,
      }
    : {r: 0, g: 0, b: 0};
}

// ========================================
// VARIANT PROPERTY EXTRACTION
// ========================================

/**
 * Checks if a name looks like variant properties (e.g., "Size=Small, Status=Default").
 * @param name - The name to check
 * @returns True if the name contains variant property syntax
 */
export function isVariantPropertiesName(name: string): boolean {
  return /[A-Z][a-z]+=[A-Z]/.test(name) && name.includes("=");
}

/**
 * Extracts relevant properties from a variant name, filtering out ignored ones.
 * @param variantName - The full variant name (e.g., "Status=Default, Size=Large")
 * @returns Object with property key-value pairs
 */
export function extractRelevantProperties(
  variantName: string,
): Record<string, string> {
  const parts = variantName.split(",").map((p) => p.trim());
  const props: Record<string, string> = {};
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

/**
 * Extracts the main state (typically "state", "status", etc.) from a variant name.
 * If multiple relevant properties exist (state, style, type), combines them.
 * @param variantName - The full variant name
 * @returns The main state string (e.g., "Default" or "Default, Style=Neutral")
 */
export function extractMainState(variantName: string): string {
  const props = extractRelevantProperties(variantName);

  // Priority properties that should be included in state
  const stateProperties = ["state", "status", "style", "type","kind"];
  const foundStates: string[] = [];

  for (const key of stateProperties) {
    if (props[key]) {
      // For the main state property, just use the value
      // For additional properties, include the key (e.g., "Style=Neutral")
      if (foundStates.length === 0) {
        foundStates.push(props[key]);
      } else {
        foundStates.push(`${key.charAt(0).toUpperCase() + key.slice(1)}=${props[key]}`);
      }
    }
  }

  return foundStates.length > 0 ? foundStates.join(", ") : "Default";
}

/**
 * Formats variant properties for display (e.g., "Default / Large").
 * @param variantName - The full variant name
 * @returns Formatted display string
 */
export function formatPropertiesForDisplay(variantName: string): string {
  const props = extractRelevantProperties(variantName);
  return Object.values(props).join(" / ") || "Default";
}

/**
 * Extracts ALL properties from a variant name (including size).
 * @param variantName - The full variant name
 * @returns Object with all property key-value pairs
 */
export function extractAllProperties(
  variantName: string,
): Record<string, string> {
  const props: Record<string, string> = {};
  const parts = variantName.split(",").map((p) => p.trim());
  for (const part of parts) {
    const [key, value] = part.split("=").map((s) => s.trim());
    if (key && value) {
      props[key.toLowerCase()] = value;
    }
  }
  return props;
}

/**
 * Resolves the spacing element name based on node name or parent hierarchy.
 * @param node - The node to analyze
 * @returns The resolved element name
 */
export function resolveSpacingElement(node: SceneNode): string {
  const name = node.name.toLowerCase();

  // First check: If the name looks like variant properties or generic names, use "Container"
  if (
    isVariantPropertiesName(node.name) ||
    name === "untitled" ||
    name.startsWith("frame")
  ) {
    return "Container";
  }

  const keywords = ["label", "hint", "helper", "input", "field", "container"];
  for (const keyword of keywords) {
    if (name.includes(keyword)) {
      return keyword.charAt(0).toUpperCase() + keyword.slice(1);
    }
  }
  if (node.parent && "name" in node.parent) {
    return resolveSpacingElement(node.parent as SceneNode);
  }

  return node.name;
}

// ========================================
// EFFECT HELPERS
// ========================================

/**
 * Formats an effect variable name into a token string.
 * @param variableName - The variable name to format
 * @returns Formatted effect token string
 */
export function formatEffectToken(variableName: string): string {
  return `$effect-${variableName.toLowerCase().replace(/\//g, "-").replace(/\s+/g, "-")}`;
}

/**
 * Formats an effect value for display.
 * @param effect - The effect to format
 * @returns Formatted effect value string
 */
export function formatEffectValue(effect: Effect): string {
  if (effect.type === "DROP_SHADOW" || effect.type === "INNER_SHADOW") {
    const shadow = effect as DropShadowEffect;
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
    const blur = effect as BlurEffect;
    return `blur(${Math.round(blur.radius)}px)`;
  } else if (effect.type === "BACKGROUND_BLUR") {
    const blur = effect as BlurEffect;
    return `backdrop-blur(${Math.round(blur.radius)}px)`;
  }
  return "Unknown effect";
}

/**
 * Gets a human-readable label for an effect type.
 * @param effectType - The effect type string
 * @returns Human-readable effect type label
 */
export function getEffectTypeLabel(effectType: string): string {
  const labels: Record<string, string> = {
    DROP_SHADOW: "Drop Shadow",
    INNER_SHADOW: "Inner Shadow",
    LAYER_BLUR: "Layer Blur",
    BACKGROUND_BLUR: "Background Blur",
  };
  return labels[effectType] || effectType;
}
