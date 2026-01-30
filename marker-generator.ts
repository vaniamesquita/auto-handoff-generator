// // ========================================================================
// // AUTO HANDOFF GENERATOR - MARKER GENERATOR
// // ========================================================================

// import {loadPluginFonts, getFont} from "../utils/fonts";
// import type {MarkerConfig} from "../types";

// // ========================================
// // ASSET BADGE HELPER
// // ========================================

// /**
//  * Creates a badge for assets.
//  * @param value - Badge text value
//  * @param color - Badge background color
//  * @returns Created FrameNode badge
//  */
// function createAssetBadge(value: string, color: RGB): FrameNode {
//   const badge = figma.createFrame();
//   badge.name = "Badge";
//   badge.fills = [{type: "SOLID", color}];
//   badge.cornerRadius = 2;
//   badge.layoutMode = "HORIZONTAL";
//   badge.primaryAxisSizingMode = "AUTO";
//   badge.counterAxisSizingMode = "FIXED";
//   badge.counterAxisAlignItems = "CENTER";
//   badge.resize(badge.width, 16); // Set height to 16px
//   badge.paddingLeft = 6;
//   badge.paddingRight = 6;
//   badge.paddingTop = 0;
//   badge.paddingBottom = 0;

//   const badgeText = figma.createText();
//   badgeText.fontName = getFont("Bold");
//   badgeText.fontSize = 11;
//   badgeText.characters = value;
//   badgeText.fills = [{type: "SOLID", color: {r: 1, g: 1, b: 1}}];
//   badge.appendChild(badgeText);

//   return badge;
// }

// // ========================================
// // MEASURE ASSET
// // ========================================

// /**
//  * Creates a resizable measure asset that resizes correctly when stretched.
//  * @param value - Measurement value label
//  * @param color - Asset color
//  * @param direction - Horizontal or vertical
//  * @param badgePosition - Position of the badge
//  * @returns Created FrameNode asset
//  */
// export function createMeasureAssetResizable(
//   value: string,
//   color: RGB,
//   direction: "horizontal" | "vertical",
//   badgePosition: "top" | "bottom" | "left" | "right",
//   size: number = 100,
// ): FrameNode {
//   const frame = figma.createFrame();
//   frame.name = `Measure - ${value}`;
//   frame.fills = [];
//   frame.clipsContent = false;

//   const SIZE = size; // Use provided size
//   const MARKER_SIZE = 12;

//   if (direction === "horizontal") {
//     frame.resize(SIZE, 45);

//     // Badge first to calculate height
//     const badge = createAssetBadge(value, color);
//     const badgeHeight = badge.height;

//     // Horizontal main line with markers
//     const lineFrame = figma.createFrame();
//     lineFrame.name = "Line Frame";
//     lineFrame.fills = [];
//     lineFrame.resize(SIZE, MARKER_SIZE);

//     // Position line based on badge position
//     if (badgePosition === "top") {
//       lineFrame.y = badgeHeight + 5;
//     } else if (badgePosition === "bottom") {
//       lineFrame.y = 5;
//     } else {
//       lineFrame.y = (frame.height - MARKER_SIZE) / 2;
//     }
//     lineFrame.constraints = {horizontal: "STRETCH", vertical: "CENTER"};

//     // Left marker
//     const leftMarker = figma.createRectangle();
//     leftMarker.name = "Left Marker";
//     leftMarker.resize(1, MARKER_SIZE);
//     leftMarker.fills = [{type: "SOLID", color: {r: 227 / 255, g: 17 / 255, b: 31 / 255}}]; // #E3111F
//     leftMarker.x = 0;
//     leftMarker.y = 0;
//     leftMarker.constraints = {horizontal: "MIN", vertical: "STRETCH"};
//     lineFrame.appendChild(leftMarker);

//     // Right marker
//     const rightMarker = figma.createRectangle();
//     rightMarker.name = "Right Marker";
//     rightMarker.resize(1, MARKER_SIZE);
//     rightMarker.fills = [{type: "SOLID", color: {r: 227 / 255, g: 17 / 255, b: 31 / 255}}]; // #E3111F
//     rightMarker.x = SIZE - 1;
//     rightMarker.y = 0;
//     rightMarker.constraints = {horizontal: "MAX", vertical: "STRETCH"};
//     lineFrame.appendChild(rightMarker);

//     // Horizontal line
//     const line = figma.createRectangle();
//     line.name = "Line";
//     line.resize(SIZE, 1);
//     line.fills = [{type: "SOLID", color: {r: 227 / 255, g: 17 / 255, b: 31 / 255}}]; // #E3111F
//     line.x = 0;
//     line.y = MARKER_SIZE / 2 - 0.5;
//     line.constraints = {horizontal: "STRETCH", vertical: "CENTER"};
//     lineFrame.appendChild(line);

//     frame.appendChild(lineFrame);

//     // Position badge
//     if (badgePosition === "top") {
//       badge.x = SIZE / 2 - badge.width / 2;
//       badge.y = 0;
//       badge.constraints = {horizontal: "CENTER", vertical: "MIN"};
//     } else if (badgePosition === "bottom") {
//       badge.x = SIZE / 2 - badge.width / 2;
//       badge.y = lineFrame.y + MARKER_SIZE + 5;
//       badge.constraints = {horizontal: "CENTER", vertical: "MAX"};
//     } else if (badgePosition === "left") {
//       badge.x = -badge.width - 5;
//       badge.y = frame.height / 2 - badge.height / 2;
//       badge.constraints = {horizontal: "MIN", vertical: "CENTER"};
//     } else {
//       badge.x = SIZE + 5;
//       badge.y = frame.height / 2 - badge.height / 2;
//       badge.constraints = {horizontal: "MAX", vertical: "CENTER"};
//     }
//     frame.appendChild(badge);
//   } else {
//     // Vertical
//     frame.resize(60, SIZE);

//     // Badge first to calculate width
//     const badge = createAssetBadge(value, color);
//     const badgeWidth = badge.width;

//     const lineFrame = figma.createFrame();
//     lineFrame.name = "Line Frame";
//     lineFrame.fills = [];
//     lineFrame.resize(MARKER_SIZE, SIZE);

//     // Position line based on badge position
//     if (badgePosition === "left") {
//       lineFrame.x = badgeWidth + 5;
//     } else if (badgePosition === "right") {
//       lineFrame.x = 5;
//     } else {
//       lineFrame.x = (frame.width - MARKER_SIZE) / 2;
//     }
//     lineFrame.constraints = {horizontal: "CENTER", vertical: "STRETCH"};

//     // Top marker
//     const topMarker = figma.createRectangle();
//     topMarker.name = "Top Marker";
//     topMarker.resize(MARKER_SIZE, 1);
//     topMarker.fills = [{type: "SOLID", color: {r: 227 / 255, g: 17 / 255, b: 31 / 255}}]; // #E3111F
//     topMarker.x = 0;
//     topMarker.y = 0;
//     topMarker.constraints = {horizontal: "STRETCH", vertical: "MIN"};
//     lineFrame.appendChild(topMarker);

//     // Bottom marker
//     const bottomMarker = figma.createRectangle();
//     bottomMarker.name = "Bottom Marker";
//     bottomMarker.resize(MARKER_SIZE, 1);
//     bottomMarker.fills = [{type: "SOLID", color: {r: 227 / 255, g: 17 / 255, b: 31 / 255}}]; // #E3111F
//     bottomMarker.x = 0;
//     bottomMarker.y = SIZE - 1;
//     bottomMarker.constraints = {horizontal: "STRETCH", vertical: "MAX"};
//     lineFrame.appendChild(bottomMarker);

//     // Vertical line
//     const line = figma.createRectangle();
//     line.name = "Line";
//     line.resize(1, SIZE);
//     line.fills = [{type: "SOLID", color: {r: 227 / 255, g: 17 / 255, b: 31 / 255}}]; // #E3111F
//     line.x = MARKER_SIZE / 2 - 0.5;
//     line.y = 0;
//     line.constraints = {horizontal: "CENTER", vertical: "STRETCH"};
//     lineFrame.appendChild(line);

//     frame.appendChild(lineFrame);

//     // Position badge
//     if (badgePosition === "left") {
//       badge.x = 0;
//       badge.y = SIZE / 2 - badge.height / 2;
//       badge.constraints = {horizontal: "MIN", vertical: "CENTER"};
//     } else if (badgePosition === "right") {
//       badge.x = lineFrame.x + MARKER_SIZE + 5;
//       badge.y = SIZE / 2 - badge.height / 2;
//       badge.constraints = {horizontal: "MAX", vertical: "CENTER"};
//     } else if (badgePosition === "top") {
//       badge.x = frame.width / 2 - badge.width / 2;
//       badge.y = -badge.height - 5;
//       badge.constraints = {horizontal: "CENTER", vertical: "MIN"};
//     } else {
//       badge.x = frame.width / 2 - badge.width / 2;
//       badge.y = SIZE + 5;
//       badge.constraints = {horizontal: "CENTER", vertical: "MAX"};
//     }
//     frame.appendChild(badge);
//   }

