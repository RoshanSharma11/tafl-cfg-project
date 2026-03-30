export interface NonTerminal {
  type: "nonterminal";
  value: string;
}

export interface Terminal {
  type: "terminal";
  value: string;
}

export type GrammarSymbol = NonTerminal | Terminal;

export interface Production {
  lhs: string;
  rhs: GrammarSymbol[]; // empty array = ε-production
  index: number;
}

export interface Grammar {
  nonTerminals: Set<string>;
  terminals: Set<string>;
  productions: Production[];
  startSymbol: string;
}

export interface ParseTreeNode {
  symbol: GrammarSymbol;
  children: ParseTreeNode[];
  production?: Production;
}

export interface DerivationStep {
  sententialForm: GrammarSymbol[];
  productionUsed: Production | null; // null for initial step
  expandedPosition: number; // -1 for initial step
}

export interface ParseResult {
  success: boolean;
  trees: ParseTreeNode[];
  error?: string;
}

export interface TreeNodeDatum {
  name: string;
  attributes?: Record<string, string>;
  children?: TreeNodeDatum[];
}

export interface GrammarExample {
  name: string;
  description: string;
  grammar: string;
  testString: string;
}
