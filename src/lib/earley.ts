import type {
  Grammar,
  GrammarSymbol,
  ParseResult,
  ParseTreeNode,
  Production,
} from "@/types/grammar";

interface EarleyItem {
  production: Production;
  dot: number;
  origin: number;
}

function itemKey(item: EarleyItem): string {
  return `${item.production.index}:${item.dot}:${item.origin}`;
}

function isComplete(item: EarleyItem): boolean {
  return item.dot >= item.production.rhs.length;
}

function nextSymbol(item: EarleyItem): GrammarSymbol | null {
  if (item.dot >= item.production.rhs.length) return null;
  return item.production.rhs[item.dot];
}

function tokenizeInput(input: string, grammar: Grammar): string[] {
  const terminalsList = Array.from(grammar.terminals).sort(
    (a, b) => b.length - a.length
  );

  const tokens: string[] = [];
  let i = 0;

  while (i < input.length) {
    if (input[i] === " " || input[i] === "\t") {
      i++;
      continue;
    }

    let matched = false;
    for (const terminal of terminalsList) {
      if (input.substring(i, i + terminal.length) === terminal) {
        tokens.push(terminal);
        i += terminal.length;
        matched = true;
        break;
      }
    }

    if (!matched) {
      tokens.push(input[i]);
      i++;
    }
  }

  return tokens;
}

class Chart {
  sets: EarleyItem[][];
  private keysets: Set<string>[];

  constructor(size: number) {
    this.sets = Array.from({ length: size + 1 }, () => []);
    this.keysets = Array.from({ length: size + 1 }, () => new Set<string>());
  }

  add(item: EarleyItem, position: number): boolean {
    const key = itemKey(item);
    if (this.keysets[position].has(key)) return false;
    this.keysets[position].add(key);
    this.sets[position].push(item);
    return true;
  }

  has(prodIndex: number, dot: number, origin: number, position: number): boolean {
    const key = `${prodIndex}:${dot}:${origin}`;
    return this.keysets[position].has(key);
  }
}

const MAX_TREES = 10;

export function parse(grammar: Grammar, input: string): ParseResult {
  const tokens = input.trim() === "" ? [] : tokenizeInput(input.trim(), grammar);

  for (const token of tokens) {
    if (!grammar.terminals.has(token)) {
      return {
        success: false,
        trees: [],
        error: `Unknown terminal symbol "${token}" not in grammar`,
      };
    }
  }

  const n = tokens.length;
  const chart = new Chart(n);

  for (const prod of grammar.productions) {
    if (prod.lhs === grammar.startSymbol) {
      chart.add({ production: prod, dot: 0, origin: 0 }, 0);
    }
  }

  for (let i = 0; i <= n; i++) {
    let j = 0;
    while (j < chart.sets[i].length) {
      const item = chart.sets[i][j];
      j++;

      if (isComplete(item)) {
        complete(chart, item, i);
      } else {
        const sym = nextSymbol(item)!;
        if (sym.type === "nonterminal") {
          predict(chart, grammar, sym.value, i);
          // Handle nullable (ε-productions)
          for (const prod of grammar.productions) {
            if (prod.lhs === sym.value && prod.rhs.length === 0) {
              chart.add(
                { production: item.production, dot: item.dot + 1, origin: item.origin },
                i
              );
            }
          }
        } else {
          scan(chart, item, tokens, i);
        }
      }
    }
  }

  const accepted = chart.sets[n].some(
    (item) =>
      item.production.lhs === grammar.startSymbol &&
      isComplete(item) &&
      item.origin === 0
  );

  if (!accepted) {
    let furthest = 0;
    for (let i = n; i >= 0; i--) {
      if (chart.sets[i].length > 0) {
        furthest = i;
        break;
      }
    }

    let error = `String "${input}" is not in the language of this grammar.`;
    if (furthest > 0 && furthest < n) {
      const consumed = tokens.slice(0, furthest).join(" ");
      const remaining = tokens.slice(furthest).join(" ");
      error += ` Parsed "${consumed}" but could not continue at "${remaining}".`;
    }
    return { success: false, trees: [], error };
  }

  const trees = buildTrees(chart, grammar, tokens);

  return {
    success: true,
    trees: trees.slice(0, MAX_TREES),
  };
}

function predict(chart: Chart, grammar: Grammar, nt: string, pos: number): void {
  for (const prod of grammar.productions) {
    if (prod.lhs === nt) {
      chart.add({ production: prod, dot: 0, origin: pos }, pos);
    }
  }
}

