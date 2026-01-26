// ========================================================================
// AUTO HANDOFF GENERATOR - MARKER GENERATOR
// ========================================================================

import {loadPluginFonts, getFont} from "../utils/fonts";

// ========================================
// ASSET BADGE HELPER
// ========================================

/**
 * Creates a badge for assets.
 * @param value - Badge text value
 * @param color - Badge background color
 * @returns Created FrameNode badge
 */
function createAssetBadge(value: string, color: RGB): FrameNode {
  const badge = figma.createFrame();
  badge.name = "Badge";
  badge.fills = [{type: "SOLID", color}];
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
  badgeText.fills = [{type: "SOLID", color: {r: 1, g: 1, b: 1}}];
  badge.appendChild(badgeText);

  return badge;
}

// ========================================
// MEASURE ASSET
// ========================================

/**
 * Creates a resizable measure asset that resizes correctly when stretched.
 * @param value - Measurement value label
 * @param color - Asset color
 * @param direction - Horizontal or vertical
 * @param badgePosition - Position of the badge
 * @returns Created FrameNode asset
 */
export function createMeasureAssetResizable(
  value: string,
  color: RGB,
  direction: "horizontal" | "vertical",
  badgePosition: "top" | "bottom" | "left" | "right",
): FrameNode {
  const frame = figma.createFrame();
  frame.name = `Measure - ${value}`;
  frame.fills = [];
  frame.clipsContent = false;

  const SIZE = 100;
  const MARKER_SIZE = 12;

  if (direction === "horizontal") {
    frame.resize(SIZE, 45);

    // Badge first to calculate height
    const badge = createAssetBadge(value, color);
    const badgeHeight = badge.height;

    // Horizontal main line with markers
    const lineFrame = figma.createFrame();
    lineFrame.name = "Line Frame";
    lineFrame.fills = [];
    lineFrame.resize(SIZE, MARKER_SIZE);

    // Position line based on badge position
    if (badgePosition === "top") {
      lineFrame.y = badgeHeight + 5;
    } else if (badgePosition === "bottom") {
      lineFrame.y = 5;
    } else {
      lineFrame.y = (frame.height - MARKER_SIZE) / 2;
    }
    lineFrame.constraints = {horizontal: "STRETCH", vertical: "CENTER"};

    // Left marker
    const leftMarker = figma.createRectangle();
    leftMarker.name = "Left Marker";
    leftMarker.resize(2, MARKER_SIZE);
    leftMarker.fills = [{type: "SOLID", color}];
    leftMarker.x = 0;
    leftMarker.y = 0;
    leftMarker.constraints = {horizontal: "MIN", vertical: "STRETCH"};
    lineFrame.appendChild(leftMarker);

    // Right marker
    const rightMarker = figma.createRectangle();
    rightMarker.name = "Right Marker";
    rightMarker.resize(2, MARKER_SIZE);
    rightMarker.fills = [{type: "SOLID", color}];
    rightMarker.x = SIZE - 2;
    rightMarker.y = 0;
    rightMarker.constraints = {horizontal: "MAX", vertical: "STRETCH"};
    lineFrame.appendChild(rightMarker);

    // Horizontal line
    const line = figma.createRectangle();
    line.name = "Line";
    line.resize(SIZE, 2);
    line.fills = [{type: "SOLID", color}];
    line.x = 0;
    line.y = MARKER_SIZE / 2 - 1;
    line.constraints = {horizontal: "STRETCH", vertical: "CENTER"};
    lineFrame.appendChild(line);

    frame.appendChild(lineFrame);

    // Position badge
    if (badgePosition === "top") {
      badge.x = SIZE / 2 - badge.width / 2;
      badge.y = 0;
      badge.constraints = {horizontal: "CENTER", vertical: "MIN"};
    } else if (badgePosition === "bottom") {
      badge.x = SIZE / 2 - badge.width / 2;
      badge.y = lineFrame.y + MARKER_SIZE + 5;
      badge.constraints = {horizontal: "CENTER", vertical: "MAX"};
    } else if (badgePosition === "left") {
      badge.x = -badge.width - 5;
      badge.y = frame.height / 2 - badge.height / 2;
      badge.constraints = {horizontal: "MIN", vertical: "CENTER"};
    } else {
      badge.x = SIZE + 5;
      badge.y = frame.height / 2 - badge.height / 2;
      badge.constraints = {horizontal: "MAX", vertical: "CENTER"};
    }
    frame.appendChild(badge);
  } else {
    // Vertical
    frame.resize(60, SIZE);

    // Badge first to calculate width
    const badge = createAssetBadge(value, color);
    const badgeWidth = badge.width;

    const lineFrame = figma.createFrame();
    lineFrame.name = "Line Frame";
    lineFrame.fills = [];
    lineFrame.resize(MARKER_SIZE, SIZE);

    // Position line based on badge position
    if (badgePosition === "left") {
      lineFrame.x = badgeWidth + 5;
    } else if (badgePosition === "right") {
      lineFrame.x = 5;
    } else {
      lineFrame.x = (frame.width - MARKER_SIZE) / 2;
    }
    lineFrame.constraints = {horizontal: "CENTER", vertical: "STRETCH"};

    // Top marker
    const topMarker = figma.createRectangle();
    topMarker.name = "Top Marker";
    topMarker.resize(MARKER_SIZE, 2);
    topMarker.fills = [{type: "SOLID", color}];
    topMarker.x = 0;
    topMarker.y = 0;
    topMarker.constraints = {horizontal: "STRETCH", vertical: "MIN"};
    lineFrame.appendChild(topMarker);

    // Bottom marker
    const bottomMarker = figma.createRectangle();
    bottomMarker.name = "Bottom Marker";
    bottomMarker.resize(MARKER_SIZE, 2);
    bottomMarker.fills = [{type: "SOLID", color}];
    bottomMarker.x = 0;
    bottomMarker.y = SIZE - 2;
    bottomMarker.constraints = {horizontal: "STRETCH", vertical: "MAX"};
    lineFrame.appendChild(bottomMarker);

    // Vertical line
    const line = figma.createRectangle();
    line.name = "Line";
    line.resize(2, SIZE);
    line.fills = [{type: "SOLID", color}];
    line.x = MARKER_SIZE / 2 - 1;
    line.y = 0;
    line.constraints = {horizontal: "CENTER", vertical: "STRETCH"};
    lineFrame.appendChild(line);

    frame.appendChild(lineFrame);

    // Position badge
    if (badgePosition === "left") {
      badge.x = 0;
      badge.y = SIZE / 2 - badge.height / 2;
      badge.constraints = {horizontal: "MIN", vertical: "CENTER"};
    } else if (badgePosition === "right") {
      badge.x = lineFrame.x + MARKER_SIZE + 5;
      badge.y = SIZE / 2 - badge.height / 2;
      badge.constraints = {horizontal: "MAX", vertical: "CENTER"};
    } else if (badgePosition === "top") {
      badge.x = frame.width / 2 - badge.width / 2;
      badge.y = -badge.height - 5;
      badge.constraints = {horizontal: "CENTER", vertical: "MIN"};
    } else {
      badge.x = frame.width / 2 - badge.width / 2;
      badge.y = SIZE + 5;
      badge.constraints = {horizontal: "CENTER", vertical: "MAX"};
    }
    frame.appendChild(badge);
  }

  return frame;
}

