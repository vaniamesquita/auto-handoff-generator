// src/features/effects.ts

import { VariantColors } from "../types";
import { getTheme } from "../config/theme";
import { getEffectTypeLabel, isVariantPropertiesName } from "../utils/helpers";
import { createTableBuilder, createSectionTitle } from "../ui/table-builder";
import { createSimpleAnnotation } from "../ui/annotations";
import {
  createSectionContainer,
  filterVariantsForVisualization,
  createGenericVariantGrid,
  findNodesWithEffects
} from "./common";

/**
 * Analisa os propertyMaps das variantes que têm um efeito e retorna um label inteligente.
 * Ex: Se todas as variantes com o efeito têm "status: On Focus", retorna "On Focus"
 * Se todas têm o efeito, retorna "Todos"
 */
function getSmartVariantLabel(
  variantPropertyMaps: Record<string, string>[],
  totalVariants: number,
  layerName: string,
): string {
  const count = variantPropertyMaps.length;

  // Se todas as variantes têm o efeito
  if (count === totalVariants) {
    return layerName !== "Container" ? `Todos (${layerName})` : "Todos";
  }

  // Se só uma variante tem o efeito, mostrar suas propriedades
  if (count === 1) {
    const props = variantPropertyMaps[0];
    const values = Object.values(props).filter(v => v);
    const label = values.join(" / ") || "Default";
    return layerName !== "Container" ? `${label} (${layerName})` : label;
  }

  // Analisar quais propriedades são constantes vs variáveis entre as variantes
  const allKeys = new Set<string>();
  for (const pm of variantPropertyMaps) {
    for (const key of Object.keys(pm)) {
      allKeys.add(key);
    }
  }

  const constantProps: Record<string, string> = {};
  const variableProps: Set<string> = new Set();

  for (const key of allKeys) {
    const values = variantPropertyMaps.map(pm => pm[key] || "").filter(v => v);
    const uniqueValues = new Set(values);

    if (uniqueValues.size === 1 && values.length === count) {
      // Esta propriedade tem o mesmo valor em todas as variantes com o efeito
      constantProps[key] = values[0];
    } else if (uniqueValues.size > 1) {
      // Esta propriedade varia
      variableProps.add(key);
    }
  }

  // Construir o label baseado nas propriedades constantes (a característica comum)
  const constantValues = Object.values(constantProps);

  if (constantValues.length > 0) {
    // Temos propriedades constantes - mostrar apenas essas
    // Ex: Se status="On Focus" é constante, mostrar "On Focus"
    const label = constantValues.join(" / ");
    return layerName !== "Container" ? `${label} (${layerName})` : label;
  }

  // Fallback: não há propriedade comum clara, listar de forma resumida
  // Pegar apenas a propriedade mais relevante (status > state > type > primeiro disponível)
  const priorityKeys = ["status", "state", "type", "variant", "mode"];
  let relevantKey: string | null = null;

  for (const pk of priorityKeys) {
    if (allKeys.has(pk)) {
      relevantKey = pk;
      break;
    }
  }

  if (!relevantKey && allKeys.size > 0) {
    relevantKey = Array.from(allKeys)[0];
  }

  if (relevantKey) {
    const uniqueValuesForKey = new Set(
      variantPropertyMaps.map(pm => pm[relevantKey!] || "").filter(v => v)
    );
    if (uniqueValuesForKey.size <= 3) {
      const label = Array.from(uniqueValuesForKey).join(", ");
      return layerName !== "Container" ? `${label} (${layerName})` : label;
    }
  }

  // Último fallback
  const label = `${count} variantes`;
  return layerName !== "Container" ? `${label} (${layerName})` : label;
}

