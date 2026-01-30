// ========================================================================
// AUTO HANDOFF GENERATOR - ANNOTATIONS
// ========================================================================

import type {AnnotationTracker} from "../types";
import {getTheme} from "../config/theme";
import {getFont} from "../utils/fonts";

// ========================================
// POSITION FINDING HELPERS
// ========================================

/**
 * Finds a free Y position for lateral annotations (right/left).
 * @param existingPositions - Already used Y positions
 * @param preferredY - Preferred Y position
 * @param minSpacing - Minimum spacing between positions
 * @returns Free Y position
 */
export function findFreeYPosition(
  existingPositions: number[],
  preferredY: number,
  minSpacing: number = 20,
): number {
  if (existingPositions.length === 0) return preferredY;

  // Sort existing positions
  const sorted = [...existingPositions].sort((a, b) => a - b);

  // Check if preferred position is free
  let collision = sorted.some((pos) => Math.abs(pos - preferredY) < minSpacing);
  if (!collision) return preferredY;

  // Find the closest free position (alternating above/below)
  let offset = minSpacing;
  for (let i = 0; i < 10; i++) {
    // Try below
    const belowY = preferredY + offset;
    collision = sorted.some((pos) => Math.abs(pos - belowY) < minSpacing);
    if (!collision) return belowY;

    // Try above
    const aboveY = preferredY - offset;
    collision = sorted.some((pos) => Math.abs(pos - aboveY) < minSpacing);
    if (!collision) return aboveY;

    offset += minSpacing;
  }
  return preferredY + offset; // Fallback
}

/**
 * Finds a free X position for top/bottom annotations.
 * @param existingPositions - Already used X positions
 * @param preferredX - Preferred X position
 * @param minSpacing - Minimum spacing between positions
 * @returns Free X position
 */
