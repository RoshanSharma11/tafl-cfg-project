import type { GrammarExample } from "@/types/grammar";

export const GRAMMAR_EXAMPLES: GrammarExample[] = [
  {
    name: "Arithmetic Expressions",
    description:
      "Classic unambiguous grammar for arithmetic with correct precedence",
    grammar: `E -> E + T | T
T -> T * F | F
F -> ( E ) | id`,
    testString: "id + id * id",
  },
  {
    name: "Ambiguous Arithmetic",
    description:
      "Ambiguous grammar — multiple parse trees for the same string",
    grammar: `E -> E + E | E * E | ( E ) | id`,
    testString: "id + id * id",
  },
  {
    name: "Balanced Parentheses",
    description: "Generates all strings of balanced parentheses",
    grammar: `S -> ( S ) S | ε`,
    testString: "(())()",
  },
  {
    name: "Palindromes over {a, b}",
    description: "Generates palindrome strings over {a, b}",
    grammar: `S -> a S a | b S b | a | b | ε`,
    testString: "abba",
  },
  {
    name: "aⁿbⁿ Language",
    description: "Generates strings of the form aⁿbⁿ (n ≥ 1) — classic CFL",
    grammar: `S -> a S b | a b`,
    testString: "aaabbb",
  },
  {
    name: "If-Else (Dangling Else)",
    description: "Classic ambiguous grammar for if-then-else statements",
    grammar: `S -> if E then S else S | if E then S | a
E -> b`,
    testString: "if b then if b then a else a",
  },
  {
    name: "Simple Declarations",
    description: "Variable declarations: type id, id, ...",
    grammar: `D -> T L
T -> int | float | bool
L -> L , id | id`,
    testString: "int id , id , id",
  },
  {
    name: "Regular-like: (aab)*",
    description: "Strings made of repetitions of 'aab'",
    grammar: `S -> S aab | ε`,
    testString: "aab aab aab",
  },
  {
    name: "Nested Lists",
    description: "Lists that can be nested: [ items ] or atoms",
    grammar: `L -> [ M ] | a
M -> M , L | L`,
    testString: "[ a , [ a , a ] ]",
  },
  {
    name: "Boolean Expressions",
    description: "Boolean algebra: and, or, not with parentheses",
    grammar: `B -> B or C | C
C -> C and D | D
D -> not D | ( B ) | true | false`,
    testString: "true and not false or true",
  },
];
