// ========================================================================
// AUTO HANDOFF GENERATOR - TYPE DEFINITIONS
// ========================================================================

// ========================================
// SPEC DATA INTERFACES
// ========================================

export interface ColorSpec {
  element: string;
  state: string;
  token: string | null;
  colorHex: string;
  colorVariableId: string | null;
  properties: string;
}

export interface TextSpec {
  element: string;
  state: string;
  token: string | null;
  fontFamily: string;
  fontWeight: string;
  fontSize: number;
  lineHeight: string;
  letterSpacing?: string;
  properties: string;
  nodeId: string;
}

export interface SpacingSpec {
  element: string;
  property: string;
  token: string | null;
  value: string;
  direction?: "H" | "V";
  properties: string;
  sourceNodeId: string;
}

export interface BorderSpec {
  element: string;
  token: string | null;
  value: string;
  properties: string;
  sourceNodeId: string;
  side?: "Top" | "Bottom" | "Left" | "Right" | "All";
  position?: "Inside" | "Outside" | "Center";
}

export interface EffectSpec {
  element: string;
  effectType: string;
  token: string | null;
  value: string;
  properties: string;
  sourceNodeId: string;
}

// ========================================
// COLLECTION INTERFACES
// ========================================

export interface VariantColors {
  variantName: string;
  properties: string;
  propertyMap: Record<string, string>;
  colors: ColorSpec[];
  textStyles: TextSpec[];
  spacings: SpacingSpec[];
  borders: BorderSpec[];
  effects: EffectSpec[];
  usedComponents: Map<string, string>;
}

export interface CollectedNodeData {
  colors: ColorSpec[];
  textStyles: TextSpec[];
  spacings: SpacingSpec[];
  borders: BorderSpec[];
  effects: EffectSpec[];
  usedComponents: Map<string, string>;
}

// ========================================
// CONFIGURATION INTERFACES
// ========================================

export interface VariantProperty {
  name: string;
  values: string[];
}

export interface GenerationOptions {
  // Sections
  sectionColors: boolean;
  sectionText: boolean;
  sectionSpacing: boolean;
  sectionEffects: boolean;
  sectionComponents: boolean;
  sectionEstados: boolean;
  sectionProperties: boolean;
  // Settings
  frameWidth: number;
  paddingHorizontal: number;
  sectionSpacingValue: number;
  bgColor: string;
  // Visualization mode
  highlightMode: boolean;
  // Visualization property filters (per section)
  textVizProperties: Record<string, string[]>;
  spacingVizProperties: Record<string, string[]>;
  effectsVizProperties: Record<string, string[]>;
  // Frames per row for visualizations
  textFramesPerRow: number;
  spacingFramesPerRow: number;
  effectsFramesPerRow: number;
  // Estados grid density
  gridDensity: number;
  // Output type toggles (table/visualization)
  textShowTable: boolean;
  textShowViz: boolean;
  spacingShowTable: boolean;
  spacingShowViz: boolean;
  effectsShowTable: boolean;
  effectsShowViz: boolean;
}

// ========================================
// THEME INTERFACE
// ========================================

export interface AnnotationTheme {
  gap: RGB;
  padding: RGB;
  radius: RGB;
  border: RGB;
  text: RGB;
  width: RGB;
  height: RGB;
  effect: RGB;
}

// ========================================
// TABLE BUILDER INTERFACES
// ========================================

export interface TableColumnConfig {
  header: string;
  position: number;
  color?: string | RGB;
}

export interface TableCellData {
  text: string;
  color?: string | RGB;
  extraElements?: SceneNode[];
}

export interface TableCellConfig {
  text: string;
  x: number;
  color?: RGB;
}

export interface TableRowConfig {
  name: string;
  cells: TableCellConfig[];
  width: number;
  height?: number;
}

// ========================================
// VARIANT GRID INTERFACES
// ========================================

export interface VariantGridConfig {
  gridName: string;
  margin: number;
}

export interface VariantAnnotationContext {
  vizFrame: FrameNode;
  instance: InstanceNode;
  instanceBounds: Rect;
  variant: ComponentNode;
  vc: VariantColors;
  highlightMode: boolean;
}

export type VariantAnnotationCallback = (
  ctx: VariantAnnotationContext,
) => Promise<void>;

// ========================================
// ANNOTATION TRACKER INTERFACE
// ========================================

export interface AnnotationTracker {
  topPositions: number[];
  bottomPositions: number[];
  leftPositions: number[];
  rightPositions: number[];
  gapPositions: number[];
}

// ========================================
// TITLED VARIANT RESULT
// ========================================

export interface TitledVariantResult {
  outerFrame: FrameNode;
  vizFrame: FrameNode;
  instance: InstanceNode;
}

// ========================================
// STROKE INFO
// ========================================

export interface StrokeInfo {
  weight: number;
  token: string | null;
  side: "Top" | "Bottom" | "Left" | "Right" | "All";
  position: "Inside" | "Outside" | "Center";
}
