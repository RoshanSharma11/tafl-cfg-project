"use client";

import { useEffect, useState } from "react";
import { parseGrammar, formatProduction, formatSententialForm } from "@/lib/grammar";
import { parse } from "@/lib/earley";
import { getLeftmostDerivation, getRightmostDerivation } from "@/lib/derivation";

interface TestResult {
  name: string;
  passed: boolean;
  details: string;
}

function runTests(): TestResult[] {
  const results: TestResult[] = [];

  // Test 1: Grammar parsing
  {
    const { grammar, errors } = parseGrammar(`E -> E + T | T
T -> T * F | F
F -> ( E ) | id`);
    results.push({
      name: "Grammar parsing (arithmetic)",
      passed: errors.length === 0 && grammar !== null && grammar.startSymbol === "E",
      details: errors.length > 0 ? errors.map(e => e.message).join(", ") : `OK: ${grammar?.productions.length} productions, start=${grammar?.startSymbol}`,
    });
  }

  // Test 2: Arithmetic expression parsing
  {
    const { grammar } = parseGrammar(`E -> E + T | T
T -> T * F | F
F -> ( E ) | id`);
    if (grammar) {
      const result = parse(grammar, "id + id * id");
      const passed = result.success && result.trees.length === 1;
      let details = `success=${result.success}, trees=${result.trees.length}`;
      if (result.trees.length > 0) {
        const ld = getLeftmostDerivation(result.trees[0]);
        details += `, leftmost steps=${ld.length}`;
        details += `\nLeftmost: ${ld.map(s => formatSententialForm(s.sententialForm)).join(" ⇒ ")}`;
      }
      results.push({ name: "Parse 'id + id * id' (unambiguous)", passed, details });
    }
  }

  // Test 3: Ambiguous grammar
  {
    const { grammar } = parseGrammar(`E -> E + E | E * E | ( E ) | id`);
    if (grammar) {
      const result = parse(grammar, "id + id * id");
      const passed = result.success && result.trees.length > 1;
      results.push({
        name: "Ambiguous grammar (multiple trees)",
        passed,
        details: `success=${result.success}, trees=${result.trees.length} (expected >1)`,
      });
    }
  }

  // Test 4: Simple a^n b^n
  {
    const { grammar } = parseGrammar(`S -> a S b | a b`);
    if (grammar) {
      const r1 = parse(grammar, "aabb");
      const r2 = parse(grammar, "aaabbb");
      const r3 = parse(grammar, "aab"); // invalid
      results.push({
        name: "a^n b^n: 'aabb'",
        passed: r1.success && r1.trees.length === 1,
        details: `success=${r1.success}, trees=${r1.trees.length}`,
      });
      results.push({
        name: "a^n b^n: 'aaabbb'",
        passed: r2.success && r2.trees.length === 1,
        details: `success=${r2.success}, trees=${r2.trees.length}`,
      });
      results.push({
        name: "a^n b^n: 'aab' (invalid)",
        passed: !r3.success,
        details: `success=${r3.success} (expected false), error="${r3.error}"`,
      });
    }
  }

  // Test 5: Epsilon production
  {
    const { grammar } = parseGrammar(`S -> a S a | b S b | a | b | ε`);
    if (grammar) {
      const result = parse(grammar, "abba");
      results.push({
        name: "Palindrome: 'abba'",
        passed: result.success && result.trees.length >= 1,
        details: `success=${result.success}, trees=${result.trees.length}`,
      });
    }
  }

  // Test 6: Balanced parens
  {
    const { grammar } = parseGrammar(`S -> ( S ) S | ε`);
    if (grammar) {
      const r1 = parse(grammar, "(())()");
      const r2 = parse(grammar, "()");
      const r3 = parse(grammar, "");
      results.push({
        name: "Balanced parens: '(())()'",
        passed: r1.success && r1.trees.length >= 1,
        details: `success=${r1.success}, trees=${r1.trees.length}, error=${r1.error || "none"}`,
      });
      results.push({
        name: "Balanced parens: '()'",
        passed: r2.success && r2.trees.length >= 1,
        details: `success=${r2.success}, trees=${r2.trees.length}, error=${r2.error || "none"}`,
      });
      results.push({
        name: "Balanced parens: '' (empty string, ε)",
        passed: r3.success && r3.trees.length >= 1,
        details: `success=${r3.success}, trees=${r3.trees.length}`,
      });
    }
  }

  // Test 7: Derivation extraction
  {
    const { grammar } = parseGrammar(`S -> a S b | a b`);
    if (grammar) {
      const result = parse(grammar, "aabb");
      if (result.success && result.trees.length > 0) {
        const ld = getLeftmostDerivation(result.trees[0]);
        const rd = getRightmostDerivation(result.trees[0]);
        const ldStr = ld.map(s => formatSententialForm(s.sententialForm)).join(" ⇒ ");
        const rdStr = rd.map(s => formatSententialForm(s.sententialForm)).join(" ⇒ ");
        // Expected: S ⇒ aSb ⇒ aabb
        const passed = ld.length === 3 && rd.length === 3;
        results.push({
          name: "Derivation: S ⇒ aSb ⇒ aabb",
          passed,
          details: `LM: ${ldStr}\nRM: ${rdStr}`,
        });
      }
    }
  }

  return results;
}

export default function TestPage() {
  const [results, setResults] = useState<TestResult[]>([]);

  useEffect(() => {
    setResults(runTests());
  }, []);

  const passed = results.filter(r => r.passed).length;
  const total = results.length;

  return (
    <div className="max-w-3xl mx-auto p-8">
      <h1 className="text-2xl font-bold mb-4">Parser Test Suite</h1>
      <p className="mb-4 text-lg">
        {passed}/{total} tests passed
        {passed === total ? " ✅" : " ❌"}
      </p>
      <div className="space-y-3">
        {results.map((r, i) => (
          <div
            key={i}
            className={`p-3 rounded border ${
              r.passed
                ? "bg-green-50 border-green-200 dark:bg-green-950 dark:border-green-800"
                : "bg-red-50 border-red-200 dark:bg-red-950 dark:border-red-800"
            }`}
          >
            <div className="flex items-center gap-2">
              <span>{r.passed ? "✅" : "❌"}</span>
              <span className="font-medium">{r.name}</span>
            </div>
            <pre className="text-xs mt-1 text-muted-foreground whitespace-pre-wrap">
              {r.details}
            </pre>
          </div>
        ))}
      </div>
    </div>
  );
}