//   return frame;
// }

// // ========================================
// // GAP/PADDING ASSET
// // ========================================

// /**
//  * Creates a resizable gap/padding asset that resizes correctly when stretched.
//  * @param value - Gap/padding value label
//  * @param color - Asset color
//  * @param direction - Horizontal or vertical
//  * @param badgePosition - Position of the badge
//  * @returns Created FrameNode asset
//  */
// export function createGapAssetResizable(
//   value: string,
//   color: RGB,
//   direction: "horizontal" | "vertical",
//   badgePosition: "top" | "bottom" | "left" | "right",
//   size: number = 80,
//   type: "Gap" | "Padding" = "Gap",
// ): FrameNode {
//   const frame = figma.createFrame();
//   frame.name = `${type} - ${value}`;
//   frame.fills = [];
//   frame.clipsContent = false;

//   const SIZE = size; // Use provided size
//   const SECONDARY_SIZE = 40;

//   if (direction === "horizontal") {
//     frame.resize(SIZE, SECONDARY_SIZE + 30);

//     // Gap/Padding area - dashed rectangle
//     const gapArea = figma.createRectangle();
//     gapArea.name = `${type} - ${value}`;
//     gapArea.resize(SIZE, SECONDARY_SIZE);
//     gapArea.fills = [{type: "SOLID", color, opacity: 0.15}];
//     gapArea.strokes = [{type: "SOLID", color, opacity: 0.6}];
//     gapArea.strokeWeight = 1;
//     gapArea.dashPattern = [4, 4];
//     gapArea.y = badgePosition === "top" ? 25 : 0;
//     gapArea.constraints = {horizontal: "STRETCH", vertical: "STRETCH"};
//     frame.appendChild(gapArea);

//     // Badge
//     const badge = createAssetBadge(value, color);
//     if (badgePosition === "top") {
//       badge.x = SIZE / 2 - badge.width / 2;
//       badge.y = 0;
//       badge.constraints = {horizontal: "CENTER", vertical: "MIN"};
//     } else if (badgePosition === "bottom") {
//       badge.x = SIZE / 2 - badge.width / 2;
//       badge.y = SECONDARY_SIZE + 5;
//       badge.constraints = {horizontal: "CENTER", vertical: "MAX"};
//     } else if (badgePosition === "left") {
//       badge.x = -badge.width - 5;
//       badge.y = SECONDARY_SIZE / 2 - badge.height / 2;
//       badge.constraints = {horizontal: "MIN", vertical: "CENTER"};
//     } else {
//       badge.x = SIZE + 5;
//       badge.y = SECONDARY_SIZE / 2 - badge.height / 2;
//       badge.constraints = {horizontal: "MAX", vertical: "CENTER"};
//     }
//     frame.appendChild(badge);
//   } else {
//     // Vertical
//     frame.resize(SECONDARY_SIZE + 50, SIZE);

//     const gapArea = figma.createRectangle();
//     gapArea.name = `${type} - ${value}`;
//     gapArea.resize(SECONDARY_SIZE, SIZE);
//     gapArea.fills = [{type: "SOLID", color, opacity: 0.15}];
//     gapArea.strokes = [{type: "SOLID", color, opacity: 0.6}];
//     gapArea.strokeWeight = 1;
//     gapArea.dashPattern = [4, 4];
//     gapArea.x = badgePosition === "left" ? 45 : 0;
//     gapArea.constraints = {horizontal: "STRETCH", vertical: "STRETCH"};
//     frame.appendChild(gapArea);

//     // Badge
//     const badge = createAssetBadge(value, color);
//     if (badgePosition === "left") {
//       badge.x = 0;
//       badge.y = SIZE / 2 - badge.height / 2;
//       badge.constraints = {horizontal: "MIN", vertical: "CENTER"};
//     } else if (badgePosition === "right") {
//       badge.x = SECONDARY_SIZE + 5;
//       badge.y = SIZE / 2 - badge.height / 2;
//       badge.constraints = {horizontal: "MAX", vertical: "CENTER"};
//     } else if (badgePosition === "top") {
//       badge.x = SECONDARY_SIZE / 2 - badge.width / 2;
//       badge.y = -badge.height - 5;
//       badge.constraints = {horizontal: "CENTER", vertical: "MIN"};
//     } else {
//       badge.x = SECONDARY_SIZE / 2 - badge.width / 2;
//       badge.y = SIZE + 5;
//       badge.constraints = {horizontal: "CENTER", vertical: "MAX"};
//     }
//     frame.appendChild(badge);
//   }

//   return frame;
// }

// // ========================================
// // POINTER ASSET
// // ========================================

// /**
//  * Creates a resizable pointer asset with a stem that resizes correctly.
//  * @param value - Pointer value label
//  * @param color - Asset color
//  * @param direction - Direction (top, bottom, left, right)
//  * @returns Created FrameNode asset
//  */
// export function createPointerAssetResizable(
//   value: string,
//   color: RGB,
//   direction: "top" | "bottom" | "left" | "right",
//   textColor?: RGB,
// ): FrameNode {
//   const frame = figma.createFrame();
//   frame.name = `Pointer - ${direction} - ${value}`;
//   frame.fills = [];
//   frame.clipsContent = false;

//   const DOT_SIZE = 8;
//   const LINE_LENGTH = 30;

//   const isVertical = direction === "top" || direction === "bottom";

//   if (isVertical) {
//     frame.resize(60, LINE_LENGTH + DOT_SIZE + 16);

//     // Dot
//     const dot = figma.createEllipse();
//     dot.name = "Dot";
//     dot.resize(DOT_SIZE, DOT_SIZE);
//     dot.fills = [{type: "SOLID", color}];

//     // Line (stem) - connected directly to dot without gap
//     const line = figma.createRectangle();
//     line.name = "Line";
//     line.resize(1, LINE_LENGTH);
//     line.fills = [{type: "SOLID", color}];

//     // Label
//     const label = figma.createText();
//     label.name = "Label";
//     label.fontName = getFont("Regular");
//     label.fontSize = 11;
//     label.characters = value;
//     label.fills = [{type: "SOLID", color: textColor || color}];

//     if (direction === "top") {
//       // Dot on top, line connected, label at bottom
//       dot.x = frame.width / 2 - DOT_SIZE / 2;
//       dot.y = 0;
//       dot.constraints = {horizontal: "CENTER", vertical: "MIN"};

//       // Line starts at dot center (no gap)
//       line.x = frame.width / 2 - 0.5;
//       line.y = DOT_SIZE / 2;
//       line.constraints = {horizontal: "CENTER", vertical: "STRETCH"};

//       label.x = frame.width / 2 - label.width / 2;
//       label.y = DOT_SIZE / 2 + LINE_LENGTH + 2;
//       label.constraints = {horizontal: "CENTER", vertical: "MAX"};
//     } else {
//       // Label on top, line, dot at bottom (bottom)
//       label.x = frame.width / 2 - label.width / 2;
//       label.y = 0;
//       label.constraints = {horizontal: "CENTER", vertical: "MIN"};

//       // Dot positioned at bottom
//       dot.x = frame.width / 2 - DOT_SIZE / 2;
//       dot.y = frame.height - DOT_SIZE;
//       dot.constraints = {horizontal: "CENTER", vertical: "MAX"};

//       // Line connects label to dot center (no gap)
//       line.x = frame.width / 2 - 0.5;
//       line.y = label.height + 2;
//       line.resize(1, frame.height - label.height - 2 - DOT_SIZE / 2);
//       line.constraints = {horizontal: "CENTER", vertical: "STRETCH"};
//     }

//     frame.appendChild(dot);
//     frame.appendChild(line);
//     frame.appendChild(label);
//   } else {
//     // Horizontal with nested frames to control spacing
//     const label = figma.createText();
//     label.name = "Label";
//     label.fontName = getFont("Regular");
//     label.fontSize = 11;
//     label.characters = value;
//     label.fills = [{type: "SOLID", color: textColor || color}];
//     label.textAutoResize = "WIDTH_AND_HEIGHT";

//     // Dot
//     const dot = figma.createEllipse();
//     dot.name = "Dot";
//     dot.resize(DOT_SIZE, DOT_SIZE);
//     dot.fills = [{type: "SOLID", color}];

//     // Line (stem)
//     const line = figma.createRectangle();
//     line.name = "Line";
//     line.resize(LINE_LENGTH, 1);
//     line.fills = [{type: "SOLID", color}];

//     // Create container for dot + line (no spacing between them)
//     const pointerFrame = figma.createFrame();
//     pointerFrame.name = "Pointer";
//     pointerFrame.fills = [];
//     pointerFrame.layoutMode = "HORIZONTAL";
//     pointerFrame.primaryAxisSizingMode = "AUTO";
//     pointerFrame.counterAxisSizingMode = "AUTO";
//     pointerFrame.counterAxisAlignItems = "CENTER";
//     pointerFrame.itemSpacing = 0;
//     pointerFrame.clipsContent = false;