// ========================================
// GAP/PADDING ASSET
// ========================================

/**
 * Creates a resizable gap/padding asset that resizes correctly when stretched.
 * @param value - Gap/padding value label
 * @param color - Asset color
 * @param direction - Horizontal or vertical
 * @param badgePosition - Position of the badge
 * @returns Created FrameNode asset
 */
export function createGapAssetResizable(
  value: string,
  color: RGB,
  direction: "horizontal" | "vertical",
  badgePosition: "top" | "bottom" | "left" | "right",
): FrameNode {
  const frame = figma.createFrame();
  frame.name = `Gap - ${value}`;
  frame.fills = [];
  frame.clipsContent = false;

  const SIZE = 80;
  const SECONDARY_SIZE = 40;

  if (direction === "horizontal") {
    frame.resize(SIZE, SECONDARY_SIZE + 30);

    // Gap area - dashed rectangle
    const gapArea = figma.createRectangle();
    gapArea.name = "Gap Area";
    gapArea.resize(SIZE, SECONDARY_SIZE);
    gapArea.fills = [{type: "SOLID", color, opacity: 0.15}];
    gapArea.strokes = [{type: "SOLID", color, opacity: 0.6}];
    gapArea.strokeWeight = 1;
    gapArea.dashPattern = [4, 4];
    gapArea.y = badgePosition === "top" ? 25 : 0;
    gapArea.constraints = {horizontal: "STRETCH", vertical: "STRETCH"};
    frame.appendChild(gapArea);

    // Badge
    const badge = createAssetBadge(value, color);
    if (badgePosition === "top") {
      badge.x = SIZE / 2 - badge.width / 2;
      badge.y = 0;
      badge.constraints = {horizontal: "CENTER", vertical: "MIN"};
    } else if (badgePosition === "bottom") {
      badge.x = SIZE / 2 - badge.width / 2;
      badge.y = SECONDARY_SIZE + 5;
      badge.constraints = {horizontal: "CENTER", vertical: "MAX"};
    } else if (badgePosition === "left") {
      badge.x = -badge.width - 5;
      badge.y = SECONDARY_SIZE / 2 - badge.height / 2;
      badge.constraints = {horizontal: "MIN", vertical: "CENTER"};
    } else {
      badge.x = SIZE + 5;
      badge.y = SECONDARY_SIZE / 2 - badge.height / 2;
      badge.constraints = {horizontal: "MAX", vertical: "CENTER"};
    }
    frame.appendChild(badge);
  } else {
    // Vertical
    frame.resize(SECONDARY_SIZE + 50, SIZE);

    const gapArea = figma.createRectangle();
    gapArea.name = "Gap Area";
    gapArea.resize(SECONDARY_SIZE, SIZE);
    gapArea.fills = [{type: "SOLID", color, opacity: 0.15}];
    gapArea.strokes = [{type: "SOLID", color, opacity: 0.6}];
    gapArea.strokeWeight = 1;
    gapArea.dashPattern = [4, 4];
    gapArea.x = badgePosition === "left" ? 45 : 0;
    gapArea.constraints = {horizontal: "STRETCH", vertical: "STRETCH"};
    frame.appendChild(gapArea);

    // Badge
    const badge = createAssetBadge(value, color);
    if (badgePosition === "left") {
      badge.x = 0;
      badge.y = SIZE / 2 - badge.height / 2;
      badge.constraints = {horizontal: "MIN", vertical: "CENTER"};
    } else if (badgePosition === "right") {
      badge.x = SECONDARY_SIZE + 5;
      badge.y = SIZE / 2 - badge.height / 2;
      badge.constraints = {horizontal: "MAX", vertical: "CENTER"};
    } else if (badgePosition === "top") {
      badge.x = SECONDARY_SIZE / 2 - badge.width / 2;
      badge.y = -badge.height - 5;
      badge.constraints = {horizontal: "CENTER", vertical: "MIN"};
    } else {
      badge.x = SECONDARY_SIZE / 2 - badge.width / 2;
      badge.y = SIZE + 5;
      badge.constraints = {horizontal: "CENTER", vertical: "MAX"};
    }
    frame.appendChild(badge);
  }

  return frame;
}