// Função auxiliar local caso não esteja no common
function findNodesWithEffectsLocal(node: SceneNode): SceneNode[] {
  const results: SceneNode[] = [];
  if ("effects" in node && Array.isArray(node.effects) && node.effects.length > 0) {
    const hasVisibleEffect = node.effects.some((e) => e.visible !== false);
    if (hasVisibleEffect) {
      results.push(node);
    }
  }
  if ("children" in node) {
    for (const child of (node as FrameNode).children) {
      results.push(...findNodesWithEffectsLocal(child));
    }
  }
  return results;
}

export async function createEffectsSectionCombined(
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
  const hasEffects = variantColors.some((v) => v.effects.length > 0);
  if (!hasEffects) return false;

  if (!showTable && !showViz) return false;

  const section = createSectionContainer("Seção Efeitos");
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
      framesPerRow,
    );
  }

  parent.appendChild(section);
  return true;
}

async function createEffectsTableInSection(
  parent: FrameNode,
  variantColors: VariantColors[],
  tableWidth: number,
): Promise<void> {
  const hasEffects = variantColors.some((v) => v.effects.length > 0);
  if (!hasEffects) return;

  const GROUP_SPACING = 20;
  const ROW_GAP = 4;

  // CONFIGURAÇÃO DE COLUNAS SOLICITADA:
  // 1. Elemento (Descrição da variante)
  // 2. Token / Valor
  // 3. Tipo
  const table = createTableBuilder("Tabela Efeitos", tableWidth, [
    {header: "Elemento", position: 0},
    {header: "Token / Valor", position: 0.55, color: "warning"},
    {header: "Tipo", position: 0.85},
  ]);

  // Estrutura de Agrupamento - agora guarda propertyMaps para análise inteligente
  const effectsGrouped = new Map<
    string,
    {
      layerName: string;
      effectType: string;
      token: string | null;
      value: string;
      variantPropertyMaps: Record<string, string>[];
    }
  >();

  for (const variant of variantColors) {
    // Nome limpo da variante para comparação (ex: "Primary", "Hover")
    const cleanVariantName = variant.variantName.trim();

    for (const effect of variant.effects) {
      // 1. LIMPEZA DO NOME DO ELEMENTO (Remove caminhos de arquivo)
      // Ex: "DesignSystem/Buttons/Primary/Hover" -> "Hover"
      let cleanLayer = effect.element.split('/').pop()?.trim() || effect.element;

      // 2. NORMALIZAÇÃO DE ELEMENTO RAIZ
      // Se o elemento tiver o mesmo nome que a variante (ex: o efeito está no frame "Hover"),
      // ou parecer propriedades de variante (ex: "Size=Small, Status=Default"),
      // ou for um nome genérico como "Untitled", "Container", "Frame",
      // renomeamos para "Container" para facilitar o agrupamento
      const cleanLayerLower = cleanLayer.toLowerCase();
      if (
        cleanLayerLower === cleanVariantName.toLowerCase() ||
        cleanLayerLower === "default" ||
        cleanLayerLower === "untitled" ||
        cleanLayerLower.startsWith("frame") ||
        isVariantPropertiesName(cleanLayer) ||
        isVariantPropertiesName(effect.element)
      ) {
          cleanLayer = "Container";
      }

      // Chave única para agrupamento: Layer + Tipo + Token/Valor
      const key = `${cleanLayer}|${effect.effectType}|${effect.token || effect.value}`;

      if (!effectsGrouped.has(key)) {
        effectsGrouped.set(key, {
          layerName: cleanLayer,
          effectType: effect.effectType,
          token: effect.token,
          value: effect.value,
          variantPropertyMaps: [],
        });
      }

      const entry = effectsGrouped.get(key)!;
      entry.variantPropertyMaps.push(variant.propertyMap);
    }
  }

  // Ordenar: Container primeiro, depois alfabético pelo layer
  const sortedEntries = Array.from(effectsGrouped.values()).sort((a, b) => {
    if (a.layerName === "Container" && b.layerName !== "Container") return -1;
    if (a.layerName !== "Container" && b.layerName === "Container") return 1;
    return a.layerName.localeCompare(b.layerName);
  });

  const totalVariants = variantColors.length;

  let lastLayer = "";
  for (const entry of sortedEntries) {
    // Espaçamento entre grupos de camadas diferentes (ex: sombras do Container vs sombras do Icone)
    if (entry.layerName !== lastLayer && lastLayer !== "") {
      table.addSpacer(GROUP_SPACING - ROW_GAP);
    }
    lastLayer = entry.layerName;

    // Coluna 1: Elemento - Análise inteligente das propriedades comuns
    const variantText = getSmartVariantLabel(entry.variantPropertyMaps, totalVariants, entry.layerName);

    // Coluna 2: Token / Valor
    const displayValue = entry.token ? entry.token : entry.value;
    const isToken = !!entry.token;

    // Coluna 3: Tipo
    const typeLabel = getEffectTypeLabel(entry.effectType);

    table.addRow(`Row-${entry.layerName}-${entry.effectType}`, [
      {text: variantText}, // Elemento
      {text: displayValue, color: isToken ? "warning" : undefined}, // Token/Valor
      {text: typeLabel}, // Tipo
    ]);
  }

  table.appendTo(parent);
}

