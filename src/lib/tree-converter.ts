import type { ParseTreeNode, TreeNodeDatum } from "@/types/grammar";

export function toTreeDatum(node: ParseTreeNode): TreeNodeDatum {
  const isTerminal = node.symbol.type === "terminal";
  const isEpsilon = isTerminal && node.symbol.value === "ε";

  return {
    name: node.symbol.value,
    attributes: {
      type: isEpsilon ? "epsilon" : isTerminal ? "terminal" : "nonterminal",
    },
    children:
      node.children.length > 0
        ? node.children.map((child) => toTreeDatum(child))
        : undefined,
  };
}
