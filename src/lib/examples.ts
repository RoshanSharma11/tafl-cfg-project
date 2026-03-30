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
    name: "Palindromes",
    description: "Generates palindrome strings over {a, b}",
    grammar: `S -> a S a | b S b | a | b | ε`,
    testString: "abba",
  },
  {
    name: "Simple Strings (aⁿbⁿ)",
    description: "Generates strings of the form aⁿbⁿ where n ≥ 1",
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
];