// ========================================
// POINTER ASSET
// ========================================

/**
 * Creates a resizable pointer asset with a stem that resizes correctly.
 * @param value - Pointer value label
 * @param color - Asset color
 * @param direction - Direction (top, bottom, left, right)
 * @returns Created FrameNode asset
 */
export function createPointerAssetResizable(
  value: string,
  color: RGB,
  direction: "top" | "bottom" | "left" | "right",
): FrameNode {
  const frame = figma.createFrame();
  frame.name = `Pointer - ${direction} - ${value}`;
  frame.fills = [];
  frame.clipsContent = false;

  const DOT_SIZE = 8;
  const LINE_LENGTH = 30;

  const isVertical = direction === "top" || direction === "bottom";

  if (isVertical) {
    frame.resize(60, LINE_LENGTH + DOT_SIZE + 16);

    // Dot
    const dot = figma.createEllipse();
    dot.name = "Dot";
    dot.resize(DOT_SIZE, DOT_SIZE);
    dot.fills = [{type: "SOLID", color}];

    // Line (stem) - connected directly to dot without gap
    const line = figma.createRectangle();
    line.name = "Line";
    line.resize(1, LINE_LENGTH);
    line.fills = [{type: "SOLID", color}];

    // Label
    const label = figma.createText();
    label.name = "Label";
    label.fontName = getFont("Regular");
    label.fontSize = 11;
    label.characters = value;
    label.fills = [{type: "SOLID", color}];

    if (direction === "top") {
      // Dot on top, line connected, label at bottom
      dot.x = frame.width / 2 - DOT_SIZE / 2;
      dot.y = 0;
      dot.constraints = {horizontal: "CENTER", vertical: "MIN"};

      // Line starts at dot center (no gap)
      line.x = frame.width / 2 - 0.5;
      line.y = DOT_SIZE / 2;
      line.constraints = {horizontal: "CENTER", vertical: "STRETCH"};

      label.x = frame.width / 2 - label.width / 2;
      label.y = DOT_SIZE / 2 + LINE_LENGTH + 2;
      label.constraints = {horizontal: "CENTER", vertical: "MAX"};
    } else {
      // Label on top, line, dot at bottom (bottom)
      label.x = frame.width / 2 - label.width / 2;
      label.y = 0;
      label.constraints = {horizontal: "CENTER", vertical: "MIN"};

      // Dot positioned at bottom
      dot.x = frame.width / 2 - DOT_SIZE / 2;
      dot.y = frame.height - DOT_SIZE;
      dot.constraints = {horizontal: "CENTER", vertical: "MAX"};

      // Line connects label to dot center (no gap)
      line.x = frame.width / 2 - 0.5;
      line.y = label.height + 2;
      line.resize(1, frame.height - label.height - 2 - DOT_SIZE / 2);
      line.constraints = {horizontal: "CENTER", vertical: "STRETCH"};
    }

    frame.appendChild(dot);
    frame.appendChild(line);
    frame.appendChild(label);
  } else {
    // Horizontal
    frame.resize(LINE_LENGTH + DOT_SIZE + 50, 30);

    // Dot
    const dot = figma.createEllipse();
    dot.name = "Dot";
    dot.resize(DOT_SIZE, DOT_SIZE);
    dot.fills = [{type: "SOLID", color}];

    // Line (stem) - connected directly to dot without gap
    const line = figma.createRectangle();
    line.name = "Line";
    line.resize(LINE_LENGTH, 1);
    line.fills = [{type: "SOLID", color}];

    // Label
    const label = figma.createText();
    label.name = "Label";
    label.fontName = getFont("Regular");
    label.fontSize = 11;
    label.characters = value;
    label.fills = [{type: "SOLID", color}];

    if (direction === "left") {
      // Dot on left, line connected, label on right
      dot.x = 0;
      dot.y = frame.height / 2 - DOT_SIZE / 2;
      dot.constraints = {horizontal: "MIN", vertical: "CENTER"};

      // Line starts at dot center (no gap)
      line.x = DOT_SIZE / 2;
      line.y = frame.height / 2 - 0.5;
      line.constraints = {horizontal: "STRETCH", vertical: "CENTER"};

      label.x = DOT_SIZE / 2 + LINE_LENGTH + 4;
      label.y = frame.height / 2 - label.height / 2;
      label.constraints = {horizontal: "MAX", vertical: "CENTER"};
    } else {
      // Label on left, line connected, dot on right (right)
      label.x = 0;
      label.y = frame.height / 2 - label.height / 2;
      label.constraints = {horizontal: "MIN", vertical: "CENTER"};

      // Dot positioned on right
      dot.x = frame.width - DOT_SIZE;
      dot.y = frame.height / 2 - DOT_SIZE / 2;
      dot.constraints = {horizontal: "MAX", vertical: "CENTER"};

      // Line connects label to dot center (no gap)
      line.x = label.width + 4;
      line.y = frame.height / 2 - 0.5;
      line.resize(frame.width - label.width - 4 - DOT_SIZE / 2, 1);
      line.constraints = {horizontal: "STRETCH", vertical: "CENTER"};
    }

    frame.appendChild(dot);
    frame.appendChild(line);
    frame.appendChild(label);
  }

  return frame;
}

