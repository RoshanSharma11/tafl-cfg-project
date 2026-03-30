import type {
  DerivationStep,
  GrammarSymbol,
  ParseTreeNode,
} from "@/types/grammar";

export function getLeftmostDerivation(tree: ParseTreeNode): DerivationStep[] {
  return buildLeftmostFromTree(tree);
}

export function getRightmostDerivation(tree: ParseTreeNode): DerivationStep[] {
  return buildRightmostFromTree(tree);
}

interface ExpansionRecord {
  form: GrammarSymbol[];
  production: ParseTreeNode;
  position: number;
}

function buildLeftmostFromTree(root: ParseTreeNode): DerivationStep[] {
  const expansions: ExpansionRecord[] = [];
  collectExpansionsPreOrder(root, expansions);

  return simulateDerivation(root, expansions, "leftmost");
}

function buildRightmostFromTree(root: ParseTreeNode): DerivationStep[] {
  const expansions: ExpansionRecord[] = [];
  collectExpansionsReversePreOrder(root, expansions);

  return simulateDerivation(root, expansions, "rightmost");
}

function collectExpansionsPreOrder(
  node: ParseTreeNode,
  expansions: ExpansionRecord[]
): void {
  if (node.production && node.symbol.type === "nonterminal") {
    expansions.push({
      form: [],
      production: node,
      position: -1,
    });
  }
  for (const child of node.children) {
    collectExpansionsPreOrder(child, expansions);
  }
}

function collectExpansionsReversePreOrder(
  node: ParseTreeNode,
  expansions: ExpansionRecord[]
): void {
  if (node.production && node.symbol.type === "nonterminal") {
    expansions.push({
      form: [],
      production: node,
      position: -1,
    });
  }
  for (let i = node.children.length - 1; i >= 0; i--) {
    collectExpansionsReversePreOrder(node.children[i], expansions);
  }
}

function simulateDerivation(
  root: ParseTreeNode,
  expansions: ExpansionRecord[],
  mode: "leftmost" | "rightmost"
): DerivationStep[] {
  const steps: DerivationStep[] = [];

  let currentForm: GrammarSymbol[] = [{ ...root.symbol }];
  steps.push({
    sententialForm: [...currentForm],
    productionUsed: null,
    expandedPosition: -1,
  });

  const nodeToId = new Map<ParseTreeNode, number>();
  let idCounter = 0;
  assignIds(root, nodeToId, { counter: idCounter });

  let formNodeMap: (ParseTreeNode | null)[] = [root];

  for (const expansion of expansions) {
    const node = expansion.production;
    if (!node.production) continue;

    const nodeId = nodeToId.get(node);

    // Find this node in the current form's node map
    let expandIdx = -1;
    if (mode === "leftmost") {
      for (let i = 0; i < formNodeMap.length; i++) {
        if (formNodeMap[i] && nodeToId.get(formNodeMap[i]!) === nodeId) {
          expandIdx = i;
          break;
        }
      }
    } else {
      for (let i = formNodeMap.length - 1; i >= 0; i--) {
        if (formNodeMap[i] && nodeToId.get(formNodeMap[i]!) === nodeId) {
          expandIdx = i;
          break;
        }
      }
    }

    if (expandIdx === -1) continue;

    const production = node.production;

    // Build replacement symbols and their node mappings
    const replacementSymbols: GrammarSymbol[] = [];
    const replacementNodes: (ParseTreeNode | null)[] = [];

    if (production.rhs.length === 0) {
      // ε-production: the non-terminal disappears
    } else {
      for (let i = 0; i < node.children.length; i++) {
        const child = node.children[i];
        // Skip epsilon children
        if (child.symbol.type === "terminal" && child.symbol.value === "ε") {
          continue;
        }
        replacementSymbols.push({ ...child.symbol });
        replacementNodes.push(child);
      }
    }

    currentForm = [
      ...currentForm.slice(0, expandIdx),
      ...replacementSymbols,
      ...currentForm.slice(expandIdx + 1),
    ];

    formNodeMap = [
      ...formNodeMap.slice(0, expandIdx),
      ...replacementNodes,
      ...formNodeMap.slice(expandIdx + 1),
    ];

    steps.push({
      sententialForm: currentForm.map((s) => ({ ...s })),
      productionUsed: production,
      expandedPosition: expandIdx,
    });
  }

  return steps;
}

function assignIds(
  node: ParseTreeNode,
  map: Map<ParseTreeNode, number>,
  ref: { counter: number }
): void {
  map.set(node, ref.counter++);
  for (const child of node.children) {
    assignIds(child, map, ref);
  }
}
