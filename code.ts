// ========================================================================
// AUTO HANDOFF GENERATOR
// ========================================================================

// INTERFACES
interface ColorSpec {
  element: string;
  state: string;
  token: string | null;
  colorHex: string;
  colorVariableId: string | null;
  properties: string;
}

interface TextSpec {
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

interface SpacingSpec {
  element: string;
  property: string;
  token: string | null;
  value: string;
  direction?: "H" | "V";
  properties: string;
  sourceNodeId: string;
}

interface BorderSpec {
  element: string;
  token: string | null;
  value: string;
  properties: string;
  sourceNodeId: string;
  side?: "Top" | "Bottom" | "Left" | "Right" | "All"; // ✅ Lado da borda
  position?: "Inside" | "Outside" | "Center"; // ✅ Posição da borda
}

interface EffectSpec {
  element: string;
  effectType: string; // DROP_SHADOW, INNER_SHADOW, LAYER_BLUR, BACKGROUND_BLUR
  token: string | null;
  value: string; // Formatted value description
  properties: string;
  sourceNodeId: string;
}

interface VariantColors {
  variantName: string;
  properties: string;
  propertyMap: Record<string, string>; // {size: "Small", type: "Primary"}
  colors: ColorSpec[];
  textStyles: TextSpec[];
  spacings: SpacingSpec[];
  borders: BorderSpec[];
  effects: EffectSpec[];
  usedComponents: Map<string, string>; // Map of componentId -> displayName
}

// ========================================
// THEME SYSTEM - Cores centralizadas para anotações
// ========================================
interface AnnotationTheme {
  gap: RGB;          // Espaçamentos/Gaps (vermelho/rosa)
  padding: RGB;      // Paddings (azul/verde)
  radius: RGB;       // Border Radius (vermelho/rosa)
  border: RGB;       // Bordas (roxo/verde)
  text: RGB;         // Textos (verde)
  width: RGB;        // Dimensões largura (cinza/verde)
  height: RGB;       // Dimensões altura (vermelho/verde)
  effect: RGB;       // Efeitos (laranja)
}

const THEME_NORMAL: AnnotationTheme = {
  gap: {r: 1, g: 0.2, b: 0.2},           // Vermelho
  padding: {r: 0, g: 0.5, b: 1},          // Azul
  radius: {r: 1, g: 0.2, b: 0.2},         // Vermelho
  border: {r: 0.6, g: 0.2, b: 0.6},       // Roxo
  text: {r: 0.2, g: 0.6, b: 0.2},         // Verde
  width: {r: 0.4, g: 0.4, b: 0.4},        // Cinza
  height: {r: 0.85, g: 0.1, b: 0.1},      // Vermelho
  effect: {r: 0.8, g: 0.5, b: 0.2},       // Laranja
};

const THEME_HIGHLIGHT: AnnotationTheme = {
  gap: {r: 255 / 255, g: 199 / 255, b: 203 / 255},      // #FFC7CB Rosa claro
  padding: {r: 98 / 255, g: 248 / 255, b: 79 / 255},    // #62F84F Verde brilhante
  radius: {r: 255 / 255, g: 199 / 255, b: 203 / 255},   // #FFC7CB Rosa claro
  border: {r: 98 / 255, g: 248 / 255, b: 79 / 255},     // #62F84F Verde brilhante
  text: {r: 98 / 255, g: 248 / 255, b: 79 / 255},       // #62F84F Verde brilhante
  width: {r: 98 / 255, g: 248 / 255, b: 79 / 255},      // #62F84F Verde brilhante
  height: {r: 98 / 255, g: 248 / 255, b: 79 / 255},     // #62F84F Verde brilhante
  effect: {r: 255 / 255, g: 183 / 255, b: 77 / 255},    // #FFB74D Laranja claro
};

/**
 * Retorna o tema de cores para anotações baseado no modo.
 * @param highlightMode - Se true, retorna cores de alto contraste
 */
function getTheme(highlightMode: boolean): AnnotationTheme {
  return highlightMode ? THEME_HIGHLIGHT : THEME_NORMAL;
}

// UTILITÁRIAS

// ✅ Helper: Verifica se um nó está visível
function isNodeVisible(node: SceneNode): boolean {
  return !("visible" in node && !node.visible);
}

// ✅ Helper: Verifica se deve pular instância aninhada
// ✅ Verifica se uma instância é estrutural (componentes de base)
// Componentes estruturais começam com ".", "-" ou ".Asset/"
// IMPORTANTE: Verifica tanto o nome do componente quanto o nome do ComponentSet pai
async function isStructuralInstance(instance: InstanceNode): Promise<boolean> {
  // Usa getMainComponentAsync para compatibilidade com dynamic-page
  const mainComp = await instance.getMainComponentAsync();
  if (!mainComp) return false;

  // Helper para verificar se um nome é estrutural
  const isStructuralName = (name: string): boolean => {
    return (
      name.startsWith(".") ||
      name.startsWith("-") ||
      name.startsWith("_") ||
      name.toLowerCase().startsWith(".asset/") ||
      name.toLowerCase().startsWith(".asset")
    );
  };

  // Verificar o nome do componente
  if (isStructuralName(mainComp.name)) {
    return true;
  }

  // Se o componente está dentro de um ComponentSet, verificar o nome do ComponentSet
  if (mainComp.parent && mainComp.parent.type === "COMPONENT_SET") {
    if (isStructuralName(mainComp.parent.name)) {
      return true;
    }
  }

  return false;
}

async function shouldSkipNestedInstance(
  node: SceneNode,
  isTopLevel: boolean,
): Promise<boolean> {
  // Se não é instância, não pular
  if (node.type !== "INSTANCE") return false;

  // Se é o nível principal, não pular
  if (isTopLevel) return false;

  // Se é instância aninhada, verificar se é estrutural
  // Instâncias estruturais (começam com ".", "-", "_" ou ".Asset/") NÃO devem ser puladas
  return !(await isStructuralInstance(node as InstanceNode));
}

/**
 * Resolve o nome "real" de um nó, priorizando o nome do componente principal
 * quando o nó está dentro de uma instância estrutural (.asset, ., -, _).
 *
 * Isso resolve o problema de designers que renomeiam camadas de instâncias
 * (ex: de ".asset/Label" para "Data de Vencimento"), garantindo que o nome
 * original do componente seja usado para identificação semântica.
 *
 * @param node - O nó a ter o nome resolvido
 * @returns Nome resolvido (do componente principal ou do nó)
 */
async function resolveNodeName(node: SceneNode): Promise<string> {
  // Helper para verificar se um nome é estrutural
  const isStructuralName = (name: string): boolean => {
    return (
      name.startsWith(".") ||
      name.startsWith("-") ||
      name.startsWith("_") ||
      name.toLowerCase().startsWith(".asset/") ||
      name.toLowerCase().startsWith(".asset")
    );
  };

  // Helper para limpar o nome (remove prefixos estruturais)
  const cleanStructuralName = (name: string): string => {
    // Remove prefixos como ".asset/", ".", "-", "_"
    let cleaned = name;
    if (cleaned.toLowerCase().startsWith(".asset/")) {
      cleaned = cleaned.substring(7); // Remove ".asset/"
    } else if (
      cleaned.startsWith(".") ||
      cleaned.startsWith("-") ||
      cleaned.startsWith("_")
    ) {
      cleaned = cleaned.substring(1); // Remove o primeiro caractere
    }
    return cleaned;
  };

  // ✅ Percorrer todos os ancestrais até encontrar uma INSTANCE
  // Exemplo: Instance (.asset/Label) -> Frame (Content) -> TextNode ("Data")
  // 1. Verifica pai (Frame): não é instância. Sobe.
  // 2. Verifica avô (Instance .asset/Label): é instância.
  // 3. Checa Main Component: Começa com .asset.
  // 4. Retorno: "Label" (nome do asset limpo).
  let currentNode: BaseNode | null = node.parent;

  while (currentNode) {
    // Verificar se o ancestral atual é uma INSTANCE
    if (currentNode.type === "INSTANCE") {
      const instanceNode = currentNode as InstanceNode;
      const mainComp = await instanceNode.getMainComponentAsync();

      if (mainComp) {
        // Verificar se o mainComponent é estrutural
        if (isStructuralName(mainComp.name)) {
          return cleanStructuralName(mainComp.name);
        }

        // Verificar se o ComponentSet pai é estrutural
        if (mainComp.parent && mainComp.parent.type === "COMPONENT_SET") {
          if (isStructuralName(mainComp.parent.name)) {
            return cleanStructuralName(mainComp.parent.name);
          }
        }

        // ✅ Se encontrou uma INSTANCE mas NÃO é estrutural (componente UI comum),
        // NÃO parar - CONTINUAR subindo para verificar se há uma instância
        // estrutural mais acima na árvore.
      }
    }

    // ✅ Verificar se o ancestral atual é um COMPONENT
    // Necessário quando geramos specs diretamente de um Component Set,
    // onde o pai imediato do texto é um COMPONENT, não uma INSTANCE.
    if (currentNode.type === "COMPONENT") {
      const componentNode = currentNode as ComponentNode;

      // Verificar se o próprio componente é estrutural
      if (isStructuralName(componentNode.name)) {
        return cleanStructuralName(componentNode.name);
      }

      // Verificar se o ComponentSet pai é estrutural
      if (
        componentNode.parent &&
        componentNode.parent.type === "COMPONENT_SET"
      ) {
        if (isStructuralName(componentNode.parent.name)) {
          return cleanStructuralName(componentNode.parent.name);
        }
      }

      // ✅ Se encontrou um COMPONENT mas NÃO é estrutural,
      // CONTINUAR subindo para verificar se há um ancestral estrutural.
    }

    // Subir para o próximo ancestral
    currentNode = currentNode.parent;
  }

  // ✅ Se o próprio nó é uma INSTANCE, verificar seu mainComponent
  if (node.type === "INSTANCE") {
    const mainComp = await (node as InstanceNode).getMainComponentAsync();
    if (mainComp && isStructuralName(mainComp.name)) {
      return cleanStructuralName(mainComp.name);
    }
  }

  // ✅ Se o próprio nó é um COMPONENT, verificar se é estrutural
  if (node.type === "COMPONENT") {
    const componentNode = node as ComponentNode;
    if (isStructuralName(componentNode.name)) {
      return cleanStructuralName(componentNode.name);
    }
    // Verificar se o ComponentSet pai é estrutural
    if (
      componentNode.parent &&
      componentNode.parent.type === "COMPONENT_SET"
    ) {
      if (isStructuralName(componentNode.parent.name)) {
        return cleanStructuralName(componentNode.parent.name);
      }
    }
  }

  // Caso padrão: retornar o nome do nó (nenhuma instância estrutural encontrada)
  return node.name;
}

// ✅ NOVA FUNÇÃO: Buscar nós de texto por tipo
// Filtra instâncias não-estruturais (componentes externos)
async function findTextNodes(
  node: SceneNode,
  isTopLevel: boolean = true,
): Promise<TextNode[]> {
  const textNodes: TextNode[] = [];

  // Skip invisible nodes
  if (!isNodeVisible(node)) {
    return textNodes;
  }

  // ✅ Se for instância aninhada, verificar se é estrutural
  if (node.type === "INSTANCE" && !isTopLevel) {
    if (!(await isStructuralInstance(node))) {
      // Instância não-estrutural - pular
      return textNodes;
    }
  }

  if (node.type === "TEXT") {
    textNodes.push(node);
  }

  if ("children" in node) {
    for (const child of node.children) {
      textNodes.push(...(await findTextNodes(child, false)));
    }
  }

  return textNodes;
}

// CONSTANTES
const IGNORED_PROPERTIES = ["size", "icon"];

// Ordenação de variantes por tamanho (usado em visualizações)
const SIZE_ORDER: Record<string, number> = {
  "x-small": 1,
  xsmall: 1,
  small: 2,
  semiregular: 3,
  regular: 4,
  medium: 5,
  large: 6,
  "x-large": 7,
  xlarge: 7,
};

const SEMANTIC_ROLES: Record<string, string> = {
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
  initials: "Initials",
};

// ========================================
// UTILIDADES DE RESOLUÇÃO DE VARIÁVEIS
// ========================================

/**
 * Resolve uma variável vinculada a uma propriedade do node.
 * Centraliza a lógica de resolução de boundVariables para evitar repetição.
 *
 * @param node - O node do Figma a ser verificado
 * @param property - Nome da propriedade a verificar (ex: "itemSpacing", "width", "strokeWeight")
 * @param formatter - Função opcional para formatar o nome da variável
 * @returns O nome da variável formatado ou null se não houver variável vinculada
 */
async function resolveBoundVariable(
  node: SceneNode,
  property: string,
  formatter?: (name: string) => string,
): Promise<string | null> {
  if (!("boundVariables" in node) || !node.boundVariables) return null;

  if (!(property in node.boundVariables)) return null;

  const binding = (node.boundVariables as any)[property];
  if (binding?.type === "VARIABLE_ALIAS") {
    const variable = await figma.variables.getVariableByIdAsync(binding.id);
    if (variable) {
      return formatter ? formatter(variable.name) : variable.name;
    }
  }
  return null;
}

/**
 * Resolve uma variável vinculada em um array (como effects).
 *
 * @param node - O node do Figma a ser verificado
 * @param property - Nome da propriedade array (ex: "effects")
 * @param index - Índice do elemento no array
 * @param formatter - Função opcional para formatar o nome da variável
 * @returns O nome da variável formatado ou null se não houver variável vinculada
 */
async function resolveBoundVariableAtIndex(
  node: SceneNode,
  property: string,
  index: number,
  formatter?: (name: string) => string,
): Promise<string | null> {
  if (!("boundVariables" in node) || !node.boundVariables) return null;

  if (!(property in node.boundVariables)) return null;

  const bindings = (node.boundVariables as any)[property];
  if (!Array.isArray(bindings) || !bindings[index]) return null;

  const binding = bindings[index];
  if (binding?.type === "VARIABLE_ALIAS") {
    const variable = await figma.variables.getVariableByIdAsync(binding.id);
    if (variable) {
      return formatter ? formatter(variable.name) : variable.name;
    }
  }
  return null;
}

// ========================================
// VARIANT GRID - FUNÇÃO GENÉRICA (HOF)
// ========================================

/**
 * Configuração para criação de grids de variantes.
 */
interface VariantGridConfig {
  /** Nome do grid container */
  gridName: string;
  /** Margem ao redor do componente */
  margin: number;
  /** Altura mínima do frame (default: 250) */
  minHeight?: number;
}

/**
 * Contexto passado para o callback de anotação.
 */
interface VariantAnnotationContext {
  /** Dados da variante (cores, texto, espaçamentos, etc.) */
  vc: VariantColors;
  /** O ComponentNode original da variante */
  variant: ComponentNode;
  /** A instância criada da variante */
  instance: InstanceNode;
  /** Frame de visualização onde as anotações são adicionadas */
  vizFrame: FrameNode;
  /** Se o modo highlight está ativo */
  highlightMode: boolean;
  /** Bounds absolutos da instância */
  instanceBounds: Rect;
}

/**
 * Callback para adicionar anotações específicas a cada variante.
 */
type VariantAnnotationCallback = (
  context: VariantAnnotationContext,
) => Promise<void>;

/**
 * Cria um grid de variantes genérico com suporte a diferentes tipos de anotação.
 * Utiliza o padrão Higher-Order Functions (HOF) para permitir customização.
 *
 * @param parent - Frame pai onde o grid será adicionado
 * @param componentSet - ComponentSet contendo as variantes
 * @param variantColors - Dados extraídos de cada variante
 * @param tableWidth - Largura total da tabela/grid
 * @param highlightMode - Se o modo highlight está ativo
 * @param framesPerRow - Número de frames por linha
 * @param config - Configuração do grid (nome, margem, altura mínima)
 * @param annotationCallback - Função que adiciona as anotações específicas
 */
async function createGenericVariantGrid(
  parent: FrameNode,
  componentSet: ComponentSetNode,
  variantColors: VariantColors[],
  tableWidth: number,
  highlightMode: boolean,
  framesPerRow: number,
  config: VariantGridConfig,
  annotationCallback: VariantAnnotationCallback,
): Promise<void> {
  const sortedVariants = sortVariantsBySize(variantColors);
  const minHeight = config.minHeight ?? 250;

  // Container principal com wrap
  const gridContainer = figma.createFrame();
  gridContainer.name = config.gridName;
  gridContainer.layoutMode = "HORIZONTAL";
  gridContainer.layoutWrap = "WRAP";
  gridContainer.primaryAxisSizingMode = "FIXED";
  gridContainer.counterAxisSizingMode = "AUTO";
  gridContainer.resize(tableWidth, 100);
  gridContainer.itemSpacing = 24;
  gridContainer.counterAxisSpacing = 24;
  gridContainer.fills = [];

  // Calcular tamanho dos frames baseado no número de colunas
  const numColumns = framesPerRow;
  const frameWidth = Math.floor(
    (tableWidth - (numColumns - 1) * 24) / numColumns,
  );

  // Calcular altura máxima de todas as variantes ANTES do loop
  let maxFrameHeight = minHeight;
  for (const vc of sortedVariants) {
    const variant = componentSet.children.find(
      (c) => c.type === "COMPONENT" && c.name === vc.variantName,
    ) as ComponentNode | undefined;
    if (variant) {
      const candidateHeight = Math.max(
        minHeight,
        variant.height + config.margin * 2,
      );
      if (candidateHeight > maxFrameHeight) {
        maxFrameHeight = candidateHeight;
      }
    }
  }

  // Processar cada variante
  for (const vc of sortedVariants) {
    const variant = componentSet.children.find(
      (c) => c.type === "COMPONENT" && c.name === vc.variantName,
    ) as ComponentNode | undefined;

    if (!variant) continue;

    const frameHeight = maxFrameHeight;
    const title = getVariantTitle(vc);

    const {outerFrame, vizFrame, instance} = await createTitledVariantFrame(
      variant,
      title,
      frameWidth,
      frameHeight,
      highlightMode,
    );

    const instanceBounds = instance.absoluteBoundingBox;
    if (instanceBounds) {
      // Chamar callback de anotação com contexto completo
      await annotationCallback({
        vc,
        variant,
        instance,
        vizFrame,
        highlightMode,
        instanceBounds,
      });
    }

    gridContainer.appendChild(outerFrame);
  }

  parent.appendChild(gridContainer);
}

// ========================================
// UI TEXT FACTORY - Centralização de criação de textos
// ========================================

/**
 * Configuração de fonte padrão do sistema.
 */
const FONT_FAMILY = "BancoDoBrasil Textos";

/**
 * Estilos de texto pré-definidos para consistência.
 */
type TextStylePreset =
  | "title" // 32px Bold - Títulos de seção
  | "subtitle" // 24px Bold - Subtítulos
  | "heading" // 18px Medium - Cabeçalhos
  | "body" // 16px Regular - Texto principal
  | "bodyBold" // 16px Bold - Texto principal em negrito
  | "small" // 14px Regular - Texto secundário
  | "label" // 12px Regular - Labels
  | "caption"; // 10px Regular - Legendas

/**
 * Definições dos estilos de texto.
 */
const TEXT_STYLE_PRESETS: Record<
  TextStylePreset,
  {
    fontSize: number;
    fontStyle: "Regular" | "Medium" | "Bold";
  }
> = {
  title: {fontSize: 32, fontStyle: "Bold"},
  subtitle: {fontSize: 24, fontStyle: "Bold"},
  heading: {fontSize: 18, fontStyle: "Medium"},
  body: {fontSize: 16, fontStyle: "Regular"},
  bodyBold: {fontSize: 16, fontStyle: "Bold"},
  small: {fontSize: 14, fontStyle: "Regular"},
  label: {fontSize: 12, fontStyle: "Regular"},
  caption: {fontSize: 10, fontStyle: "Regular"},
};

/**
 * Cores padrão para textos.
 */
const TEXT_COLORS = {
  default: {r: 0, g: 0, b: 0} as RGB,
  secondary: {r: 0.4, g: 0.4, b: 0.4} as RGB,
  muted: {r: 0.6, g: 0.6, b: 0.6} as RGB,
  success: {r: 0.2, g: 0.6, b: 0.2} as RGB,
  error: {r: 0.85, g: 0.1, b: 0.1} as RGB,
  warning: {r: 0.8, g: 0.5, b: 0.2} as RGB,
  white: {r: 1, g: 1, b: 1} as RGB,
};

/**
 * Factory para criar nós de texto com configuração simplificada.
 * Centraliza a criação de textos para garantir consistência visual.
 *
 * @param content - O texto a ser exibido
 * @param preset - Estilo pré-definido ou configuração customizada
 * @param options - Opções adicionais (cor, posição)
 * @returns TextNode configurado
 */
function createText(
  content: string,
  preset:
    | TextStylePreset
    | {fontSize: number; fontStyle: "Regular" | "Medium" | "Bold"} = "body",
  options?: {
    color?: RGB | keyof typeof TEXT_COLORS;
    x?: number;
    y?: number;
  },
): TextNode {
  const textNode = figma.createText();

  // Determinar estilo (preset ou customizado)
  const style =
    typeof preset === "string" ? TEXT_STYLE_PRESETS[preset] : preset;

  textNode.fontName = {family: FONT_FAMILY, style: style.fontStyle};
  textNode.fontSize = style.fontSize;
  textNode.characters = content;

  // Aplicar cor
  if (options?.color) {
    const colorValue =
      typeof options.color === "string"
        ? TEXT_COLORS[options.color]
        : options.color;
    textNode.fills = [{type: "SOLID", color: colorValue}];
  }

  // Aplicar posição
  if (options?.x !== undefined) textNode.x = options.x;
  if (options?.y !== undefined) textNode.y = options.y;

  return textNode;
}

/**
 * Cria um texto e o adiciona a um container.
 */
function createTextInContainer(
  content: string,
  container: FrameNode,
  preset: TextStylePreset = "body",
  options?: {
    color?: RGB | keyof typeof TEXT_COLORS;
  },
): TextNode {
  const textNode = createText(content, preset, options);
  container.appendChild(textNode);
  return textNode;
}

// ========================================
// HELPERS DE CRIAÇÃO DE UI
// ========================================

// ✅ Helper: Cria container de seção com layout vertical
function createSectionContainer(
  name: string,
  itemSpacing: number = 24,
): FrameNode {
  const section = figma.createFrame();
  section.name = name;
  section.layoutMode = "VERTICAL";
  section.primaryAxisSizingMode = "AUTO";
  section.counterAxisSizingMode = "AUTO";
  section.itemSpacing = itemSpacing;
  section.fills = [];
  return section;
}

// ✅ Helper: Cria título de seção
function createSectionTitle(
  text: string,
  parent: FrameNode,
  fontSize: number = 32,
  style: "Bold" | "Medium" | "Regular" = "Bold",
): TextNode {
  const title = figma.createText();
  title.fontName = {family: "BancoDoBrasil Textos", style};
  title.fontSize = fontSize;
  title.characters = text;
  parent.appendChild(title);
  return title;
}

// ✅ Helper: Cria container de tabela
function createTableContainer(name: string): FrameNode {
  const table = figma.createFrame();
  table.name = name;
  table.fills = [];
  return table;
}

// ✅ Helper: Cria container de tabela com AutoLayout vertical (para linhas)
function createTableAutoLayoutContainer(
  name: string,
  tableWidth: number,
  rowGap: number = 4,
): FrameNode {
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

// ✅ Helper: Cria uma linha de tabela como Group
function createTableRowGroup(
  name: string,
  tableWidth: number,
  rowHeight: number = 44,
): GroupNode {
  // Criar um frame temporário para agrupar depois
  const rowFrame = figma.createFrame();
  rowFrame.name = name;
  rowFrame.resize(tableWidth, rowHeight);
  rowFrame.fills = [{type: "SOLID", color: {r: 1, g: 1, b: 1}}];
  rowFrame.cornerRadius = 4;
  return rowFrame as unknown as GroupNode; // Será convertido para grupo depois
}

// ✅ Helper: Converte elementos em um Group e adiciona ao container
function groupElementsAndAppend(
  elements: SceneNode[],
  groupName: string,
  container: FrameNode,
): GroupNode {
  // Criar um frame temporário SEM AutoLayout para preservar posições
  const tempFrame = figma.createFrame();
  tempFrame.name = "temp";
  tempFrame.fills = [];

  // Adicionar elementos ao frame temporário (preserva x/y)
  for (const el of elements) {
    tempFrame.appendChild(el);
  }

  // Agrupar os elementos dentro do frame temporário
  const group = figma.group(elements, tempFrame);
  group.name = groupName;

  // Mover o grupo para o container final (AutoLayout)
  container.appendChild(group);

  // Remover o frame temporário
  tempFrame.remove();

  return group;
}

// ✅ Helper: Cria fundo de linha de tabela
function createTableRowBackground(
  width: number,
  height: number = 44,
  cornerRadius: number = 4,
): RectangleNode {
  const rowBg = figma.createRectangle();
  rowBg.name = "Row Background";
  rowBg.resize(width, height);
  rowBg.fills = [{type: "SOLID", color: {r: 1, g: 1, b: 1}}];
  rowBg.cornerRadius = cornerRadius;
  rowBg.x = 0;
  rowBg.y = 0;
  return rowBg;
}

// ✅ Helper: Cria célula de texto para tabela
interface TableCellConfig {
  text: string;
  x: number;
  y?: number;
  fontSize?: number;
  fontStyle?: "Regular" | "Bold" | "Medium";
  color?: RGB;
}

function createTableTextCell(config: TableCellConfig): TextNode {
  const {
    text,
    x,
    y = 12,
    fontSize = 16,
    fontStyle = "Regular",
    color = {r: 0, g: 0, b: 0},
  } = config;

  const textNode = figma.createText();
  textNode.fontName = {family: "BancoDoBrasil Textos", style: fontStyle};
  textNode.fontSize = fontSize;
  textNode.characters = text;
  textNode.fills = [{type: "SOLID", color}];
  textNode.x = x;
  textNode.y = y;
  return textNode;
}

// ✅ Helper: Cria header de tabela
function createTableHeader(
  headers: string[],
  positions: number[],
  tableContainer: FrameNode,
): void {
  const headerElements: SceneNode[] = [];

  for (let i = 0; i < headers.length; i++) {
    const headerText = createTableTextCell({
      text: headers[i],
      x: positions[i],
      y: 0,
      fontStyle: "Bold",
      color: {r: 0.4, g: 0.4, b: 0.4},
    });
    headerElements.push(headerText);
  }

  groupElementsAndAppend(headerElements, "Header", tableContainer);
}

// ✅ Helper: Cria linha completa de tabela e adiciona ao container
interface TableRowConfig {
  rowName: string;
  width: number;
  height?: number;
  cells: TableCellConfig[];
  additionalElements?: SceneNode[];
}

function createTableRow(
  config: TableRowConfig,
  container: FrameNode,
): GroupNode {
  const {rowName, width, height = 44, cells, additionalElements = []} = config;

  const rowElements: SceneNode[] = [];

  // Fundo da linha
  rowElements.push(createTableRowBackground(width, height));

  // Células de texto
  for (const cell of cells) {
    rowElements.push(createTableTextCell(cell));
  }

  // Elementos adicionais (ex: círculo de cor)
  for (const element of additionalElements) {
    rowElements.push(element);
  }

  return groupElementsAndAppend(rowElements, rowName, container);
}

// ✅ Helper: Cria espaçador entre grupos de tabela
function createTableSpacer(
  width: number,
  height: number,
  container: FrameNode,
): void {
  const spacer = figma.createFrame();
  spacer.name = "Spacer";
  spacer.resize(width, height);
  spacer.fills = [];
  container.appendChild(spacer);
}

// ========================================
// TABLE BUILDER - Construtor Genérico de Tabelas
// ========================================

/**
 * Configuração de coluna para o TableBuilder.
 */
interface TableColumnConfig {
  header: string;
  /** Posição X relativa (0-1) ou absoluta (>1) */
  position: number;
  /** Cor do texto da coluna */
  color?: RGB | keyof typeof TEXT_COLORS;
}

/**
 * Configuração de célula para renderização.
 */
interface TableCellData {
  text: string;
  color?: RGB | keyof typeof TEXT_COLORS;
  /** Elementos adicionais (ex: círculo de cor, ícone) */
  extraElements?: SceneNode[];
}

/**
 * Classe TableBuilder para criação simplificada de tabelas.
 * Automatiza a criação de container, headers e linhas.
 */
class TableBuilder {
  private container: FrameNode;
  private columns: TableColumnConfig[];
  private tableWidth: number;
  private rowHeight: number;
  private rowGap: number;

  constructor(
    name: string,
    tableWidth: number,
    columns: TableColumnConfig[],
    options?: {
      rowHeight?: number;
      rowGap?: number;
    },
  ) {
    this.tableWidth = tableWidth;
    this.columns = columns;
    this.rowHeight = options?.rowHeight ?? 44;
    this.rowGap = options?.rowGap ?? 4;

    // Criar container principal
    this.container = createTableAutoLayoutContainer(
      name,
      tableWidth,
      this.rowGap,
    );

    // Criar header automaticamente
    this.createHeader();
  }

  /**
   * Cria a linha de cabeçalho.
   */
  private createHeader(): void {
    const headerElements: SceneNode[] = [];

    for (const col of this.columns) {
      const x =
        col.position <= 1
          ? Math.floor(this.tableWidth * col.position)
          : col.position;

      const headerText = createText(col.header, "bodyBold", {
        color: "secondary",
        x,
        y: 0,
      });
      headerElements.push(headerText);
    }

    groupElementsAndAppend(headerElements, "Header", this.container);
  }

  /**
   * Adiciona uma linha de dados à tabela.
   *
   * @param rowName - Nome identificador da linha
   * @param cells - Dados das células (devem corresponder às colunas)
   */
  addRow(rowName: string, cells: TableCellData[]): void {
    const rowElements: SceneNode[] = [];

    // Fundo da linha
    rowElements.push(createTableRowBackground(this.tableWidth, this.rowHeight));

    // Células
    for (let i = 0; i < this.columns.length && i < cells.length; i++) {
      const col = this.columns[i];
      const cell = cells[i];

      const x =
        col.position <= 1
          ? Math.floor(this.tableWidth * col.position) + 16 // padding interno
          : col.position + 16;

      // Resolver cor
      let colorValue: RGB = TEXT_COLORS.default;
      if (cell.color) {
        colorValue =
          typeof cell.color === "string" ? TEXT_COLORS[cell.color] : cell.color;
      } else if (col.color) {
        colorValue =
          typeof col.color === "string" ? TEXT_COLORS[col.color] : col.color;
      }

      const textNode = createText(cell.text, "body", {
        color: colorValue,
        x,
        y: 12,
      });
      rowElements.push(textNode);

      // Elementos extras
      if (cell.extraElements) {
        for (const el of cell.extraElements) {
          rowElements.push(el);
        }
      }
    }

    groupElementsAndAppend(rowElements, rowName, this.container);
  }

  /**
   * Adiciona um espaçador entre grupos de linhas.
   */
  addSpacer(height: number = 12): void {
    createTableSpacer(this.tableWidth, height, this.container);
  }

  /**
   * Retorna o container da tabela para ser adicionado ao parent.
   */
  build(): FrameNode {
    return this.container;
  }

  /**
   * Adiciona a tabela ao container pai.
   */
  appendTo(parent: FrameNode): void {
    parent.appendChild(this.container);
  }
}

/**
 * Factory function para criar TableBuilder com configuração simplificada.
 */
function createTableBuilder(
  name: string,
  tableWidth: number,
  columns: TableColumnConfig[],
  options?: {rowHeight?: number; rowGap?: number},
): TableBuilder {
  return new TableBuilder(name, tableWidth, columns, options);
}

// ✅ Helper: Cria container de grid para variantes
function createVariantGridContainer(
  name: string,
  tableWidth: number,
  itemSpacing: number = 24,
): FrameNode {
  const grid = figma.createFrame();
  grid.name = name;
  grid.layoutMode = "HORIZONTAL";
  grid.layoutWrap = "WRAP";
  grid.primaryAxisSizingMode = "FIXED";
  grid.counterAxisSizingMode = "AUTO";
  grid.resize(tableWidth, 100);
  grid.itemSpacing = itemSpacing;
  grid.counterAxisSpacing = itemSpacing;
  grid.fills = [];
  return grid;
}

// ========================================
// UTILITÁRIOS DE FORMATAÇÃO
// ========================================

function formatToken(variableName: string): string {
  return `$color-${variableName.toLowerCase().replace(/\//g, "-").replace(/\s+/g, "-")}`;
}

function formatSpaceToken(variableName: string): string {
  return `$${variableName
    .toLowerCase()
    .replace(/^(spacing|space|size)[-/]/g, "")
    .replace(/\//g, "-")
    .replace(/\s+/g, "-")}`;
}

function pad(str: string, length: number, char: string): string {
  while (str.length < length) str = char + str;
  return str;
}

function rgbToHex(color: RGB): string {
  const r = Math.round(color.r * 255);
  const g = Math.round(color.g * 255);
  const b = Math.round(color.b * 255);
  return `#${pad(r.toString(16), 2, "0")}${pad(g.toString(16), 2, "0")}${pad(b.toString(16), 2, "0")}`.toUpperCase();
}

function hexToRgb(hex: string): RGB {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16) / 255,
        g: parseInt(result[2], 16) / 255,
        b: parseInt(result[3], 16) / 255,
      }
    : {r: 0, g: 0, b: 0};
}

