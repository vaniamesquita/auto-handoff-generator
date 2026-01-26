// ========================================================================
// AUTO HANDOFF GENERATOR - NODE HELPERS
// ========================================================================

// ========================================
// STRUCTURAL NAME HELPERS
// ========================================

/**
 * Checks if a name follows structural naming conventions.
 * Structural components start with ".", "-", "_" or ".asset/"
 * @param name - The name to check
 * @returns True if the name is structural
 */
export function isStructuralName(name: string): boolean {
  return (
    name.startsWith(".") ||
    name.startsWith("-") ||
    name.startsWith("_") ||
    name.toLowerCase().startsWith(".asset/") ||
    name.toLowerCase().startsWith(".asset")
  );
}

/**
 * Cleans a structural name by removing structural prefixes.
 * @param name - The name to clean
 * @returns Cleaned name without structural prefixes
 */
export function cleanStructuralName(name: string): string {
  let cleaned = name;
  if (cleaned.toLowerCase().startsWith(".asset/")) {
    cleaned = cleaned.substring(7); // Remove ".asset/"
  } else if (
    cleaned.startsWith(".") ||
    cleaned.startsWith("-") ||
    cleaned.startsWith("_")
  ) {
    cleaned = cleaned.substring(1); // Remove first character
  }
  return cleaned;
}

// ========================================
// VISIBILITY & STRUCTURE CHECKS
// ========================================

/**
 * Checks if a node is visible.
 * @param node - The node to check
 * @returns True if the node is visible
 */
export function isNodeVisible(node: SceneNode): boolean {
  return !("visible" in node && !node.visible);
}

/**
 * Checks if an instance is structural (base components).
 * Structural components start with ".", "-", "_" or ".Asset/"
 * Important: Checks both the component name and parent ComponentSet name
 * @param instance - The instance to check
 * @returns True if the instance is structural
 */
export async function isStructuralInstance(
  instance: InstanceNode,
): Promise<boolean> {
  // Use getMainComponentAsync for dynamic-page compatibility
  const mainComp = await instance.getMainComponentAsync();
  if (!mainComp) return false;

  // Check component name
  if (isStructuralName(mainComp.name)) {
    return true;
  }

  // If the component is inside a ComponentSet, check the ComponentSet name
  if (mainComp.parent && mainComp.parent.type === "COMPONENT_SET") {
    if (isStructuralName(mainComp.parent.name)) {
      return true;
    }
  }

  return false;
}

/**
 * Checks if a nested instance should be skipped during traversal.
 * Structural instances should NOT be skipped.
 * @param node - The node to check
 * @param isTopLevel - Whether this is the top level of traversal
 * @returns True if the instance should be skipped
 */
export async function shouldSkipNestedInstance(
  node: SceneNode,
  isTopLevel: boolean,
): Promise<boolean> {
  // If not an instance, don't skip
  if (node.type !== "INSTANCE") return false;

  // If top level, don't skip
  if (isTopLevel) return false;

  // If nested instance, check if structural
  // Structural instances (starting with ".", "-", "_" or ".Asset/") should NOT be skipped
  return !(await isStructuralInstance(node as InstanceNode));
}

// ========================================
// NAME RESOLUTION
// ========================================

/**
 * Resolves the "real" name of a node, prioritizing the main component name
 * when the node is inside a structural instance (.asset, ., -, _).
 *
 * This solves the problem of designers renaming instance layers
 * (e.g., from ".asset/Label" to "Due Date"), ensuring the original
 * component name is used for semantic identification.
 *
 * @param node - The node to resolve the name for
 * @returns Resolved name (from main component or from the node)
 */