//     // Main frame with spacing between pointer and label
//     frame.layoutMode = "HORIZONTAL";
//     frame.primaryAxisSizingMode = "AUTO";
//     frame.counterAxisSizingMode = "AUTO";
//     frame.counterAxisAlignItems = "CENTER";
//     frame.itemSpacing = 4; // Spacing only between pointer and label

//     if (direction === "left") {
//       // Dot + line in container, then label
//       pointerFrame.appendChild(dot);
//       pointerFrame.appendChild(line);
//       frame.appendChild(pointerFrame);
//       frame.appendChild(label);
//     } else {
//       // Label first, then line + dot in container
//       pointerFrame.appendChild(line);
//       pointerFrame.appendChild(dot);
//       frame.appendChild(label);
//       frame.appendChild(pointerFrame);
//     }
//   }

//   return frame;
// }

// // ========================================
// // TOUCHAREA ASSET
// // ========================================

// /**
//  * Creates a toucharea asset (circle with gradient effect)
//  * @param variant - "drag-up" | "touch" | "drag-down"
//  * @param size - Circle diameter (touch circle size)
//  * @param color - Fill color
//  */
// export function createTouchareaAsset(
//   variant: "drag-up" | "touch" | "drag-down",
//   size: number = 56,
//   color: RGB = {r: 1, g: 0.4, b: 0.4},
// ): FrameNode {
//   const totalHeight = variant === "touch" ? size : size * 2;
//   const frame = figma.createFrame();
//   frame.name = `Toucharea-${variant}`;
//   frame.resize(size, totalHeight);
//   frame.fills = [];
//   frame.clipsContent = false;

//   // Create gradient background
//   const gradient = figma.createRectangle();
//   gradient.name = "Gradient";
//   gradient.resize(size, totalHeight);

//   if (variant === "drag-up") {
//     gradient.y = 0;
//     gradient.fills = [{
//       type: "GRADIENT_LINEAR",
//       gradientTransform: [[0, 0, 0], [0, 1, 0]],
//       gradientStops: [
//         {position: 0, color: {...color, a: 0}},
//         {position: 1, color: {...color, a: 0.3}}
//       ]
//     }];
//   } else if (variant === "drag-down") {
//     gradient.y = 0;
//     gradient.fills = [{
//       type: "GRADIENT_LINEAR",
//       gradientTransform: [[0, 0, 0], [0, 1, 0]],
//       gradientStops: [
//         {position: 0, color: {...color, a: 0.3}},
//         {position: 1, color: {...color, a: 0}}
//       ]
//     }];
//   } else {
//     // touch - no gradient, just circle
//     gradient.visible = false;
//   }

//   // Create solid circle
//   const circle = figma.createEllipse();
//   circle.name = "Touch";
//   circle.resize(size, size);
//   circle.y = variant === "drag-up" ? totalHeight - size : 0;
//   circle.fills = [{type: "SOLID", color, opacity: 0.8}];

//   frame.appendChild(gradient);
//   frame.appendChild(circle);
//   return frame;
// }

// // ========================================
// // CIRCLE/SQUARE AREA ASSET
// // ========================================

// /**
//  * Creates a circle or square area asset (dashed, solid, or outline)
//  * @param variant - "dashed-circle" | "dashed-square" | "solid-circle" | "solid-square" | "outline-circle" | "outline-square"
//  * @param size - Size of the shape
//  * @param color - Color
//  */
// export function createAreaAsset(
//   variant: "dashed-circle" | "dashed-square" | "solid-circle" | "solid-square" | "outline-circle" | "outline-square",
//   size: number = 48,
//   color: RGB = {r: 218 / 255, g: 160 / 255, b: 176 / 255},
// ): FrameNode {
//   const isCircle = variant.includes("circle");
//   const isDashed = variant.includes("dashed");
//   const isOutline = variant.includes("outline");

//   const frame = figma.createFrame();
//   frame.name = variant;
//   frame.resize(size, size);
//   frame.fills = [];
//   frame.clipsContent = false;

//   // Lock aspect ratio for proportional resizing
//   frame.constrainProportions = true;

//   // SEM auto-layout para Fill funcionar
//   let shapeNode: EllipseNode | RectangleNode;

//   if (isCircle) {
//     shapeNode = figma.createEllipse();
//     shapeNode.resize(size, size);
//   } else {
//     shapeNode = figma.createRectangle();
//     shapeNode.resize(size, size);
//   }

//   shapeNode.name = isCircle ? "Circle" : "Square";
//   shapeNode.x = 0;
//   shapeNode.y = 0;

//   // STRETCH constraints para Fill container
//   shapeNode.constraints = {
//     horizontal: "STRETCH",
//     vertical: "STRETCH",
//   };

//   if (isDashed) {
//     // Dashed: transparent fill, dashed stroke
//     shapeNode.fills = [{type: "SOLID", color, opacity: 0.3}];
//     shapeNode.strokes = [{type: "SOLID", color}];
//     shapeNode.strokeWeight = 2;
//     shapeNode.dashPattern = [4, 4];
//   } else if (isOutline) {
//     // Outline: no fill, dashed stroke
//     shapeNode.fills = [];
//     shapeNode.strokes = [{type: "SOLID", color}];
//     shapeNode.strokeWeight = 1;
//     shapeNode.dashPattern = [4, 4];
//   } else {
//     // Solid: solid fill, no stroke
//     shapeNode.fills = [{type: "SOLID", color}];
//     shapeNode.strokes = [];
//   }

//   frame.appendChild(shapeNode);
//   return frame;
// }

// // ========================================
// // NUMBER POINTER ASSET
// // ========================================

// /**
//  * Creates a number pointer asset (numbered circle with optional line)
//  * @param number - Number to display
//  * @param direction - Direction (top, bottom, left, right)
//  * @param size - Circle diameter
//  * @param color - Circle fill color
//  */
// export function createNumberPointerAsset(
//   number: string,
//   direction: "top" | "bottom" | "left" | "right",
//   size: number = 25,
//   color: RGB = {r: 1, g: 215 / 255, b: 0},
// ): FrameNode {
//   const frame = figma.createFrame();
//   frame.name = `Number ${direction} - ${number}`;
//   frame.fills = [];
//   frame.clipsContent = false;

//   const LINE_LENGTH = 40;
//   const isVertical = direction === "top" || direction === "bottom";

//   if (isVertical) {
//     frame.resize(size + 10, LINE_LENGTH + size + 10);

//     // Circle
//     const circle = figma.createEllipse();
//     circle.name = "Circle";
//     circle.resize(size, size);
//     circle.fills = [{type: "SOLID", color}];

//     // Line (stem)
//     const line = figma.createRectangle();
//     line.name = "Line";
//     line.resize(1, LINE_LENGTH);
//     line.fills = [{type: "SOLID", color}];

//     // Number text
//     const text = figma.createText();
//     text.name = "Number";
//     text.fontName = getFont("Bold");
//     text.fontSize = Math.round(size * 0.6);
//     text.characters = number;
//     text.fills = [{type: "SOLID", color: {r: 0, g: 0, b: 0}}];
//     text.textAlignHorizontal = "CENTER";
//     text.textAlignVertical = "CENTER";

//     if (direction === "top") {
//       // Circle at top, line extends down
//       circle.x = frame.width / 2 - size / 2;
//       circle.y = 0;
//       circle.constraints = {horizontal: "CENTER", vertical: "MIN"};

//       line.x = frame.width / 2 - 0.5;
//       line.y = size / 2;
//       line.constraints = {horizontal: "CENTER", vertical: "STRETCH"};

//       text.x = circle.x + size / 2 - text.width / 2;
//       text.y = circle.y + size / 2 - text.height / 2;
//       text.constraints = {horizontal: "CENTER", vertical: "MIN"};
//     } else {
//       // Circle at bottom, line extends up
//       circle.x = frame.width / 2 - size / 2;
//       circle.y = frame.height - size;
//       circle.constraints = {horizontal: "CENTER", vertical: "MAX"};

//       line.x = frame.width / 2 - 0.5;
//       line.y = 0;
//       line.resize(1, frame.height - size / 2);
//       line.constraints = {horizontal: "CENTER", vertical: "STRETCH"};

//       text.x = circle.x + size / 2 - text.width / 2;
//       text.y = circle.y + size / 2 - text.height / 2;
//       text.constraints = {horizontal: "CENTER", vertical: "MAX"};
//     }

//     frame.appendChild(line);
//     frame.appendChild(circle);
//     frame.appendChild(text);
//   } else {
//     // Horizontal
//     frame.resize(LINE_LENGTH + size + 10, size + 10);

//     // Circle
//     const circle = figma.createEllipse();
//     circle.name = "Circle";
//     circle.resize(size, size);
//     circle.fills = [{type: "SOLID", color}];

//     // Line (stem)
//     const line = figma.createRectangle();
//     line.name = "Line";
//     line.resize(LINE_LENGTH, 1);
//     line.fills = [{type: "SOLID", color}];