function extractRelevantProperties(
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

function extractMainState(variantName: string): string {
  const props = extractRelevantProperties(variantName);
  return props["status"] || Object.values(props)[0] || "Default";
}

function formatPropertiesForDisplay(variantName: string): string {
  const props = extractRelevantProperties(variantName);
  return Object.values(props).join(" / ") || "Default";
}

// ✅ Extrai TODAS as propriedades de uma variante (incluindo size)
function extractAllProperties(variantName: string): Record<string, string> {
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

function resolveSpacingElement(node: SceneNode): string {
  const name = node.name.toLowerCase();
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

// NOTA: Função findNodeById removida - não era utilizada no código

// ✅ FUNÇÃO PARA EXTRAIR COR DE ÍCONE (busca por nó "Vector" dentro de instâncias)
async function extractIconColor(
  node: InstanceNode,
  state: string,
  properties: string,
): Promise<ColorSpec | null> {
  // Buscar recursivamente por um nó chamado "Vector"
  const vectorNode = findVectorNode(node);
  if (!vectorNode) return null;

  // Extrair cor do fill do Vector
  if ("fills" in vectorNode && Array.isArray(vectorNode.fills)) {
    for (const paint of vectorNode.fills) {
      if (paint.type === "SOLID" && paint.visible !== false) {
        const hex = rgbToHex(paint.color);
        let token: string | null = null;
        let varId: string | null = null;

        if (paint.boundVariables?.color) {
          varId = paint.boundVariables.color.id;
          const variable = await figma.variables.getVariableByIdAsync(varId);
          if (variable) token = formatToken(variable.name);
        }

        // Usar o nome do ícone (instância) como elemento
        const iconName = node.name || "Icon";

        return {
          element: `Icon (${iconName})`,
          state,
          token,
          colorHex: hex,
          colorVariableId: varId,
          properties,
        };
      }
    }
  }

  return null;
}

// ✅ FUNÇÃO AUXILIAR: Busca recursiva por nó chamado "Vector"
function findVectorNode(node: SceneNode): SceneNode | null {
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

// ========================================
// HELPER FUNCTIONS PARA EFEITOS
// ========================================
function formatEffectToken(variableName: string): string {
  return `$effect-${variableName.toLowerCase().replace(/\//g, "-").replace(/\s+/g, "-")}`;
}

function formatEffectValue(effect: Effect): string {
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

function getEffectTypeLabel(effectType: string): string {
  const labels: Record<string, string> = {
    DROP_SHADOW: "Drop Shadow",
    INNER_SHADOW: "Inner Shadow",
    LAYER_BLUR: "Layer Blur",
    BACKGROUND_BLUR: "Background Blur",
  };
  return labels[effectType] || effectType;
}

// ========================================
// SINGLE PASS TRAVERSAL - COLETA DE DADOS
// ========================================

/**
 * Interface para armazenar todos os dados coletados de um nó em uma única travessia.
 */
interface CollectedNodeData {
  colors: ColorSpec[];
  textStyles: TextSpec[];
  spacings: SpacingSpec[];
  borders: BorderSpec[];
  effects: EffectSpec[];
  usedComponents: Map<string, string>;
}

/**
 * Coleta todos os dados de um nó e seus filhos em uma ÚNICA travessia da árvore.
 * Substitui as 5 funções de extração separadas para melhor performance.
 *
 * @param node - O nó raiz a ser processado
 * @param state - Estado da variante (ex: "Default", "Hover")
 * @param properties - Propriedades formatadas para display
 * @param data - Objeto para acumular os dados coletados
 * @param isTopLevel - Se é o nó de nível superior
 */
async function collectNodeData(
  node: SceneNode,
  state: string,
  properties: string,
  data: CollectedNodeData,
  isTopLevel: boolean = false,
): Promise<void> {
  // ✅ Ignorar nós ocultos
  if (!isNodeVisible(node)) return;

  // ✅ Verificar se é instância para coletar componentes usados e extrair cor de ícone
  if (node.type === "INSTANCE") {
    const mainComponent = await node.getMainComponentAsync();
    if (mainComponent) {
      const displayName =
        mainComponent.parent?.type === "COMPONENT_SET"
          ? mainComponent.parent.name
          : mainComponent.name;
      if (displayName) {
        data.usedComponents.set(mainComponent.id, displayName);
      }
    }

    // Extrair cor de ícone (se houver)
    const iconColor = await extractIconColor(node, state, properties);
    if (iconColor) {
      data.colors.push(iconColor);
    }

    // Se não é top level, retornar para evitar duplicação de cores
    if (!isTopLevel) {
      return;
    }
  }

  // ✅ Pular instâncias aninhadas não-estruturais (exceto para o nó principal)
  if (await shouldSkipNestedInstance(node, isTopLevel)) return;

  // ========================================
  // EXTRAÇÃO DE CORES (fills e strokes)
  // ========================================
  // ✅ Usar resolveNodeName para obter o nome "real" (do componente principal se estrutural)
  const resolvedName = await resolveNodeName(node);
  const nodeName = resolvedName.toLowerCase();
  let semanticRole: string | null = null;
  for (const [key, value] of Object.entries(SEMANTIC_ROLES)) {
    if (nodeName.includes(key)) {
      semanticRole = value;
      break;
    }
  }
  const elementName = semanticRole || resolvedName;
  const spacingElementName = resolveSpacingElement(node);

  // Cores de fills
  if ("fills" in node && Array.isArray(node.fills)) {
    for (const paint of node.fills) {
      if (paint.type === "SOLID") {
        const hex = rgbToHex(paint.color);
        let token: string | null = null;
        let varId: string | null = null;
        if (paint.boundVariables?.color) {
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
          properties,
        });
      }
    }
  }

  // Cores de strokes
  if ("strokes" in node && Array.isArray(node.strokes)) {
    for (const paint of node.strokes) {
      if (paint.type === "SOLID") {
        const hex = rgbToHex(paint.color);
        let token: string | null = null;
        let varId: string | null = null;
        if (paint.boundVariables?.color) {
          varId = paint.boundVariables.color.id;
          const variable = await figma.variables.getVariableByIdAsync(varId);
          if (variable) token = formatToken(variable.name);
        }
        const element = semanticRole
          ? `${semanticRole} Border`
          : `${node.name} Border`;
        data.colors.push({
          element,
          state,
          token,
          colorHex: hex,
          colorVariableId: varId,
          properties,
        });
      }
    }
  }

  // ========================================
  // EXTRAÇÃO DE TEXTOS
  // ========================================
  if (node.type === "TEXT") {
    // ✅ Usar a mesma lógica de elementName (semanticRole || resolvedName)
    // Se não houver match no SEMANTIC_ROLES, usar o nome resolvido do componente
    // Exemplo: .asset/Saldo -> "Saldo" (não "Text")
    const textElement = semanticRole || resolvedName;

    let token: string | null = null;
    if (
      node.textStyleId &&
      node.textStyleId !== "" &&
      node.textStyleId !== figma.mixed
    ) {
      const textStyle = await figma.getStyleByIdAsync(node.textStyleId);
      if (textStyle && textStyle.type === "TEXT") {
        token = textStyle.name
          .toLowerCase()
          .replace(/\//g, "-")
          .replace(/\s+/g, "-");
      }
    }

    const fontName =
      node.fontName !== figma.mixed
        ? node.fontName
        : {family: "Mixed", style: "Mixed"};
    const fontSize = node.fontSize !== figma.mixed ? node.fontSize : 0;
    const lineHeight =
      node.lineHeight !== figma.mixed
        ? typeof node.lineHeight === "object" && "value" in node.lineHeight
          ? `${Math.round(node.lineHeight.value)}${node.lineHeight.unit === "PIXELS" ? "px" : "%"}`
          : "Auto"
        : "Mixed";
    const letterSpacing =
      node.letterSpacing !== figma.mixed
        ? typeof node.letterSpacing === "object" &&
          "value" in node.letterSpacing
          ? `${Math.round(node.letterSpacing.value * 100) / 100}${node.letterSpacing.unit === "PIXELS" ? "px" : "%"}`
          : "0%"
        : "Mixed";

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
      nodeId: node.id,
    });
  }

  // ========================================
  // EXTRAÇÃO DE ESPAÇAMENTOS
  // ========================================
  // GAP
  if (
    "layoutMode" in node &&
    node.layoutMode !== "NONE" &&
    "itemSpacing" in node &&
    node.itemSpacing > 0 &&
    "children" in node &&
    node.children.length >= 2
  ) {
    const token = await resolveBoundVariable(
      node,
      "itemSpacing",
      formatSpaceToken,
    );
    data.spacings.push({
      element: spacingElementName,
      property: "Gap",
      token,
      value: `${node.itemSpacing}px`,
      direction: node.layoutMode === "HORIZONTAL" ? "H" : "V",
      properties: spacingElementName,
      sourceNodeId: node.id,
    });
  }

  // PADDINGS
  if ("layoutMode" in node && node.layoutMode !== "NONE") {
    const paddings = [
      {prop: "paddingTop", label: "Padding Top", dir: "V" as const},
      {prop: "paddingBottom", label: "Padding Bottom", dir: "V" as const},
      {prop: "paddingLeft", label: "Padding Left", dir: "H" as const},
      {prop: "paddingRight", label: "Padding Right", dir: "H" as const},
    ];

    for (const pad of paddings) {
      const paddingValue = (node as any)[pad.prop];
      if (paddingValue > 0) {
        const token = await resolveBoundVariable(
          node,
          pad.prop,
          formatSpaceToken,
        );
        data.spacings.push({
          element: spacingElementName,
          property: pad.label,
          token,
          value: `${paddingValue}px`,
          direction: pad.dir,
          properties,
          sourceNodeId: node.id,
        });
      }
    }
  }

  // WIDTH / HEIGHT - apenas para o nó principal
  if ("width" in node && "height" in node && isTopLevel) {
    const widthToken = await resolveBoundVariable(
      node,
      "width",
      formatSpaceToken,
    );
    data.spacings.push({
      element: spacingElementName,
      property: "Width",
      token: widthToken,
      value: `${Math.round(node.width)}px`,
      properties,
      sourceNodeId: node.id,
    });

    const heightToken = await resolveBoundVariable(
      node,
      "height",
      formatSpaceToken,
    );
    data.spacings.push({
      element: spacingElementName,
      property: "Height",
      token: heightToken,
      value: `${Math.round(node.height)}px`,
      properties,
      sourceNodeId: node.id,
    });
  }

  // STROKE WEIGHT (para spacings)
  if (
    "strokeWeight" in node &&
    typeof node.strokeWeight === "number" &&
    node.strokeWeight > 0
  ) {
    const strokeToken = await resolveBoundVariable(
      node,
      "strokeWeight",
      formatSpaceToken,
    );
    data.spacings.push({
      element: spacingElementName,
      property: "Stroke Weight",
      token: strokeToken,
      value: `${node.strokeWeight}px`,
      properties,
      sourceNodeId: node.id,
    });
  }

  // BORDER RADIUS
  if ("cornerRadius" in node) {
    const radii = [
      (node as any).topLeftRadius,
      (node as any).topRightRadius,
      (node as any).bottomLeftRadius,
      (node as any).bottomRightRadius,
    ].filter((r) => typeof r === "number" && r > 0);
    if (radii.length > 0) {
      const radiusFormatter = (name: string) =>
        `$${name.toLowerCase().replace(/\//g, "-").replace(/\s+/g, "-")}`;
      let token: string | null = null;
      for (const key of [
        "topLeftRadius",
        "topRightRadius",
        "bottomLeftRadius",
        "bottomRightRadius",
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
        sourceNodeId: node.id,
      });
    }
  }

  // ========================================
  // EXTRAÇÃO DE BORDAS
  // ========================================
  const hasVisibleStrokes =
    "strokes" in node &&
    Array.isArray(node.strokes) &&
    node.strokes.length > 0 &&
    node.strokes.some((stroke: Paint) => stroke.visible !== false);

  if (hasVisibleStrokes && "strokeWeight" in node) {
    let position: "Inside" | "Outside" | "Center" = "Center";
    if ("strokeAlign" in node) {
      const align = (node as any).strokeAlign;
      if (align === "INSIDE") position = "Inside";
      else if (align === "OUTSIDE") position = "Outside";
      else position = "Center";
    }

    const hasIndividualStrokes =
      "strokeTopWeight" in node ||
      "strokeBottomWeight" in node ||
      "strokeLeftWeight" in node ||
      "strokeRightWeight" in node;

    if (hasIndividualStrokes) {
      const sides: {
        prop: string;
        label: "Top" | "Bottom" | "Left" | "Right";
        varKey: string;
      }[] = [
        {prop: "strokeTopWeight", label: "Top", varKey: "strokeTopWeight"},
        {
          prop: "strokeBottomWeight",
          label: "Bottom",
          varKey: "strokeBottomWeight",
        },
        {prop: "strokeLeftWeight", label: "Left", varKey: "strokeLeftWeight"},
        {
          prop: "strokeRightWeight",
          label: "Right",
          varKey: "strokeRightWeight",
        },
      ];

      for (const side of sides) {
        const weight = (node as any)[side.prop];
        if (typeof weight === "number" && weight > 0) {
          const token = await resolveBoundVariable(
            node,
            side.varKey,
            formatSpaceToken,
          );
          data.borders.push({
            element: spacingElementName,
            token,
            value: `${weight}px`,
            properties,
            sourceNodeId: node.id,
            side: side.label,
            position,
          });
        }
      }
    } else if (typeof node.strokeWeight === "number" && node.strokeWeight > 0) {
      const token = await resolveBoundVariable(
        node,
        "strokeWeight",
        formatSpaceToken,
      );
      data.borders.push({
        element: spacingElementName,
        token,
        value: `${node.strokeWeight}px`,
        properties,
        sourceNodeId: node.id,
        side: "All",
        position,
      });
    }
  }

  // ========================================
  // EXTRAÇÃO DE EFEITOS
  // ========================================
  if (
    "effects" in node &&
    Array.isArray(node.effects) &&
    node.effects.length > 0
  ) {
    for (let i = 0; i < node.effects.length; i++) {
      const effect = node.effects[i];
      if (!effect.visible) continue;

      let token: string | null = null;

      if (
        "effectStyleId" in node &&
        node.effectStyleId &&
        node.effectStyleId !== ""
      ) {
        try {
          const effectStyle = await figma.getStyleByIdAsync(
            node.effectStyleId as string,
          );
          if (effectStyle && effectStyle.type === "EFFECT") {
            token = formatEffectToken(effectStyle.name);
          }
        } catch {
          // Ignore if style not found
        }
      }

      if (!token) {
        token = await resolveBoundVariableAtIndex(
          node,
          "effects",
          i,
          formatEffectToken,
        );
      }

      data.effects.push({
        element: spacingElementName,
        effectType: effect.type,
        token,
        value: formatEffectValue(effect),
        properties,
        sourceNodeId: node.id,
      });
    }
  }

  // ========================================
  // RECURSÃO - Processar filhos
  // ========================================
  if ("children" in node) {
    for (const child of node.children) {
      await collectNodeData(child, state, properties, data);
    }
  }
}

/**
 * Cria um objeto CollectedNodeData vazio para iniciar a coleta.
 */
function createEmptyCollectedData(): CollectedNodeData {
  return {
    colors: [],
    textStyles: [],
    spacings: [],
    borders: [],
    effects: [],
    usedComponents: new Map<string, string>(),
  };
}

// PROCESSAMENTO DO COMPONENTE
async function processComponent(
  component: ComponentNode | ComponentSetNode | InstanceNode,
): Promise<VariantColors[]> {
  const results: VariantColors[] = [];
  const allColors: ColorSpec[] = [];
  const allUsedComponents = new Map<string, string>();

  // ✅ PROCESSAR INSTÂNCIA - Single Pass Traversal
  if (component.type === "INSTANCE") {
    const data = createEmptyCollectedData();
    await collectNodeData(component, "Default", "Instance", data, true);

    // Sempre adicionar resultado para instâncias
    if (
      data.colors.length > 0 ||
      data.textStyles.length > 0 ||
      data.spacings.length > 0 ||
      data.borders.length > 0 ||
      data.effects.length > 0 ||
      data.usedComponents.size > 0
    ) {
      results.push({
        variantName: "Default",
        properties: "Instance",
        propertyMap: {},
        colors: data.colors,
        textStyles: data.textStyles,
        spacings: data.spacings,
        borders: data.borders,
        effects: data.effects,
        usedComponents: data.usedComponents,
      });
    }

    // Se não encontrou nada, criar resultado vazio para permitir visualizações
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
        usedComponents: new Map<string, string>(),
      });
    }

    return results;
  }

  // ✅ PROCESSAR COMPONENT_SET - Single Pass Traversal para cada variante
  if (component.type === "COMPONENT_SET") {
    for (const variant of component.children) {
      if (variant.type !== "COMPONENT") continue;

      const stateName = extractMainState(variant.name);
      const displayProperties = formatPropertiesForDisplay(variant.name);
      const propertyMap = extractAllProperties(variant.name);

      // Single pass - coleta todos os dados de uma vez
      const data = createEmptyCollectedData();
      await collectNodeData(variant, stateName, displayProperties, data);

      // Acumular para tabelas globais
      for (const color of data.colors) allColors.push(color);
      for (const [id, name] of data.usedComponents)
        allUsedComponents.set(id, name);

      // Criar VariantColors para esta variante
      results.push({
        variantName: variant.name,
        properties: displayProperties,
        propertyMap,
        colors: data.colors,
        textStyles: data.textStyles,
        spacings: data.spacings,
        borders: data.borders,
        effects: data.effects,
        usedComponents: data.usedComponents,
      });
    }
  } else {
    // ✅ PROCESSAR COMPONENTE SIMPLES - Single Pass Traversal
    const data = createEmptyCollectedData();
    await collectNodeData(component, "Default", "Default", data);

    if (
      data.colors.length > 0 ||
      data.textStyles.length > 0 ||
      data.effects.length > 0 ||
      data.usedComponents.size > 0
    ) {
      results.push({
        variantName: "Default",
        properties: "Default",
        propertyMap: {},
        colors: data.colors,
        textStyles: data.textStyles,
        spacings: data.spacings,
        borders: data.borders,
        effects: data.effects,
        usedComponents: data.usedComponents,
      });
    }
  }

  return results;
}

