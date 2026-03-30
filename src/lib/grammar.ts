import type { Grammar, GrammarSymbol, Production } from "@/types/grammar";

const EPSILON_SYMBOLS = ["ε", "epsilon", "ϵ", "eps"];

function isNonTerminal(token: string): boolean {
  if (token.length === 0) return false;
  if (token.length === 1) return token >= "A" && token <= "Z";
  return /^[A-Z][A-Za-z0-9_']*$/.test(token);
}

function tokenizeRHS(rhs: string): string[] {
  const tokens: string[] = [];
  let i = 0;

  while (i < rhs.length) {
    // Skip whitespace
    if (rhs[i] === " " || rhs[i] === "\t") {
      i++;
      continue;
    }

    if (rhs[i] === "'" || rhs[i] === '"') {
      const quote = rhs[i];
      let j = i + 1;
      while (j < rhs.length && rhs[j] !== quote) j++;
      tokens.push(rhs.substring(i + 1, j));
      i = j + 1;
      continue;
    }

    // Multi-char uppercase = non-terminal
    if (rhs[i] >= "A" && rhs[i] <= "Z") {
      let j = i + 1;
      while (j < rhs.length && /[A-Za-z0-9_']/.test(rhs[j])) j++;
      tokens.push(rhs.substring(i, j));
      i = j;
      continue;
    }

    if (rhs[i] === "e" && rhs.substring(i, i + 7) === "epsilon") {
      tokens.push("ε");
      i += 7;
      continue;
    }

    if (rhs[i] === "e" && rhs.substring(i, i + 3) === "eps") {
      tokens.push("ε");
      i += 3;
      continue;
    }

    // Multi-char lowercase token (e.g., 'id', 'if', 'num')
    if (rhs[i] >= "a" && rhs[i] <= "z") {
      let j = i + 1;
      while (j < rhs.length && rhs[j] >= "a" && rhs[j] <= "z") j++;
      tokens.push(rhs.substring(i, j));
      i = j;
      continue;
    }

    tokens.push(rhs[i]);
    i++;
  }

  return tokens;
}

function classifySymbol(token: string): GrammarSymbol {
  if (isNonTerminal(token)) {
    return { type: "nonterminal", value: token };
  }
  return { type: "terminal", value: token };
}

export interface GrammarParseError {
  line: number;
  message: string;
}

export interface GrammarParseResult {
  grammar: Grammar | null;
  errors: GrammarParseError[];
}

export function parseGrammar(text: string): GrammarParseResult {
  const lines = text.split("\n");
  const errors: GrammarParseError[] = [];
  const productions: Production[] = [];
  const nonTerminals = new Set<string>();
  const terminals = new Set<string>();
  let startSymbol = "";
  let productionIndex = 0;

  for (let lineNum = 0; lineNum < lines.length; lineNum++) {
    const line = lines[lineNum].trim();

    if (line === "" || line.startsWith("//") || line.startsWith("#")) {
      continue;
    }

    const arrowMatch = line.match(/^(.+?)\s*(?:->|→)\s*(.+)$/);
    if (!arrowMatch) {
      errors.push({
        line: lineNum + 1,
        message: `Invalid production rule format. Expected "A -> ..." or "A → ..."`,
      });
      continue;
    }

    const lhsStr = arrowMatch[1].trim();
    const rhsStr = arrowMatch[2].trim();

    if (!isNonTerminal(lhsStr)) {
      errors.push({
        line: lineNum + 1,
        message: `Left-hand side "${lhsStr}" must be a non-terminal (start with uppercase letter)`,
      });
      continue;
    }

    nonTerminals.add(lhsStr);

    if (startSymbol === "") {
      startSymbol = lhsStr;
    }

    const alternatives = rhsStr.split("|");

    for (const alt of alternatives) {
      const trimmedAlt = alt.trim();
      if (trimmedAlt === "") {
        errors.push({
          line: lineNum + 1,
          message: `Empty alternative found`,
        });
        continue;
      }

      const tokens = tokenizeRHS(trimmedAlt);

      if (
        tokens.length === 1 &&
        EPSILON_SYMBOLS.includes(tokens[0].toLowerCase())
      ) {
        productions.push({
          lhs: lhsStr,
          rhs: [], // empty = epsilon production
          index: productionIndex++,
        });
        continue;
      }

      const rhs: GrammarSymbol[] = tokens
        .filter((t) => !EPSILON_SYMBOLS.includes(t.toLowerCase()))
        .map((token) => {
          const sym = classifySymbol(token);
          if (sym.type === "terminal") {
            terminals.add(sym.value);
          } else {
            nonTerminals.add(sym.value);
          }
          return sym;
        });

      productions.push({
        lhs: lhsStr,
        rhs,
        index: productionIndex++,
      });
    }
  }

  if (productions.length === 0) {
    errors.push({ line: 0, message: "No valid production rules found" });
    return { grammar: null, errors };
  }

  if (errors.length > 0) {
    return { grammar: null, errors };
  }

  return {
    grammar: {
      nonTerminals,
      terminals,
      productions,
      startSymbol,
    },
    errors: [],
  };
}

export function formatSententialForm(symbols: GrammarSymbol[]): string {
  if (symbols.length === 0) return "ε";
  return symbols.map((s) => s.value).join(" ");
}

export function formatProduction(prod: Production): string {
  if (prod.rhs.length === 0) return `${prod.lhs} → ε`;
  return `${prod.lhs} → ${prod.rhs.map((s) => s.value).join(" ")}`;
}