export function findFreeXPosition(
  existingPositions: number[],
  preferredX: number,
  minSpacing: number = 80,
): number {
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

/**
 * Creates a new empty annotation tracker.
 */
export function createAnnotationTracker(): AnnotationTracker {
  return {
    topPositions: [],
    bottomPositions: [],
    leftPositions: [],
    rightPositions: [],
    gapPositions: [],
  };
}

// ========================================
// SIMPLE ANNOTATION (BASE)
// ========================================

/**
 * Creates a grouped annotation: dot + line + label.
 * @param container - Parent frame
 * @param startX - Start X position
 * @param startY - Start Y position
 * @param endX - End X position
 * @param endY - End Y position
 * @param label - Annotation label text
 * @param color - Annotation color
 */
export async function createSimpleAnnotation(
  container: FrameNode,
  startX: number,
  startY: number,
  endX: number,
  endY: number,
  label: string,
  color: RGB,
  markerType?: "gap" | "padding" | "pointer-top" | "pointer-bottom" | "pointer-left" | "pointer-right",
  colorType?: "red" | "blue" | "pink" | "green",
  highlightMode?: boolean,
): Promise<void> {
  const DOT_SIZE = 8;
  const PADDING = 2;

  const deltaX = endX - startX;
  const deltaY = endY - startY;
  const isVertical = Math.abs(deltaY) >= Math.abs(deltaX);

  // Create resizable frame for the annotation
  const group = figma.createFrame();
  group.name = label;
  group.fills = [];
  group.clipsContent = false;

  // Create the dot (origin point)
  const dot = figma.createEllipse();
  dot.name = "Dot";
  dot.resize(DOT_SIZE, DOT_SIZE);
  dot.fills = [{type: "SOLID", color}];

  // Create connection line using rectangle (easier to apply constraints)
  const line = figma.createRectangle();
  line.name = "Line";
  line.fills = [{type: "SOLID", color}];

  // Create label text
  const text = figma.createText();
  text.name = "Label";
  text.fontName = getFont("Regular");
  text.fontSize = 10;
  text.characters = label;
  text.fills = [{type: "SOLID", color}];

  if (isVertical) {
    // Vertical annotation (up or down)
    const lineLength = Math.abs(deltaY);
    const goingDown = deltaY > 0;
    const frameWidth = Math.max(text.width, DOT_SIZE) + PADDING * 2;
    // Simplified frame: dot + line + text (no extra padding causing gaps)
    const frameHeight = DOT_SIZE + lineLength + text.height;

    group.resize(frameWidth, frameHeight);
    group.x = startX - frameWidth / 2;
    group.y = goingDown ? startY - DOT_SIZE / 2 : endY - text.height;

    if (goingDown) {
      // Dot on top, line, label at bottom
      dot.x = frameWidth / 2 - DOT_SIZE / 2;
      dot.y = 0;
      dot.constraints = {horizontal: "CENTER", vertical: "MIN"};

      // Line connects directly from dot center to text
      line.resize(1, lineLength);
      line.x = frameWidth / 2 - 0.5;
      line.y = DOT_SIZE / 2;
      line.constraints = {horizontal: "CENTER", vertical: "STRETCH"};

      text.x = frameWidth / 2 - text.width / 2;
      text.y = frameHeight - text.height;
      text.constraints = {horizontal: "CENTER", vertical: "MAX"};
    } else {
      // Label on top, line, dot at bottom
      text.x = frameWidth / 2 - text.width / 2;
      text.y = 0;
      text.constraints = {horizontal: "CENTER", vertical: "MIN"};

      // Line connects directly from text to dot center
      line.resize(1, lineLength);
      line.x = frameWidth / 2 - 0.5;
      line.y = text.height;
      line.constraints = {horizontal: "CENTER", vertical: "STRETCH"};

      dot.x = frameWidth / 2 - DOT_SIZE / 2;
      dot.y = frameHeight - DOT_SIZE;
      dot.constraints = {horizontal: "CENTER", vertical: "MAX"};
    }
  } else {
    // Horizontal annotation (left or right)
    const lineLength = Math.abs(deltaX);
    const goingRight = deltaX > 0;
    // Simplified frame: dot + line + text (no extra padding)
    const frameWidth = DOT_SIZE + lineLength + text.width;
    const frameHeight = Math.max(text.height, DOT_SIZE);

    group.resize(frameWidth, frameHeight);
    group.x = goingRight ? startX - DOT_SIZE / 2 : endX - text.width;
    group.y = startY - frameHeight / 2;

    if (goingRight) {
      // Dot on left, line, label on right
      dot.x = 0;
      dot.y = frameHeight / 2 - DOT_SIZE / 2;
      dot.constraints = {horizontal: "MIN", vertical: "CENTER"};

      // Line connects from dot center to text
      line.resize(lineLength, 1);
      line.x = DOT_SIZE / 2;
      line.y = frameHeight / 2 - 0.5;
      line.constraints = {horizontal: "STRETCH", vertical: "CENTER"};

      text.x = frameWidth - text.width;
      text.y = frameHeight / 2 - text.height / 2;
      text.constraints = {horizontal: "MAX", vertical: "CENTER"};
    } else {
      // Label on left, line, dot on right
      text.x = 0;
      text.y = frameHeight / 2 - text.height / 2;
      text.constraints = {horizontal: "MIN", vertical: "CENTER"};

      // Line connects from text to dot center
      line.resize(lineLength, 1);
      line.x = text.width;
      line.y = frameHeight / 2 - 0.5;
      line.constraints = {horizontal: "STRETCH", vertical: "CENTER"};

      dot.x = frameWidth - DOT_SIZE;
      dot.y = frameHeight / 2 - DOT_SIZE / 2;
      dot.constraints = {horizontal: "MAX", vertical: "CENTER"};
    }
  }

  // Add elements to group
  group.appendChild(dot);
  group.appendChild(line);
  group.appendChild(text);

  // Add plugin data for live editing if marker type is provided
  if (markerType && colorType) {
    const deltaX = endX - startX;
    const deltaY = endY - startY;
    const isVertical = Math.abs(deltaY) >= Math.abs(deltaX);
    const goingDown = deltaY > 0;
    const goingRight = deltaX > 0;

    let direction: "horizontal" | "vertical" | undefined;
    let badgePosition: "top" | "bottom" | "left" | "right" | undefined;

    if (markerType === "gap" || markerType === "padding") {
      direction = isVertical ? "vertical" : "horizontal";
      if (isVertical) {
        badgePosition = goingDown ? "bottom" : "top";
      } else {
        badgePosition = goingRight ? "right" : "left";
      }
    } else {
      // pointer type
      if (markerType === "pointer-top") badgePosition = "top";
      else if (markerType === "pointer-bottom") badgePosition = "bottom";
      else if (markerType === "pointer-left") badgePosition = "left";
      else badgePosition = "right";
    }

    const markerConfig = {
      type: markerType,
      direction,
      value: label,
      colorType,
      badgePosition,
      highlightMode: highlightMode || false,
    };
    group.setPluginData("markerConfig", JSON.stringify(markerConfig));
  }

  // Add group to container
  container.appendChild(group);
}

// ========================================
// GAP ANNOTATION
// ========================================

/**
 * Creates a GAP annotation with rectangle as padding.
 */
export async function annotateGapNew(
  container: FrameNode,
  node: FrameNode,
  gapValue: number,
  direction: "H" | "V",
  nodeX: number,
  nodeY: number,
  token: string | null = null,
  childIndex: number = 0,
  highlightMode: boolean = false,
  tracker?: AnnotationTracker,
): Promise<void> {
  if (!node.children || node.children.length < 2) return;
  if (childIndex >= node.children.length - 1) return;

  const isHorizontal = direction === "H";
  const currentChild = node.children[childIndex] as SceneNode & {
    x: number;
    y: number;
    width: number;
    height: number;
  };

  const label = token ? token : `${gapValue}px`;
  const color = getTheme(highlightMode).gap;
  const LINE_OFFSET = 40;

  let rectX: number, rectY: number, rectW: number, rectH: number;
  let startX: number, startY: number, endX: number, endY: number;

  if (isHorizontal) {
    // Horizontal gap - annotation goes up or down
    rectX = nodeX + currentChild.x + currentChild.width;
    rectY = nodeY + currentChild.y;
    rectW = gapValue;
    rectH = currentChild.height;

    const preferredX = rectX + rectW / 2;
    // Alternate between top and bottom for horizontal gaps
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
    // Vertical gap - annotation goes right or left
    rectX = nodeX + currentChild.x;
    rectY = nodeY + currentChild.y + currentChild.height;
    rectW = currentChild.width;
    rectH = gapValue;

    const preferredY = rectY + rectH / 2;
    // Alternate between right and left for vertical gaps
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

  // Create semi-transparent rectangle for the gap
  const rect = figma.createRectangle();
  rect.name = `Gap - ${label}`;
  rect.x = rectX;
  rect.y = rectY;
  rect.resize(Math.max(rectW, 2), Math.max(rectH, 2));
  rect.fills = [{type: "SOLID", color, opacity: 0.15}];
  rect.strokes = [{type: "SOLID", color, opacity: 0.5}];
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
    color,
    "gap",
    "pink",
    highlightMode,
  );
}

// ========================================
// PADDING ANNOTATION
// ========================================

/**
 * Creates a PADDING annotation.
 */
export async function annotatePaddingNew(
  container: FrameNode,
  paddingValue: number,
  side: "top" | "bottom" | "left" | "right",
  nodeX: number,
  nodeY: number,
  nodeW: number,
  nodeH: number,
  token: string | null = null,
  highlightMode: boolean = false,
  tracker?: AnnotationTracker,
): Promise<void> {
  const label = token ? token : `${paddingValue}px`;
  const color = getTheme(highlightMode).padding;
  const LINE_OFFSET = 50;

  let startX: number, startY: number, endX: number, endY: number;
  let rectX: number, rectY: number, rectW: number, rectH: number;

  switch (side) {
    case "top": {
      rectX = nodeX;
      rectY = nodeY;
      rectW = nodeW;
      rectH = paddingValue;
      const preferredX = nodeX + nodeW / 2;
      const freeX = tracker
        ? findFreeXPosition(tracker.topPositions, preferredX, 100)
        : preferredX;
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
      const freeX = tracker
        ? findFreeXPosition(tracker.bottomPositions, preferredX, 100)
        : preferredX;
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
      const freeY = tracker
        ? findFreeYPosition(tracker.leftPositions, preferredY, 25)
        : preferredY;
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
      const freeY = tracker
        ? findFreeYPosition(tracker.rightPositions, preferredY, 25)
        : preferredY;
      if (tracker) tracker.rightPositions.push(freeY);
      startX = nodeX + nodeW;
      startY = freeY;
      endX = nodeX + nodeW + LINE_OFFSET;
      endY = freeY;
      break;
    }
  }

  const rect = figma.createRectangle();
  rect.name = `Padding - ${label}`;
  rect.x = rectX;
  rect.y = rectY;
  rect.resize(Math.max(rectW, 1), Math.max(rectH, 1));
  rect.fills = [{type: "SOLID", color, opacity: 0.15}];
  rect.strokes = [{type: "SOLID", color, opacity: 0.5}];
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
    color,
    "padding",
    "blue",
    highlightMode,
  );
}