function scan(chart: Chart, item: EarleyItem, tokens: string[], pos: number): void {
  const sym = nextSymbol(item);
  if (sym && sym.type === "terminal" && pos < tokens.length && sym.value === tokens[pos]) {
    chart.add(
      { production: item.production, dot: item.dot + 1, origin: item.origin },
      pos + 1
    );
  }
}

function complete(chart: Chart, completedItem: EarleyItem, pos: number): void {
  for (const item of chart.sets[completedItem.origin]) {
    const sym = nextSymbol(item);
    if (sym && sym.type === "nonterminal" && sym.value === completedItem.production.lhs) {
      chart.add(
        { production: item.production, dot: item.dot + 1, origin: item.origin },
        pos
      );
    }
  }
}

// Reconstruct parse trees by checking if NT A derives tokens[i..j] against the chart.
function buildTrees(
  chart: Chart,
  grammar: Grammar,
  tokens: string[]
): ParseTreeNode[] {
  const n = tokens.length;
  const memo = new Map<string, ParseTreeNode[]>();
  return buildNT(grammar.startSymbol, 0, n, chart, grammar, tokens, memo, 0);
}

function buildNT(
  nt: string,
  start: number,
  end: number,
  chart: Chart,
  grammar: Grammar,
  tokens: string[],
  memo: Map<string, ParseTreeNode[]>,
  depth: number
): ParseTreeNode[] {
  if (depth > 300) return [];

  const key = `${nt}:${start}:${end}`;
  if (memo.has(key)) return memo.get(key)!;

  // Temporarily set to empty to handle left recursion
  memo.set(key, []);
  const results: ParseTreeNode[] = [];

  // Find all productions for nt that are completed in the chart spanning [start, end]
  for (const prod of grammar.productions) {
    if (prod.lhs !== nt) continue;

    // Check if this production's completion is in the chart
    if (!chart.has(prod.index, prod.rhs.length, start, end)) continue;

    // ε-production: start must equal end
    if (prod.rhs.length === 0) {
      if (start === end) {
        results.push({
          symbol: { type: "nonterminal", value: nt },
          children: [{ symbol: { type: "terminal", value: "ε" }, children: [] }],
          production: prod,
        });
      }
      continue;
    }

    const childSets = matchRHS(prod.rhs, 0, start, end, chart, grammar, tokens, memo, depth + 1);

    for (const children of childSets) {
      if (results.length >= MAX_TREES) break;
      results.push({
        symbol: { type: "nonterminal", value: nt },
        children,
        production: prod,
      });
    }

    if (results.length >= MAX_TREES) break;
  }

  memo.set(key, results);
  return results;
}

function matchRHS(
  rhs: GrammarSymbol[],
  rhsIndex: number,
  start: number,
  end: number,
  chart: Chart,
  grammar: Grammar,
  tokens: string[],
  memo: Map<string, ParseTreeNode[]>,
  depth: number
): ParseTreeNode[][] {
  if (depth > 300) return [];

  if (rhsIndex === rhs.length) {
    return start === end ? [[]] : [];
  }

  const sym = rhs[rhsIndex];
  const isLast = rhsIndex === rhs.length - 1;
  const results: ParseTreeNode[][] = [];

  if (sym.type === "terminal") {
    if (start < end && tokens[start] === sym.value) {
      const termNode: ParseTreeNode = {
        symbol: sym,
        children: [],
      };
      const rest = matchRHS(rhs, rhsIndex + 1, start + 1, end, chart, grammar, tokens, memo, depth);
      for (const r of rest) {
        if (results.length >= MAX_TREES) break;
        results.push([termNode, ...r]);
      }
    }
  } else {
    // Try all split points; maxEnd = end because remaining symbols may be nullable
    const maxEnd = end;

    for (let mid = start; mid <= maxEnd; mid++) {
      if (results.length >= MAX_TREES) break;

      let found = false;
      for (const prod of grammar.productions) {
        if (prod.lhs === sym.value && chart.has(prod.index, prod.rhs.length, start, mid)) {
          found = true;
          break;
        }
      }

      if (!found) continue;

      const ntTrees = buildNT(sym.value, start, mid, chart, grammar, tokens, memo, depth);

      for (const ntTree of ntTrees) {
        if (results.length >= MAX_TREES) break;

        if (isLast && mid === end) {
          results.push([ntTree]);
        } else if (!isLast) {
          const rest = matchRHS(rhs, rhsIndex + 1, mid, end, chart, grammar, tokens, memo, depth);
          for (const r of rest) {
            if (results.length >= MAX_TREES) break;
            results.push([ntTree, ...r]);
          }
        }
      }
    }
  }

  return results;
}