//     // Number text
//     const text = figma.createText();
//     text.name = "Number";
//     text.fontName = getFont("Bold");
//     text.fontSize = Math.round(size * 0.6);
//     text.characters = number;
//     text.fills = [{type: "SOLID", color: {r: 0, g: 0, b: 0}}];
//     text.textAlignHorizontal = "CENTER";
//     text.textAlignVertical = "CENTER";

//     if (direction === "left") {
//       // Circle at left
//       circle.x = 0;
//       circle.y = frame.height / 2 - size / 2;
//       circle.constraints = {horizontal: "MIN", vertical: "CENTER"};

//       line.x = size / 2;
//       line.y = frame.height / 2 - 0.5;
//       line.constraints = {horizontal: "STRETCH", vertical: "CENTER"};

//       text.x = circle.x + size / 2 - text.width / 2;
//       text.y = circle.y + size / 2 - text.height / 2;
//       text.constraints = {horizontal: "MIN", vertical: "CENTER"};
//     } else {
//       // Circle at right
//       circle.x = frame.width - size;
//       circle.y = frame.height / 2 - size / 2;
//       circle.constraints = {horizontal: "MAX", vertical: "CENTER"};

//       line.x = 0;
//       line.y = frame.height / 2 - 0.5;
//       line.resize(frame.width - size / 2, 1);
//       line.constraints = {horizontal: "STRETCH", vertical: "CENTER"};

//       text.x = circle.x + size / 2 - text.width / 2;
//       text.y = circle.y + size / 2 - text.height / 2;
//       text.constraints = {horizontal: "MAX", vertical: "CENTER"};
//     }

//     frame.appendChild(line);
//     frame.appendChild(circle);
//     frame.appendChild(text);
//   }

//   return frame;
// }

// // ========================================
// // MAIN INSERT FUNCTION
// // ========================================

// /**
//  * Inserts an asset into Figma at viewport center.
//  * @param assetType - Type of asset (measure, gap, padding, pointer-*, toucharea-*, area-*, number-*)
//  * @param value - Value label
//  * @param colorType - Color type (red, blue, pink, green)
//  * @param direction - Horizontal or vertical direction
//  * @param badgePosition - Badge position
//  * @param highlightMode - Whether to use highlight colors
//  * @param size - Size in pixels
//  */
// /**
//  * Converts a hex color string to RGB object.
//  * @param hex - Hex color string (e.g., "#FF0000")
//  * @returns RGB color object with values 0-1
//  */
// function hexToRgb(hex: string): RGB {
//   const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
//   return result
//     ? {
//         r: parseInt(result[1], 16) / 255,
//         g: parseInt(result[2], 16) / 255,
//         b: parseInt(result[3], 16) / 255,
//       }
//     : {r: 0, g: 0, b: 0};
// }

// export async function insertAssetIntoFigma(
//   assetType: string,
//   value: string,
//   colorType: string,
//   direction: "horizontal" | "vertical" = "horizontal",
//   badgePosition: "top" | "bottom" | "left" | "right" = "bottom",
//   highlightMode: boolean = false,
//   size: number = 100,
//   textColorType?: string,
// ): Promise<void> {
//   await loadPluginFonts();

//   // Define colors based on type (normal mode)
//   const normalColors: Record<string, RGB> = {
//     red: {r: 1, g: 0.2, b: 0.2}, // Red (measure/gap)
//     blue: {r: 0, g: 0.5, b: 1}, // Blue (padding)
//     pink: {r: 236 / 255, g: 72 / 255, b: 153 / 255}, // Pink
//     green: {r: 0.2, g: 0.6, b: 0.2}, // Dark green (text)
//     black: {r: 0, g: 0, b: 0}, // Black
//   };

//   // Colors for highlight mode
//   const highlightColors: Record<string, RGB> = {
//     red: {r: 255 / 255, g: 199 / 255, b: 203 / 255}, // #FFC7CB (light pink)
//     blue: {r: 98 / 255, g: 248 / 255, b: 79 / 255}, // #62F84F (bright green)
//     pink: {r: 255 / 255, g: 199 / 255, b: 203 / 255}, // #FFC7CB (light pink)
//     green: {r: 98 / 255, g: 248 / 255, b: 79 / 255}, // #62F84F (bright green)
//   };

//   const colors = highlightMode ? highlightColors : normalColors;

//   // Check if colorType is a hex color (starts with #)
//   let color: RGB;
//   if (colorType.startsWith('#')) {
//     color = hexToRgb(colorType);
//   } else {
//     color = colors[colorType] || colors.red;
//   }

//   // Text color for pointers
//   let textColor: RGB | undefined = undefined;
//   if (textColorType && textColorType !== 'inherit') {
//     if (textColorType.startsWith('#')) {
//       textColor = hexToRgb(textColorType);
//     } else {
//       textColor = normalColors[textColorType];
//     }
//   }

//   let assetFrame: FrameNode;

//   switch (assetType) {
//     case "measure":
//       assetFrame = createMeasureAssetResizable(
//         value,
//         color,
//         direction,
//         badgePosition,
//         size,
//       );
//       break;
//     case "gap":
//       assetFrame = createGapAssetResizable(
//         value,
//         colors.pink,
//         direction,
//         badgePosition,
//         size,
//         "Gap",
//       );
//       break;
//     case "padding":
//       assetFrame = createGapAssetResizable(
//         value,
//         colors.blue,
//         direction,
//         badgePosition,
//         size,
//         "Padding",
//       );
//       break;
//     case "pointer-top":
//       assetFrame = createPointerAssetResizable(value, color, "top", textColor);
//       break;
//     case "pointer-bottom":
//       assetFrame = createPointerAssetResizable(value, color, "bottom", textColor);
//       break;
//     case "pointer-left":
//       assetFrame = createPointerAssetResizable(value, color, "left", textColor);
//       break;
//     case "pointer-right":
//       assetFrame = createPointerAssetResizable(value, color, "right", textColor);
//       break;
//     case "area-dashed-circle":
//       assetFrame = createAreaAsset(
//         "dashed-circle",
//         size || 48,
//         color,
//       );
//       break;
//     case "area-dashed-square":
//       assetFrame = createAreaAsset(
//         "dashed-square",
//         size || 48,
//         color,
//       );
//       break;
//     case "area-solid-circle":
//       assetFrame = createAreaAsset(
//         "solid-circle",
//         size || 48,
//         color,
//       );
//       break;
//     case "area-solid-square":
//       assetFrame = createAreaAsset(
//         "solid-square",
//         size || 48,
//         color,
//       );
//       break;
//     case "area-outline-circle":
//       assetFrame = createAreaAsset(
//         "outline-circle",
//         size || 28,
//         color,
//       );
//       break;
//     case "area-outline-square":
//       assetFrame = createAreaAsset(
//         "outline-square",
//         size || 28,
//         color,
//       );
//       break;
//     case "number-top":
//       assetFrame = createNumberPointerAsset(
//         value || "1",
//         "top",
//         size || 25,
//         color,
//       );
//       break;
//     case "number-bottom":
//       assetFrame = createNumberPointerAsset(
//         value || "1",
//         "bottom",
//         size || 25,
//         color,
//       );
//       break;
//     case "number-left":
//       assetFrame = createNumberPointerAsset(
//         value || "1",
//         "left",
//         size || 25,
//         color,
//       );
//       break;
//     case "number-right":
//       assetFrame = createNumberPointerAsset(
//         value || "1",
//         "right",
//         size || 25,
//         color,
//       );
//       break;
//     default:
//       assetFrame = createMeasureAssetResizable(
//         value,
//         color,
//         direction,
//         badgePosition,
//         size,
//       );
//   }

//   // Inject metadata for live editing
//   const markerConfig: MarkerConfig = {
//     type: assetType as MarkerConfig["type"],
//     direction,
//     value,
//     colorType: colorType as MarkerConfig["colorType"],
//     textColorType: textColorType as MarkerConfig["textColorType"],
//     badgePosition,
//     highlightMode,
//     size,
//   };
//   assetFrame.setPluginData("markerConfig", JSON.stringify(markerConfig));

//   // Position at viewport center
//   const viewport = figma.viewport.center;
//   assetFrame.x = viewport.x - assetFrame.width / 2;
//   assetFrame.y = viewport.y - assetFrame.height / 2;

//   // Select the created asset
//   figma.currentPage.selection = [assetFrame];
//   figma.viewport.scrollAndZoomIntoView([assetFrame]);

//   figma.notify(`Asset "${assetType}" inserted!`);
// }

// // ========================================
// // UPDATE MARKER (Live Editing)
// // ========================================

// /**
//  * Updates an existing marker with new configuration.
//  * Strategy: Delete old marker and create new one in the same position.
//  * @param oldMarker - The existing marker node to replace
//  * @param newConfig - New marker configuration
//  */
// export async function updateMarker(
//   oldMarker: SceneNode,
//   newConfig: MarkerConfig,
// ): Promise<void> {
//   await loadPluginFonts();

//   // Store position and parent
//   const oldX = oldMarker.x;
//   const oldY = oldMarker.y;
//   const parent = oldMarker.parent;