async function createEffectsVisualizationInSection(
  parent: FrameNode,
  component: ComponentNode | ComponentSetNode | InstanceNode,
  variantColors: VariantColors[],
  tableWidth: number,
  highlightMode: boolean,
  vizPropertyFilters: Record<string, string[]>,
  framesPerRow: number,
): Promise<void> {
  if (component.type !== "COMPONENT_SET") return;

  const variantsWithEffects = variantColors.filter((v) => v.effects.length > 0);
  if (variantsWithEffects.length === 0) return;

  let filteredVariants = filterVariantsForVisualization(
    variantsWithEffects,
    vizPropertyFilters,
  );

  if (filteredVariants.length === 0) {
    filteredVariants = variantsWithEffects;
  }

  if (filteredVariants.length > 0) {
    await createMultiVariantEffectsGrid(
      parent,
      component,
      filteredVariants,
      tableWidth,
      highlightMode,
      framesPerRow,
    );
  }
}

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
      const nodesWithEffects = findNodesWithEffectsLocal(ctx.instance);

      for (let i = 0; i < nodesWithEffects.length; i++) {
        const node = nodesWithEffects[i];
        const nodeBounds = node.absoluteBoundingBox;
        if (!nodeBounds) continue;

        const nodeRelX = nodeBounds.x - ctx.instanceBounds.x;
        const nodeRelY = nodeBounds.y - ctx.instanceBounds.y;
        const nodeW = nodeBounds.width;
        const nodeH = nodeBounds.height;

        let label = "";
        
        // Tenta encontrar o label correspondente limpando os nomes
        for (const spec of ctx.vc.effects) {
          const specElClean = spec.element.split('/').pop()?.trim().toLowerCase();
          const nodeNameClean = node.name.split('/').pop()?.trim().toLowerCase();
          const variantNameClean = ctx.vc.variantName.toLowerCase();

          // Match flexível: nome exato, ou se é o container principal
          if (
            specElClean === nodeNameClean ||
            (specElClean === variantNameClean && i === 0) ||
            specElClean === "container"
          ) {
            // Priorizar token, depois valor, e só por último o tipo
            label = spec.token || spec.value || getEffectTypeLabel(spec.effectType);
            break;
          }
        }

        // Fallback se não encontrou no spec - tenta buscar qualquer efeito deste nó
        if (!label && ctx.vc.effects.length > 0) {
          // Busca qualquer spec que tenha token ou valor
          for (const spec of ctx.vc.effects) {
            if (spec.token) {
              label = spec.token;
              break;
            } else if (spec.value) {
              label = spec.value;
              break;
            }
          }
        }

        // Último fallback: usa o tipo do efeito
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
            isAbove ? "pointer-top" : "pointer-bottom",
            "green",
            ctx.highlightMode,
          );
        }
      }
    },
  );
}