// ========================================
// FUNÇÕES DE ANOTAÇÃO SIMPLES E LIMPAS
// ========================================

// ✅ Função auxiliar para criar anotação AGRUPADA: dot + linha + label
async function createSimpleAnnotation(
  container: FrameNode,
  startX: number,
  startY: number,
  endX: number,
  endY: number,
  label: string,
  color: RGB,
): Promise<void> {
  const DOT_SIZE = 8;
  const PADDING = 2;

  const deltaX = endX - startX;
  const deltaY = endY - startY;
  const isVertical = Math.abs(deltaY) >= Math.abs(deltaX);

  // ✅ Criar frame redimensionável para a anotação
  const group = figma.createFrame();
  group.name = label;
  group.fills = [];
  group.clipsContent = false;

  // Criar o dot (ponto de origem)
  const dot = figma.createEllipse();
  dot.name = "Dot";
  dot.resize(DOT_SIZE, DOT_SIZE);
  dot.fills = [{type: "SOLID", color}];

  // Criar linha de conexão usando retângulo (mais fácil de aplicar constraints)
  const line = figma.createRectangle();
  line.name = "Line";
  line.fills = [{type: "SOLID", color}];

  // Criar texto do label
  const text = figma.createText();
  text.name = "Label";
  text.fontName = {family: "BancoDoBrasil Textos", style: "Regular"};
  text.fontSize = 10;
  text.characters = label;
  text.fills = [{type: "SOLID", color}];

  if (isVertical) {
    // Anotação vertical (para cima ou para baixo)
    const lineLength = Math.abs(deltaY);
    const goingDown = deltaY > 0;
    const frameWidth = Math.max(text.width, DOT_SIZE) + PADDING * 2;
    // ✅ Frame simplificado: dot + linha + texto (sem padding extra que causa gap)
    const frameHeight = DOT_SIZE + lineLength + text.height;

    group.resize(frameWidth, frameHeight);
    group.x = startX - frameWidth / 2;
    group.y = goingDown ? startY - DOT_SIZE / 2 : endY - text.height;

    if (goingDown) {
      // Dot no topo, linha, label embaixo
      dot.x = frameWidth / 2 - DOT_SIZE / 2;
      dot.y = 0;
      dot.constraints = {horizontal: "CENTER", vertical: "MIN"};

      // ✅ Linha conecta diretamente do centro do dot até o texto
      line.resize(1, lineLength);
      line.x = frameWidth / 2 - 0.5;
      line.y = DOT_SIZE / 2;
      line.constraints = {horizontal: "CENTER", vertical: "STRETCH"};

      text.x = frameWidth / 2 - text.width / 2;
      text.y = frameHeight - text.height;
      text.constraints = {horizontal: "CENTER", vertical: "MAX"};
    } else {
      // Label no topo, linha, dot embaixo
      text.x = frameWidth / 2 - text.width / 2;
      text.y = 0;
      text.constraints = {horizontal: "CENTER", vertical: "MIN"};

      // ✅ Linha conecta diretamente do texto até o centro do dot
      line.resize(1, lineLength);
      line.x = frameWidth / 2 - 0.5;
      line.y = text.height;
      line.constraints = {horizontal: "CENTER", vertical: "STRETCH"};

      dot.x = frameWidth / 2 - DOT_SIZE / 2;
      dot.y = frameHeight - DOT_SIZE;
      dot.constraints = {horizontal: "CENTER", vertical: "MAX"};
    }
  } else {
    // Anotação horizontal (para esquerda ou direita)
    const lineLength = Math.abs(deltaX);
    const goingRight = deltaX > 0;
    // ✅ Frame simplificado: dot + linha + texto (sem padding extra)
    const frameWidth = DOT_SIZE + lineLength + text.width;
    const frameHeight = Math.max(text.height, DOT_SIZE);

    group.resize(frameWidth, frameHeight);
    group.x = goingRight ? startX - DOT_SIZE / 2 : endX - text.width;
    group.y = startY - frameHeight / 2;

    if (goingRight) {
      // Dot na esquerda, linha, label na direita
      dot.x = 0;
      dot.y = frameHeight / 2 - DOT_SIZE / 2;
      dot.constraints = {horizontal: "MIN", vertical: "CENTER"};

      // ✅ Linha conecta do centro do dot até o texto
      line.resize(lineLength, 1);
      line.x = DOT_SIZE / 2;
      line.y = frameHeight / 2 - 0.5;
      line.constraints = {horizontal: "STRETCH", vertical: "CENTER"};

      text.x = frameWidth - text.width;
      text.y = frameHeight / 2 - text.height / 2;
      text.constraints = {horizontal: "MAX", vertical: "CENTER"};
    } else {
      // Label na esquerda, linha, dot na direita
      text.x = 0;
      text.y = frameHeight / 2 - text.height / 2;
      text.constraints = {horizontal: "MIN", vertical: "CENTER"};

      // ✅ Linha conecta do texto até o centro do dot
      line.resize(lineLength, 1);
      line.x = text.width;
      line.y = frameHeight / 2 - 0.5;
      line.constraints = {horizontal: "STRETCH", vertical: "CENTER"};

      dot.x = frameWidth - DOT_SIZE;
      dot.y = frameHeight / 2 - DOT_SIZE / 2;
      dot.constraints = {horizontal: "MAX", vertical: "CENTER"};
    }
  }

  // Adicionar elementos ao grupo
  group.appendChild(dot);
  group.appendChild(line);
  group.appendChild(text);

  // Adicionar grupo ao container
  container.appendChild(group);
}

// ✅ Anotação de GAP - COM RETÂNGULO como padding
async function annotateGapNew(
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

  const label = token ? `$${token}` : `${gapValue}px`;
  const color = getTheme(highlightMode).gap;
  const LINE_OFFSET = 40;

  let rectX: number, rectY: number, rectW: number, rectH: number;
  let startX: number, startY: number, endX: number, endY: number;

  if (isHorizontal) {
    // Gap horizontal - anotação vai para cima ou para baixo
    rectX = nodeX + currentChild.x + currentChild.width;
    rectY = nodeY + currentChild.y;
    rectW = gapValue;
    rectH = currentChild.height;

    const preferredX = rectX + rectW / 2;
    // Alternar entre top e bottom para gaps horizontais
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
    // Gap vertical - anotação vai para a direita ou esquerda
    rectX = nodeX + currentChild.x;
    rectY = nodeY + currentChild.y + currentChild.height;
    rectW = currentChild.width;
    rectH = gapValue;

    const preferredY = rectY + rectH / 2;
    // Alternar entre right e left para gaps verticais
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

  // ✅ Criar retângulo semi-transparente para o gap (igual ao padding)
  const rect = figma.createRectangle();
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
  );
}

// Anotação de PADDING - VERSÃO LIMPA
async function annotatePaddingNew(
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
  const label = token ? `$${token}` : `${paddingValue}px`;
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
  );
}

// ✅ Anotação de BORDER RADIUS - VERSÃO CORRIGIDA
async function annotateRadiusNew(
  container: FrameNode,
  radius: number,
  nodeX: number,
  nodeY: number,
  _nodeW: number,
  _nodeH: number,
  token: string | null = null,
  highlightMode: boolean = false,
): Promise<void> {
  const label = token ? `$${token}` : `${radius}px`;
  const color = getTheme(highlightMode).radius;

  // ✅ Criar círculo tracejado no canto superior esquerdo
  // O círculo representa visualmente o border radius (tamanho original mantido)
  const circleSize = Math.max(20, Math.min(radius * 2, 32));
  const circle = figma.createEllipse();
  // Posicionar o círculo centralizado no canto
  circle.x = nodeX - circleSize / 4;
  circle.y = nodeY - circleSize / 4;
  circle.resize(circleSize, circleSize);
  circle.fills = [];
  circle.strokes = [{type: "SOLID", color}];
  circle.strokeWeight = 1.5;
  circle.dashPattern = [4, 4]; // Linha tracejada
  container.appendChild(circle);

  // ✅ O dot fica no canto exato do componente (onde o radius começa)
  const DOT_SIZE = 8;
  const dotX = nodeX;
  const dotY = nodeY;

  // ✅ Linha vai do canto para cima até o label
  const LINE_LENGTH = 30;
  const lineEndX = dotX;
  const lineEndY = dotY - LINE_LENGTH;

  // Criar o dot (ponto no canto)
  const dot = figma.createEllipse();
  dot.name = `Dot - ${label}`;
  dot.resize(DOT_SIZE, DOT_SIZE);
  dot.fills = [{type: "SOLID", color}];
  dot.x = dotX - DOT_SIZE / 2;
  dot.y = dotY - DOT_SIZE / 2;

  // Criar linha de conexão (vertical, do dot até o label)
  const line = figma.createRectangle();
  line.name = `Line - ${label}`;
  line.fills = [{type: "SOLID", color}];
  line.resize(1, LINE_LENGTH);
  line.x = dotX - 0.5;
  line.y = lineEndY;

  // Criar texto do label - posicionado acima do ponto final da linha
  const text = figma.createText();
  text.name = `Label - ${label}`;
  text.fontName = {family: "BancoDoBrasil Textos", style: "Regular"};
  text.fontSize = 10;
  text.characters = label;
  text.fills = [{type: "SOLID", color}];
  // Texto centralizado acima da linha
  text.x = lineEndX - text.width / 2;
  text.y = lineEndY - text.height - 2;

  // Criar grupo
  const group = figma.createFrame();
  group.name = label;
  group.fills = [];
  group.clipsContent = false;

  // Calcular bounds
  const minX = Math.min(dot.x, line.x, text.x) - 2;
  const minY = Math.min(dot.y, line.y, text.y) - 2;
  const maxX = Math.max(dot.x + DOT_SIZE, text.x + text.width) + 2;
  const maxY = Math.max(dot.y + DOT_SIZE, text.y + text.height) + 2;

  group.x = minX;
  group.y = minY;
  group.resize(Math.max(maxX - minX, 10), Math.max(maxY - minY, 10));

  // Ajustar posições relativas
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

// ✅ Anotação de BORDER WEIGHT - VERSÃO CORRIGIDA (posição baseada no lado da borda)
async function annotateBorderNew(
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
  // ✅ Incluir posição da borda no label se disponível
  const positionSuffix = position !== "Center" ? ` (${position})` : "";
  const label = token
    ? `$${token}${positionSuffix}`
    : `${strokeWeight}px${positionSuffix}`;

  const color = getTheme(highlightMode).border;

  const borderLine = figma.createLine();
  borderLine.strokes = [{type: "SOLID", color}];
  borderLine.strokeWeight = 2;
  borderLine.dashPattern = [4, 4];

  let startX: number, startY: number, endX: number, endY: number;

  // ✅ Posicionar linha pontilhada e anotação baseado no lado da borda
  if (side === "Top") {
    // Linha no topo
    borderLine.x = nodeX;
    borderLine.y = nodeY;
    borderLine.resize(nodeW, 0);
    container.appendChild(borderLine);

    // Anotação acima do componente
    startX = nodeX + nodeW / 2;
    startY = nodeY;
    endX = startX;
    endY = nodeY - 35;
  } else if (side === "Bottom" || side === "All") {
    // Linha na parte inferior (padrão para "All")
    borderLine.x = nodeX;
    borderLine.y = nodeY + nodeH;
    borderLine.resize(nodeW, 0);
    container.appendChild(borderLine);

    // Anotação abaixo do componente
    startX = nodeX + nodeW / 2;
    startY = nodeY + nodeH;
    endX = startX;
    endY = nodeY + nodeH + 35;
  } else if (side === "Left") {
    // Linha vertical no lado esquerdo
    borderLine.x = nodeX;
    borderLine.y = nodeY;
    borderLine.rotation = -90;
    borderLine.resize(nodeH, 0);
    container.appendChild(borderLine);

    // Anotação à esquerda do componente
    startX = nodeX;
    startY = nodeY + nodeH / 2;
    endX = nodeX - 50;
    endY = startY;
  } else if (side === "Right") {
    // Linha vertical no lado direito
    borderLine.x = nodeX + nodeW;
    borderLine.y = nodeY;
    borderLine.rotation = -90;
    borderLine.resize(nodeH, 0);
    container.appendChild(borderLine);

    // Anotação à direita do componente
    startX = nodeX + nodeW;
    startY = nodeY + nodeH / 2;
    endX = nodeX + nodeW + 50;
    endY = startY;
  } else {
    // Fallback: inferior
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

// ✅ Anotação de DIMENSÃO (width/height com token)
async function annotateDimensionNew(
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
  const label = token ? `$${token}` : `${value}px`;
  const theme = getTheme(highlightMode);
  const color = dimension === "width" ? theme.width : theme.height;

  if (dimension === "width") {
    // ✅ Criar frame agrupado para o marcador de width (redimensionável)
    const lineY = nodeY + nodeH + 15;
    const MARKER_HEIGHT = 8;

    // Criar texto do label primeiro para calcular dimensões
    const text = figma.createText();
    text.name = "Label";
    text.fontName = {family: "BancoDoBrasil Textos", style: "Regular"};
    text.fontSize = 12;
    text.characters = label;
    text.fills = [{type: "SOLID", color}];

    // Calcular dimensões do frame agrupado
    const labelGap = 4;
    const frameWidth = nodeW;
    const frameHeight = MARKER_HEIGHT + labelGap + text.height;

    // ✅ Criar frame agrupado
    const widthFrame = figma.createFrame();
    widthFrame.name = label;
    widthFrame.fills = [];
    widthFrame.clipsContent = false;
    widthFrame.resize(frameWidth, frameHeight);
    widthFrame.x = nodeX;
    widthFrame.y = lineY - MARKER_HEIGHT / 2;

    // Linha horizontal
    const line = figma.createRectangle();
    line.name = "Horizontal Line";
    line.x = 0;
    line.y = MARKER_HEIGHT / 2 - 0.5;
    line.resize(frameWidth, 1);
    line.fills = [{type: "SOLID", color}];
    line.strokes = [];
    line.constraints = {horizontal: "STRETCH", vertical: "MIN"};

    // Marcador esquerdo
    const leftMarker = figma.createRectangle();
    leftMarker.name = "Left Marker";
    leftMarker.x = -0.5;
    leftMarker.y = 0;
    leftMarker.resize(1, MARKER_HEIGHT);
    leftMarker.fills = [{type: "SOLID", color}];
    leftMarker.strokes = [];
    leftMarker.constraints = {horizontal: "MIN", vertical: "MIN"};

    // Marcador direito
    const rightMarker = figma.createRectangle();
    rightMarker.name = "Right Marker";
    rightMarker.x = frameWidth - 0.5;
    rightMarker.y = 0;
    rightMarker.resize(1, MARKER_HEIGHT);
    rightMarker.fills = [{type: "SOLID", color}];
    rightMarker.strokes = [];
    rightMarker.constraints = {horizontal: "MAX", vertical: "MIN"};

    // Label centralizado
    text.x = frameWidth / 2 - text.width / 2;
    text.y = MARKER_HEIGHT + labelGap;
    text.constraints = {horizontal: "CENTER", vertical: "MAX"};

    // Adicionar elementos ao frame
    widthFrame.appendChild(line);
    widthFrame.appendChild(leftMarker);
    widthFrame.appendChild(rightMarker);
    widthFrame.appendChild(text);

    container.appendChild(widthFrame);
  } else {
    // ✅ Criar frame agrupado para o marcador de height (redimensionável)
    const lineX = nodeX + nodeW + 15;
    const MARKER_WIDTH = 8;

    // Criar texto do label primeiro para calcular dimensões
    const text = figma.createText();
    text.name = "Label";
    text.fontName = {family: "BancoDoBrasil Textos", style: "Bold"};
    text.fontSize = 12;
    text.characters = label;
    const textColor = highlightMode
      ? {r: 0, g: 0, b: 0} // Preto
      : {r: 1, g: 1, b: 1}; // Branco
    text.fills = [{type: "SOLID", color: textColor}];

    // Criar badge
    const badgePadding = 6;
    const badgeWidth = text.width + badgePadding * 2;
    const badgeHeight = text.height + badgePadding * 2;

    // Calcular dimensões do frame agrupado
    const connectorLength = 8;
    const frameWidth = MARKER_WIDTH + connectorLength + badgeWidth;
    const frameHeight = nodeH;

    // ✅ Criar frame agrupado
    const heightFrame = figma.createFrame();
    heightFrame.name = label;
    heightFrame.fills = [];
    heightFrame.clipsContent = false;
    heightFrame.resize(frameWidth, frameHeight);
    heightFrame.x = lineX - MARKER_WIDTH / 2;
    heightFrame.y = nodeY;

    // Linha vertical (centralizada no MARKER_WIDTH)
    const line = figma.createRectangle();
    line.name = "Vertical Line";
    line.x = MARKER_WIDTH / 2 - 0.5;
    line.y = 0;
    line.resize(1, frameHeight);
    line.fills = [{type: "SOLID", color}];
    line.strokes = [];
    line.constraints = {horizontal: "MIN", vertical: "STRETCH"};

    // Marcador superior
    const topMarker = figma.createRectangle();
    topMarker.name = "Top Marker";
    topMarker.x = 0;
    topMarker.y = -0.5;
    topMarker.resize(MARKER_WIDTH, 1);
    topMarker.fills = [{type: "SOLID", color}];
    topMarker.strokes = [];
    topMarker.constraints = {horizontal: "MIN", vertical: "MIN"};

    // Marcador inferior
    const bottomMarker = figma.createRectangle();
    bottomMarker.name = "Bottom Marker";
    bottomMarker.x = 0;
    bottomMarker.y = frameHeight - 0.5;
    bottomMarker.resize(MARKER_WIDTH, 1);
    bottomMarker.fills = [{type: "SOLID", color}];
    bottomMarker.strokes = [];
    bottomMarker.constraints = {horizontal: "MIN", vertical: "MAX"};

    // Linha conectora horizontal
    const connector = figma.createRectangle();
    connector.name = "Connector";
    connector.x = MARKER_WIDTH / 2;
    connector.y = frameHeight / 2 - 0.5;
    connector.resize(connectorLength, 1);
    connector.fills = [{type: "SOLID", color}];
    connector.strokes = [];
    connector.constraints = {horizontal: "MIN", vertical: "CENTER"};

    // Badge com label
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

    // Adicionar elementos ao frame
    heightFrame.appendChild(line);
    heightFrame.appendChild(topMarker);
    heightFrame.appendChild(bottomMarker);
    heightFrame.appendChild(connector);
    heightFrame.appendChild(badge);

    container.appendChild(heightFrame);
  }
}

// ✅ INTERFACE PARA PROPRIEDADES DE VARIANTE
interface VariantProperty {
  name: string;
  values: string[];
}

// ✅ INTERFACE DE OPÇÕES DO USUÁRIO
interface GenerationOptions {
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

// ✅ FUNÇÃO PARA EXTRAIR PROPRIEDADES DE VARIANTE DE UM COMPONENT SET
function extractVariantProperties(
  componentSet: ComponentSetNode,
): VariantProperty[] {
  const properties: VariantProperty[] = [];

  // Usar componentPropertyDefinitions para manter a ordem original do Figma
  const propDefs = componentSet.componentPropertyDefinitions;
  if (propDefs) {
    // Iterar pelas propriedades na ordem definida no Figma
    for (const [propName, propDef] of Object.entries(propDefs)) {
      // Só processar propriedades do tipo VARIANT
      if (propDef.type === "VARIANT" && propDef.variantOptions) {
        const normalizedKey = propName.toLowerCase();
        let values = [...propDef.variantOptions];

        // Ordenar valores: SIZE_ORDER para size, caso contrário manter ordem original
        if (normalizedKey === "size") {
          values = values.sort((a, b) => {
            const orderA = SIZE_ORDER[a.toLowerCase()] ?? 99;
            const orderB = SIZE_ORDER[b.toLowerCase()] ?? 99;
            return orderA - orderB;
          });
        }

        properties.push({name: normalizedKey, values});
      }
    }
  }

  // Fallback: se não conseguiu via componentPropertyDefinitions, usar método antigo
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
        if (name === "size") {
          const orderA = SIZE_ORDER[a.toLowerCase()] ?? 99;
          const orderB = SIZE_ORDER[b.toLowerCase()] ?? 99;
          return orderA - orderB;
        }
        return a.localeCompare(b);
      });
      properties.push({name, values: sortedValues});
    }
  }

  return properties;
}

// ✅ FUNÇÃO PARA FILTRAR VARIANTES PARA VISUALIZAÇÃO
function filterVariantsForVisualization(
  variantColors: VariantColors[],
  selectedProperties: Record<string, string[]>,
): VariantColors[] {
  // Se não há filtros ou está vazio, retornar todas
  if (!selectedProperties || Object.keys(selectedProperties).length === 0) {
    return variantColors;
  }

  // Verificar se há pelo menos uma propriedade com valores selecionados
  const hasAnySelection = Object.values(selectedProperties).some(
    (values) => values.length > 0,
  );
  if (!hasAnySelection) {
    return variantColors;
  }

  // Filtrar variantes que correspondem aos critérios selecionados
  const filtered = variantColors.filter((vc) => {
    const variantProps = vc.propertyMap;

    for (const [propName, selectedValues] of Object.entries(
      selectedProperties,
    )) {
      if (selectedValues.length === 0) continue;

      const variantValue = variantProps[propName];
      if (!variantValue) continue;

      const isSelected = selectedValues.some(
        (v) => v.toLowerCase() === variantValue.toLowerCase(),
      );
      if (!isSelected) {
        return false;
      }
    }
    return true;
  });

  // Deduplicar: agrupar por propriedades selecionadas e pegar a melhor variante
  return deduplicateVariants(filtered, selectedProperties);
}