//   // Extract current text from the marker if it's a pointer
//   // This preserves user-edited text during live editing
//   if (newConfig.type.startsWith('pointer-') && 'findOne' in oldMarker) {
//     const labelNode = oldMarker.findOne((n) => n.type === 'TEXT' && n.name === 'Label') as TextNode | null;
//     if (labelNode && labelNode.characters) {
//       newConfig.value = labelNode.characters;
//     }
//   }

//   // Define colors
//   const normalColors: Record<string, RGB> = {
//     red: {r: 1, g: 0.2, b: 0.2},
//     blue: {r: 0, g: 0.5, b: 1},
//     pink: {r: 236 / 255, g: 72 / 255, b: 153 / 255},
//     green: {r: 0.2, g: 0.6, b: 0.2},
//     black: {r: 0, g: 0, b: 0},
//   };

//   const highlightColors: Record<string, RGB> = {
//     red: {r: 255 / 255, g: 199 / 255, b: 203 / 255},
//     blue: {r: 98 / 255, g: 248 / 255, b: 79 / 255},
//     pink: {r: 255 / 255, g: 199 / 255, b: 203 / 255},
//     green: {r: 98 / 255, g: 248 / 255, b: 79 / 255},
//   };

//   const colors = newConfig.highlightMode ? highlightColors : normalColors;

//   // Check if colorType is a hex color (starts with #)
//   let color: RGB;
//   if (newConfig.colorType.startsWith('#')) {
//     color = hexToRgb(newConfig.colorType);
//   } else {
//     color = colors[newConfig.colorType] || colors.red;
//   }

//   // Text color for pointers
//   let textColor: RGB | undefined = undefined;
//   if (newConfig.textColorType && newConfig.textColorType !== 'inherit') {
//     if (newConfig.textColorType.startsWith('#')) {
//       textColor = hexToRgb(newConfig.textColorType);
//     } else {
//       textColor = normalColors[newConfig.textColorType];
//     }
//   }

//   // Create new marker based on type
//   let newMarker: FrameNode;
//   const size = newConfig.size || 100;

//   switch (newConfig.type) {
//     case "measure":
//       newMarker = createMeasureAssetResizable(
//         newConfig.value,
//         color,
//         newConfig.direction || "horizontal",
//         newConfig.badgePosition || "bottom",
//         size,
//       );
//       break;
//     case "gap":
//       newMarker = createGapAssetResizable(
//         newConfig.value,
//         colors.pink,
//         newConfig.direction || "horizontal",
//         newConfig.badgePosition || "bottom",
//         size,
//         "Gap",
//       );
//       break;
//     case "padding":
//       newMarker = createGapAssetResizable(
//         newConfig.value,
//         colors.blue,
//         newConfig.direction || "horizontal",
//         newConfig.badgePosition || "bottom",
//         size,
//         "Padding",
//       );
//       break;
//     case "pointer-top":
//       newMarker = createPointerAssetResizable(newConfig.value, color, "top", textColor);
//       break;
//     case "pointer-bottom":
//       newMarker = createPointerAssetResizable(
//         newConfig.value,
//         color,
//         "bottom",
//         textColor,
//       );
//       break;
//     case "pointer-left":
//       newMarker = createPointerAssetResizable(newConfig.value, color, "left", textColor);
//       break;
//     case "pointer-right":
//       newMarker = createPointerAssetResizable(newConfig.value, color, "right", textColor);
//       break;
//     case "number-top":
//       newMarker = createNumberPointerAsset(newConfig.value || "1", "top", size, color);
//       break;
//     case "number-bottom":
//       newMarker = createNumberPointerAsset(newConfig.value || "1", "bottom", size, color);
//       break;
//     case "number-left":
//       newMarker = createNumberPointerAsset(newConfig.value || "1", "left", size, color);
//       break;
//     case "number-right":
//       newMarker = createNumberPointerAsset(newConfig.value || "1", "right", size, color);
//       break;
//     case "area-dashed-circle":
//       newMarker = createAreaAsset("dashed-circle", size, color);
//       break;
//     case "area-dashed-square":
//       newMarker = createAreaAsset("dashed-square", size, color);
//       break;
//     case "area-solid-circle":
//       newMarker = createAreaAsset("solid-circle", size, color);
//       break;
//     case "area-solid-square":
//       newMarker = createAreaAsset("solid-square", size, color);
//       break;
//     case "area-outline-circle":
//       newMarker = createAreaAsset("outline-circle", size || 28, color);
//       break;
//     case "area-outline-square":
//       newMarker = createAreaAsset("outline-square", size || 28, color);
//       break;
//     default:
//       newMarker = createMeasureAssetResizable(
//         newConfig.value,
//         color,
//         newConfig.direction || "horizontal",
//         newConfig.badgePosition || "bottom",
//         size,
//       );
//   }

//   // Inject metadata
//   newMarker.setPluginData("markerConfig", JSON.stringify(newConfig));

//   // Position at same location
//   newMarker.x = oldX;
//   newMarker.y = oldY;

//   // Insert in same parent if possible
//   if (parent && "appendChild" in parent) {
//     parent.appendChild(newMarker);
//   }

//   // Delete old marker
//   oldMarker.remove();

//   // Select new marker
//   figma.currentPage.selection = [newMarker];

//   // Notify UI with new config
//   figma.ui.postMessage({
//     type: "marker-selected",
//     config: newConfig,
//   });

//   figma.notify(`Marker updated!`);
// }
// ========================================================================
// AUTO HANDOFF GENERATOR - MARKER GENERATOR
// ========================================================================

import {loadPluginFonts, getFont} from "../utils/fonts";
import type {MarkerConfig} from "../types";

// ========================================
// ASSET BADGE HELPER
// ========================================

function createAssetBadge(value: string, color: RGB): FrameNode {
  const badge = figma.createFrame();
  badge.name = "Badge";
  badge.fills = [{type: "SOLID", color}];
  badge.cornerRadius = 2;
  badge.layoutMode = "HORIZONTAL";
  badge.primaryAxisSizingMode = "AUTO";
  badge.counterAxisSizingMode = "FIXED";
  badge.counterAxisAlignItems = "CENTER";
  badge.resize(badge.width, 16);
  badge.paddingLeft = 6;
  badge.paddingRight = 6;
  badge.paddingTop = 0;
  badge.paddingBottom = 0;

  const badgeText = figma.createText();
  badgeText.fontName = getFont("Bold");
  badgeText.fontSize = 11;
  badgeText.characters = value;
  badgeText.fills = [{type: "SOLID", color: {r: 1, g: 1, b: 1}}];
  badge.appendChild(badgeText);

  return badge;
}

// ========================================
// MEASURE ASSET
// ========================================