// ========================================
// RADIUS ANNOTATION
// ========================================

/**
 * Creates a BORDER RADIUS annotation.
 */
export async function annotateRadiusNew(
  container: FrameNode,
  radius: number,
  nodeX: number,
  nodeY: number,
  _nodeW: number,
  _nodeH: number,
  token: string | null = null,
  highlightMode: boolean = false,
): Promise<void> {
  const label = token ? token : `${radius}px`;
  const color = getTheme(highlightMode).radius;

  // Create dashed circle at top left corner
  // The circle visually represents the border radius
  const circleSize = Math.max(20, Math.min(radius * 2, 32));
  const circle = figma.createEllipse();
  // Position circle centered at the corner
  circle.x = nodeX - circleSize / 4;
  circle.y = nodeY - circleSize / 4;
  circle.resize(circleSize, circleSize);
  circle.fills = [];
  circle.strokes = [{type: "SOLID", color}];
  circle.strokeWeight = 1.5;
  circle.dashPattern = [4, 4]; // Dashed line
  container.appendChild(circle);

  // Dot at the exact corner of the component (where radius starts)
  const DOT_SIZE = 8;
  const dotX = nodeX;
  const dotY = nodeY;

  // Line goes from corner up to label
  const LINE_LENGTH = 30;
  const lineEndX = dotX;
  const lineEndY = dotY - LINE_LENGTH;

  // Create the dot (point at corner)
  const dot = figma.createEllipse();
  dot.name = `Dot - ${label}`;
  dot.resize(DOT_SIZE, DOT_SIZE);
  dot.fills = [{type: "SOLID", color}];
  dot.x = dotX - DOT_SIZE / 2;
  dot.y = dotY - DOT_SIZE / 2;

  // Create connection line (vertical, from dot to label)
  const line = figma.createRectangle();
  line.name = `Line - ${label}`;
  line.fills = [{type: "SOLID", color}];
  line.resize(1, LINE_LENGTH);
  line.x = dotX - 0.5;
  line.y = lineEndY;

  // Create label text - positioned above line end
  const text = figma.createText();
  text.name = `Label - ${label}`;
  text.fontName = getFont("Regular");
  text.fontSize = 10;
  text.characters = label;
  text.fills = [{type: "SOLID", color}];
  // Text centered above line
  text.x = lineEndX - text.width / 2;
  text.y = lineEndY - text.height - 2;

  // Create group
  const group = figma.createFrame();
  group.name = label;
  group.fills = [];
  group.clipsContent = false;

  // Calculate bounds
  const minX = Math.min(dot.x, line.x, text.x) - 2;
  const minY = Math.min(dot.y, line.y, text.y) - 2;
  const maxX = Math.max(dot.x + DOT_SIZE, text.x + text.width) + 2;
  const maxY = Math.max(dot.y + DOT_SIZE, text.y + text.height) + 2;

  group.x = minX;
  group.y = minY;
  group.resize(Math.max(maxX - minX, 10), Math.max(maxY - minY, 10));

  // Adjust relative positions
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

// ========================================
// BORDER ANNOTATION
// ========================================

/**
 * Creates a BORDER WEIGHT annotation (position based on border side).
 */
export async function annotateBorderNew(
  container: FrameNode,
  strokeWeight: number,
  nodeX: number,
  nodeY: number,
  nodeW: number,
  nodeH: number,
  token: string | null = null,
  highlightMode: boolean = false,
  side: "Top" | "Bottom" | "Left" | "Right" | "All" = "All",
  position: "Inside" | "Outside" | "Center" = "Center",
): Promise<void> {
  // Include border position in label if available
  const positionSuffix = position !== "Center" ? ` (${position})` : "";
  const label = token
    ? `${token}${positionSuffix}`
    : `${strokeWeight}px${positionSuffix}`;

  const color = getTheme(highlightMode).border;

  const borderLine = figma.createLine();
  borderLine.strokes = [{type: "SOLID", color}];
  borderLine.strokeWeight = 2;
  borderLine.dashPattern = [4, 4];

  let startX: number, startY: number, endX: number, endY: number;

  // Position dashed line and annotation based on border side
  if (side === "Top") {
    // Line at top
    borderLine.x = nodeX;
    borderLine.y = nodeY;
    borderLine.resize(nodeW, 0);
    container.appendChild(borderLine);

    // Annotation above component
    startX = nodeX + nodeW / 2;
    startY = nodeY;
    endX = startX;
    endY = nodeY - 35;
  } else if (side === "Bottom" || side === "All") {
    // Line at bottom (default for "All")
    borderLine.x = nodeX;
    borderLine.y = nodeY + nodeH;
    borderLine.resize(nodeW, 0);
    container.appendChild(borderLine);

    // Annotation below component
    startX = nodeX + nodeW / 2;
    startY = nodeY + nodeH;
    endX = startX;
    endY = nodeY + nodeH + 35;
  } else if (side === "Left") {
    // Vertical line on left side
    borderLine.x = nodeX;
    borderLine.y = nodeY;
    borderLine.rotation = -90;
    borderLine.resize(nodeH, 0);
    container.appendChild(borderLine);

    // Annotation to the left of component
    startX = nodeX;
    startY = nodeY + nodeH / 2;
    endX = nodeX - 50;
    endY = startY;
  } else if (side === "Right") {
    // Vertical line on right side
    borderLine.x = nodeX + nodeW;
    borderLine.y = nodeY;
    borderLine.rotation = -90;
    borderLine.resize(nodeH, 0);
    container.appendChild(borderLine);

    // Annotation to the right of component
    startX = nodeX + nodeW;
    startY = nodeY + nodeH / 2;
    endX = nodeX + nodeW + 50;
    endY = startY;
  } else {
    // Fallback: bottom
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
    color,
  );
}

// ========================================
// DIMENSION ANNOTATION
// ========================================

/**
 * Creates a DIMENSION annotation (width/height with token).
 */
export async function annotateDimensionNew(
  container: FrameNode,
  dimension: "width" | "height",
  value: number,
  nodeX: number,
  nodeY: number,
  nodeW: number,
  nodeH: number,
  token: string | null = null,
  highlightMode: boolean = false,
): Promise<void> {
  const label = token ? token : `${value}px`;
  const theme = getTheme(highlightMode);
  const color = dimension === "width" ? theme.width : theme.height;

  if (dimension === "width") {
    // Create grouped frame for width marker (resizable)
    const lineY = nodeY + nodeH + 15;
    const MARKER_HEIGHT = 8;

    // Create label text first to calculate dimensions
    const text = figma.createText();
    text.name = "Label";
    text.fontName = getFont("Regular");
    text.fontSize = 12;
    text.characters = label;
    text.fills = [{type: "SOLID", color}];

    // Calculate grouped frame dimensions
    const labelGap = 4;
    const frameWidth = nodeW;
    const frameHeight = MARKER_HEIGHT + labelGap + text.height;

    // Create grouped frame
    const widthFrame = figma.createFrame();
    widthFrame.name = label;
    widthFrame.fills = [];
    widthFrame.clipsContent = false;
    widthFrame.resize(frameWidth, frameHeight);
    widthFrame.x = nodeX;
    widthFrame.y = lineY - MARKER_HEIGHT / 2;

    // Horizontal line
    const line = figma.createRectangle();
    line.name = "Horizontal Line";
    line.x = 0;
    line.y = MARKER_HEIGHT / 2 - 0.5;
    line.resize(frameWidth, 1);
    line.fills = [{type: "SOLID", color}];
    line.strokes = [];
    line.constraints = {horizontal: "STRETCH", vertical: "MIN"};

    // Left marker
    const leftMarker = figma.createRectangle();
    leftMarker.name = "Left Marker";
    leftMarker.x = -0.5;
    leftMarker.y = 0;
    leftMarker.resize(1, MARKER_HEIGHT);
    leftMarker.fills = [{type: "SOLID", color}];
    leftMarker.strokes = [];
    leftMarker.constraints = {horizontal: "MIN", vertical: "MIN"};

    // Right marker
    const rightMarker = figma.createRectangle();
    rightMarker.name = "Right Marker";
    rightMarker.x = frameWidth - 0.5;
    rightMarker.y = 0;
    rightMarker.resize(1, MARKER_HEIGHT);
    rightMarker.fills = [{type: "SOLID", color}];
    rightMarker.strokes = [];
    rightMarker.constraints = {horizontal: "MAX", vertical: "MIN"};

    // Centered label
    text.x = frameWidth / 2 - text.width / 2;
    text.y = MARKER_HEIGHT + labelGap;
    text.constraints = {horizontal: "CENTER", vertical: "MAX"};

    // Add elements to frame
    widthFrame.appendChild(line);
    widthFrame.appendChild(leftMarker);
    widthFrame.appendChild(rightMarker);
    widthFrame.appendChild(text);

    container.appendChild(widthFrame);
  } else {
    // Create grouped frame for height marker (resizable)
    const lineX = nodeX + nodeW + 15;
    const MARKER_WIDTH = 8;

    // Create label text first to calculate dimensions
    const text = figma.createText();
    text.name = "Label";
    text.fontName = getFont("Bold");
    text.fontSize = 12;
    text.characters = label;
    const textColor = highlightMode
      ? {r: 0, g: 0, b: 0} // Black
      : {r: 1, g: 1, b: 1}; // White
    text.fills = [{type: "SOLID", color: textColor}];

    // Create badge
    const badgePadding = 6;
    const badgeWidth = text.width + badgePadding * 2;
    const badgeHeight = text.height + badgePadding * 2;

    // Calculate grouped frame dimensions
    const connectorLength = 8;
    const frameWidth = MARKER_WIDTH + connectorLength + badgeWidth;
    const frameHeight = nodeH;

    // Create grouped frame
    const heightFrame = figma.createFrame();
    heightFrame.name = label;
    heightFrame.fills = [];
    heightFrame.clipsContent = false;
    heightFrame.resize(frameWidth, frameHeight);
    heightFrame.x = lineX - MARKER_WIDTH / 2;
    heightFrame.y = nodeY;

    // Vertical line (centered on MARKER_WIDTH)
    const line = figma.createRectangle();
    line.name = "Vertical Line";
    line.x = MARKER_WIDTH / 2 - 0.5;
    line.y = 0;
    line.resize(1, frameHeight);
    line.fills = [{type: "SOLID", color}];
    line.strokes = [];
    line.constraints = {horizontal: "MIN", vertical: "STRETCH"};

    // Top marker
    const topMarker = figma.createRectangle();
    topMarker.name = "Top Marker";
    topMarker.x = 0;
    topMarker.y = -0.5;
    topMarker.resize(MARKER_WIDTH, 1);
    topMarker.fills = [{type: "SOLID", color}];
    topMarker.strokes = [];
    topMarker.constraints = {horizontal: "MIN", vertical: "MIN"};

    // Bottom marker
    const bottomMarker = figma.createRectangle();
    bottomMarker.name = "Bottom Marker";
    bottomMarker.x = 0;
    bottomMarker.y = frameHeight - 0.5;
    bottomMarker.resize(MARKER_WIDTH, 1);
    bottomMarker.fills = [{type: "SOLID", color}];
    bottomMarker.strokes = [];
    bottomMarker.constraints = {horizontal: "MIN", vertical: "MAX"};

    // Horizontal connector line
    const connector = figma.createRectangle();
    connector.name = "Connector";
    connector.x = MARKER_WIDTH / 2;
    connector.y = frameHeight / 2 - 0.5;
    connector.resize(connectorLength, 1);
    connector.fills = [{type: "SOLID", color}];
    connector.strokes = [];
    connector.constraints = {horizontal: "MIN", vertical: "CENTER"};

    // Badge with label
    const badge = figma.createFrame();
    badge.name = "Badge";
    badge.fills = [{type: "SOLID", color}];
    badge.cornerRadius = 4;
    badge.resize(badgeWidth, badgeHeight);
    badge.x = MARKER_WIDTH / 2 + connectorLength;
    badge.y = frameHeight / 2 - badgeHeight / 2;
    badge.constraints = {horizontal: "MAX", vertical: "CENTER"};

    text.x = badgePadding;
    text.y = badgePadding;
    badge.appendChild(text);

    // Add elements to frame
    heightFrame.appendChild(line);
    heightFrame.appendChild(topMarker);
    heightFrame.appendChild(bottomMarker);
    heightFrame.appendChild(connector);
    heightFrame.appendChild(badge);

    container.appendChild(heightFrame);
  }
}