export async function resolveNodeName(node: SceneNode): Promise<string> {
  // Traverse all ancestors to find an INSTANCE
  // Example: Instance (.asset/Label) -> Frame (Content) -> TextNode ("Data")
  // 1. Check parent (Frame): not instance. Go up.
  // 2. Check grandparent (Instance .asset/Label): is instance.
  // 3. Check Main Component: Starts with .asset.
  // 4. Return: "Label" (cleaned asset name).
  let currentNode: BaseNode | null = node.parent;

  while (currentNode) {
    // Check if current ancestor is an INSTANCE
    if (currentNode.type === "INSTANCE") {
      const instanceNode = currentNode as InstanceNode;
      const mainComp = await instanceNode.getMainComponentAsync();

      if (mainComp) {
        // Check if mainComponent is structural
        if (isStructuralName(mainComp.name)) {
          return cleanStructuralName(mainComp.name);
        }

        // Check if parent ComponentSet is structural
        if (mainComp.parent && mainComp.parent.type === "COMPONENT_SET") {
          if (isStructuralName(mainComp.parent.name)) {
            return cleanStructuralName(mainComp.parent.name);
          }
        }

        // If found an INSTANCE but NOT structural (common UI component),
        // DON'T stop - CONTINUE going up to check for a structural
        // instance higher in the tree.
      }
    }

    // Check if current ancestor is a COMPONENT
    // Necessary when generating specs directly from a Component Set,
    // where the immediate parent of text is a COMPONENT, not an INSTANCE.
    if (currentNode.type === "COMPONENT") {
      const componentNode = currentNode as ComponentNode;

      // Check if the component itself is structural
      if (isStructuralName(componentNode.name)) {
        return cleanStructuralName(componentNode.name);
      }

      // Check if parent ComponentSet is structural
      if (
        componentNode.parent &&
        componentNode.parent.type === "COMPONENT_SET"
      ) {
        if (isStructuralName(componentNode.parent.name)) {
          return cleanStructuralName(componentNode.parent.name);
        }
      }

      // If found a COMPONENT but NOT structural,
      // CONTINUE going up to check for a structural ancestor.
    }

    // Go up to next ancestor
    currentNode = currentNode.parent;
  }

  // If the node itself is an INSTANCE, check its mainComponent
  if (node.type === "INSTANCE") {
    const mainComp = await (node as InstanceNode).getMainComponentAsync();
    if (mainComp && isStructuralName(mainComp.name)) {
      return cleanStructuralName(mainComp.name);
    }
  }

  // If the node itself is a COMPONENT, check if structural
  if (node.type === "COMPONENT") {
    const componentNode = node as ComponentNode;
    if (isStructuralName(componentNode.name)) {
      return cleanStructuralName(componentNode.name);
    }
    // Check if parent ComponentSet is structural
    if (
      componentNode.parent &&
      componentNode.parent.type === "COMPONENT_SET"
    ) {
      if (isStructuralName(componentNode.parent.name)) {
        return cleanStructuralName(componentNode.parent.name);
      }
    }
  }

  // Default case: return node name (no structural instance found)
  return node.name;
}

// ========================================
// NODE SEARCH FUNCTIONS
// ========================================

/**
 * Finds all text nodes within a node, filtering non-structural instances.
 * @param node - The node to search within
 * @param isTopLevel - Whether this is the top level of traversal
 * @returns Array of text nodes found
 */
export async function findTextNodes(
  node: SceneNode,
  isTopLevel: boolean = true,
): Promise<TextNode[]> {
  const textNodes: TextNode[] = [];

  // Skip invisible nodes
  if (!isNodeVisible(node)) {
    return textNodes;
  }

  // If nested instance, check if structural
  if (node.type === "INSTANCE" && !isTopLevel) {
    if (!(await isStructuralInstance(node))) {
      // Non-structural instance - skip
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

/**
 * Finds a vector node within a node tree.
 * @param node - The node to search within
 * @returns The vector node found, or null
 */
export function findVectorNode(node: SceneNode): SceneNode | null {
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
// VARIABLE RESOLUTION
// ========================================

/**
 * Resolves a variable bound to a node property.
 * Centralizes the boundVariables resolution logic to avoid repetition.
 *
 * @param node - The Figma node to check
 * @param property - Property name to check (e.g., "itemSpacing", "width", "strokeWeight")
 * @param formatter - Optional function to format the variable name
 * @returns The formatted variable name or null if no bound variable
 */
export async function resolveBoundVariable(
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
 * Resolves a variable bound in an array (like effects).
 *
 * @param node - The Figma node to check
 * @param property - Array property name (e.g., "effects")
 * @param index - Index of the element in the array
 * @param formatter - Optional function to format the variable name
 * @returns The formatted variable name or null if no bound variable
 */
export async function resolveBoundVariableAtIndex(
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