export function createMeasureAssetResizable(
  value: string,
  color: RGB,
  direction: "horizontal" | "vertical",
  badgePosition: "top" | "bottom" | "left" | "right",
  size: number = 100,
): FrameNode {
  const frame = figma.createFrame();
  frame.name = `Measure - ${value}`;
  frame.fills = [];
  frame.clipsContent = false;

  const SIZE = size;
  const MARKER_SIZE = 12;
  
  // CORREÇÃO: Usar a cor passada para as linhas
  const strokeColor = color; 

  if (direction === "horizontal") {
    frame.resize(SIZE, 45);

    // Badge
    const badge = createAssetBadge(value, color);
    const badgeHeight = badge.height;

    // Line Frame
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
    lineFrame.constraints = {horizontal: "STRETCH", vertical: "CENTER"};

    // Left marker
    const leftMarker = figma.createRectangle();
    leftMarker.name = "Left Marker";
    leftMarker.resize(1, MARKER_SIZE);
    leftMarker.fills = [{type: "SOLID", color: strokeColor}];
    leftMarker.x = 0;
    leftMarker.y = 0;
    leftMarker.constraints = {horizontal: "MIN", vertical: "STRETCH"};
    lineFrame.appendChild(leftMarker);

    // Right marker
    const rightMarker = figma.createRectangle();
    rightMarker.name = "Right Marker";
    rightMarker.resize(1, MARKER_SIZE);
    rightMarker.fills = [{type: "SOLID", color: strokeColor}];
    rightMarker.x = SIZE - 1;
    rightMarker.y = 0;
    rightMarker.constraints = {horizontal: "MAX", vertical: "STRETCH"};
    lineFrame.appendChild(rightMarker);

    // Horizontal line
    const line = figma.createRectangle();
    line.name = "Line";
    line.resize(SIZE, 1);
    line.fills = [{type: "SOLID", color: strokeColor}];
    line.x = 0;
    line.y = MARKER_SIZE / 2 - 0.5;
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
    lineFrame.constraints = {horizontal: "CENTER", vertical: "STRETCH"};

    // Top marker
    const topMarker = figma.createRectangle();
    topMarker.name = "Top Marker";
    topMarker.resize(MARKER_SIZE, 1);
    topMarker.fills = [{type: "SOLID", color: strokeColor}];
    topMarker.x = 0;
    topMarker.y = 0;
    topMarker.constraints = {horizontal: "STRETCH", vertical: "MIN"};
    lineFrame.appendChild(topMarker);

    // Bottom marker
    const bottomMarker = figma.createRectangle();
    bottomMarker.name = "Bottom Marker";
    bottomMarker.resize(MARKER_SIZE, 1);
    bottomMarker.fills = [{type: "SOLID", color: strokeColor}];
    bottomMarker.x = 0;
    bottomMarker.y = SIZE - 1;
    bottomMarker.constraints = {horizontal: "STRETCH", vertical: "MAX"};
    lineFrame.appendChild(bottomMarker);

    // Vertical line
    const line = figma.createRectangle();
    line.name = "Line";
    line.resize(1, SIZE);
    line.fills = [{type: "SOLID", color: strokeColor}];
    line.x = MARKER_SIZE / 2 - 0.5;
    line.y = 0;
    line.constraints = {horizontal: "CENTER", vertical: "STRETCH"};
    lineFrame.appendChild(line);

    frame.appendChild(lineFrame);

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

export function createGapAssetResizable(
  value: string,
  color: RGB,
  direction: "horizontal" | "vertical",
  badgePosition: "top" | "bottom" | "left" | "right",
  size: number = 80,
  type: "Gap" | "Padding" = "Gap",
): FrameNode {
  const frame = figma.createFrame();
  frame.name = `${type} - ${value}`;
  frame.fills = [];
  frame.clipsContent = false;

  const SIZE = size;
  const SECONDARY_SIZE = 40;

  if (direction === "horizontal") {
    frame.resize(SIZE, SECONDARY_SIZE + 30);

    const gapArea = figma.createRectangle();
    gapArea.name = `${type} - ${value}`;
    gapArea.resize(SIZE, SECONDARY_SIZE);
    gapArea.fills = [{type: "SOLID", color, opacity: 0.15}];
    gapArea.strokes = [{type: "SOLID", color, opacity: 0.6}];
    gapArea.strokeWeight = 1;
    gapArea.dashPattern = [4, 4];
    gapArea.y = badgePosition === "top" ? 25 : 0;
    gapArea.constraints = {horizontal: "STRETCH", vertical: "STRETCH"};
    frame.appendChild(gapArea);

    const badge = createAssetBadge(value, color);
    if (badgePosition === "top") {
      badge.x = SIZE / 2 - badge.width / 2; badge.y = 0;
      badge.constraints = {horizontal: "CENTER", vertical: "MIN"};
    } else if (badgePosition === "bottom") {
      badge.x = SIZE / 2 - badge.width / 2; badge.y = SECONDARY_SIZE + 5;
      badge.constraints = {horizontal: "CENTER", vertical: "MAX"};
    } else if (badgePosition === "left") {
      badge.x = -badge.width - 5; badge.y = SECONDARY_SIZE / 2 - badge.height / 2;
      badge.constraints = {horizontal: "MIN", vertical: "CENTER"};
    } else {
      badge.x = SIZE + 5; badge.y = SECONDARY_SIZE / 2 - badge.height / 2;
      badge.constraints = {horizontal: "MAX", vertical: "CENTER"};
    }
    frame.appendChild(badge);
  } else {
    frame.resize(SECONDARY_SIZE + 50, SIZE);

    const gapArea = figma.createRectangle();
    gapArea.name = `${type} - ${value}`;
    gapArea.resize(SECONDARY_SIZE, SIZE);
    gapArea.fills = [{type: "SOLID", color, opacity: 0.15}];
    gapArea.strokes = [{type: "SOLID", color, opacity: 0.6}];
    gapArea.strokeWeight = 1;
    gapArea.dashPattern = [4, 4];
    gapArea.x = badgePosition === "left" ? 45 : 0;
    gapArea.constraints = {horizontal: "STRETCH", vertical: "STRETCH"};
    frame.appendChild(gapArea);

    const badge = createAssetBadge(value, color);
    if (badgePosition === "left") {
      badge.x = 0; badge.y = SIZE / 2 - badge.height / 2;
      badge.constraints = {horizontal: "MIN", vertical: "CENTER"};
    } else if (badgePosition === "right") {
      badge.x = SECONDARY_SIZE + 5; badge.y = SIZE / 2 - badge.height / 2;
      badge.constraints = {horizontal: "MAX", vertical: "CENTER"};
    } else if (badgePosition === "top") {
      badge.x = SECONDARY_SIZE / 2 - badge.width / 2; badge.y = -badge.height - 5;
      badge.constraints = {horizontal: "CENTER", vertical: "MIN"};
    } else {
      badge.x = SECONDARY_SIZE / 2 - badge.width / 2; badge.y = SIZE + 5;
      badge.constraints = {horizontal: "CENTER", vertical: "MAX"};
    }
    frame.appendChild(badge);
  }

  return frame;
}

// ========================================
// POINTER ASSET
// ========================================

export function createPointerAssetResizable(
  value: string,
  color: RGB,
  direction: "top" | "bottom" | "left" | "right",
  textColor?: RGB,
): FrameNode {
  const frame = figma.createFrame();
  frame.name = `Pointer - ${direction} - ${value}`;
  frame.fills = [];
  frame.clipsContent = false;

  const DOT_SIZE = 8;
  const LINE_LENGTH = 30;
  const strokeColor = color; 

  const isVertical = direction === "top" || direction === "bottom";

  if (isVertical) {
    frame.resize(60, LINE_LENGTH + DOT_SIZE + 16);

    const dot = figma.createEllipse();
    dot.name = "Dot";
    dot.resize(DOT_SIZE, DOT_SIZE);
    dot.fills = [{type: "SOLID", color: strokeColor}];

    const line = figma.createRectangle();
    line.name = "Line";
    line.resize(1, LINE_LENGTH);
    line.fills = [{type: "SOLID", color: strokeColor}];

    const label = figma.createText();
    label.name = "Label";
    label.fontName = getFont("Regular");
    label.fontSize = 11;
    label.characters = value;
    label.fills = [{type: "SOLID", color: textColor || strokeColor}];

    if (direction === "top") {
      dot.x = frame.width / 2 - DOT_SIZE / 2; dot.y = 0;
      dot.constraints = {horizontal: "CENTER", vertical: "MIN"};

      line.x = frame.width / 2 - 0.5; line.y = DOT_SIZE / 2;
      line.constraints = {horizontal: "CENTER", vertical: "STRETCH"};

      label.x = frame.width / 2 - label.width / 2; label.y = DOT_SIZE / 2 + LINE_LENGTH + 2;
      label.constraints = {horizontal: "CENTER", vertical: "MAX"};
    } else {
      label.x = frame.width / 2 - label.width / 2; label.y = 0;
      label.constraints = {horizontal: "CENTER", vertical: "MIN"};

      dot.x = frame.width / 2 - DOT_SIZE / 2; dot.y = frame.height - DOT_SIZE;
      dot.constraints = {horizontal: "CENTER", vertical: "MAX"};

      line.x = frame.width / 2 - 0.5; line.y = label.height + 2;
      line.resize(1, frame.height - label.height - 2 - DOT_SIZE / 2);
      line.constraints = {horizontal: "CENTER", vertical: "STRETCH"};
    }

    frame.appendChild(dot); frame.appendChild(line); frame.appendChild(label);
  } else {
    const label = figma.createText();
    label.name = "Label";
    label.fontName = getFont("Regular");
    label.fontSize = 11;
    label.characters = value;
    label.fills = [{type: "SOLID", color: textColor || strokeColor}];
    label.textAutoResize = "WIDTH_AND_HEIGHT";

    const dot = figma.createEllipse();
    dot.name = "Dot";
    dot.resize(DOT_SIZE, DOT_SIZE);
    dot.fills = [{type: "SOLID", color: strokeColor}];

    const line = figma.createRectangle();
    line.name = "Line";
    line.resize(LINE_LENGTH, 1);
    line.fills = [{type: "SOLID", color: strokeColor}];

    const pointerFrame = figma.createFrame();
    pointerFrame.name = "Pointer";
    pointerFrame.fills = [];
    pointerFrame.layoutMode = "HORIZONTAL";
    pointerFrame.primaryAxisSizingMode = "AUTO";
    pointerFrame.counterAxisSizingMode = "AUTO";
    pointerFrame.counterAxisAlignItems = "CENTER";
    pointerFrame.itemSpacing = 0;
    pointerFrame.clipsContent = false;

    frame.layoutMode = "HORIZONTAL";
    frame.primaryAxisSizingMode = "AUTO";
    frame.counterAxisSizingMode = "AUTO";
    frame.counterAxisAlignItems = "CENTER";
    frame.itemSpacing = 4;

    if (direction === "left") {
      pointerFrame.appendChild(dot); pointerFrame.appendChild(line);
      frame.appendChild(pointerFrame); frame.appendChild(label);
    } else {
      pointerFrame.appendChild(line); pointerFrame.appendChild(dot);
      frame.appendChild(label); frame.appendChild(pointerFrame);
    }
  }

  return frame;
}

// ========================================
// TOUCHAREA ASSET
// ========================================

export function createTouchareaAsset(
  variant: "drag-up" | "touch" | "drag-down",
  size: number = 56,
  color: RGB = {r: 1, g: 0.4, b: 0.4},
): FrameNode {
  const totalHeight = variant === "touch" ? size : size * 2;
  const frame = figma.createFrame();
  frame.name = `Toucharea-${variant}`;
  frame.resize(size, totalHeight);
  frame.fills = [];
  frame.clipsContent = false;

  const gradient = figma.createRectangle();
  gradient.name = "Gradient";
  gradient.resize(size, totalHeight);

  if (variant === "drag-up") {
    gradient.y = 0;
    gradient.fills = [{
      type: "GRADIENT_LINEAR",
      gradientTransform: [[0, 0, 0], [0, 1, 0]],
      gradientStops: [{position: 0, color: {...color, a: 0}}, {position: 1, color: {...color, a: 0.3}}]
    }];
  } else if (variant === "drag-down") {
    gradient.y = 0;
    gradient.fills = [{
      type: "GRADIENT_LINEAR",
      gradientTransform: [[0, 0, 0], [0, 1, 0]],
      gradientStops: [{position: 0, color: {...color, a: 0.3}}, {position: 1, color: {...color, a: 0}}]
    }];
  } else {
    gradient.visible = false;
  }

  const circle = figma.createEllipse();
  circle.name = "Touch";
  circle.resize(size, size);
  circle.y = variant === "drag-up" ? totalHeight - size : 0;
  circle.fills = [{type: "SOLID", color, opacity: 0.8}];

  frame.appendChild(gradient);
  frame.appendChild(circle);
  return frame;
}

// ========================================
// CIRCLE/SQUARE AREA ASSET
// ========================================

export function createAreaAsset(
  variant: "dashed-circle" | "dashed-square" | "solid-circle" | "solid-square" | "outline-circle" | "outline-square",
  size: number = 48,
  color: RGB = {r: 218 / 255, g: 160 / 255, b: 176 / 255},
): FrameNode {
  const isCircle = variant.includes("circle");
  const isDashed = variant.includes("dashed");
  const isOutline = variant.includes("outline");

  const frame = figma.createFrame();
  frame.name = variant;
  frame.resize(size, size);
  frame.fills = [];
  frame.clipsContent = false;
  frame.constrainProportions = true;

  let shapeNode: EllipseNode | RectangleNode;

  if (isCircle) {
    shapeNode = figma.createEllipse();
    shapeNode.resize(size, size);
  } else {
    shapeNode = figma.createRectangle();
    shapeNode.resize(size, size);
  }

  shapeNode.name = isCircle ? "Circle" : "Square";
  shapeNode.x = 0;
  shapeNode.y = 0;
  shapeNode.constraints = { horizontal: "STRETCH", vertical: "STRETCH" };

  if (isDashed) {
    shapeNode.fills = [{type: "SOLID", color, opacity: 0.3}];
    shapeNode.strokes = [{type: "SOLID", color}];
    shapeNode.strokeWeight = 2;
    shapeNode.dashPattern = [4, 4];
  } else if (isOutline) {
    shapeNode.fills = [];
    shapeNode.strokes = [{type: "SOLID", color}];
    shapeNode.strokeWeight = 1;
    shapeNode.dashPattern = [4, 4];
  } else {
    shapeNode.fills = [{type: "SOLID", color}];
    shapeNode.strokes = [];
  }

  frame.appendChild(shapeNode);
  return frame;
}

// ========================================
// NUMBER POINTER ASSET
// ========================================

export function createNumberPointerAsset(
  number: string,
  direction: "top" | "bottom" | "left" | "right",
  size: number = 25,
  color: RGB = {r: 1, g: 215 / 255, b: 0},
): FrameNode {
  const frame = figma.createFrame();
  frame.name = `Number ${direction} - ${number}`;
  frame.fills = [];
  frame.clipsContent = false;

  const LINE_LENGTH = 40;
  const isVertical = direction === "top" || direction === "bottom";

  if (isVertical) {
    frame.resize(size + 10, LINE_LENGTH + size + 10);

    const circle = figma.createEllipse();
    circle.name = "Circle";
    circle.resize(size, size);
    circle.fills = [{type: "SOLID", color}];

    const line = figma.createRectangle();
    line.name = "Line";
    line.resize(1, LINE_LENGTH);
    line.fills = [{type: "SOLID", color}];

    const text = figma.createText();
    text.name = "Number";
    text.fontName = getFont("Bold");
    text.fontSize = Math.round(size * 0.6);
    text.characters = number;
    text.fills = [{type: "SOLID", color: {r: 0, g: 0, b: 0}}];
    text.textAlignHorizontal = "CENTER";
    text.textAlignVertical = "CENTER";

    if (direction === "top") {
      circle.x = frame.width / 2 - size / 2; circle.y = 0;
      circle.constraints = {horizontal: "CENTER", vertical: "MIN"};
      line.x = frame.width / 2 - 0.5; line.y = size / 2;
      line.constraints = {horizontal: "CENTER", vertical: "STRETCH"};
      text.x = circle.x + size / 2 - text.width / 2; text.y = circle.y + size / 2 - text.height / 2;
      text.constraints = {horizontal: "CENTER", vertical: "MIN"};
    } else {
      circle.x = frame.width / 2 - size / 2; circle.y = frame.height - size;
      circle.constraints = {horizontal: "CENTER", vertical: "MAX"};
      line.x = frame.width / 2 - 0.5; line.y = 0; line.resize(1, frame.height - size / 2);
      line.constraints = {horizontal: "CENTER", vertical: "STRETCH"};
      text.x = circle.x + size / 2 - text.width / 2; text.y = circle.y + size / 2 - text.height / 2;
      text.constraints = {horizontal: "CENTER", vertical: "MAX"};
    }
    frame.appendChild(line); frame.appendChild(circle); frame.appendChild(text);
  } else {
    frame.resize(LINE_LENGTH + size + 10, size + 10);
    const circle = figma.createEllipse();
    circle.name = "Circle";
    circle.resize(size, size);
    circle.fills = [{type: "SOLID", color}];
    const line = figma.createRectangle();
    line.name = "Line";
    line.resize(LINE_LENGTH, 1);
    line.fills = [{type: "SOLID", color}];
    const text = figma.createText();
    text.name = "Number";
    text.fontName = getFont("Bold");
    text.fontSize = Math.round(size * 0.6);
    text.characters = number;
    text.fills = [{type: "SOLID", color: {r: 0, g: 0, b: 0}}];
    text.textAlignHorizontal = "CENTER";
    text.textAlignVertical = "CENTER";

    if (direction === "left") {
      circle.x = 0; circle.y = frame.height / 2 - size / 2;
      circle.constraints = {horizontal: "MIN", vertical: "CENTER"};
      line.x = size / 2; line.y = frame.height / 2 - 0.5;
      line.constraints = {horizontal: "STRETCH", vertical: "CENTER"};
      text.x = circle.x + size / 2 - text.width / 2; text.y = circle.y + size / 2 - text.height / 2;
      text.constraints = {horizontal: "MIN", vertical: "CENTER"};
    } else {
      circle.x = frame.width - size; circle.y = frame.height / 2 - size / 2;
      circle.constraints = {horizontal: "MAX", vertical: "CENTER"};
      line.x = 0; line.y = frame.height / 2 - 0.5; line.resize(frame.width - size / 2, 1);
      line.constraints = {horizontal: "STRETCH", vertical: "CENTER"};
      text.x = circle.x + size / 2 - text.width / 2; text.y = circle.y + size / 2 - text.height / 2;
      text.constraints = {horizontal: "MAX", vertical: "CENTER"};
    }
    frame.appendChild(line); frame.appendChild(circle); frame.appendChild(text);
  }
  return frame;
}

// ========================================
// MAIN INSERT FUNCTION & UTILS
// ========================================

function hexToRgb(hex: string): RGB {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? { r: parseInt(result[1], 16) / 255, g: parseInt(result[2], 16) / 255, b: parseInt(result[3], 16) / 255 } : {r: 0, g: 0, b: 0};
}

export async function insertAssetIntoFigma(
  assetType: string,
  value: string,
  colorType: string,
  direction: "horizontal" | "vertical" = "horizontal",
  badgePosition: "top" | "bottom" | "left" | "right" = "bottom",
  highlightMode: boolean = false,
  size: number = 100,
  textColorType?: string,
): Promise<void> {
  await loadPluginFonts();

  const normalColors: Record<string, RGB> = {
    red: {r: 1, g: 0.2, b: 0.2},
    blue: {r: 0, g: 0.5, b: 1},
    pink: {r: 236 / 255, g: 72 / 255, b: 153 / 255},
    green: {r: 0.2, g: 0.6, b: 0.2},
    black: {r: 0, g: 0, b: 0},
  };

  const highlightColors: Record<string, RGB> = {
    red: {r: 255 / 255, g: 199 / 255, b: 203 / 255},
    blue: {r: 98 / 255, g: 248 / 255, b: 79 / 255},
    pink: {r: 255 / 255, g: 199 / 255, b: 203 / 255},
    green: {r: 98 / 255, g: 248 / 255, b: 79 / 255},
  };

  // Cores
  let color: RGB;
  if (colorType.startsWith('#')) {
    color = hexToRgb(colorType);
  } else {
    const palette = highlightMode ? highlightColors : normalColors;
    color = palette[colorType] || normalColors.red;
  }

  // Texto
  let textColor: RGB | undefined = undefined;
  if (textColorType && textColorType !== 'inherit') {
    if (textColorType.startsWith('#')) {
      textColor = hexToRgb(textColorType);
    } else {
      textColor = normalColors[textColorType];
    }
  }

  let assetFrame: FrameNode;

  switch (assetType) {
    case "measure":
      assetFrame = createMeasureAssetResizable(value, color, direction, badgePosition, size);
      break;
    case "gap":
      // CORRIGIDO: Passa a cor customizada se estiver setada, senao default
      assetFrame = createGapAssetResizable(value, color, direction, badgePosition, size, "Gap");
      break;
    case "padding":
      // CORRIGIDO: Mesmo para padding
      assetFrame = createGapAssetResizable(value, color, direction, badgePosition, size, "Padding");
      break;
    case "pointer-top":
      assetFrame = createPointerAssetResizable(value, color, "top", textColor);
      break;
    case "pointer-bottom":
      assetFrame = createPointerAssetResizable(value, color, "bottom", textColor);
      break;
    case "pointer-left":
      assetFrame = createPointerAssetResizable(value, color, "left", textColor);
      break;
    case "pointer-right":
      assetFrame = createPointerAssetResizable(value, color, "right", textColor);
      break;
    case "area-dashed-circle":
      assetFrame = createAreaAsset("dashed-circle", size || 48, color);
      break;
    case "area-dashed-square":
      assetFrame = createAreaAsset("dashed-square", size || 48, color);
      break;
    case "area-solid-circle":
      assetFrame = createAreaAsset("solid-circle", size || 48, color);
      break;
    case "area-solid-square":
      assetFrame = createAreaAsset("solid-square", size || 48, color);
      break;
    case "area-outline-circle":
      assetFrame = createAreaAsset("outline-circle", size || 28, color);
      break;
    case "area-outline-square":
      assetFrame = createAreaAsset("outline-square", size || 28, color);
      break;
    case "number-top":
      assetFrame = createNumberPointerAsset(value || "1", "top", size || 25, color);
      break;
    case "number-bottom":
      assetFrame = createNumberPointerAsset(value || "1", "bottom", size || 25, color);
      break;
    case "number-left":
      assetFrame = createNumberPointerAsset(value || "1", "left", size || 25, color);
      break;
    case "number-right":
      assetFrame = createNumberPointerAsset(value || "1", "right", size || 25, color);
      break;
    default:
      assetFrame = createMeasureAssetResizable(value, color, direction, badgePosition, size);
  }

  // Metadata
  const markerConfig: MarkerConfig = {
    type: assetType as MarkerConfig["type"],
    direction,
    value,
    colorType: colorType as MarkerConfig["colorType"],
    textColorType: textColorType as MarkerConfig["textColorType"],
    badgePosition,
    highlightMode,
    size,
  };
  assetFrame.setPluginData("markerConfig", JSON.stringify(markerConfig));

  // Viewport
  const viewport = figma.viewport.center;
  assetFrame.x = viewport.x - assetFrame.width / 2;
  assetFrame.y = viewport.y - assetFrame.height / 2;

  figma.currentPage.selection = [assetFrame];
  figma.viewport.scrollAndZoomIntoView([assetFrame]);
  figma.notify(`Asset "${assetType}" inserted!`);
}

// ========================================
// UPDATE MARKER (Live Editing)
// ========================================

export async function updateMarker(
  oldMarker: SceneNode,
  newConfig: MarkerConfig,
): Promise<void> {
  await loadPluginFonts();

  const oldX = oldMarker.x;
  const oldY = oldMarker.y;
  const parent = oldMarker.parent;

  // CORREÇÃO: Preservar texto de Measures E Pointers
  if ('findOne' in oldMarker) {
      if (newConfig.type.startsWith('pointer-')) {
          const labelNode = oldMarker.findOne((n) => n.type === 'TEXT' && n.name === 'Label') as TextNode | null;
          if (labelNode && labelNode.characters) newConfig.value = labelNode.characters;
      } else if (newConfig.type === 'measure' || newConfig.type === 'gap' || newConfig.type === 'padding') {
          // Tenta achar texto dentro do Badge
          const badgeText = oldMarker.findOne((n) => n.type === 'TEXT') as TextNode | null;
          if (badgeText && badgeText.characters) newConfig.value = badgeText.characters;
      } else if (newConfig.type.startsWith('number-')) {
          const numText = oldMarker.findOne((n) => n.type === 'TEXT') as TextNode | null;
          if (numText && numText.characters) newConfig.value = numText.characters;
      }
  }

  // Colors Logic
  const normalColors: Record<string, RGB> = {
    red: {r: 1, g: 0.2, b: 0.2},
    blue: {r: 0, g: 0.5, b: 1},
    pink: {r: 236 / 255, g: 72 / 255, b: 153 / 255},
    green: {r: 0.2, g: 0.6, b: 0.2},
    black: {r: 0, g: 0, b: 0},
  };
  const highlightColors: Record<string, RGB> = {
    red: {r: 255 / 255, g: 199 / 255, b: 203 / 255},
    blue: {r: 98 / 255, g: 248 / 255, b: 79 / 255},
    pink: {r: 255 / 255, g: 199 / 255, b: 203 / 255},
    green: {r: 98 / 255, g: 248 / 255, b: 79 / 255},
  };

  const colors = newConfig.highlightMode ? highlightColors : normalColors;
  let color: RGB;
  if (newConfig.colorType.startsWith('#')) {
    color = hexToRgb(newConfig.colorType);
  } else {
    color = colors[newConfig.colorType] || colors.red;
  }

  let textColor: RGB | undefined = undefined;
  if (newConfig.textColorType && newConfig.textColorType !== 'inherit') {
    if (newConfig.textColorType.startsWith('#')) {
      textColor = hexToRgb(newConfig.textColorType);
    } else {
      textColor = normalColors[newConfig.textColorType];
    }
  }

  let newMarker: FrameNode;
  const size = newConfig.size || 100;

  switch (newConfig.type) {
    case "measure":
      newMarker = createMeasureAssetResizable(newConfig.value, color, newConfig.direction || "horizontal", newConfig.badgePosition || "bottom", size);
      break;
    case "gap":
      newMarker = createGapAssetResizable(newConfig.value, color, newConfig.direction || "horizontal", newConfig.badgePosition || "bottom", size, "Gap");
      break;
    case "padding":
      newMarker = createGapAssetResizable(newConfig.value, color, newConfig.direction || "horizontal", newConfig.badgePosition || "bottom", size, "Padding");
      break;
    case "pointer-top":
      newMarker = createPointerAssetResizable(newConfig.value, color, "top", textColor);
      break;
    case "pointer-bottom":
      newMarker = createPointerAssetResizable(newConfig.value, color, "bottom", textColor);
      break;
    case "pointer-left":
      newMarker = createPointerAssetResizable(newConfig.value, color, "left", textColor);
      break;
    case "pointer-right":
      newMarker = createPointerAssetResizable(newConfig.value, color, "right", textColor);
      break;
    case "number-top":
      newMarker = createNumberPointerAsset(newConfig.value || "1", "top", size, color);
      break;
    case "number-bottom":
      newMarker = createNumberPointerAsset(newConfig.value || "1", "bottom", size, color);
      break;
    case "number-left":
      newMarker = createNumberPointerAsset(newConfig.value || "1", "left", size, color);
      break;
    case "number-right":
      newMarker = createNumberPointerAsset(newConfig.value || "1", "right", size, color);
      break;
    case "area-dashed-circle":
      newMarker = createAreaAsset("dashed-circle", size, color);
      break;
    case "area-dashed-square":
      newMarker = createAreaAsset("dashed-square", size, color);
      break;
    case "area-solid-circle":
      newMarker = createAreaAsset("solid-circle", size, color);
      break;
    case "area-solid-square":
      newMarker = createAreaAsset("solid-square", size, color);
      break;
    case "area-outline-circle":
      newMarker = createAreaAsset("outline-circle", size || 28, color);
      break;
    case "area-outline-square":
      newMarker = createAreaAsset("outline-square", size || 28, color);
      break;
    default:
      newMarker = createMeasureAssetResizable(newConfig.value, color, newConfig.direction || "horizontal", newConfig.badgePosition || "bottom", size);
  }

  newMarker.setPluginData("markerConfig", JSON.stringify(newConfig));
  newMarker.x = oldX;
  newMarker.y = oldY;

  if (parent && "appendChild" in parent) {
    parent.appendChild(newMarker);
  }

  oldMarker.remove();
  figma.currentPage.selection = [newMarker];
  
  figma.ui.postMessage({
    type: "marker-selected",
    config: newConfig,
  });

  figma.notify(`Marker updated!`);
}