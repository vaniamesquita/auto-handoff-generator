// ========================================================================
// AUTO HANDOFF GENERATOR - FONT FALLBACK
// ========================================================================
// Tenta "BancoDoBrasil Textos"; se não existir no arquivo, usa Inter ou Roboto.

const FONT_CANDIDATES = ["BancoDoBrasil Textos", "Inter", "Roboto"] as const;
const FONT_STYLES = ["Regular", "Medium", "Bold"] as const;
export type PluginFontStyle = (typeof FONT_STYLES)[number];

let resolvedFontFamily: string | null = null;

/**
 * Carrega as fontes do plugin com fallback.
 * Ordem: BancoDoBrasil Textos → Inter → Roboto.
 * Idempotente: se já carregou, retorna a família resolvida.
 */
export async function loadPluginFonts(): Promise<string> {
  if (resolvedFontFamily) return resolvedFontFamily;

  for (const family of FONT_CANDIDATES) {
    try {
      for (const style of FONT_STYLES) {
        await figma.loadFontAsync({family, style});
      }
      resolvedFontFamily = family;
      return family;
    } catch {
      // Próximo candidato
    }
  }

  // Último recurso: Inter (fontes padrão do Figma)
  resolvedFontFamily = "Inter";
  try {
    for (const style of FONT_STYLES) {
      await figma.loadFontAsync({family: "Inter", style});
    }
  } catch {
    // Ignora; getFont usará "Inter" mesmo assim
  }
  return resolvedFontFamily;
}

/**
 * Retorna a família de fonte resolvida (após loadPluginFonts).
 * Fallback síncrono: "Inter" se ainda não carregou.
 */
export function getResolvedFontFamily(): string {
  return resolvedFontFamily ?? "Inter";
}

/**
 * Retorna { family, style } para uso em textNode.fontName.
 * Usar apenas após loadPluginFonts() ter sido await.
 */
export function getFont(
  style: "Regular" | "Medium" | "Bold",
): {family: string; style: string} {
  return {family: getResolvedFontFamily(), style};
}