// ✅ FUNÇÃO DE DEDUPLICAÇÃO: Prioriza Default, Regular, Enabled
function deduplicateVariants(
  variants: VariantColors[],
  selectedProperties: Record<string, string[]>,
): VariantColors[] {
  const PRIORITY_VALUES = ["default", "regular", "enabled"];
  const selectedPropNames = Object.keys(selectedProperties).filter(
    (k) => selectedProperties[k].length > 0,
  );

  // Agrupar variantes pela combinação de propriedades selecionadas
  const groups = new Map<string, VariantColors[]>();

  for (const vc of variants) {
    // Criar chave baseada apenas nas propriedades selecionadas
    const keyParts = selectedPropNames
      .map((prop) => `${prop}=${vc.propertyMap[prop] || ""}`)
      .sort();
    const key = keyParts.join("|");

    if (!groups.has(key)) {
      groups.set(key, []);
    }
    groups.get(key)!.push(vc);
  }

  // Para cada grupo, selecionar a melhor variante
  const result: VariantColors[] = [];

  for (const groupVariants of groups.values()) {
    if (groupVariants.length === 1) {
      result.push(groupVariants[0]);
      continue;
    }

    // Encontrar a variante com valores prioritários nas propriedades NÃO selecionadas
    const allPropNames = new Set<string>();
    for (const vc of groupVariants) {
      Object.keys(vc.propertyMap).forEach((k) => allPropNames.add(k));
    }
    const hiddenPropNames = [...allPropNames].filter(
      (p) => !selectedPropNames.includes(p),
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

// FUNÇÃO MAIN - Mostra a UI (suporta múltipla seleção)
async function main() {
  // ✅ Mostrar UI sempre (mesmo sem seleção)
  figma.showUI(__html__, {width: 320, height: 640});

  // Verificar seleção
  const selection = figma.currentPage.selection;

  // ✅ Filtrar nós válidos
  const validNodes = selection.filter(
    (node) =>
      node.type === "COMPONENT" ||
      node.type === "COMPONENT_SET" ||
      node.type === "INSTANCE",
  );

  // Se não há seleção válida, apenas mostrar UI sem dados de componente
  if (validNodes.length === 0) {
    figma.ui.postMessage({
      type: "init",
      componentName: "Nenhum componente selecionado",
      variantProperties: [],
      selectionCount: 0,
    });
    return;
  }

  // ✅ Coletar nomes e propriedades de variante de todos os nós
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

    // Mesclar propriedades de variante
    for (const prop of nodeVariantProperties) {
      if (!allVariantProperties.has(prop.name)) {
        allVariantProperties.set(prop.name, new Set());
      }
      for (const value of prop.values) {
        allVariantProperties.get(prop.name)!.add(value);
      }
    }
  }

  // ✅ Converter Map para array de VariantProperty
  const mergedVariantProperties: VariantProperty[] = [];
  for (const [name, values] of allVariantProperties) {
    mergedVariantProperties.push({name, values: Array.from(values)});
  }

  // ✅ Determinar nome para exibir na UI
  const displayName =
    validNodes.length === 1
      ? componentNames[0]
      : `${validNodes.length} componentes selecionados`;

  // ✅ Enviar informações para a UI
  figma.ui.postMessage({
    type: "init",
    componentName: displayName,
    variantProperties: mergedVariantProperties,
    hasVariants: mergedVariantProperties.length > 0,
    selectionCount: validNodes.length,
  });
}

// ✅ FUNÇÃO DE GERAÇÃO - Recebe opções da UI (suporta múltipla seleção)
async function generateSpec(options: GenerationOptions) {
  // ✅ Fechar UI primeiro para que a notificação apareça imediatamente
  figma.ui.hide();

  //✅ Notificar usuário que o plugin está sendo executado
  const loadingNotification = figma.notify("🔄 Gerando especificação...", {
    timeout: 50000,
  });

  await figma.loadFontAsync({family: "BancoDoBrasil Textos", style: "Regular"});
  await figma.loadFontAsync({family: "BancoDoBrasil Textos", style: "Medium"});
  await figma.loadFontAsync({family: "BancoDoBrasil Textos", style: "Bold"});

  const selection = figma.currentPage.selection;

  // ✅ Filtrar apenas nós suportados (Instance, Component, ComponentSet)
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

  // ✅ Processar todos os nós e agregar variantColors
  const allVariantColors: VariantColors[] = [];
  for (const nodeToProcess of validNodes) {
    const variantColors = await processComponent(nodeToProcess);
    allVariantColors.push(...variantColors);
  }

  // ✅ Validação - gera spec mesmo se tiver apenas spacings ou visualizações
  if (allVariantColors.length === 0) {
    figma.notify("⚠️ Nenhum dado encontrado nos componentes selecionados");
    figma.closePlugin();
    return;
  }

  // ✅ Determinar nome do spec (único ou múltiplos)
  const specTitle =
    componentNames.length === 1
      ? componentNames[0]
      : `${componentNames.length} Componentes`;

  // ✅ Usar primeiro nó para posicionamento e visualizações (fallback)
  const firstNode = validNodes[0];

  // ✅ Usar configurações customizadas ou valores padrão
  const frameWidth = options.frameWidth || 1140;
  const paddingH = options.paddingHorizontal || 84;
  const sectionGap = options.sectionSpacingValue || 40;
  const tableWidth = frameWidth - paddingH * 2;

  // ✅ Frame principal COM AUTO-LAYOUT - Background customizável
  const specFrame = figma.createFrame();
  specFrame.name = `${specTitle} — Especificação`;
  specFrame.x = firstNode.x + firstNode.width + 100;
  specFrame.y = firstNode.y;

  // Converter hex para RGB
  const bgHex = options.bgColor || "F4F5F7";
  const bgR = parseInt(bgHex.substring(0, 2), 16) / 255;
  const bgG = parseInt(bgHex.substring(2, 4), 16) / 255;
  const bgB = parseInt(bgHex.substring(4, 6), 16) / 255;
  specFrame.fills = [{type: "SOLID", color: {r: bgR, g: bgG, b: bgB}}];

  // ✅ Configurar auto-layout vertical com espaçamento customizável
  specFrame.layoutMode = "VERTICAL";
  specFrame.primaryAxisSizingMode = "AUTO";
  specFrame.counterAxisSizingMode = "FIXED";
  specFrame.resize(frameWidth, 100);
  specFrame.itemSpacing = sectionGap;
  specFrame.paddingLeft = paddingH;
  specFrame.paddingRight = paddingH;
  specFrame.paddingTop = 60;
  specFrame.paddingBottom = 60;

  // Título
  const titleText = figma.createText();
  titleText.fontName = {family: "BancoDoBrasil Textos", style: "Bold"};
  titleText.fontSize = 48;
  titleText.characters = `${specTitle} — Especificações`;
  titleText.textAutoResize = "WIDTH_AND_HEIGHT";
  specFrame.appendChild(titleText);

  // ✅ Subtítulo com lista de componentes (se múltiplos)
  if (componentNames.length > 1) {
    const subtitleText = figma.createText();
    subtitleText.fontName = {family: "BancoDoBrasil Textos", style: "Regular"};
    subtitleText.fontSize = 14;
    subtitleText.characters = componentNames.join(", ");
    subtitleText.fills = [{type: "SOLID", color: {r: 0.4, g: 0.4, b: 0.4}}];
    subtitleText.textAutoResize = "WIDTH_AND_HEIGHT";
    specFrame.appendChild(subtitleText);
  }

  // ✅ Controle de seções criadas para adicionar divisores corretamente
  let lastSectionCreated = false;

  // ✅ SEÇÃO CORES (tabela apenas, dados consolidados de todos os componentes)
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

  // ✅ SEÇÃO PADRÕES DE TEXTO (tabela + visualização para cada componente)
  if (options.sectionText) {
    let sectionCreated = false;
    let dividerAdded = false;
    for (let i = 0; i < validNodes.length; i++) {
      const nodeToProcess = validNodes[i];
      const nodeVariantColors = await processComponent(nodeToProcess);
      // Verificar se há conteúdo antes de fazer qualquer coisa
      const hasContent = nodeVariantColors.some((v) => v.textStyles.length > 0);
      if (!hasContent) continue;
      // Adicionar divider apenas uma vez, antes da primeira seção com conteúdo
      if (!dividerAdded && lastSectionCreated) {
        await addSectionDivider(specFrame, tableWidth);
        dividerAdded = true;
      }
      if (sectionCreated) {
        // Adicionar subtítulo para cada componente após o primeiro
        const compTitle = figma.createText();
        compTitle.fontName = {family: "BancoDoBrasil Textos", style: "Medium"};
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

  // ✅ SEÇÃO MEDIDAS E ESPAÇAMENTOS (tabela + visualizações para cada componente)
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
        compTitle.fontName = {family: "BancoDoBrasil Textos", style: "Medium"};
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

  // ✅ SEÇÃO EFEITOS (Shadows, Blur, etc.)
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
        compTitle.fontName = {family: "BancoDoBrasil Textos", style: "Medium"};
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

  // ✅ SEÇÃO COMPONENTES E ÍCONES UTILIZADOS (consolidado de todos)
  if (options.sectionComponents) {
    // Verificar se há componentes usados antes de adicionar divider
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
        validNodes, // ✅ Passar componentes principais para visualização de anatomia
        options.highlightMode, // ✅ Passar modo highlight para fundo azul
      );
      if (created) lastSectionCreated = true;
    }
  }

  // ✅ SEÇÃO ESTADOS (mostrar variantes de cada componente)
  if (options.sectionEstados) {
    // Verificar se algum nó terá estados antes de adicionar divider
    let hasAnyEstados = false;
    for (const node of validNodes) {
      if (node.type === "COMPONENT_SET" && node.children.length > 0) {
        hasAnyEstados = true;
        break;
      } else if (node.type === "COMPONENT" || node.type === "INSTANCE") {
        hasAnyEstados = true; // Pode ter pelo menos o estado default
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
          compTitle.fontName = {
            family: "BancoDoBrasil Textos",
            style: "Medium",
          };
          compTitle.fontSize = 18;
          compTitle.characters = `Estados: ${componentNames[i]}`;
          compTitle.fills = [{type: "SOLID", color: {r: 0.2, g: 0.2, b: 0.2}}];
          specFrame.appendChild(compTitle);
        }
        const created = await createEstadosSection(
          specFrame,
          nodeToProcess,
          tableWidth,
          options.highlightMode,
          options.gridDensity || 2,
        );
        if (created) sectionCreated = true;
      }
      if (sectionCreated) lastSectionCreated = true;
    }
  }

  // ✅ SEÇÃO PROPRIEDADES DO COMPONENTE (para cada componente)
  if (options.sectionProperties) {
    // Verificar se algum nó terá propriedades antes de adicionar divider
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
          compTitle.fontName = {
            family: "BancoDoBrasil Textos",
            style: "Medium",
          };
          compTitle.fontSize = 18;
          compTitle.characters = `Propriedades: ${componentNames[i]}`;
          compTitle.fills = [{type: "SOLID", color: {r: 0.2, g: 0.2, b: 0.2}}];
          specFrame.appendChild(compTitle);
        }
        const created = await createPropertiesSection(
          specFrame,
          nodeToProcess,
          tableWidth,
        );
        if (created) sectionCreated = true;
      }
      if (sectionCreated) lastSectionCreated = true;
    }
  }

  figma.currentPage.appendChild(specFrame);
  figma.viewport.scrollAndZoomIntoView([specFrame]);

  // ✅ Cancelar notificação de loading e mostrar sucesso
  loadingNotification.cancel();
  const successMsg =
    validNodes.length === 1
      ? "✅ Especificação gerada com sucesso!"
      : `✅ Especificação gerada para ${validNodes.length} componentes!`;
  figma.notify(successMsg);
  figma.closePlugin();
}

// ✅ DIVISOR DE SEÇÕES
async function addSectionDivider(
  parent: FrameNode,
  width: number,
): Promise<void> {
  const divider = figma.createFrame();
  divider.name = "Divider";
  divider.resize(width, 1);
  divider.fills = [{type: "SOLID", color: {r: 0.85, g: 0.85, b: 0.85}}]; // Linha cinza clara
  parent.appendChild(divider);
}