// ========================================
// MAIN INSERT FUNCTION
// ========================================

/**
 * Inserts an asset into Figma at viewport center.
 * @param assetType - Type of asset (measure, gap, padding, pointer-*)
 * @param value - Value label
 * @param colorType - Color type (red, blue, pink, green)
 * @param direction - Horizontal or vertical direction
 * @param badgePosition - Badge position
 * @param highlightMode - Whether to use highlight colors
 */
export async function insertAssetIntoFigma(
  assetType: string,
  value: string,
  colorType: string,
  direction: "horizontal" | "vertical" = "horizontal",
  badgePosition: "top" | "bottom" | "left" | "right" = "bottom",
  highlightMode: boolean = false,
): Promise<void> {
  await loadPluginFonts();

  // Define colors based on type (normal mode)
  const normalColors: Record<string, RGB> = {
    red: {r: 1, g: 0.2, b: 0.2}, // Red (measure/gap)
    blue: {r: 0, g: 0.5, b: 1}, // Blue (padding)
    pink: {r: 236 / 255, g: 72 / 255, b: 153 / 255}, // Pink
    green: {r: 0.2, g: 0.6, b: 0.2}, // Dark green (text)
  };

  // Colors for highlight mode
  const highlightColors: Record<string, RGB> = {
    red: {r: 255 / 255, g: 199 / 255, b: 203 / 255}, // #FFC7CB (light pink)
    blue: {r: 98 / 255, g: 248 / 255, b: 79 / 255}, // #62F84F (bright green)
    pink: {r: 255 / 255, g: 199 / 255, b: 203 / 255}, // #FFC7CB (light pink)
    green: {r: 98 / 255, g: 248 / 255, b: 79 / 255}, // #62F84F (bright green)
  };

  const colors = highlightMode ? highlightColors : normalColors;
  const color = colors[colorType] || colors.red;

  let assetFrame: FrameNode;

  switch (assetType) {
    case "measure":
      assetFrame = createMeasureAssetResizable(
        value,
        color,
        direction,
        badgePosition,
      );
      break;
    case "gap":
      assetFrame = createGapAssetResizable(
        value,
        colors.pink,
        direction,
        badgePosition,
      );
      break;
    case "padding":
      assetFrame = createGapAssetResizable(
        value,
        colors.blue,
        direction,
        badgePosition,
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
        badgePosition,
      );
  }

  // Position at viewport center
  const viewport = figma.viewport.center;
  assetFrame.x = viewport.x - assetFrame.width / 2;
  assetFrame.y = viewport.y - assetFrame.height / 2;

  // Select the created asset
  figma.currentPage.selection = [assetFrame];
  figma.viewport.scrollAndZoomIntoView([assetFrame]);

  figma.notify(`Asset "${assetType}" inserted!`);
}