// ✅ SEÇÃO ESTADOS - Mostra as variantes/estados do componente
async function createEstadosSection(
  parent: FrameNode,
  component: ComponentNode | ComponentSetNode | InstanceNode,
  tableWidth: number,
  highlightMode: boolean,
  framesPerRow: number = 4,
): Promise<boolean> {
  // Obter variantes do componente primeiro para verificar se há conteúdo
  const variants: {name: string; node: ComponentNode}[] = [];

  if (component.type === "COMPONENT_SET") {
    // Para ComponentSet, pegar todos os children que são COMPONENT
    for (const child of component.children) {
      if (child.type === "COMPONENT") {
        // Extrair propriedade principal (State, Status, Type, etc.)
        const props = extractRelevantProperties(child.name);
        const stateName =
          props["state"] ||
          props["status"] ||
          props["type"] ||
          props["style"] ||
          Object.values(props)[0] ||
          "Default";
        variants.push({name: stateName, node: child});
      }
    }
  } else if (component.type === "COMPONENT") {
    // Para um Component único, mostrar apenas ele
    variants.push({name: "Default", node: component});
  } else if (component.type === "INSTANCE") {
    // Para Instance, tentar obter o mainComponent
    const mainComp = await component.getMainComponentAsync();
    if (mainComp) {
      if (mainComp.parent && mainComp.parent.type === "COMPONENT_SET") {
        // Se o mainComponent faz parte de um ComponentSet, mostrar todas as variantes
        const compSet = mainComp.parent as ComponentSetNode;
        for (const child of compSet.children) {
          if (child.type === "COMPONENT") {
            const props = extractRelevantProperties(child.name);
            const stateName =
              props["state"] ||
              props["status"] ||
              props["type"] ||
              Object.values(props)[0] ||
              "Default";
            variants.push({name: stateName, node: child});
          }
        }
      } else {
        variants.push({name: "Default", node: mainComp});
      }
    }
  }

  // Remover duplicatas baseado no nome do estado
  const uniqueVariants: {name: string; node: ComponentNode}[] = [];
  const seenNames = new Set<string>();
  for (const v of variants) {
    if (!seenNames.has(v.name)) {
      seenNames.add(v.name);
      uniqueVariants.push(v);
    }
  }

  // Se não há variantes, não criar seção
  if (uniqueVariants.length === 0) {
    return false;
  }

  // Criar seção
  const section = createSectionContainer("Seção Estados");
  createSectionTitle("ESTADOS", section);

  // Criar grid container
  const GRID_GAP = 16;
  const CARD_PADDING = 24;
  const COLUMNS = framesPerRow;
  const cardWidth = Math.floor(
    (tableWidth - GRID_GAP * (COLUMNS - 1)) / COLUMNS,
  );

  const gridContainer = figma.createFrame();
  gridContainer.name = "Grid Estados";
  gridContainer.layoutMode = "VERTICAL";
  gridContainer.primaryAxisSizingMode = "AUTO";
  gridContainer.counterAxisSizingMode = "AUTO";
  gridContainer.itemSpacing = GRID_GAP;
  gridContainer.fills = [];

  // Criar cards em rows de 2
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

      // Card container
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
      // Highlight mode: #3853FF (blue background), Normal: white
      const cardBgColor = highlightMode
        ? {r: 56 / 255, g: 83 / 255, b: 255 / 255} // #3853FF
        : {r: 0.98, g: 0.98, b: 0.98}; // Branco/cinza bem claro
      card.fills = [{type: "SOLID", color: cardBgColor}];
      card.cornerRadius = 8;

      // Label numerado (01. Default, 02. Focado, etc.)
      const label = figma.createText();
      label.fontName = {family: "BancoDoBrasil Textos", style: "Regular"};
      label.fontSize = 14;
      label.characters = `${String(index).padStart(2, "0")}. ${variant.name}`;
      // Highlight mode: #62F84F (green text), Normal: gray
      const labelColor = highlightMode
        ? {r: 98 / 255, g: 248 / 255, b: 79 / 255} // #62F84F
        : {r: 0.4, g: 0.4, b: 0.4};
      label.fills = [{type: "SOLID", color: labelColor}];
      card.appendChild(label);

      // Criar instância do componente
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

// ✅ SEÇÃO PROPRIEDADES DO COMPONENTE
async function createPropertiesSection(
  parent: FrameNode,
  component: ComponentNode | ComponentSetNode | InstanceNode,
  tableWidth: number,
): Promise<boolean> {
  // Obter o ComponentSetNode para acessar as definições de propriedades
  let componentSet: ComponentSetNode | null = null;
  let componentName = "";

  if (component.type === "COMPONENT_SET") {
    componentSet = component;
    componentName = component.name;
  } else if (component.type === "COMPONENT") {
    if (component.parent && component.parent.type === "COMPONENT_SET") {
      componentSet = component.parent as ComponentSetNode;
      componentName = componentSet.name;
    } else {
      componentName = component.name;
    }
  } else if (component.type === "INSTANCE") {
    const mainComp = await component.getMainComponentAsync();
    if (mainComp) {
      if (mainComp.parent && mainComp.parent.type === "COMPONENT_SET") {
        componentSet = mainComp.parent as ComponentSetNode;
        componentName = componentSet.name;
      } else {
        componentName = mainComp.name;
      }
    }
  }

  // Se não encontrou propriedades, retornar
  if (!componentSet || !componentSet.componentPropertyDefinitions) {
    return false;
  }

  const propDefs = componentSet.componentPropertyDefinitions;
  const propKeys = Object.keys(propDefs);
  if (propKeys.length === 0) return false;

  // Coletar todas as propriedades com índice original para preservar ordem da API
  const allPropsWithIndex: {
    key: string;
    def: ComponentPropertyDefinitions[string];
    originalIndex: number;
  }[] = propKeys.map((key, index) => ({
    key,
    def: propDefs[key],
    originalIndex: index,
  }));

  // Separar por tipo para reordenar grupos mantendo ordem interna
  const variants = allPropsWithIndex.filter((p) => p.def.type === "VARIANT");
  const instanceSwaps = allPropsWithIndex.filter(
    (p) => p.def.type === "INSTANCE_SWAP",
  );
  const others = allPropsWithIndex.filter(
    (p) => p.def.type !== "VARIANT" && p.def.type !== "INSTANCE_SWAP",
  );

  // Ordenar "others" (TEXT e BOOLEAN) para agrupar pares relacionados
  // Padrão: boolean de toggle (Label) vem antes do text relacionado (Text label)
  others.sort((a, b) => {
    const aKeyLower = a.key.toLowerCase();
    const bKeyLower = b.key.toLowerCase();

    // Detectar pares relacionados (ex: "Label" + "Text label", "Hint" + "Text hint")
    // Se "Text X" contém X que é um boolean, o boolean vem primeiro
    if (a.def.type === "BOOLEAN" && b.def.type === "TEXT") {
      // Verificar se o text contém o nome do boolean
      if (
        bKeyLower.includes(aKeyLower) ||
        bKeyLower.startsWith("text " + aKeyLower)
      ) {
        return -1; // Boolean antes do Text relacionado
      }
    }
    if (b.def.type === "BOOLEAN" && a.def.type === "TEXT") {
      if (
        aKeyLower.includes(bKeyLower) ||
        aKeyLower.startsWith("text " + bKeyLower)
      ) {
        return 1; // Boolean antes do Text relacionado
      }
    }

    // Manter ordem original da API para não-pares
    return a.originalIndex - b.originalIndex;
  });

  // Reconstruir array na ordem: VARIANT, others (TEXT/BOOLEAN), INSTANCE_SWAP
  const allProps = [...variants, ...others, ...instanceSwaps].map(
    ({key, def}) => ({key, def}),
  );

  // Separar propriedades normais das nested instances
  const normalProps = allProps.filter((p) => p.def.type !== "INSTANCE_SWAP");
  const nestedInstanceProps = allProps.filter(
    (p) => p.def.type === "INSTANCE_SWAP",
  );

  // Criar seção com padding de 32px
  const section = createSectionContainer("Seção Propriedades", 32);
  section.paddingLeft = 32;
  section.paddingRight = 32;
  section.paddingTop = 32;
  section.paddingBottom = 32;
  section.fills = [{type: "SOLID", color: {r: 1, g: 1, b: 1}}];
  section.cornerRadius = 8;
  createSectionTitle(`❖ ${componentName} Properties`, section);

  // Cores para os tipos
  const BLUE_COLOR: RGB = {r: 49 / 255, g: 53 / 255, b: 217 / 255}; // #3135D9
  const GRAY_COLOR: RGB = {r: 0.4, g: 0.4, b: 0.4};
  const WHITE_COLOR: RGB = {r: 1, g: 1, b: 1};

  // ✅ Largura interna da tabela (descontando padding da seção)
  const innerTableWidth = tableWidth - 64; // 32px padding em cada lado

  // ✅ Criar tabela de propriedades normais
  if (normalProps.length > 0) {
    const tableContainer = figma.createFrame();
    tableContainer.name = "Properties Table";
    tableContainer.layoutMode = "VERTICAL";
    tableContainer.primaryAxisSizingMode = "AUTO";
    tableContainer.counterAxisSizingMode = "FIXED";
    tableContainer.resize(innerTableWidth, 100); // ✅ Usa largura interna
    tableContainer.itemSpacing = 0;
    tableContainer.fills = [];

    // Header row
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
      headerText.fontName = {family: "BancoDoBrasil Textos", style: "Bold"};
      headerText.fontSize = 12;
      headerText.characters = headers[i];
      headerText.fills = [{type: "SOLID", color: GRAY_COLOR}];
      headerCell.appendChild(headerText);
      headerRow.appendChild(headerCell);
    }
    tableContainer.appendChild(headerRow);

    // Property rows
    for (const prop of normalProps) {
      const def = prop.def;
      const propName = prop.key.split("#")[0]; // Remove o hash se houver

      const row = figma.createFrame();
      row.name = `Row ${propName}`;
      row.layoutMode = "HORIZONTAL";
      row.primaryAxisSizingMode = "FIXED";
      row.counterAxisSizingMode = "AUTO"; // ✅ HUG na altura
      row.counterAxisAlignItems = "MIN"; // ✅ Alinha items no topo quando há wrap
      row.minWidth = innerTableWidth; // ✅ Largura fixa sem definir altura
      row.maxWidth = innerTableWidth;
      row.paddingTop = 12;
      row.paddingBottom = 12;
      row.strokes = [{type: "SOLID", color: {r: 0.9, g: 0.9, b: 0.9}}];
      row.strokeTopWeight = 1;
      row.strokeBottomWeight = 0;
      row.strokeLeftWeight = 0;
      row.strokeRightWeight = 0;
      row.fills = [{type: "SOLID", color: {r: 1, g: 1, b: 1}}]; // ✅ Background branco

      // Coluna PROPERTY
      const propCell = figma.createFrame();
      propCell.name = "Property Cell";
      propCell.layoutMode = "HORIZONTAL";
      propCell.primaryAxisSizingMode = "FIXED";
      propCell.counterAxisSizingMode = "AUTO"; // ✅ HUG na altura
      propCell.minWidth = colWidths[0]; // ✅ Largura fixa sem definir altura
      propCell.maxWidth = colWidths[0];
      propCell.fills = [];
      propCell.itemSpacing = 8;

      const propText = figma.createText();
      propText.fontName = {family: "BancoDoBrasil Textos", style: "Regular"};
      propText.fontSize = 14;
      propText.characters = propName;
      propText.fills = [{type: "SOLID", color: {r: 0.2, g: 0.2, b: 0.2}}];
      propCell.appendChild(propText);
      row.appendChild(propCell);

      // Coluna TYPE
      const typeCell = figma.createFrame();
      typeCell.name = "Type Cell";
      typeCell.layoutMode = "HORIZONTAL";
      typeCell.primaryAxisSizingMode = "FIXED";
      typeCell.counterAxisSizingMode = "AUTO"; // ✅ HUG na altura
      typeCell.counterAxisAlignItems = "CENTER";
      typeCell.minWidth = colWidths[1]; // ✅ Largura fixa sem definir altura
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
      } else if (def.type === "INSTANCE_SWAP") {
        typeIcon = "◇";
        typeName = "Instance";
      }

      const iconText = figma.createText();
      iconText.fontName = {family: "BancoDoBrasil Textos", style: "Regular"};
      iconText.fontSize = 14;
      iconText.characters = typeIcon;
      iconText.fills = [{type: "SOLID", color: BLUE_COLOR}];
      typeCell.appendChild(iconText);

      const typeNameText = figma.createText();
      typeNameText.fontName = {
        family: "BancoDoBrasil Textos",
        style: "Regular",
      };
      typeNameText.fontSize = 14;
      typeNameText.characters = typeName;
      typeNameText.fills = [{type: "SOLID", color: GRAY_COLOR}];
      typeCell.appendChild(typeNameText);
      row.appendChild(typeCell);

      // Coluna DEFAULT / OPTIONS
      const valueCell = figma.createFrame();
      valueCell.name = "Value Cell";
      valueCell.layoutMode = "HORIZONTAL";
      valueCell.primaryAxisSizingMode = "FIXED";
      valueCell.counterAxisSizingMode = "AUTO"; // ✅ HUG na altura
      valueCell.counterAxisAlignItems = "MIN"; // ✅ Alinha no topo para wrap
      valueCell.minWidth = colWidths[2]; // ✅ Largura fixa sem definir altura
      valueCell.maxWidth = colWidths[2];
      valueCell.fills = [];
      valueCell.itemSpacing = 8;
      valueCell.layoutWrap = "WRAP";
      valueCell.counterAxisSpacing = 8;

      if (def.type === "VARIANT" && def.variantOptions) {
        // Mostrar todas as opções como badges
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
          optionText.fontName = {
            family: "BancoDoBrasil Textos",
            style: "Medium",
          };
          optionText.fontSize = 12;
          optionText.characters = option;
          optionText.fills = [
            {type: "SOLID", color: isDefault ? WHITE_COLOR : BLUE_COLOR},
          ];
          badge.appendChild(optionText);
          valueCell.appendChild(badge);
        }
      } else if (def.type === "BOOLEAN") {
        // Mostrar toggle com True/False
        const toggleContainer = figma.createFrame();
        toggleContainer.name = "Boolean Toggle";
        toggleContainer.layoutMode = "HORIZONTAL";
        toggleContainer.primaryAxisSizingMode = "AUTO";
        toggleContainer.counterAxisSizingMode = "AUTO";
        toggleContainer.counterAxisAlignItems = "CENTER";
        toggleContainer.itemSpacing = 8;
        toggleContainer.fills = [];

        const isTrue = def.defaultValue === true;

        // Toggle visual
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
        boolText.fontName = {family: "BancoDoBrasil Textos", style: "Regular"};
        boolText.fontSize = 14;
        boolText.characters = isTrue ? "True" : "False";
        boolText.fills = [{type: "SOLID", color: GRAY_COLOR}];
        toggleContainer.appendChild(boolText);

        valueCell.appendChild(toggleContainer);
      } else if (def.type === "TEXT") {
        // Mostrar valor do texto
        const textValue = figma.createText();
        textValue.fontName = {family: "BancoDoBrasil Textos", style: "Regular"};
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

  // ✅ Seção Nested Instances
  if (nestedInstanceProps.length > 0) {
    const nestedTitle = figma.createText();
    nestedTitle.fontName = {family: "BancoDoBrasil Textos", style: "Bold"};
    nestedTitle.fontSize = 24;
    nestedTitle.characters = "◇ Nested Instances";
    section.appendChild(nestedTitle);

    const nestedTable = figma.createFrame();
    nestedTable.name = "Nested Instances Table";
    nestedTable.layoutMode = "VERTICAL";
    nestedTable.primaryAxisSizingMode = "AUTO";
    nestedTable.counterAxisSizingMode = "FIXED";
    nestedTable.resize(innerTableWidth, 100); // ✅ Usa largura interna
    nestedTable.itemSpacing = 0;
    nestedTable.fills = [];

    const colWidths = [
      Math.floor(innerTableWidth * 0.25),
      Math.floor(innerTableWidth * 0.2),
      Math.floor(innerTableWidth * 0.55),
    ];

    // Header row para nested instances
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
      headerText.fontName = {family: "BancoDoBrasil Textos", style: "Bold"};
      headerText.fontSize = 12;
      headerText.characters = headers[i];
      headerText.fills = [{type: "SOLID", color: GRAY_COLOR}];
      headerCell.appendChild(headerText);
      headerRow.appendChild(headerCell);
    }
    nestedTable.appendChild(headerRow);

    // Rows para cada nested instance property
    for (const prop of nestedInstanceProps) {
      const def = prop.def;
      const propName = prop.key.split("#")[0];

      const row = figma.createFrame();
      row.name = `Row ${propName}`;
      row.layoutMode = "HORIZONTAL";
      row.primaryAxisSizingMode = "FIXED";
      row.counterAxisSizingMode = "AUTO"; // ✅ HUG na altura
      row.counterAxisAlignItems = "MIN"; // ✅ Alinha items no topo quando há wrap
      row.minWidth = innerTableWidth; // ✅ Largura fixa sem definir altura
      row.maxWidth = innerTableWidth;
      row.paddingTop = 12;
      row.paddingBottom = 12;
      row.strokes = [{type: "SOLID", color: {r: 0.9, g: 0.9, b: 0.9}}];
      row.strokeTopWeight = 1;
      row.strokeBottomWeight = 0;
      row.strokeLeftWeight = 0;
      row.strokeRightWeight = 0;
      row.fills = [{type: "SOLID", color: {r: 1, g: 1, b: 1}}]; // ✅ Background branco

      // Property name
      const propCell = figma.createFrame();
      propCell.layoutMode = "HORIZONTAL";
      propCell.primaryAxisSizingMode = "FIXED";
      propCell.counterAxisSizingMode = "AUTO"; // ✅ HUG na altura
      propCell.minWidth = colWidths[0]; // ✅ Largura fixa sem definir altura
      propCell.maxWidth = colWidths[0];
      propCell.fills = [];

      const propText = figma.createText();
      propText.fontName = {family: "BancoDoBrasil Textos", style: "Regular"};
      propText.fontSize = 14;
      propText.characters = propName;
      propText.fills = [{type: "SOLID", color: {r: 0.2, g: 0.2, b: 0.2}}];
      propCell.appendChild(propText);
      row.appendChild(propCell);

      // Type
      const typeCell = figma.createFrame();
      typeCell.layoutMode = "HORIZONTAL";
      typeCell.primaryAxisSizingMode = "FIXED";
      typeCell.counterAxisSizingMode = "AUTO"; // ✅ HUG na altura
      typeCell.counterAxisAlignItems = "CENTER";
      typeCell.minWidth = colWidths[1]; // ✅ Largura fixa sem definir altura
      typeCell.maxWidth = colWidths[1];
      typeCell.fills = [];
      typeCell.itemSpacing = 6;

      const iconText = figma.createText();
      iconText.fontName = {family: "BancoDoBrasil Textos", style: "Regular"};
      iconText.fontSize = 14;
      iconText.characters = "◇";
      iconText.fills = [{type: "SOLID", color: BLUE_COLOR}];
      typeCell.appendChild(iconText);

      const typeNameText = figma.createText();
      typeNameText.fontName = {
        family: "BancoDoBrasil Textos",
        style: "Regular",
      };
      typeNameText.fontSize = 14;
      typeNameText.characters = "Variant";
      typeNameText.fills = [{type: "SOLID", color: GRAY_COLOR}];
      typeCell.appendChild(typeNameText);
      row.appendChild(typeCell);

      // Options (preferred values)
      const valueCell = figma.createFrame();
      valueCell.name = "Value Cell";
      valueCell.layoutMode = "HORIZONTAL";
      valueCell.primaryAxisSizingMode = "FIXED";
      valueCell.counterAxisSizingMode = "AUTO"; // ✅ HUG na altura
      valueCell.counterAxisAlignItems = "MIN"; // ✅ Alinha no topo para wrap
      valueCell.minWidth = colWidths[2]; // ✅ Largura fixa sem definir altura
      valueCell.maxWidth = colWidths[2];
      valueCell.fills = [];
      valueCell.itemSpacing = 8;
      valueCell.layoutWrap = "WRAP";
      valueCell.counterAxisSpacing = 8;

      // Se tiver preferredValues, mostrar como badges
      if (def.preferredValues && def.preferredValues.length > 0) {
        let isFirst = true;
        for (const pv of def.preferredValues) {
          if (pv.type === "COMPONENT" || pv.type === "COMPONENT_SET") {
            // Usar importComponentByKeyAsync para obter o nome do componente a partir da key
            let compName = "Component";
            try {
              const compNode = await figma.importComponentByKeyAsync(pv.key);
              if (compNode) {
                compName = compNode.name;
              }
            } catch {
              // Se importComponentByKeyAsync falhar (componente de biblioteca externa não acessível),
              // tentar extrair um nome legível da key ou usar fallback
              try {
                // Tentar via getNodeByIdAsync como fallback (caso seja um ID local)
                const node = await figma.getNodeByIdAsync(pv.key);
                if (node && "name" in node) {
                  compName = node.name;
                }
              } catch {
                // Se tudo falhar, manter "Component" como fallback legível
                // ao invés de mostrar a key hash
              }
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
            optionText.fontName = {
              family: "BancoDoBrasil Textos",
              style: "Medium",
            };
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

// ✅ SEÇÃO COMBINADA: CORES
async function createColorSectionCombined(
  parent: FrameNode,
  variantColors: VariantColors[],
  tableWidth: number,
): Promise<boolean> {
  const hasColors = variantColors.some((v) => v.colors.length > 0);
  if (!hasColors) return false;

  const section = createSectionContainer("Seção Cores");
  createSectionTitle("CORES", section);

  // Tabela de cores
  await createColorTableInSection(section, variantColors, tableWidth);

  parent.appendChild(section);
  return true;
}

/// ✅ SEÇÃO COMBINADA: PADRÕES DE TEXTO
async function createTextSectionCombined(
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

  // Se ambos estiverem desabilitados, não criar nada
  if (!showTable && !showViz) return false;

  const section = createSectionContainer("Seção Padrões de Texto");
  createSectionTitle("PADRÕES DE TEXTO", section);

  // Tabela de tipografia (sempre exaustiva - sem filtro)
  if (showTable) {
    await createTextTableInSection(section, variantColors, tableWidth);
  }

  // Visualização de texto (filtrada)
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

// ✅ SEÇÃO COMBINADA: MEDIDAS E ESPAÇAMENTOS
async function createSpacingSectionCombined(
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
  // Verificar se há dados de espaçamento ou bordas
  const hasSpacings = variantColors.some(
    (v) => v.spacings.length > 0 || v.borders.length > 0,
  );
  if (!hasSpacings) return false;

  // Se ambos estiverem desabilitados, não criar nada
  if (!showTable && !showViz) return false;

  const section = createSectionContainer("Seção Medidas e Espaçamentos");
  createSectionTitle("MEDIDAS E ESPAÇAMENTOS", section);

  // Tabela de espaçamentos (sempre exaustiva - sem filtro)
  if (showTable) {
    await createSpacingTableInSection(section, variantColors, tableWidth);
  }

  // Visualização de paddings e gaps (filtrada)
  if (showViz) {
    await createPaddingGapVisualizationInSection(
      section,
      nodeToProcess,
      variantColors,
      tableWidth,
      highlightMode,
      vizPropertyFilters,
      framesPerRow,
    );

    // Visualização de dimensões e bordas (filtrada)
    await createDimensionVisualizationInSection(
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

// ✅ SEÇÃO COMBINADA: EFEITOS (Shadows, Blur, etc.)
async function createEffectsSectionCombined(
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
  // Verificar se há efeitos para mostrar
  const hasEffects = variantColors.some((v) => v.effects.length > 0);
  if (!hasEffects) return false;

  // Se ambos estiverem desabilitados, não criar nada
  if (!showTable && !showViz) return false;

  const section = createSectionContainer("Seção Efeitos");
  createSectionTitle("EFEITOS", section);

  // Tabela de efeitos
  if (showTable) {
    await createEffectsTableInSection(section, variantColors, tableWidth);
  }

  // Visualização de efeitos
  if (showViz) {
    await createEffectsVisualizationInSection(
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

// ✅ TABELA DE CORES DENTRO DE SEÇÃO - Estilo: linhas como Groups em Frame AutoLayout
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

  // ✅ Container principal com AutoLayout vertical
  const tableContainer = createTableAutoLayoutContainer(
    "Tabela Cores",
    tableWidth,
    ROW_GAP,
  );

  // ✅ Header como Group
  const headerElements: SceneNode[] = [];
  const headers = ["Elemento / Estado", "Token", "Referência"];
  const headerX = [
    0,
    Math.floor(tableWidth * 0.4),
    Math.floor(tableWidth * 0.8),
  ];

  for (let i = 0; i < headers.length; i++) {
    const headerText = figma.createText();
    headerText.fontName = {family: "BancoDoBrasil Textos", style: "Bold"};
    headerText.fontSize = 16;
    headerText.characters = headers[i];
    headerText.fills = [{type: "SOLID", color: {r: 0.4, g: 0.4, b: 0.4}}];
    headerText.x = headerX[i];
    headerText.y = 0;
    headerElements.push(headerText);
  }
  groupElementsAndAppend(headerElements, "Header", tableContainer);

  // ✅ Agrupar cores por estado
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

  // ✅ Deduplicar cores dentro de cada status
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

    // Adicionar espaçador entre grupos de status
    if (!isFirstStatus) {
      const spacer = figma.createFrame();
      spacer.name = "Spacer";
      spacer.resize(tableWidth, GROUP_SPACING - ROW_GAP);
      spacer.fills = [];
      tableContainer.appendChild(spacer);
    }
    isFirstStatus = false;

    for (const colorRow of colorRows) {
      // ✅ Criar elementos da linha
      const rowElements: SceneNode[] = [];

      // Fundo branco da linha
      const rowBg = figma.createRectangle();
      rowBg.name = "Row Background";
      rowBg.resize(tableWidth, ROW_HEIGHT);
      rowBg.fills = [{type: "SOLID", color: {r: 1, g: 1, b: 1}}];
      rowBg.cornerRadius = 4;
      rowBg.x = 0;
      rowBg.y = 0;
      rowElements.push(rowBg);

      const elementText = figma.createText();
      elementText.fontName = {family: "BancoDoBrasil Textos", style: "Regular"};
      elementText.fontSize = 16;
      elementText.characters = `${colorRow.state} / ${colorRow.element}`;
      elementText.x = 16;
      elementText.y = 12;
      rowElements.push(elementText);

      const tokenText = figma.createText();
      tokenText.fontName = {family: "BancoDoBrasil Textos", style: "Regular"};
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

      // ✅ Agrupar elementos e adicionar ao container
      groupElementsAndAppend(
        rowElements,
        `${colorRow.state} / ${colorRow.element}`,
        tableContainer,
      );
    }
  }

  parent.appendChild(tableContainer);
}

// ✅ TABELA DE TEXTO DENTRO DE SEÇÃO - Estilo: linhas como Groups em Frame AutoLayout
async function createTextTableInSection(
  parent: FrameNode,
  variantColors: VariantColors[],
  tableWidth: number,
): Promise<void> {
  const hasText = variantColors.some((v) => v.textStyles.length > 0);
  if (!hasText) return;

  // ✅ Usar TableBuilder para criar tabela de tipografia
  const table = createTableBuilder("Tabela Tipografia", tableWidth, [
    {header: "Elemento", position: 0},
    {header: "Componente", position: 0.45},
  ]);

  // Coletar todos os textStyles com Size / Element
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

  // Ordenar por size
  allTextRows.sort((a, b) => a.sizeOrder - b.sizeOrder);

  // Deduplicar por sizeElement + token
  const seen = new Set<string>();
  const uniqueRows = allTextRows.filter((row) => {
    const key = `${row.sizeElement}-${row.textSpec.token || row.textSpec.fontFamily}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  // Adicionar linhas usando TableBuilder
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

// ✅ HELPER: Formatar propriedades da variante para tabela (ex: "Size: Small / Type: Primary")
function formatVariantPropertiesForTable(
  propertyMap: Record<string, string>,
): string {
  const priorityOrder = ["size", "type", "variant", "state", "status", "mode"];
  const parts: string[] = [];

  // Primeiro, adicionar propriedades na ordem de prioridade
  for (const prop of priorityOrder) {
    if (propertyMap[prop]) {
      const label = prop.charAt(0).toUpperCase() + prop.slice(1);
      parts.push(`${label}: ${propertyMap[prop]}`);
    }
  }

  // Depois, adicionar propriedades restantes
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

// ✅ HELPER: Extrair título da variante a partir do propertyMap
function getVariantTitle(variantColors: VariantColors): string {
  const {propertyMap} = variantColors;

  // Ordem de prioridade para exibição das propriedades
  const priorityOrder = ["size", "type", "variant", "state", "status", "mode"];

  // Coletar todas as propriedades em ordem de prioridade
  const titleParts: string[] = [];

  // Primeiro, adicionar propriedades na ordem de prioridade
  for (const prop of priorityOrder) {
    if (propertyMap[prop]) {
      titleParts.push(propertyMap[prop]);
    }
  }

  // Depois, adicionar propriedades restantes que não estão na lista de prioridade
  for (const [key, value] of Object.entries(propertyMap)) {
    if (!priorityOrder.includes(key) && value) {
      titleParts.push(value);
    }
  }

  // Se tiver partes, juntar com " / "
  if (titleParts.length > 0) {
    return titleParts.join(" / ").toUpperCase();
  }

  return variantColors.variantName || "DEFAULT";
}

function sortVariantsBySize(variants: VariantColors[]): VariantColors[] {
  return [...variants].sort((a, b) => {
    const sizeA = (a.propertyMap.size || "").toLowerCase();
    const sizeB = (b.propertyMap.size || "").toLowerCase();
    const orderA = SIZE_ORDER[sizeA] ?? 99;
    const orderB = SIZE_ORDER[sizeB] ?? 99;
    return orderA - orderB;
  });
}

// ✅ CRIAR FRAME TITULADO PARA UMA VARIANTE
interface TitledVariantResult {
  outerFrame: FrameNode;
  vizFrame: FrameNode;
  instance: InstanceNode;
}

async function createTitledVariantFrame(
  variant: ComponentNode,
  title: string,
  frameWidth: number,
  frameHeight: number,
  highlightMode: boolean,
): Promise<TitledVariantResult> {
  // Outer frame com layout vertical
  const outerFrame = figma.createFrame();
  outerFrame.name = `Variant: ${title}`;
  outerFrame.layoutMode = "VERTICAL";
  outerFrame.primaryAxisSizingMode = "AUTO";
  outerFrame.counterAxisSizingMode = "AUTO";
  outerFrame.itemSpacing = 12;
  outerFrame.fills = [];

  // Título da variante
  const titleText = figma.createText();
  titleText.fontName = {family: "BancoDoBrasil Textos", style: "Medium"};
  titleText.fontSize = 14;
  titleText.characters = title;
  titleText.fills = [{type: "SOLID", color: {r: 0.4, g: 0.4, b: 0.4}}];
  outerFrame.appendChild(titleText);

  // Frame de visualização
  const vizFrame = figma.createFrame();
  vizFrame.name = "Visualization Frame";
  vizFrame.resize(frameWidth, frameHeight);
  const frameBgColor = highlightMode
    ? {r: 56 / 255, g: 83 / 255, b: 255 / 255} // #3853FF
    : {r: 0.98, g: 0.98, b: 0.98};
  vizFrame.fills = [{type: "SOLID", color: frameBgColor}];
  vizFrame.cornerRadius = 8;
  vizFrame.clipsContent = false;

  // Criar instância e centralizar
  const instance = variant.createInstance();
  instance.x = frameWidth / 2 - instance.width / 2;
  instance.y = frameHeight / 2 - instance.height / 2;
  vizFrame.appendChild(instance);

  outerFrame.appendChild(vizFrame);

  return {outerFrame, vizFrame, instance};
}

// ✅ CRIAR GRID DE VARIANTES PARA VISUALIZAÇÃO DE TEXTOS
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

      // ✅ Deduplicate text nodes by resolved name (nome real do componente)
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

        // ✅ Encontrar spec correspondente - usando nome resolvido (do componente principal)
        const resolvedNodeName = await resolveNodeName(textNode);
        const nodeName = resolvedNodeName.toLowerCase();
        const textNodeFontName =
          textNode.fontName !== figma.mixed
            ? textNode.fontName
            : {family: "Mixed", style: "Mixed"};
        const textNodeFontSize =
          textNode.fontSize !== figma.mixed ? textNode.fontSize : 0;
        let label = "";

        // Primeiro: tentar match por nome do elemento (case-insensitive e flexível)
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

        // Segundo: se não encontrou, tentar match por propriedades de fonte
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

        // Fallback: usar propriedades da fonte diretamente
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
        );
      }
    },
  );
}

// ✅ CRIAR GRID DE VARIANTES PARA VISUALIZAÇÃO DE ESPAÇAMENTOS
async function createMultiVariantSpacingGrid(
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
      gridName: "Grid Variantes - Espaçamentos",
      margin: 100,
    },
    async (ctx) => {
      await processSpacingNodeForViz(
        ctx.instance,
        ctx.vizFrame,
        ctx.instance.x,
        ctx.instance.y,
        ctx.instanceBounds,
        ctx.highlightMode,
      );
    },
  );
}

// ✅ CRIAR GRID DE VARIANTES PARA VISUALIZAÇÃO DE DIMENSÕES
async function createMultiVariantDimensionGrid(
  parent: FrameNode,
  componentSet: ComponentSetNode,
  variantColors: VariantColors[],
  tableWidth: number,
  highlightMode: boolean,
  framesPerRow: number = 2,
): Promise<void> {
  // Container com subtítulo (wrapper específico para dimensões)
  const vizContainer = figma.createFrame();
  vizContainer.name = "Visualização Dimensões e Bordas";
  vizContainer.layoutMode = "VERTICAL";
  vizContainer.primaryAxisSizingMode = "AUTO";
  vizContainer.counterAxisSizingMode = "AUTO";
  vizContainer.itemSpacing = 16;
  vizContainer.fills = [];

  const subTitle = figma.createText();
  subTitle.fontName = {family: "BancoDoBrasil Textos", style: "Bold"};
  subTitle.fontSize = 32;
  subTitle.characters = "Visualização de Dimensões e Bordas";
  vizContainer.appendChild(subTitle);

  await createGenericVariantGrid(
    vizContainer, // Grid será adicionado dentro do wrapper
    componentSet,
    variantColors,
    tableWidth,
    highlightMode,
    framesPerRow,
    {
      gridName: "Grid Variantes - Dimensões",
      margin: 100,
    },
    async (ctx) => {
      const instX = ctx.instance.x;
      const instY = ctx.instance.y;
      const instW = ctx.instance.width;
      const instH = ctx.instance.height;

      // Buscar tokens de dimensão
      const heightToken = await findHeightToken(ctx.variant);
      const radiusInfo = findCornerRadius(ctx.variant);
      const strokeInfo = await findStrokeWeight(ctx.instance);

      // Anotações de dimensão com highlightMode (apenas altura)
      await annotateDimensionNew(
        ctx.vizFrame,
        "height",
        instH,
        instX,
        instY,
        instW,
        instH,
        heightToken,
        ctx.highlightMode,
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
          ctx.highlightMode,
        );
      }

      // Iterar sobre todas as bordas encontradas (pode ter múltiplos lados)
      if (strokeInfo && strokeInfo.length > 0) {
        for (const stroke of strokeInfo) {
          let borderToken: string | null = null;
          const varKey =
            stroke.side === "All"
              ? "strokeWeight"
              : `stroke${stroke.side}Weight`;
          if (varKey in stroke.boundVars && stroke.boundVars[varKey]?.id) {
            const variable = await figma.variables.getVariableByIdAsync(
              stroke.boundVars[varKey].id,
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
            stroke.position,
          );
        }
      }
    },
  );

  parent.appendChild(vizContainer);
}

// ✅ VISUALIZAÇÃO DE TEXTO DENTRO DE SEÇÃO
async function createTextVisualizationInSection(
  parent: FrameNode,
  component: ComponentNode | ComponentSetNode | InstanceNode,
  variantColors: VariantColors[],
  tableWidth: number,
  highlightMode: boolean,
  vizPropertyFilters: Record<string, string[]>,
  framesPerRow: number = 2,
): Promise<void> {
  const hasText = variantColors.some((v) => v.textStyles.length > 0);
  if (!hasText) return;

  // ✅ Aplicar filtro para visualização
  const filteredVariants = filterVariantsForVisualization(
    variantColors,
    vizPropertyFilters,
  );

  // ✅ Se for ComponentSet com múltiplas variantes, usar grid
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

  const vizContainer = figma.createFrame();
  vizContainer.name = "Visualização Textos";
  vizContainer.layoutMode = "VERTICAL";
  vizContainer.primaryAxisSizingMode = "AUTO";
  vizContainer.counterAxisSizingMode = "FIXED";
  vizContainer.resize(tableWidth, 100);
  vizContainer.itemSpacing = 16;
  vizContainer.fills = [];

  const subTitle = figma.createText();
  subTitle.fontName = {family: "BancoDoBrasil Textos", style: "Medium"};
  subTitle.fontSize = 18;
  subTitle.characters = "Visualização";
  vizContainer.appendChild(subTitle);

  const MARGIN = 100;
  const frameWidth = tableWidth; // Use tableWidth for full width
  const frameHeight = Math.max(300, instance.height + MARGIN * 2);

  const vizFrame = figma.createFrame();
  vizFrame.name = "Text Visualization";
  vizFrame.resize(frameWidth, frameHeight);
  // Highlight mode: #3853FF (blue background), Normal: light gray
  const frameBgColor = highlightMode
    ? {r: 56 / 255, g: 83 / 255, b: 255 / 255} // #3853FF
    : {r: 0.98, g: 0.98, b: 0.98};
  vizFrame.fills = [{type: "SOLID", color: frameBgColor}];
  vizFrame.cornerRadius = 8;
  vizFrame.clipsContent = false;

  instance.x = frameWidth / 2 - instance.width / 2;
  instance.y = frameHeight / 2 - instance.height / 2;
  vizFrame.appendChild(instance);

  const allTextNodes = await findTextNodes(instance);
  const instanceBounds = instance.absoluteBoundingBox;

  if (instanceBounds) {
    const textStyles = variantColors[0]?.textStyles || [];
    const color = getTheme(highlightMode).text;

    // ✅ Deduplicate text nodes by name - only show one annotation per unique name
    const seenNames = new Set<string>();
    const uniqueTextNodes = allTextNodes.filter((node) => {
      const name = node.name.toLowerCase();
      if (seenNames.has(name)) return false;
      seenNames.add(name);
      return true;
    });

    // Track label positions to avoid overlapping
    const labelPositions: {
      x: number;
      y: number;
      width: number;
      height: number;
    }[] = [];
    const LABEL_HEIGHT = 16; // Approximate height of label text
    const LABEL_PADDING = 8; // Minimum space between labels

    for (let i = 0; i < uniqueTextNodes.length; i++) {
      const textNode = uniqueTextNodes[i];
      const textBounds = textNode.absoluteBoundingBox;
      if (!textBounds) continue;

      const textRelX = textBounds.x - instanceBounds.x;
      const textRelY = textBounds.y - instanceBounds.y;
      const nodeW = textBounds.width;
      const nodeH = textBounds.height;

      // ✅ Formato padrão: Family / Weight / LH: % / LS: %
      const fontName =
        textNode.fontName !== figma.mixed
          ? textNode.fontName
          : {family: "Mixed", style: "Mixed"};
      const lineHeight =
        textNode.lineHeight !== figma.mixed
          ? typeof textNode.lineHeight === "object" &&
            "value" in textNode.lineHeight
            ? `${Math.round(textNode.lineHeight.value)}${textNode.lineHeight.unit === "PIXELS" ? "px" : "%"}`
            : "Auto"
          : "Mixed";
      const letterSpacing =
        textNode.letterSpacing !== figma.mixed
          ? typeof textNode.letterSpacing === "object" &&
            "value" in textNode.letterSpacing
            ? `${Math.round(textNode.letterSpacing.value * 100) / 100}${textNode.letterSpacing.unit === "PIXELS" ? "px" : "%"}`
            : "0%"
          : "Mixed";
      let label = `${fontName.family} / ${fontName.style} / LH: ${lineHeight} / LS: ${letterSpacing}`;

      // ✅ Usar resolveNodeName para obter o nome correto do componente
      const resolvedNodeName = await resolveNodeName(textNode);
      const nodeName = resolvedNodeName.toLowerCase();
      for (const spec of textStyles) {
        const specEl = spec.element.toLowerCase();
        if (
          specEl === nodeName ||
          nodeName.includes(specEl) ||
          specEl.includes(nodeName)
        ) {
          // Use $textstyle- prefix for text tokens, senão formato completo
          label = spec.token
            ? `$textstyle-${spec.token.replace(/\//g, "-")}`
            : `${spec.fontFamily} / ${spec.fontWeight} / ${spec.fontSize}px / LH: ${spec.lineHeight} / LS: ${spec.letterSpacing || "0%"}`;
          break;
        }
      }

      const textX = instance.x + textRelX;
      const textY = instance.y + textRelY;
      let isAbove = i % 2 === 0;
      const LINE_LENGTH = 25;
      // ✅ Offset para afastar o dot do texto/componente
      const DOT_OFFSET = 15;

      // Calculate initial label position (incluindo DOT_OFFSET)
      let endX = textX + nodeW / 2;
      let endY = isAbove
        ? textY - DOT_OFFSET - LINE_LENGTH
        : textY + nodeH + DOT_OFFSET + LINE_LENGTH;
      const estimatedLabelWidth = label.length * 7; // Approximate width based on char count

      // Check for collision with existing labels and adjust position
      const checkCollision = (x: number, y: number, w: number, h: number) => {
        for (const pos of labelPositions) {
          const overlapX =
            Math.abs(x - pos.x) < (w + pos.width) / 2 + LABEL_PADDING;
          const overlapY =
            Math.abs(y - pos.y) < (h + pos.height) / 2 + LABEL_PADDING;
          if (overlapX && overlapY) return true;
        }
        return false;
      };

      // Try to find a non-overlapping position
      let attempts = 0;
      const maxAttempts = 4;
      while (
        checkCollision(endX, endY, estimatedLabelWidth, LABEL_HEIGHT) &&
        attempts < maxAttempts
      ) {
        attempts++;
        // Try alternating between above and below, then offset horizontally
        if (attempts === 1) {
          isAbove = !isAbove;
          endY = isAbove
            ? textY - DOT_OFFSET - LINE_LENGTH
            : textY + nodeH + DOT_OFFSET + LINE_LENGTH;
        } else if (attempts === 2) {
          endX += estimatedLabelWidth + LABEL_PADDING;
        } else if (attempts === 3) {
          endX -= (estimatedLabelWidth + LABEL_PADDING) * 2;
        } else {
          // Last resort: increase line length
          endY = isAbove
            ? textY - DOT_OFFSET - LINE_LENGTH * 2
            : textY + nodeH + DOT_OFFSET + LINE_LENGTH * 2;
        }
      }

      // Record this label's position
      labelPositions.push({
        x: endX,
        y: endY,
        width: estimatedLabelWidth,
        height: LABEL_HEIGHT,
      });

      const startX = textX + nodeW / 2;
      const startY = isAbove ? textY - DOT_OFFSET : textY + nodeH + DOT_OFFSET;

      await createSimpleAnnotation(
        vizFrame,
        startX,
        startY,
        endX,
        endY,
        label,
        color,
      );
    }
  }

  vizContainer.appendChild(vizFrame);
  parent.appendChild(vizContainer);
}

// ✅ TABELA DE ESPAÇAMENTOS DENTRO DE SEÇÃO - Estilo: linhas brancas, agrupado por Size
async function createSpacingTableInSection(
  parent: FrameNode,
  variantColors: VariantColors[],
  tableWidth: number,
): Promise<void> {
  const hasSpacing = variantColors.some(
    (v) => v.spacings.length > 0 || v.borders.length > 0,
  );
  if (!hasSpacing) return;

  const GROUP_SPACING = 20;
  const ROW_GAP = 4;

  // ✅ Usar TableBuilder para criar tabela de espaçamentos
  const table = createTableBuilder("Tabela Espaçamentos", tableWidth, [
    {header: "Medida", position: 0},
    {header: "Token / Valor", position: 0.4, color: "error"},
    {header: "Referência", position: 0.75},
  ]);

  // Agrupar por tipo de medida (property) e coletar tokens únicos
  const spacingsByProperty: Map<
    string,
    {token: string | null; value: string; variants: string[]}[]
  > = new Map();

  for (const variant of variantColors) {
    const variantLabel = formatVariantPropertiesForTable(variant.propertyMap);

    for (const spacing of variant.spacings) {
      if (!spacingsByProperty.has(spacing.property)) {
        spacingsByProperty.set(spacing.property, []);
      }
      const entries = spacingsByProperty.get(spacing.property)!;
      const existing = entries.find(
        (e) => (e.token || e.value) === (spacing.token || spacing.value),
      );
      if (existing) {
        if (!existing.variants.includes(variantLabel)) {
          existing.variants.push(variantLabel);
        }
      } else {
        entries.push({
          token: spacing.token,
          value: spacing.value,
          variants: [variantLabel],
        });
      }
    }

    for (const border of variant.borders) {
      const sideName =
        border.side && border.side !== "All" ? ` ${border.side}` : "";
      const positionName = border.position ? ` (${border.position})` : "";
      const propName = `Border${sideName}${positionName}`;

      if (!spacingsByProperty.has(propName)) {
        spacingsByProperty.set(propName, []);
      }
      const entries = spacingsByProperty.get(propName)!;
      const existing = entries.find(
        (e) => (e.token || e.value) === (border.token || border.value),
      );
      if (existing) {
        if (!existing.variants.includes(variantLabel)) {
          existing.variants.push(variantLabel);
        }
      } else {
        entries.push({
          token: border.token,
          value: border.value,
          variants: [variantLabel],
        });
      }
    }
  }

  // Criar lista de todas as entradas com prefixo semântico
  interface DisplayEntry {
    prefix: string;
    displayText: string;
    token: string | null;
    value: string;
  }
  const allDisplayEntries: DisplayEntry[] = [];

  // Contar o número total de variantes (labels únicos)
  const allVariantLabels = new Set<string>();
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
          value: entry.value,
        });
      } else {
        const entryGroups = new Set<string>();
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
            value: entry.value,
          });
        }
      }
    }
  }

  // Agrupar por prefixo semântico
  const entriesByPrefix: Map<string, DisplayEntry[]> = new Map();
  for (const entry of allDisplayEntries) {
    if (!entriesByPrefix.has(entry.prefix)) {
      entriesByPrefix.set(entry.prefix, []);
    }
    entriesByPrefix.get(entry.prefix)!.push(entry);
  }

  // Ordenar prefixos: "Todos" primeiro, depois alfabeticamente
  const sortedPrefixes = Array.from(entriesByPrefix.keys()).sort((a, b) => {
    if (a === "Todos") return -1;
    if (b === "Todos") return 1;
    return a.localeCompare(b);
  });

  // Renderizar agrupado por prefixo usando TableBuilder
  let isFirstGroup = true;
  for (const prefix of sortedPrefixes) {
    const groupEntries = entriesByPrefix.get(prefix)!;
    if (groupEntries.length === 0) continue;

    // Adicionar espaçamento entre grupos
    if (!isFirstGroup) {
      table.addSpacer(GROUP_SPACING - ROW_GAP);
    }
    isFirstGroup = false;

    for (const entry of groupEntries) {
      table.addRow(`Row - ${entry.displayText}`, [
        {text: entry.displayText},
        {text: entry.token || "-", color: "error"},
        {text: entry.value},
      ]);
    }
  }

  table.appendTo(parent);
}

// ✅ VISUALIZAÇÃO DE PADDING/GAP DENTRO DE SEÇÃO
async function createPaddingGapVisualizationInSection(
  parent: FrameNode,
  component: ComponentNode | ComponentSetNode | InstanceNode,
  variantColors: VariantColors[],
  tableWidth: number,
  highlightMode: boolean,
  vizPropertyFilters: Record<string, string[]>,
  framesPerRow: number = 2,
): Promise<void> {
  // ✅ Aplicar filtro para visualização
  const filteredVariants = filterVariantsForVisualization(
    variantColors,
    vizPropertyFilters,
  );

  // ✅ Se for ComponentSet com múltiplas variantes, usar grid
  if (component.type === "COMPONENT_SET" && filteredVariants.length > 1) {
    await createMultiVariantSpacingGrid(
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

  const vizContainer = figma.createFrame();
  vizContainer.name = "Visualização Paddings e Gaps";
  vizContainer.layoutMode = "VERTICAL";
  vizContainer.primaryAxisSizingMode = "AUTO";
  vizContainer.counterAxisSizingMode = "FIXED";
  vizContainer.resize(tableWidth, 100);
  vizContainer.itemSpacing = 16;
  vizContainer.fills = [];

  const subTitle = figma.createText();
  subTitle.fontName = {family: "BancoDoBrasil Textos", style: "Medium"};
  subTitle.fontSize = 18;
  subTitle.characters = "Visualização de Paddings e Gaps";
  vizContainer.appendChild(subTitle);

  const MARGIN = 120;
  const frameWidth = tableWidth; // Use tableWidth for full width
  const frameHeight = Math.max(300, instance.height + MARGIN * 2);

  const frame = figma.createFrame();
  frame.name = "Spacing Visualization";
  frame.resize(frameWidth, frameHeight);
  // Highlight mode: #3853FF (blue background), Normal: light gray
  const frameBgColor = highlightMode
    ? {r: 56 / 255, g: 83 / 255, b: 255 / 255} // #3853FF
    : {r: 0.98, g: 0.98, b: 0.98};
  frame.fills = [{type: "SOLID", color: frameBgColor}];
  frame.cornerRadius = 8;
  frame.clipsContent = false;

  instance.x = frameWidth / 2 - instance.width / 2;
  instance.y = frameHeight / 2 - instance.height / 2;
  frame.appendChild(instance);

  // Adicionar overlays de padding/gap usando a função existente
  const instanceBounds = instance.absoluteBoundingBox;
  if (instanceBounds) {
    await processSpacingNodeForViz(
      instance,
      frame,
      instance.x,
      instance.y,
      instanceBounds,
      highlightMode,
    );
  }

  vizContainer.appendChild(frame);
  parent.appendChild(vizContainer);
}

// ✅ VISUALIZAÇÃO DE DIMENSÕES DENTRO DE SEÇÃO
async function createDimensionVisualizationInSection(
  parent: FrameNode,
  component: ComponentNode | ComponentSetNode | InstanceNode,
  variantColors: VariantColors[],
  tableWidth: number,
  highlightMode: boolean,
  vizPropertyFilters: Record<string, string[]>,
  framesPerRow: number = 2,
): Promise<void> {
  // ✅ Aplicar filtro para visualização
  const filteredVariants = filterVariantsForVisualization(
    variantColors,
    vizPropertyFilters,
  );

  // ✅ Se for ComponentSet com múltiplas variantes, usar grid
  if (component.type === "COMPONENT_SET" && filteredVariants.length > 1) {
    await createMultiVariantDimensionGrid(
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

  const vizContainer = figma.createFrame();
  vizContainer.name = "Visualização Dimensões e Bordas";
  vizContainer.layoutMode = "VERTICAL";
  vizContainer.primaryAxisSizingMode = "AUTO";
  vizContainer.counterAxisSizingMode = "FIXED";
  vizContainer.resize(tableWidth, 100);
  vizContainer.itemSpacing = 16;
  vizContainer.fills = [];

  const subTitle = figma.createText();
  subTitle.fontName = {family: "BancoDoBrasil Textos", style: "Medium"};
  subTitle.fontSize = 18;
  subTitle.characters = "Visualização de Dimensões e Bordas";
  vizContainer.appendChild(subTitle);

  const MARGIN = 120;
  const frameWidth = tableWidth; // Use tableWidth for full width
  const frameHeight = Math.max(300, instance.height + MARGIN * 2);

  const frame = figma.createFrame();
  frame.name = "Dimension Visualization";
  frame.resize(frameWidth, frameHeight);
  // Highlight mode: #3853FF (blue background), Normal: light gray
  const frameBgColor = highlightMode
    ? {r: 56 / 255, g: 83 / 255, b: 255 / 255} // #3853FF
    : {r: 0.98, g: 0.98, b: 0.98};
  frame.fills = [{type: "SOLID", color: frameBgColor}];
  frame.cornerRadius = 8;
  frame.clipsContent = false;

  instance.x = frameWidth / 2 - instance.width / 2;
  instance.y = frameHeight / 2 - instance.height / 2;
  frame.appendChild(instance);

  const instX = instance.x;
  const instY = instance.y;
  const instW = instance.width;
  const instH = instance.height;

  // Buscar cornerRadius e seu token (buscar recursivamente)
  const radiusInfo = findCornerRadius(baseComponent);
  if (radiusInfo) {
    // Usar função recursiva para encontrar token de cornerRadius
    const radiusToken = await findCornerRadiusToken(baseComponent);
    await annotateRadiusNew(
      frame,
      radiusInfo.value,
      instX,
      instY,
      instW,
      instH,
      radiusToken,
      highlightMode,
    );
  }

  // ✅ Iterar sobre todas as bordas encontradas (pode ter múltiplos lados)
  const strokeInfo = await findStrokeWeight(instance);
  if (strokeInfo && strokeInfo.length > 0) {
    for (const stroke of strokeInfo) {
      let borderToken: string | null = null;
      const varKey =
        stroke.side === "All" ? "strokeWeight" : `stroke${stroke.side}Weight`;
      if (varKey in stroke.boundVars && stroke.boundVars[varKey]?.id) {
        const variable = await figma.variables.getVariableByIdAsync(
          stroke.boundVars[varKey].id,
        );
        if (variable) borderToken = variable.name.replace(/\//g, "-");
      }
      await annotateBorderNew(
        frame,
        stroke.value,
        instX,
        instY,
        instW,
        instH,
        borderToken,
        highlightMode,
        stroke.side,
        stroke.position,
      );
    }
  }

  // Verificar token de height (buscar recursivamente no componente)
  const heightToken = await findHeightToken(baseComponent);

  // Mostrar height com token se existir, senão mostrar valor
  await annotateDimensionNew(
    frame,
    "height",
    instH,
    instX,
    instY,
    instW,
    instH,
    heightToken,
    highlightMode,
  );

  vizContainer.appendChild(frame);
  parent.appendChild(vizContainer);
}

// ✅ LISTENER DE MENSAGENS DA UI
figma.ui.onmessage = async (msg: {
  type: string;
  options?: GenerationOptions;
  assetType?: string;
  value?: string;
  color?: string;
  direction?: string;
  badgePosition?: string;
  highlightMode?: boolean;
  markerConfig?: {
    type: string;
    value?: string;
    colorType?: string;
    textColorType?: string;
    direction?: string;
    badgePosition?: string;
    highlightMode?: boolean;
    size?: number;
  };
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
  } else if (msg.type === "update-marker" && msg.markerConfig) {
    // Update existing marker in real-time
    const config = msg.markerConfig;
    await insertAssetIntoFigma(
      config.type,
      config.value || "0px",
      config.colorType || "red",
      (config.direction as "horizontal" | "vertical") || "horizontal",
      (config.badgePosition as "top" | "bottom" | "left" | "right") || "bottom",
      config.highlightMode || false,
      config.textColorType,
    );
  } else if (msg.type === "cancel" || msg.type === "close") {
    figma.closePlugin();
  } else if (msg.type === "refresh") {
    // Reload plugin
    figma.closePlugin();
    figma.showUI(__html__);
  }
};

// ✅ FUNÇÃO PARA INSERIR ASSETS/MARCADORES NO FIGMA
async function insertAssetIntoFigma(
  assetType: string,
  value: string,
  colorType: string,
  direction: "horizontal" | "vertical" = "horizontal",
  badgePosition: "top" | "bottom" | "left" | "right" = "bottom",
  highlightMode: boolean = false,
  textColorType?: string,
): Promise<void> {
  await figma.loadFontAsync({family: "BancoDoBrasil Textos", style: "Bold"});
  await figma.loadFontAsync({family: "BancoDoBrasil Textos", style: "Regular"});

  // Definir cores baseado no tipo (modo normal)
  const normalColors: Record<string, RGB> = {
    red: {r: 1, g: 0.2, b: 0.2}, // Vermelho (medida/gap)
    blue: {r: 0, g: 0.5, b: 1}, // Azul (padding)
    pink: {r: 236 / 255, g: 72 / 255, b: 153 / 255}, // Rosa
    green: {r: 0.2, g: 0.6, b: 0.2}, // Verde escuro (texto)
    black: {r: 0, g: 0, b: 0}, // Preto
  };

  // Cores para modo highlight
  const highlightColors: Record<string, RGB> = {
    red: {r: 255 / 255, g: 199 / 255, b: 203 / 255}, // #FFC7CB (rosa claro)
    blue: {r: 98 / 255, g: 248 / 255, b: 79 / 255}, // #62F84F (verde brilhante)
    pink: {r: 255 / 255, g: 199 / 255, b: 203 / 255}, // #FFC7CB (rosa claro)
    green: {r: 98 / 255, g: 248 / 255, b: 79 / 255}, // #62F84F (verde brilhante)
  };

  const colors = highlightMode ? highlightColors : normalColors;
  const color = colors[colorType] || colors.red;

  // Cor do texto (para pointers)
  let textColor: RGB | undefined = undefined;
  if (textColorType && textColorType !== 'inherit') {
    textColor = normalColors[textColorType];
  }

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
    case "number-top":
      assetFrame = createNumberAssetResizable("1", "top", 25);
      break;
    case "number-bottom":
      assetFrame = createNumberAssetResizable("1", "bottom", 25);
      break;
    case "number-left":
      assetFrame = createNumberAssetResizable("1", "left", 25);
      break;
    case "number-right":
      assetFrame = createNumberAssetResizable("1", "right", 25);
      break;
    case "area-dashed-circle":
      assetFrame = createAreaAssetResizable("dashed", "circle", 28);
      break;
    case "area-dashed-square":
      assetFrame = createAreaAssetResizable("dashed", "square", 28);
      break;
    case "area-solid-circle":
      assetFrame = createAreaAssetResizable("solid", "circle", 28);
      break;
    case "area-solid-square":
      assetFrame = createAreaAssetResizable("solid", "square", 28);
      break;
    default:
      assetFrame = createMeasureAssetResizable(
        value,
        color,
        direction,
        badgePosition,
      );
  }

  // Posicionar no centro da viewport
  const viewport = figma.viewport.center;
  assetFrame.x = viewport.x - assetFrame.width / 2;
  assetFrame.y = viewport.y - assetFrame.height / 2;

  // Selecionar o asset criado
  figma.currentPage.selection = [assetFrame];
  figma.viewport.scrollAndZoomIntoView([assetFrame]);

  figma.notify(`Asset "${assetType}" inserido!`);
}

// ✅ ASSET RESIZABLE DE MEDIDA - Redimensiona corretamente ao esticar
function createMeasureAssetResizable(
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

    // Badge primeiro para calcular altura
    const badge = createAssetBadge(value, color);
    const badgeHeight = badge.height;

    // Linha horizontal principal com marcadores
    const lineFrame = figma.createFrame();
    lineFrame.name = "Line Frame";
    lineFrame.fills = [];
    lineFrame.resize(SIZE, MARKER_SIZE);

    // Posicionar linha baseado na posição do badge
    if (badgePosition === "top") {
      lineFrame.y = badgeHeight + 5;
    } else if (badgePosition === "bottom") {
      lineFrame.y = 5;
    } else {
      lineFrame.y = (frame.height - MARKER_SIZE) / 2;
    }
    lineFrame.constraints = {horizontal: "STRETCH", vertical: "CENTER"};

    // Marcador esquerdo
    const leftMarker = figma.createRectangle();
    leftMarker.name = "Left Marker";
    leftMarker.resize(2, MARKER_SIZE);
    leftMarker.fills = [{type: "SOLID", color}];
    leftMarker.x = 0;
    leftMarker.y = 0;
    leftMarker.constraints = {horizontal: "MIN", vertical: "STRETCH"};
    lineFrame.appendChild(leftMarker);

    // Marcador direito
    const rightMarker = figma.createRectangle();
    rightMarker.name = "Right Marker";
    rightMarker.resize(2, MARKER_SIZE);
    rightMarker.fills = [{type: "SOLID", color}];
    rightMarker.x = SIZE - 2;
    rightMarker.y = 0;
    rightMarker.constraints = {horizontal: "MAX", vertical: "STRETCH"};
    lineFrame.appendChild(rightMarker);

    // Linha horizontal
    const line = figma.createRectangle();
    line.name = "Line";
    line.resize(SIZE, 2);
    line.fills = [{type: "SOLID", color}];
    line.x = 0;
    line.y = MARKER_SIZE / 2 - 1;
    line.constraints = {horizontal: "STRETCH", vertical: "CENTER"};
    lineFrame.appendChild(line);

    frame.appendChild(lineFrame);

    // Posicionar badge
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

    // Badge primeiro para calcular largura
    const badge = createAssetBadge(value, color);
    const badgeWidth = badge.width;

    const lineFrame = figma.createFrame();
    lineFrame.name = "Line Frame";
    lineFrame.fills = [];
    lineFrame.resize(MARKER_SIZE, SIZE);

    // Posicionar linha baseado na posição do badge
    if (badgePosition === "left") {
      lineFrame.x = badgeWidth + 5;
    } else if (badgePosition === "right") {
      lineFrame.x = 5;
    } else {
      lineFrame.x = (frame.width - MARKER_SIZE) / 2;
    }
    lineFrame.constraints = {horizontal: "CENTER", vertical: "STRETCH"};

    // Marcador superior
    const topMarker = figma.createRectangle();
    topMarker.name = "Top Marker";
    topMarker.resize(MARKER_SIZE, 2);
    topMarker.fills = [{type: "SOLID", color}];
    topMarker.x = 0;
    topMarker.y = 0;
    topMarker.constraints = {horizontal: "STRETCH", vertical: "MIN"};
    lineFrame.appendChild(topMarker);

    // Marcador inferior
    const bottomMarker = figma.createRectangle();
    bottomMarker.name = "Bottom Marker";
    bottomMarker.resize(MARKER_SIZE, 2);
    bottomMarker.fills = [{type: "SOLID", color}];
    bottomMarker.x = 0;
    bottomMarker.y = SIZE - 2;
    bottomMarker.constraints = {horizontal: "STRETCH", vertical: "MAX"};
    lineFrame.appendChild(bottomMarker);

    // Linha vertical
    const line = figma.createRectangle();
    line.name = "Line";
    line.resize(2, SIZE);
    line.fills = [{type: "SOLID", color}];
    line.x = MARKER_SIZE / 2 - 1;
    line.y = 0;
    line.constraints = {horizontal: "CENTER", vertical: "STRETCH"};
    lineFrame.appendChild(line);

    frame.appendChild(lineFrame);

    // Posicionar badge
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

// ✅ ASSET RESIZABLE DE GAP/PADDING - Redimensiona corretamente ao esticar
function createGapAssetResizable(
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

    // Área do gap - retângulo tracejado
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

// ✅ ASSET RESIZABLE DE POINTER - Com haste que redimensiona
function createPointerAssetResizable(
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

  const isVertical = direction === "top" || direction === "bottom";

  if (isVertical) {
    frame.resize(60, LINE_LENGTH + DOT_SIZE + 16);

    // Dot
    const dot = figma.createEllipse();
    dot.name = "Dot";
    dot.resize(DOT_SIZE, DOT_SIZE);
    dot.fills = [{type: "SOLID", color}];

    // Line (haste) - conectada diretamente ao dot sem gap
    const line = figma.createRectangle();
    line.name = "Line";
    line.resize(1, LINE_LENGTH);
    line.fills = [{type: "SOLID", color}];

    // Label
    const label = figma.createText();
    label.name = "Label";
    label.fontName = {family: "BancoDoBrasil Textos", style: "Regular"};
    label.fontSize = 11;
    label.characters = value;
    label.fills = [{type: "SOLID", color: textColor || color}];

    if (direction === "top") {
      // Dot no topo, linha conectada, label embaixo
      dot.x = frame.width / 2 - DOT_SIZE / 2;
      dot.y = 0;
      dot.constraints = {horizontal: "CENTER", vertical: "MIN"};

      // Linha começa no centro do dot (sem gap)
      line.x = frame.width / 2 - 0.5;
      line.y = DOT_SIZE / 2;
      line.constraints = {horizontal: "CENTER", vertical: "STRETCH"};

      label.x = frame.width / 2 - label.width / 2;
      label.y = DOT_SIZE / 2 + LINE_LENGTH + 2;
      label.constraints = {horizontal: "CENTER", vertical: "MAX"};
    } else {
      // Label no topo, linha, dot embaixo (bottom)
      label.x = frame.width / 2 - label.width / 2;
      label.y = 0;
      label.constraints = {horizontal: "CENTER", vertical: "MIN"};

      // Dot posicionado na parte inferior
      dot.x = frame.width / 2 - DOT_SIZE / 2;
      dot.y = frame.height - DOT_SIZE;
      dot.constraints = {horizontal: "CENTER", vertical: "MAX"};

      // Linha conecta label ao centro do dot (sem gap)
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

    // Line (haste) - conectada diretamente ao dot sem gap
    const line = figma.createRectangle();
    line.name = "Line";
    line.resize(LINE_LENGTH, 1);
    line.fills = [{type: "SOLID", color}];

    // Label
    const label = figma.createText();
    label.name = "Label";
    label.fontName = {family: "BancoDoBrasil Textos", style: "Regular"};
    label.fontSize = 11;
    label.characters = value;
    label.fills = [{type: "SOLID", color: textColor || color}];

    if (direction === "left") {
      // Dot na esquerda, linha conectada, label na direita
      dot.x = 0;
      dot.y = frame.height / 2 - DOT_SIZE / 2;
      dot.constraints = {horizontal: "MIN", vertical: "CENTER"};

      // Linha começa no centro do dot (sem gap)
      line.x = DOT_SIZE / 2;
      line.y = frame.height / 2 - 0.5;
      line.constraints = {horizontal: "STRETCH", vertical: "CENTER"};

      label.x = DOT_SIZE / 2 + LINE_LENGTH + 4;
      label.y = frame.height / 2 - label.height / 2;
      label.constraints = {horizontal: "MAX", vertical: "CENTER"};
    } else {
      // Label na esquerda, linha conectada, dot na direita (right)
      label.x = 0;
      label.y = frame.height / 2 - label.height / 2;
      label.constraints = {horizontal: "MIN", vertical: "CENTER"};

      // Dot posicionado na direita
      dot.x = frame.width - DOT_SIZE;
      dot.y = frame.height / 2 - DOT_SIZE / 2;
      dot.constraints = {horizontal: "MAX", vertical: "CENTER"};

      // Linha conecta label ao centro do dot (sem gap)
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

// Helper: Criar badge para assets
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
  badgeText.fontName = {family: "BancoDoBrasil Textos", style: "Bold"};
  badgeText.fontSize = 12;
  badgeText.characters = value;
  badgeText.fills = [{type: "SOLID", color: {r: 1, g: 1, b: 1}}];
  badge.appendChild(badgeText);

  return badge;
}

// ✅ ASSET DE NÚMERO - Responsivo com haste (similar aos pointers)
function createNumberAssetResizable(
  value: string,
  position: "top" | "bottom" | "left" | "right",
  size: number
): FrameNode {
  const frame = figma.createFrame();
  frame.name = `Number-${position}`;
  frame.fills = [];
  frame.clipsContent = false;

  const DOT_SIZE = size;
  const LINE_LENGTH = 40;
  const LINE_WIDTH = 1;
  const color = {r: 1, g: 0.84, b: 0}; // Amarelo

  if (position === "top" || position === "bottom") {
    // Vertical
    frame.resize(DOT_SIZE, LINE_LENGTH + DOT_SIZE + 10);

    // Círculo
    const circle = figma.createEllipse();
    circle.name = "Circle";
    circle.resize(DOT_SIZE, DOT_SIZE);
    circle.fills = [{type: "SOLID", color}];

    // Linha (haste)
    const line = figma.createRectangle();
    line.name = "Line";
    line.resize(LINE_WIDTH, LINE_LENGTH);
    line.fills = [{type: "SOLID", color}];

    // Número (texto)
    const text = figma.createText();
    text.name = "Number";
    text.fontName = {family: "BancoDoBrasil Textos", style: "Bold"};
    text.fontSize = 14;
    text.characters = value;
    text.fills = [{type: "SOLID", color: {r: 0, g: 0, b: 0}}];
    text.textAlignHorizontal = "CENTER";
    text.textAlignVertical = "CENTER";

    if (position === "top") {
      // Círculo no topo, linha desce, conectado ao centro do círculo
      circle.x = frame.width / 2 - DOT_SIZE / 2;
      circle.y = 0;
      circle.constraints = {horizontal: "CENTER", vertical: "MIN"};

      line.x = frame.width / 2 - LINE_WIDTH / 2;
      line.y = DOT_SIZE / 2;
      line.constraints = {horizontal: "CENTER", vertical: "STRETCH"};

      text.x = circle.x + DOT_SIZE / 2 - text.width / 2;
      text.y = circle.y + DOT_SIZE / 2 - text.height / 2;
      text.constraints = {horizontal: "CENTER", vertical: "MIN"};
    } else {
      // Círculo embaixo, linha sobe
      circle.x = frame.width / 2 - DOT_SIZE / 2;
      circle.y = frame.height - DOT_SIZE;
      circle.constraints = {horizontal: "CENTER", vertical: "MAX"};

      line.x = frame.width / 2 - LINE_WIDTH / 2;
      line.y = 0;
      line.resize(LINE_WIDTH, frame.height - DOT_SIZE / 2);
      line.constraints = {horizontal: "CENTER", vertical: "STRETCH"};

      text.x = circle.x + DOT_SIZE / 2 - text.width / 2;
      text.y = circle.y + DOT_SIZE / 2 - text.height / 2;
      text.constraints = {horizontal: "CENTER", vertical: "MAX"};
    }

    frame.appendChild(line);
    frame.appendChild(circle);
    frame.appendChild(text);
  } else {
    // Horizontal
    frame.resize(LINE_LENGTH + DOT_SIZE + 10, DOT_SIZE);

    // Círculo
    const circle = figma.createEllipse();
    circle.name = "Circle";
    circle.resize(DOT_SIZE, DOT_SIZE);
    circle.fills = [{type: "SOLID", color}];

    // Linha (haste)
    const line = figma.createRectangle();
    line.name = "Line";
    line.resize(LINE_LENGTH, LINE_WIDTH);
    line.fills = [{type: "SOLID", color}];

    // Número (texto)
    const text = figma.createText();
    text.name = "Number";
    text.fontName = {family: "BancoDoBrasil Textos", style: "Bold"};
    text.fontSize = 14;
    text.characters = value;
    text.fills = [{type: "SOLID", color: {r: 0, g: 0, b: 0}}];
    text.textAlignHorizontal = "CENTER";
    text.textAlignVertical = "CENTER";

    if (position === "left") {
      // Círculo na esquerda
      circle.x = 0;
      circle.y = frame.height / 2 - DOT_SIZE / 2;
      circle.constraints = {horizontal: "MIN", vertical: "CENTER"};

      line.x = DOT_SIZE / 2;
      line.y = frame.height / 2 - LINE_WIDTH / 2;
      line.constraints = {horizontal: "STRETCH", vertical: "CENTER"};

      text.x = circle.x + DOT_SIZE / 2 - text.width / 2;
      text.y = circle.y + DOT_SIZE / 2 - text.height / 2;
      text.constraints = {horizontal: "MIN", vertical: "CENTER"};
    } else {
      // Círculo na direita
      circle.x = frame.width - DOT_SIZE;
      circle.y = frame.height / 2 - DOT_SIZE / 2;
      circle.constraints = {horizontal: "MAX", vertical: "CENTER"};

      line.x = 0;
      line.y = frame.height / 2 - LINE_WIDTH / 2;
      line.resize(frame.width - DOT_SIZE / 2, LINE_WIDTH);
      line.constraints = {horizontal: "STRETCH", vertical: "CENTER"};

      text.x = circle.x + DOT_SIZE / 2 - text.width / 2;
      text.y = circle.y + DOT_SIZE / 2 - text.height / 2;
      text.constraints = {horizontal: "MAX", vertical: "CENTER"};
    }

    frame.appendChild(line);
    frame.appendChild(circle);
    frame.appendChild(text);
  }

  return frame;
}

// ✅ ASSET DE ÁREA - Fill container (redimensiona com o pai)
function createAreaAssetResizable(
  style: "dashed" | "solid",
  shape: "circle" | "square",
  size: number
): FrameNode {
  const frame = figma.createFrame();
  frame.name = `Area-${style}-${shape}`;
  frame.fills = [];
  frame.resize(size, size);
  frame.clipsContent = false;

  const color = {r: 0.9, g: 0.53, b: 0.6}; // Rosa claro

  if (shape === "circle") {
    const circle = figma.createEllipse();
    circle.name = "Area";
    circle.resize(size, size);

    if (style === "solid") {
      circle.fills = [{type: "SOLID", color, opacity: 0.3}];
      circle.strokes = [{type: "SOLID", color}];
      circle.strokeWeight = 1;
    } else {
      circle.fills = [];
      circle.strokes = [{type: "SOLID", color}];
      circle.strokeWeight = 1;
      circle.dashPattern = [4, 4];
    }

    // Fill container - redimensiona com o frame pai
    circle.constraints = {horizontal: "STRETCH", vertical: "STRETCH"};
    circle.x = 0;
    circle.y = 0;
    frame.appendChild(circle);
  } else {
    const rect = figma.createRectangle();
    rect.name = "Area";
    rect.resize(size, size);

    if (style === "solid") {
      rect.fills = [{type: "SOLID", color, opacity: 0.3}];
      rect.strokes = [{type: "SOLID", color}];
      rect.strokeWeight = 1;
    } else {
      rect.fills = [];
      rect.strokes = [{type: "SOLID", color}];
      rect.strokeWeight = 1;
      rect.dashPattern = [4, 4];
    }

    // Fill container - redimensiona com o frame pai
    rect.constraints = {horizontal: "STRETCH", vertical: "STRETCH"};
    rect.x = 0;
    rect.y = 0;
    frame.appendChild(rect);
  }

  return frame;
}

// Interface para rastrear posições de anotações e evitar sobreposição
interface AnnotationTracker {
  // Posições Y das anotações para cada lado (para right/left, rastrear Y)
  // Posições X das anotações para top/bottom (rastrear X)
  rightPositions: number[];
  leftPositions: number[];
  topPositions: number[];
  bottomPositions: number[];
  gapPositions: number[];
}

// Função para encontrar posição Y livre para anotação lateral (right/left)
function findFreeYPosition(
  existingPositions: number[],
  preferredY: number,
  minSpacing: number = 20,
): number {
  if (existingPositions.length === 0) return preferredY;

  // Ordenar posições existentes
  const sorted = [...existingPositions].sort((a, b) => a - b);

  // Verificar se a posição preferida está livre
  let collision = sorted.some((pos) => Math.abs(pos - preferredY) < minSpacing);
  if (!collision) return preferredY;

  // Encontrar a posição livre mais próxima (alternando acima/abaixo)
  let offset = minSpacing;
  for (let i = 0; i < 10; i++) {
    // Tentar abaixo
    const belowY = preferredY + offset;
    collision = sorted.some((pos) => Math.abs(pos - belowY) < minSpacing);
    if (!collision) return belowY;

    // Tentar acima
    const aboveY = preferredY - offset;
    collision = sorted.some((pos) => Math.abs(pos - aboveY) < minSpacing);
    if (!collision) return aboveY;

    offset += minSpacing;
  }
  return preferredY + offset; // Fallback
}

// Função para encontrar posição X livre para anotação top/bottom
function findFreeXPosition(
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

// Função auxiliar para processar nós de espaçamento
async function processSpacingNodeForViz(
  node: SceneNode,
  container: FrameNode,
  baseX: number,
  baseY: number,
  instanceBounds: Rect,
  highlightMode: boolean = false,
  tracker?: AnnotationTracker,
): Promise<void> {
  // ✅ Ignorar nós ocultos
  if (!isNodeVisible(node)) return;

  // Criar tracker se não existir (primeira chamada)
  if (!tracker) {
    tracker = {
      rightPositions: [],
      leftPositions: [],
      topPositions: [],
      bottomPositions: [],
      gapPositions: [],
    };
  }

  if ("layoutMode" in node && node.layoutMode !== "NONE") {
    const n = node as FrameNode;
    const nodeBounds = n.absoluteBoundingBox;
    if (!nodeBounds) return;

    const nodeRelX = nodeBounds.x - instanceBounds.x;
    const nodeRelY = nodeBounds.y - instanceBounds.y;
    const nodeX = baseX + nodeRelX;
    const nodeY = baseY + nodeRelY;
    const nodeW = nodeBounds.width;
    const nodeH = nodeBounds.height;

    const boundVars = n.boundVariables || {};

    // Gap
    if (
      n.itemSpacing &&
      n.itemSpacing > 0 &&
      n.children &&
      n.children.length >= 2
    ) {
      let gapToken: string | null = null;
      if ("itemSpacing" in boundVars) {
        const binding = (boundVars as Record<string, VariableAlias>)
          .itemSpacing;
        if (binding?.id) {
          const variable = await figma.variables.getVariableByIdAsync(
            binding.id,
          );
          if (variable)
            gapToken = variable.name
              .replace(/^[Ss]pacing\//i, "")
              .replace(/\//g, "-");
        }
      }
      const visibleChildren = n.children.filter((child) =>
        "visible" in child ? child.visible : true,
      );
      const isHorizontal = n.layoutMode === "HORIZONTAL";
      for (let i = 0; i < visibleChildren.length - 1; i++) {
        await annotateGapNew(
          container,
          n,
          n.itemSpacing,
          isHorizontal ? "H" : "V",
          nodeX,
          nodeY,
          gapToken,
          i,
          highlightMode,
          tracker,
        );
      }
    }

    // Paddings
    const paddingProps = [
      {key: "paddingTop" as const, side: "top" as const},
      {key: "paddingBottom" as const, side: "bottom" as const},
      {key: "paddingLeft" as const, side: "left" as const},
      {key: "paddingRight" as const, side: "right" as const},
    ];

    for (const {key, side} of paddingProps) {
      const paddingValue = n[key];
      if (paddingValue > 0) {
        let paddingToken: string | null = null;
        if (key in boundVars) {
          const binding = (boundVars as Record<string, VariableAlias>)[key];
          if (binding?.id) {
            const variable = await figma.variables.getVariableByIdAsync(
              binding.id,
            );
            if (variable)
              paddingToken = variable.name
                .replace(/^[Ss]pacing\//i, "")
                .replace(/\//g, "-");
          }
        }
        await annotatePaddingNew(
          container,
          paddingValue,
          side,
          nodeX,
          nodeY,
          nodeW,
          nodeH,
          paddingToken,
          highlightMode,
          tracker,
        );
      }
    }
  }

  if ("children" in node) {
    for (const child of node.children) {
      await processSpacingNodeForViz(
        child,
        container,
        baseX,
        baseY,
        instanceBounds,
        highlightMode,
        tracker,
      );
    }
  }
}

// ✅ Função auxiliar para encontrar cornerRadius em um nó e seus filhos
function findCornerRadius(node: SceneNode): {
  value: number;
  token: string | null;
  boundVars: Record<string, VariableAlias>;
} | null {
  // ✅ Ignorar nós ocultos
  if (!isNodeVisible(node)) return null;

  const nodeWithRadius = node as unknown as {
    cornerRadius?: number | typeof figma.mixed;
    topLeftRadius?: number;
    topRightRadius?: number;
    bottomLeftRadius?: number;
    bottomRightRadius?: number;
    boundVariables?: Record<string, VariableAlias>;
  };

  // Verificar no nó atual - handle both single cornerRadius and individual corners
  if (
    nodeWithRadius.cornerRadius !== undefined &&
    nodeWithRadius.cornerRadius !== figma.mixed &&
    typeof nodeWithRadius.cornerRadius === "number" &&
    nodeWithRadius.cornerRadius > 0
  ) {
    return {
      value: nodeWithRadius.cornerRadius,
      token: null,
      boundVars: nodeWithRadius.boundVariables || {},
    };
  }

  // Check individual corner radii (topLeftRadius is the most common for annotation)
  if (
    nodeWithRadius.topLeftRadius &&
    typeof nodeWithRadius.topLeftRadius === "number" &&
    nodeWithRadius.topLeftRadius > 0
  ) {
    return {
      value: nodeWithRadius.topLeftRadius,
      token: null,
      boundVars: nodeWithRadius.boundVariables || {},
    };
  }

  // Verificar nos filhos, mas NÃO entrar em InstanceNodes (componentes aninhados)
  if ("children" in node) {
    for (const child of (node as FrameNode | ComponentNode | InstanceNode)
      .children) {
      // Pular instâncias de outros componentes - só queremos o border radius do componente pai
      if (child.type === "INSTANCE") {
        continue;
      }
      const result = findCornerRadius(child);
      if (result) return result;
    }
  }

  return null;
}

// ✅ Interface para informação de stroke individual
interface StrokeInfo {
  value: number;
  token: string | null;
  boundVars: Record<string, VariableAlias>;
  side: "Top" | "Bottom" | "Left" | "Right" | "All";
  position: "Inside" | "Outside" | "Center";
}

// ✅ Função auxiliar para encontrar strokeWeight em um nó e seus filhos
// Retorna array com informações de cada lado da borda
// IMPORTANTE: Só considera bordas do nó principal e de instâncias estruturais
async function findStrokeWeight(node: SceneNode): Promise<StrokeInfo[] | null> {
  // ✅ Ignorar nós ocultos
  if (!isNodeVisible(node)) return null;

  const nodeWithStroke = node as unknown as {
    strokeWeight?: number | typeof figma.mixed;
    strokeTopWeight?: number;
    strokeBottomWeight?: number;
    strokeLeftWeight?: number;
    strokeRightWeight?: number;
    strokeAlign?: "INSIDE" | "OUTSIDE" | "CENTER";
    strokes?: readonly Paint[];
    boundVariables?: Record<string, VariableAlias>;
  };

  // Verificar no nó atual
  const hasVisibleStrokes =
    nodeWithStroke.strokes &&
    nodeWithStroke.strokes.length > 0 &&
    nodeWithStroke.strokes.some((s: Paint) => s.visible !== false);

  if (hasVisibleStrokes) {
    const results: StrokeInfo[] = [];
    const boundVars = nodeWithStroke.boundVariables || {};

    // ✅ Obter posição da borda (strokeAlign)
    let position: "Inside" | "Outside" | "Center" = "Center";
    if (nodeWithStroke.strokeAlign) {
      if (nodeWithStroke.strokeAlign === "INSIDE") position = "Inside";
      else if (nodeWithStroke.strokeAlign === "OUTSIDE") position = "Outside";
      else position = "Center";
    }

    // ✅ Verificar se tem espessuras diferentes por lado (mixed)
    const hasIndividualStrokes =
      nodeWithStroke.strokeTopWeight !== undefined ||
      nodeWithStroke.strokeBottomWeight !== undefined ||
      nodeWithStroke.strokeLeftWeight !== undefined ||
      nodeWithStroke.strokeRightWeight !== undefined;

    if (hasIndividualStrokes) {
      // ✅ Extrair bordas individuais por lado
      const sides: {
        prop: keyof typeof nodeWithStroke;
        label: "Top" | "Bottom" | "Left" | "Right";
        varKey: string;
      }[] = [
        {prop: "strokeTopWeight", label: "Top", varKey: "strokeTopWeight"},
        {
          prop: "strokeBottomWeight",
          label: "Bottom",
          varKey: "strokeBottomWeight",
        },
        {prop: "strokeLeftWeight", label: "Left", varKey: "strokeLeftWeight"},
        {
          prop: "strokeRightWeight",
          label: "Right",
          varKey: "strokeRightWeight",
        },
      ];

      for (const {prop, label, varKey} of sides) {
        const weight = nodeWithStroke[prop] as number | undefined;
        if (weight !== undefined && weight > 0) {
          results.push({
            value: weight,
            token: null,
            boundVars: {[varKey]: boundVars[varKey]} as Record<
              string,
              VariableAlias
            >,
            side: label,
            position,
          });
        }
      }

      if (results.length > 0) {
        return results;
      }
    } else if (
      nodeWithStroke.strokeWeight &&
      typeof nodeWithStroke.strokeWeight === "number" &&
      nodeWithStroke.strokeWeight > 0
    ) {
      // ✅ Borda uniforme em todos os lados
      return [
        {
          value: nodeWithStroke.strokeWeight,
          token: null,
          boundVars,
          side: "All",
          position,
        },
      ];
    }
  }

  // ✅ Verificar nos filhos, mas apenas em instâncias estruturais
  // Instâncias não-estruturais (componentes externos) são ignoradas
  if ("children" in node) {
    for (const child of (node as FrameNode | ComponentNode | InstanceNode)
      .children) {
      // ✅ Se for uma instância, verificar se é estrutural
      if (child.type === "INSTANCE") {
        const isStructural = await isStructuralInstance(child);
        if (!isStructural) {
          // ✅ Ignorar instâncias não-estruturais (componentes externos)
          continue;
        }
      }
      const result = await findStrokeWeight(child);
      if (result && result.length > 0) return result;
    }
  }

  return null;
}

// ✅ Função auxiliar para encontrar token de height em um nó e seus filhos
async function findHeightToken(node: SceneNode): Promise<string | null> {
  // ✅ Ignorar nós ocultos
  if (!isNodeVisible(node)) return null;

  const nodeWithDimension = node as unknown as {
    height?: number;
    boundVariables?: Record<string, VariableAlias>;
  };

  // Verificar no nó atual
  if (
    nodeWithDimension.boundVariables &&
    "height" in nodeWithDimension.boundVariables
  ) {
    const binding = nodeWithDimension.boundVariables.height;
    if (binding?.id) {
      const variable = await figma.variables.getVariableByIdAsync(binding.id);
      if (variable) return variable.name.replace(/\//g, "-");
    }
  }

  // Verificar nos filhos, mas NÃO entrar em InstanceNodes (componentes aninhados)
  if ("children" in node) {
    for (const child of (node as FrameNode | ComponentNode | InstanceNode)
      .children) {
      // Pular instâncias de outros componentes - só queremos o height do componente pai
      if (child.type === "INSTANCE") {
        continue;
      }
      const result = await findHeightToken(child);
      if (result) return result;
    }
  }

  return null;
}

// ✅ Função auxiliar para encontrar token de cornerRadius em um nó e seus filhos
async function findCornerRadiusToken(node: SceneNode): Promise<string | null> {
  // ✅ Ignorar nós ocultos
  if (!isNodeVisible(node)) return null;

  const nodeWithRadius = node as unknown as {
    cornerRadius?: number | typeof figma.mixed;
    topLeftRadius?: number;
    boundVariables?: Record<string, VariableAlias>;
  };

  // Verificar cornerRadius no nó atual
  if (nodeWithRadius.boundVariables) {
    // Tentar cornerRadius primeiro
    if ("cornerRadius" in nodeWithRadius.boundVariables) {
      const binding = nodeWithRadius.boundVariables.cornerRadius;
      if (binding?.id) {
        const variable = await figma.variables.getVariableByIdAsync(binding.id);
        if (variable) return variable.name.replace(/\//g, "-");
      }
    }
    // Tentar topLeftRadius (para corners individuais)
    if ("topLeftRadius" in nodeWithRadius.boundVariables) {
      const binding = nodeWithRadius.boundVariables.topLeftRadius;
      if (binding?.id) {
        const variable = await figma.variables.getVariableByIdAsync(binding.id);
        if (variable) return variable.name.replace(/\//g, "-");
      }
    }
  }

  // Verificar nos filhos, mas NÃO entrar em InstanceNodes (componentes aninhados)
  if ("children" in node) {
    for (const child of (node as FrameNode | ComponentNode | InstanceNode)
      .children) {
      // Pular instâncias de outros componentes - só queremos o border radius do componente pai
      if (child.type === "INSTANCE") {
        continue;
      }
      const result = await findCornerRadiusToken(child);
      if (result) return result;
    }
  }

  return null;
}

// ✅ VISUALIZAÇÃO DE ANATOMIA DO COMPONENTE - Mostra pointers para dependências
// Mostra uma variação para cada componente usado único
async function createComponentAnatomyVisualization(
  parent: FrameNode,
  mainComponent: ComponentNode | ComponentSetNode | InstanceNode,
  componentMap: Map<string, string>,
  tableWidth: number,
  highlightMode: boolean = false,
): Promise<void> {
  if (componentMap.size === 0) return;

  // ✅ Cores baseadas no modo highlight
  const bgColor: RGB = highlightMode
    ? {r: 56 / 255, g: 83 / 255, b: 255 / 255} // #3853FF - Azul para highlight mode
    : {r: 1, g: 1, b: 1}; // Branco para modo normal

  const pointerColor: RGB = highlightMode
    ? {r: 98 / 255, g: 248 / 255, b: 79 / 255} // #62F84F - Verde para highlight mode
    : {r: 0.9, g: 0.2, b: 0.2}; // Vermelho para modo normal

  const textColor: RGB = highlightMode
    ? {r: 1, g: 1, b: 1} // Branco para highlight mode
    : {r: 0.2, g: 0.2, b: 0.2}; // Cinza escuro para modo normal

  // ✅ Criar container para a visualização de anatomia
  const anatomyContainer = figma.createFrame();
  anatomyContainer.name = "Anatomia do Componente";
  anatomyContainer.layoutMode = "VERTICAL";
  anatomyContainer.primaryAxisSizingMode = "AUTO";
  anatomyContainer.counterAxisSizingMode = "FIXED";
  anatomyContainer.resize(tableWidth, 100);
  anatomyContainer.itemSpacing = 24;
  anatomyContainer.paddingTop = 24;
  anatomyContainer.paddingBottom = 32;
  anatomyContainer.paddingLeft = 32;
  anatomyContainer.paddingRight = 32;
  anatomyContainer.fills = [{type: "SOLID", color: bgColor}];
  anatomyContainer.cornerRadius = 8;

  // ✅ Subtítulo da seção
  const subtitle = figma.createText();
  subtitle.fontName = {family: "BancoDoBrasil Textos", style: "Medium"};
  subtitle.fontSize = 28;
  subtitle.characters = "Anatomia do Componente";
  subtitle.fills = [{type: "SOLID", color: textColor}];
  anatomyContainer.appendChild(subtitle);

  // ✅ Container para as variações (horizontal wrap)
  const variationsContainer = figma.createFrame();
  variationsContainer.name = "Variations Container";
  variationsContainer.layoutMode = "HORIZONTAL";
  variationsContainer.layoutWrap = "WRAP";
  variationsContainer.primaryAxisSizingMode = "FIXED";
  variationsContainer.counterAxisSizingMode = "AUTO";
  variationsContainer.resize(tableWidth - 64, 100);
  variationsContainer.itemSpacing = 32;
  variationsContainer.counterAxisSpacing = 32;
  variationsContainer.fills = [];
  variationsContainer.clipsContent = false; // ✅ Não cortar conteúdo que ultrapassa os limites

  // ✅ Coletar todas as variantes disponíveis
  const variants: ComponentNode[] = [];
  if (mainComponent.type === "COMPONENT_SET") {
    for (const child of mainComponent.children) {
      if (child.type === "COMPONENT") {
        variants.push(child);
      }
    }
  } else if (mainComponent.type === "COMPONENT") {
    variants.push(mainComponent);
  } else if (mainComponent.type === "INSTANCE") {
    const mainComp = await mainComponent.getMainComponentAsync();
    if (mainComp) {
      variants.push(mainComp);
    }
  }

  if (variants.length === 0) {
    anatomyContainer.remove();
    variationsContainer.remove();
    return;
  }

  // ✅ Para cada componente no componentMap, encontrar uma variação que o contenha
  const componentsShown = new Set<string>();

  // ✅ Função para verificar se uma variante contém um componente específico
  async function variantContainsComponent(
    variant: ComponentNode,
    targetComponentId: string,
  ): Promise<{found: boolean; x: number; y: number; w: number; h: number}> {
    const result = {found: false, x: 0, y: 0, w: 0, h: 0};

    async function searchInNode(
      node: SceneNode,
      offsetX: number,
      offsetY: number,
    ): Promise<boolean> {
      if (node.type === "INSTANCE") {
        const mainComp = await node.getMainComponentAsync();
        if (mainComp && mainComp.id === targetComponentId) {
          result.found = true;
          result.x = offsetX + node.x;
          result.y = offsetY + node.y;
          result.w = node.width;
          result.h = node.height;
          return true;
        }
      }
      if ("children" in node) {
        for (const child of (node as FrameNode).children) {
          const newOffsetX =
            node.type === "INSTANCE" ? offsetX : offsetX + node.x;
          const newOffsetY =
            node.type === "INSTANCE" ? offsetY : offsetY + node.y;
          if (await searchInNode(child, newOffsetX, newOffsetY)) {
            return true;
          }
        }
      }
      return false;
    }

    for (const child of variant.children) {
      if (await searchInNode(child, 0, 0)) break;
    }
    return result;
  }

  // ✅ Para cada componente usado, criar uma visualização
  for (const [compId, compName] of componentMap) {
    if (componentsShown.has(compId)) continue;

    // Encontrar uma variante que contenha este componente
    let foundVariant: ComponentNode | null = null;
    let componentPosition = {found: false, x: 0, y: 0, w: 0, h: 0};

    for (const variant of variants) {
      const pos = await variantContainsComponent(variant, compId);
      if (pos.found) {
        foundVariant = variant;
        componentPosition = pos;
        break;
      }
    }

    if (!foundVariant) continue;

    // ✅ Criar frame para esta variação (sem auto layout, posicionamento absoluto)
    const vizFrame = figma.createFrame();
    vizFrame.name = `Anatomia - ${compName}`;
    vizFrame.fills = []; // Transparente, pois o container já tem o fundo
    vizFrame.cornerRadius = 8;
    vizFrame.clipsContent = false; // ✅ Não cortar conteúdo que ultrapassa os limites

    // Criar instância da variante
    const instance = foundVariant.createInstance();

    // Escalar se necessário
    const maxSize = 300;
    let scale = 1;
    if (instance.width > maxSize || instance.height > maxSize) {
      scale = Math.min(maxSize / instance.width, maxSize / instance.height);
      instance.rescale(scale);
    }

    // ✅ Criar ponteiro primeiro para calcular espaço necessário
    const DOT_SIZE = 8;
    const PADDING = 2;
    const marginBottom = 10;

    // Criar texto do label primeiro para calcular dimensões
    const labelText = figma.createText();
    labelText.name = "Label";
    labelText.fontName = {family: "BancoDoBrasil Textos", style: "Medium"};
    labelText.fontSize = 11;
    labelText.characters = compName;
    labelText.fills = [{type: "SOLID", color: textColor}];

    // ✅ Calcular espaço necessário para o pointer acima do componente
    // O pointer consiste em: Label + Linha + Dot
    // A linha vai do label até a borda superior do componente alvo
    const scaledW = componentPosition.w * scale;

    // Espaço necessário acima do componente para o label
    const pointerSpaceAbove = labelText.height + PADDING * 2 + 10; // Label + padding + margem extra

    // ✅ Posicionar instância com margem suficiente para o pointer
    const marginTop = Math.max(pointerSpaceAbove, 30);
    instance.x = 20;
    instance.y = marginTop;
    vizFrame.appendChild(instance);

    // ✅ Calcular posições do ponteiro
    const scaledX = 20 + componentPosition.x * scale;
    const scaledY = marginTop + componentPosition.y * scale;

    // ✅ Dot fica na borda SUPERIOR do componente, não no centro
    const dotX = scaledX + scaledW / 2;
    const dotY = scaledY; // Borda superior do componente

    // Calcular dimensões do frame do ponteiro
    const lineLength = dotY - PADDING; // Distância do topo até o dot
    const pointerFrameWidth = Math.max(labelText.width, DOT_SIZE) + PADDING * 2;
    const pointerFrameHeight = lineLength + DOT_SIZE;

    // Criar frame do ponteiro
    const pointerFrame = figma.createFrame();
    pointerFrame.name = compName;
    pointerFrame.fills = [];
    pointerFrame.clipsContent = false;
    pointerFrame.resize(pointerFrameWidth, pointerFrameHeight);
    pointerFrame.x = dotX - pointerFrameWidth / 2;
    pointerFrame.y = PADDING; // Começar do topo do frame

    // Criar dot (na parte inferior do pointer frame)
    const dot = figma.createEllipse();
    dot.name = "Dot";
    dot.resize(DOT_SIZE, DOT_SIZE);
    dot.fills = [{type: "SOLID", color: pointerColor}];
    dot.x = pointerFrameWidth / 2 - DOT_SIZE / 2;
    dot.y = pointerFrameHeight - DOT_SIZE;
    dot.constraints = {horizontal: "CENTER", vertical: "MAX"};

    // Criar linha (do label até o dot)
    const actualLineLength =
      pointerFrameHeight - labelText.height - PADDING - DOT_SIZE;
    const line = figma.createRectangle();
    line.name = "Line";
    line.fills = [{type: "SOLID", color: pointerColor}];
    line.resize(1, Math.max(actualLineLength, 10));
    line.x = pointerFrameWidth / 2 - 0.5;
    line.y = labelText.height + PADDING;
    line.constraints = {horizontal: "CENTER", vertical: "STRETCH"};

    // Posicionar label (no topo do pointer frame)
    labelText.x = pointerFrameWidth / 2 - labelText.width / 2;
    labelText.y = 0;
    labelText.constraints = {horizontal: "CENTER", vertical: "MIN"};

    // Adicionar elementos ao frame do ponteiro
    pointerFrame.appendChild(labelText);
    pointerFrame.appendChild(line);
    pointerFrame.appendChild(dot);
    vizFrame.appendChild(pointerFrame);

    // Ajustar tamanho do vizFrame para incluir todo o conteúdo
    const frameWidth = Math.max(instance.width + 40, labelText.width + 40);
    const frameHeight = marginTop + instance.height + marginBottom;
    vizFrame.resize(frameWidth, frameHeight);

    // Reposicionar o ponteiro para centralizar horizontalmente no frame
    pointerFrame.x = frameWidth / 2 - pointerFrameWidth / 2;

    variationsContainer.appendChild(vizFrame);
    componentsShown.add(compId);
  }

  // Se não mostrou nenhum componente, remover container
  if (componentsShown.size === 0) {
    anatomyContainer.remove();
    variationsContainer.remove();
    return;
  }

  anatomyContainer.appendChild(variationsContainer);
  parent.appendChild(anatomyContainer);
}

// ✅ SEÇÃO DE COMPONENTES UTILIZADOS - BUSCA NO DOCUMENTO INTEIRO
async function createUsedComponentsSectionAutoLayout(
  parent: FrameNode,
  variantColors: VariantColors[],
  tableWidth: number,
  mainComponents: (ComponentNode | ComponentSetNode | InstanceNode)[] = [],
  highlightMode: boolean = false,
): Promise<boolean> {
  // Collect component IDs and names from all variants
  const componentMap = new Map<string, string>(); // id -> displayName
  for (const variant of variantColors) {
    for (const [compId, compName] of variant.usedComponents) {
      // ✅ Ignorar componentes que começam com "." ou "_" (internos/privados)
      if (compName.startsWith(".") || compName.startsWith("_")) {
        continue;
      }
      componentMap.set(compId, compName);
    }
  }
  if (componentMap.size === 0) return false;

  const section = createSectionContainer("Seção Componentes Utilizados", 16);
  createSectionTitle("COMPONENTES E ÍCONES UTILIZADOS", section, 24);

  // Container com wrap - usando tableWidth para largura total
  const componentsContainer = figma.createFrame();
  componentsContainer.name = "Components Container";
  componentsContainer.layoutMode = "HORIZONTAL";
  componentsContainer.layoutWrap = "WRAP";
  componentsContainer.primaryAxisSizingMode = "FIXED";
  componentsContainer.counterAxisSizingMode = "AUTO";
  componentsContainer.resize(tableWidth, 100); // ✅ Usar tableWidth para largura total
  componentsContainer.itemSpacing = 48; // More space between items
  componentsContainer.counterAxisSpacing = 40;
  componentsContainer.paddingLeft = 32;
  componentsContainer.paddingRight = 32;
  componentsContainer.paddingTop = 32;
  componentsContainer.paddingBottom = 32;
  componentsContainer.fills = [
    {type: "SOLID", color: {r: 0.98, g: 0.98, b: 0.98}},
  ];
  componentsContainer.cornerRadius = 8;

  // ✅ Limitar número de componentes para evitar travamento com muitas variações
  const MAX_COMPONENTS_TO_SHOW = 100;
  const componentEntries = Array.from(componentMap.entries()).slice(
    0,
    MAX_COMPONENTS_TO_SHOW,
  );

  // Mostrar aviso se houver mais componentes
  if (componentMap.size > MAX_COMPONENTS_TO_SHOW) {
    const warningText = figma.createText();
    warningText.fontName = {family: "BancoDoBrasil Textos", style: "Regular"};
    warningText.fontSize = 12;
    warningText.characters = `Mostrando ${MAX_COMPONENTS_TO_SHOW} de ${componentMap.size} componentes`;
    warningText.fills = [{type: "SOLID", color: {r: 0.5, g: 0.5, b: 0.5}}];
    section.appendChild(warningText);
  }

  for (const [compId, displayName] of componentEntries) {
    const card = figma.createFrame();
    card.name = `Card: ${displayName}`;
    card.layoutMode = "VERTICAL";
    card.primaryAxisSizingMode = "AUTO";
    card.counterAxisSizingMode = "AUTO";
    card.primaryAxisAlignItems = "CENTER";
    card.counterAxisAlignItems = "CENTER";
    card.itemSpacing = 8;
    card.fills = [];

    // ✅ Buscar o componente diretamente pelo ID (otimizado - sem fallback pesado)
    let foundComponent: ComponentNode | null = null;
    try {
      const node = await figma.getNodeByIdAsync(compId);
      if (node && node.type === "COMPONENT") {
        foundComponent = node;
      }
    } catch {
      // Component might be from external library or deleted
    }

    // Criar instância ou placeholder
    if (foundComponent) {
      try {
        const instance = foundComponent.createInstance();
        const maxSize = 180; // Maximum size for large components

        // Only scale DOWN large components, never scale up small ones
        if (instance.width > maxSize || instance.height > maxSize) {
          const scale = Math.min(
            maxSize / instance.width,
            maxSize / instance.height,
          );
          // Use rescale to maintain aspect ratio properly
          instance.rescale(scale);
        }
        // Small components keep their original size
        card.appendChild(instance);
      } catch {
        const placeholder = figma.createRectangle();
        placeholder.resize(80, 80);
        placeholder.fills = [{type: "SOLID", color: {r: 0.9, g: 0.9, b: 0.9}}];
        placeholder.cornerRadius = 8;
        card.appendChild(placeholder);
      }
    } else {
      const placeholder = figma.createRectangle();
      placeholder.resize(80, 80);
      placeholder.fills = [{type: "SOLID", color: {r: 0.9, g: 0.9, b: 0.9}}];
      placeholder.cornerRadius = 8;
      card.appendChild(placeholder);
    }

    const nameText = figma.createText();
    nameText.fontName = {family: "BancoDoBrasil Textos", style: "Medium"};
    nameText.fontSize = 12;
    nameText.characters = displayName;
    nameText.textAlignHorizontal = "CENTER";
    nameText.fills = [{type: "SOLID", color: {r: 0.2, g: 0.6, b: 0.2}}];
    card.appendChild(nameText);

    componentsContainer.appendChild(card);
  }

  section.appendChild(componentsContainer);

  // ✅ VISUALIZAÇÃO DE ANATOMIA - Mostra o componente com pointers para dependências
  if (mainComponents.length > 0) {
    await createComponentAnatomyVisualization(
      section,
      mainComponents[0], // Usar o primeiro componente selecionado
      componentMap,
      tableWidth,
      highlightMode, // ✅ Passar modo highlight para fundo azul
    );
  }

  parent.appendChild(section);
  return true;
}

// ========================================
// SEÇÃO DE EFEITOS (Shadows, Blur, etc.)
// ========================================

// ✅ TABELA DE EFEITOS DENTRO DE SEÇÃO - Estilo: linhas brancas, agrupado semanticamente
async function createEffectsTableInSection(
  parent: FrameNode,
  variantColors: VariantColors[],
  tableWidth: number,
): Promise<void> {
  const hasEffects = variantColors.some((v) => v.effects.length > 0);
  if (!hasEffects) return;

  const ROW_HEIGHT = 44;
  const ROW_GAP = 4;
  const GROUP_SPACING = 20;

  // ✅ Container principal com AutoLayout vertical
  const tableContainer = createTableAutoLayoutContainer(
    "Tabela Efeitos",
    tableWidth,
    ROW_GAP,
  );

  // ✅ Header como Group
  const headerElements: SceneNode[] = [];
  const headers = ["Efeito", "Token / Valor"];
  const headerX = [0, Math.floor(tableWidth * 0.45)];
  for (let i = 0; i < headers.length; i++) {
    const headerText = figma.createText();
    headerText.fontName = {family: "BancoDoBrasil Textos", style: "Bold"};
    headerText.fontSize = 16;
    headerText.characters = headers[i];
    headerText.fills = [{type: "SOLID", color: {r: 0.4, g: 0.4, b: 0.4}}];
    headerText.x = headerX[i];
    headerText.y = 0;
    headerElements.push(headerText);
  }
  groupElementsAndAppend(headerElements, "Header", tableContainer);

  // ✅ Agrupar por tipo de efeito e coletar tokens únicos
  const effectsByType: Map<
    string,
    {token: string | null; value: string; variants: string[]}[]
  > = new Map();

  for (const variant of variantColors) {
    const variantLabel = formatVariantPropertiesForTable(variant.propertyMap);

    for (const effect of variant.effects) {
      const effectType = getEffectTypeLabel(effect.effectType);
      if (!effectsByType.has(effectType)) {
        effectsByType.set(effectType, []);
      }
      const entries = effectsByType.get(effectType)!;
      const existing = entries.find(
        (e) => (e.token || e.value) === (effect.token || effect.value),
      );
      if (existing) {
        if (!existing.variants.includes(variantLabel)) {
          existing.variants.push(variantLabel);
        }
      } else {
        entries.push({
          token: effect.token,
          value: effect.value,
          variants: [variantLabel],
        });
      }
    }
  }

  // ✅ Criar lista de todas as entradas com prefixo semântico
  interface DisplayEntry {
    prefix: string;
    displayText: string;
    token: string | null;
    value: string;
  }
  const allDisplayEntries: DisplayEntry[] = [];

  // Contar total de variantes que TÊM efeitos (não todas as variantes)
  const variantsWithEffects = new Set<string>();
  for (const variant of variantColors) {
    if (variant.effects.length > 0) {
      const variantLabel = formatVariantPropertiesForTable(variant.propertyMap);
      variantsWithEffects.add(variantLabel);
    }
  }
  const totalVariantsWithEffects = variantsWithEffects.size;

  for (const [effectType, entries] of effectsByType) {
    for (const entry of entries) {
      // Verificar se este token/valor é usado por TODAS as variantes que têm efeitos
      const isUsedByAll =
        entry.variants.length === totalVariantsWithEffects &&
        totalVariantsWithEffects > 1;

      if (isUsedByAll) {
        // Mesmo token usado por todas as variantes com efeitos → "Todos"
        allDisplayEntries.push({
          prefix: "Todos",
          displayText: `Todos / ${effectType}`,
          token: entry.token,
          value: entry.value,
        });
      } else {
        // Criar uma entrada para cada variante que usa este token
        // Usar o label completo da variante para melhor clareza
        for (const variantLabel of entry.variants) {
          // Extrair um label curto mas informativo
          // "Size: Regular / State: Hover" → "Regular / Hover"
          const parts = variantLabel.split(" / ");
          const shortLabel = parts
            .map((p) => {
              const value = p.split(": ")[1] || p;
              return value;
            })
            .join(" / ");

          allDisplayEntries.push({
            prefix: shortLabel,
            displayText: `${shortLabel} / ${effectType}`,
            token: entry.token,
            value: entry.value,
          });
        }
      }
    }
  }

  // ✅ Agrupar por prefixo semântico
  const entriesByPrefix: Map<string, DisplayEntry[]> = new Map();
  for (const entry of allDisplayEntries) {
    if (!entriesByPrefix.has(entry.prefix)) {
      entriesByPrefix.set(entry.prefix, []);
    }
    entriesByPrefix.get(entry.prefix)!.push(entry);
  }

  // ✅ Ordenar prefixos: "Todos" primeiro, depois alfabeticamente
  const sortedPrefixes = Array.from(entriesByPrefix.keys()).sort((a, b) => {
    if (a === "Todos") return -1;
    if (b === "Todos") return 1;
    return a.localeCompare(b);
  });

  // ✅ Renderizar agrupado por prefixo usando Groups
  let isFirstGroup = true;
  for (const prefix of sortedPrefixes) {
    const groupEntries = entriesByPrefix.get(prefix)!;
    if (groupEntries.length === 0) continue;

    // ✅ Adicionar espaçamento de 20px entre grupos semânticos usando spacer frame
    if (!isFirstGroup) {
      const spacer = figma.createFrame();
      spacer.name = "Group Spacer";
      spacer.resize(tableWidth, GROUP_SPACING - ROW_GAP);
      spacer.fills = [];
      tableContainer.appendChild(spacer);
    }
    isFirstGroup = false;

    for (const entry of groupEntries) {
      // ✅ Criar elementos da linha
      const rowElements: SceneNode[] = [];

      // Background da linha
      const rowBg = figma.createRectangle();
      rowBg.name = "Row Background";
      rowBg.resize(tableWidth, ROW_HEIGHT);
      rowBg.x = 0;
      rowBg.y = 0;
      rowBg.fills = [{type: "SOLID", color: {r: 1, g: 1, b: 1}}];
      rowBg.cornerRadius = 4;
      rowElements.push(rowBg);

      const elementText = figma.createText();
      elementText.fontName = {family: "BancoDoBrasil Textos", style: "Regular"};
      elementText.fontSize = 16;
      elementText.characters = entry.displayText;
      elementText.x = 16;
      elementText.y = 12;
      rowElements.push(elementText);

      const tokenText = figma.createText();
      tokenText.fontName = {family: "BancoDoBrasil Textos", style: "Regular"};
      tokenText.fontSize = 16;
      tokenText.characters = entry.token || "-";
      tokenText.fills = [{type: "SOLID", color: {r: 0.85, g: 0.1, b: 0.1}}];
      tokenText.x = Math.floor(tableWidth * 0.45);
      tokenText.y = 12;
      rowElements.push(tokenText);

      // ✅ Agrupar elementos e adicionar ao container
      groupElementsAndAppend(
        rowElements,
        `Row - ${entry.displayText}`,
        tableContainer,
      );
    }
  }

  parent.appendChild(tableContainer);
}

// ✅ CRIAR GRID DE VARIANTES PARA VISUALIZAÇÃO DE EFEITOS
async function createMultiVariantEffectsGrid(
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
      gridName: "Grid Variantes - Efeitos",
      margin: 80,
    },
    async (ctx) => {
      if (ctx.vc.effects.length === 0) return;

      const color = getTheme(ctx.highlightMode).effect;

      // Encontrar nós com efeitos na instância
      const nodesWithEffects = findNodesWithEffects(ctx.instance);

      for (let i = 0; i < nodesWithEffects.length; i++) {
        const node = nodesWithEffects[i];
        const nodeBounds = node.absoluteBoundingBox;
        if (!nodeBounds) continue;

        const nodeRelX = nodeBounds.x - ctx.instanceBounds.x;
        const nodeRelY = nodeBounds.y - ctx.instanceBounds.y;
        const nodeW = nodeBounds.width;
        const nodeH = nodeBounds.height;

        // Encontrar spec correspondente
        let label = "";
        for (const spec of ctx.vc.effects) {
          label = spec.token ? spec.token : getEffectTypeLabel(spec.effectType);
          break;
        }

        if (
          !label &&
          "effects" in node &&
          Array.isArray(node.effects) &&
          node.effects.length > 0
        ) {
          const firstEffect = node.effects.find((e: Effect) => e.visible);
          if (firstEffect) {
            label = getEffectTypeLabel(firstEffect.type);
          }
        }

        if (label) {
          const nodeX = ctx.instance.x + nodeRelX;
          const nodeY = ctx.instance.y + nodeRelY;
          const isAbove = i % 2 === 0;
          const LINE_LENGTH = 25;

          const startX = nodeX + nodeW / 2;
          const startY = isAbove ? nodeY : nodeY + nodeH;
          const endX = startX;
          const endY = isAbove
            ? nodeY - LINE_LENGTH
            : nodeY + nodeH + LINE_LENGTH;

          await createSimpleAnnotation(
            ctx.vizFrame,
            startX,
            startY,
            endX,
            endY,
            label,
            color,
          );
        }
      }
    },
  );
}

// Função auxiliar para encontrar nós com efeitos
function findNodesWithEffects(node: SceneNode): SceneNode[] {
  const results: SceneNode[] = [];

  if (
    "effects" in node &&
    Array.isArray(node.effects) &&
    node.effects.length > 0
  ) {
    const hasVisibleEffect = node.effects.some((e: Effect) => e.visible);
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

// ✅ VISUALIZAÇÃO DE EFEITOS DENTRO DE SEÇÃO
async function createEffectsVisualizationInSection(
  parent: FrameNode,
  component: ComponentNode | ComponentSetNode | InstanceNode,
  variantColors: VariantColors[],
  tableWidth: number,
  highlightMode: boolean,
  vizPropertyFilters: Record<string, string[]>,
  framesPerRow: number = 2,
): Promise<void> {
  // Filtrar apenas variantes que TÊM efeitos
  const variantsWithEffects = variantColors.filter((v) => v.effects.length > 0);
  if (variantsWithEffects.length === 0) return;

  // Aplicar filtro de propriedades para visualização (se definido)
  let filteredVariants = filterVariantsForVisualization(
    variantsWithEffects,
    vizPropertyFilters,
  );

  // Se o filtro removeu tudo, usar todas as variantes com efeitos
  if (filteredVariants.length === 0) {
    filteredVariants = variantsWithEffects;
  }

  // Se for ComponentSet com múltiplas variantes, usar grid
  if (component.type === "COMPONENT_SET" && filteredVariants.length > 1) {
    await createMultiVariantEffectsGrid(
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

  const vizContainer = figma.createFrame();
  vizContainer.name = "Visualização Efeitos";
  vizContainer.layoutMode = "VERTICAL";
  vizContainer.primaryAxisSizingMode = "AUTO";
  vizContainer.counterAxisSizingMode = "FIXED";
  vizContainer.resize(tableWidth, 100);
  vizContainer.itemSpacing = 16;
  vizContainer.fills = [];

  const subTitle = figma.createText();
  subTitle.fontName = {family: "BancoDoBrasil Textos", style: "Medium"};
  subTitle.fontSize = 18;
  subTitle.characters = "Visualização de Efeitos";
  vizContainer.appendChild(subTitle);

  const MARGIN = 100;
  const frameWidth = tableWidth;
  const frameHeight = Math.max(300, instance.height + MARGIN * 2);

  const frame = figma.createFrame();
  frame.name = "Effects Visualization";
  frame.resize(frameWidth, frameHeight);
  const frameBgColor = highlightMode
    ? {r: 56 / 255, g: 83 / 255, b: 255 / 255}
    : {r: 0.98, g: 0.98, b: 0.98};
  frame.fills = [{type: "SOLID", color: frameBgColor}];
  frame.cornerRadius = 8;
  frame.clipsContent = false;

  instance.x = frameWidth / 2 - instance.width / 2;
  instance.y = frameHeight / 2 - instance.height / 2;
  frame.appendChild(instance);

  // Adicionar anotações de efeitos
  const instanceBounds = instance.absoluteBoundingBox;
  const effectSpecs = variantColors[0]?.effects || [];
  const color = getTheme(highlightMode).effect;

  if (instanceBounds) {
    const nodesWithEffects = findNodesWithEffects(instance);

    for (let i = 0; i < nodesWithEffects.length; i++) {
      const node = nodesWithEffects[i];
      const nodeBounds = node.absoluteBoundingBox;
      if (!nodeBounds) continue;

      const nodeRelX = nodeBounds.x - instanceBounds.x;
      const nodeRelY = nodeBounds.y - instanceBounds.y;
      const nodeW = nodeBounds.width;
      const nodeH = nodeBounds.height;

      let label = "";
      // Tentar encontrar spec correspondente
      for (const spec of effectSpecs) {
        label = spec.token ? spec.token : getEffectTypeLabel(spec.effectType);
        break;
      }

      if (!label && "effects" in node && Array.isArray(node.effects)) {
        const firstEffect = (node.effects as Effect[]).find((e) => e.visible);
        if (firstEffect) {
          label = getEffectTypeLabel(firstEffect.type);
        }
      }

      if (label) {
        const nodeX = instance.x + nodeRelX;
        const nodeY = instance.y + nodeRelY;
        const isAbove = i % 2 === 0;
        const LINE_LENGTH = 30;

        const startX = nodeX + nodeW / 2;
        const startY = isAbove ? nodeY : nodeY + nodeH;
        const endX = startX;
        const endY = isAbove
          ? nodeY - LINE_LENGTH
          : nodeY + nodeH + LINE_LENGTH;

        await createSimpleAnnotation(
          frame,
          startX,
          startY,
          endX,
          endY,
          label,
          color,
        );
      }
    }
  }

  vizContainer.appendChild(frame);
  parent.appendChild(vizContainer);
}

main();
