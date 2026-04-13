"use client";

import dynamic from "next/dynamic";
import { useCallback, useState } from "react";
import type { Grammar, DerivationStep, ParseTreeNode } from "@/types/grammar";
import { parseGrammar } from "@/lib/grammar";
import { parse } from "@/lib/earley";
import { getLeftmostDerivation, getRightmostDerivation } from "@/lib/derivation";
import { GRAMMAR_EXAMPLES } from "@/lib/examples";

import { GrammarEditor } from "@/components/grammar-editor";
import { StringInput } from "@/components/string-input";
import { ExamplesDropdown } from "@/components/examples-dropdown";
import { DerivationPanel } from "@/components/derivation-panel";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

const ParseTreePanel = dynamic(
  () => import("@/components/parse-tree-panel").then((m) => m.ParseTreePanel),
  {
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center h-96 text-gray-400 text-sm">
        Loading visualizer…
      </div>
    ),
  }
);

// ─────────────────────────────────────────────────────────────────────────────
// Grammar Info Panel
// ─────────────────────────────────────────────────────────────────────────────
function GrammarInfoPanel({ grammar }: { grammar: Grammar }) {
  return (
    <div className="border border-gray-200 rounded-md bg-gray-50 p-3 space-y-2 text-xs">
      <p className="font-semibold text-gray-500 uppercase tracking-wider text-[10px]">
        Parsed Grammar
      </p>
      <div className="flex flex-wrap gap-x-6 gap-y-1">
        <span className="text-gray-600">
          Start symbol:{" "}
          <code className="font-mono font-bold text-blue-700 bg-blue-50 px-1 rounded">
            {grammar.startSymbol}
          </code>
        </span>
        <span className="text-gray-600">
          Productions: <strong>{grammar.productions.length}</strong>
        </span>
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-1">
        <span className="text-gray-500">
          Non-terminals:{" "}
          {Array.from(grammar.nonTerminals).map((nt) => (
            <code key={nt} className="font-mono text-blue-700 bg-blue-50 px-1 rounded mr-1">
              {nt}
            </code>
          ))}
        </span>
        <span className="text-gray-500">
          Terminals:{" "}
          {Array.from(grammar.terminals).map((t) => (
            <code key={t} className="font-mono text-green-700 bg-green-50 px-1 rounded mr-1">
              {t}
            </code>
          ))}
        </span>
      </div>
      <Separator />
      <div className="space-y-0.5">
        {grammar.productions.map((p, i) => (
          <div key={i} className="font-mono flex gap-2">
            <span className="text-gray-400 select-none w-5 text-right">{i + 1}.</span>
            <span>
              <span className="text-blue-700 font-bold">{p.lhs}</span>
              <span className="text-gray-400"> → </span>
              {p.rhs.length === 0 ? (
                <span className="text-gray-400 italic">ε</span>
              ) : (
                p.rhs.map((sym, j) => (
                  <span
                    key={j}
                    className={sym.type === "nonterminal" ? "text-blue-700" : "text-green-700"}
                  >
                    {j > 0 && " "}
                    {sym.value}
                  </span>
                ))
              )}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Empty Tree State
// ─────────────────────────────────────────────────────────────────────────────
function EmptyTreeState() {
  return (
    <div
      className="flex flex-col items-center justify-center rounded-md border-2 border-dashed border-gray-200 bg-gray-50 text-center p-10"
      style={{ minHeight: "480px" }}
    >
      <svg
        className="w-12 h-12 text-gray-300 mb-4"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={1.2}
      >
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1M4.22 4.22l.7.7m13.16 13.16.7.7M1 12h1m20 0h1M4.22 19.78l.7-.7M18.36 5.64l.7-.7" />
        <circle cx="12" cy="12" r="4" />
      </svg>
      <p className="font-semibold text-gray-600 text-base">No parse tree yet</p>
      <p className="text-sm text-gray-400 mt-1 max-w-xs leading-relaxed">
        Enter a grammar and an input string, then click <strong>Derive</strong> to see the
        parse tree and step-by-step derivations.
      </p>
      <div className="mt-6 flex items-center gap-2 text-xs text-gray-400">
        <span className="border rounded px-2 py-1 bg-white">1. Write grammar</span>
        <span>→</span>
        <span className="border rounded px-2 py-1 bg-white">2. Enter string</span>
        <span>→</span>
        <span className="border rounded px-2 py-1 bg-white">3. Derive</span>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Theory Section
// ─────────────────────────────────────────────────────────────────────────────
function TheorySection() {
  const [open, setOpen] = useState<number | null>(0);

  const sections = [
    {
      title: "What is a Context-Free Grammar (CFG)?",
      body: (
        <div className="space-y-3 text-base text-gray-600 leading-relaxed">
          <p>
            A <strong>Context-Free Grammar (CFG)</strong> is a formal grammar used to describe the
            syntax of programming languages, mathematical expressions, and natural languages. It is
            one of the most important concepts in the Theory of Automata and Formal Languages (TAFL).
          </p>
          <p>A CFG is a 4-tuple <strong>G = (V, Σ, P, S)</strong> where:</p>
          <ul className="list-none space-y-1 pl-2 border-l-2 border-blue-200">
            <li><strong className="text-blue-700">V</strong> — a finite set of <em>non-terminal</em> symbols (variables)</li>
            <li><strong className="text-green-700">Σ</strong> — a finite set of <em>terminal</em> symbols (the alphabet), where V ∩ Σ = ∅</li>
            <li><strong className="text-gray-700">P</strong> — a finite set of <em>production rules</em> of the form A → α, where A ∈ V and α ∈ (V ∪ Σ)*</li>
            <li><strong className="text-gray-700">S</strong> — the <em>start symbol</em>, where S ∈ V</li>
          </ul>
          <div className="bg-gray-50 border rounded p-3 font-mono text-sm space-y-0.5">
            <div className="text-gray-400 mb-1">Example: Arithmetic expressions</div>
            <div><span className="text-blue-700">E</span> → <span className="text-blue-700">E</span> + <span className="text-blue-700">T</span> | <span className="text-blue-700">T</span></div>
            <div><span className="text-blue-700">T</span> → <span className="text-blue-700">T</span> * <span className="text-blue-700">F</span> | <span className="text-blue-700">F</span></div>
            <div><span className="text-blue-700">F</span> → ( <span className="text-blue-700">E</span> ) | <span className="text-green-700">id</span></div>
          </div>
        </div>
      ),
    },
    {
      title: "Productions & Sentential Forms",
      body: (
        <div className="space-y-3 text-base text-gray-600 leading-relaxed">
          <p>
            A <strong>production rule</strong> (or simply production) describes how a non-terminal
            can be replaced. If we have the production <code className="bg-gray-100 px-1 rounded font-mono">A → α</code>, it
            means the non-terminal <em>A</em> can be rewritten as the string <em>α</em>.
          </p>
          <p>
            A <strong>sentential form</strong> is any string of terminals and non-terminals that
            can be derived from the start symbol by zero or more applications of production rules.
          </p>
          <ul className="list-disc pl-5 space-y-1">
            <li>If a sentential form contains only terminal symbols, it is a <strong>sentence</strong> (word) of the language.</li>
            <li>The set of all sentences derivable from S forms the <strong>language L(G)</strong>.</li>
          </ul>
          <div className="bg-gray-50 border rounded p-3 font-mono text-sm">
            <div className="text-gray-400 mb-1">Sentential forms leading to &quot;id + id&quot;:</div>
            <span className="text-blue-700">E</span>
            <span className="text-gray-400"> ⇒ </span>
            <span className="text-blue-700">E</span> + <span className="text-blue-700">T</span>
            <span className="text-gray-400"> ⇒ </span>
            <span className="text-blue-700">T</span> + <span className="text-blue-700">T</span>
            <span className="text-gray-400"> ⇒ </span>
            <span className="text-blue-700">F</span> + <span className="text-blue-700">T</span>
            <span className="text-gray-400"> ⇒ </span>
            <span className="text-green-700">id</span> + <span className="text-blue-700">T</span>
            <span className="text-gray-400"> ⇒ </span>
            <span className="text-green-700">id</span> + <span className="text-blue-700">F</span>
            <span className="text-gray-400"> ⇒ </span>
            <span className="text-green-700">id + id</span>
          </div>
        </div>
      ),
    },
    {
      title: "Leftmost & Rightmost Derivation",
      body: (
        <div className="space-y-3 text-base text-gray-600 leading-relaxed">
          <p>
            In a derivation, at each step we expand exactly one non-terminal using a production
            rule. We can choose <em>which</em> non-terminal to expand — this choice defines the
            type of derivation.
          </p>
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="border rounded p-3 space-y-1">
              <p className="font-semibold text-blue-700 text-sm uppercase tracking-wide">Leftmost Derivation</p>
              <p className="text-sm">Always expand the <strong>leftmost</strong> non-terminal first.</p>
              <div className="font-mono text-sm mt-2 space-y-0.5 bg-gray-50 rounded p-2">
                <div><span className="text-blue-700">E</span> ⇒ <span className="text-blue-700 font-bold underline">E</span> + T</div>
                <div><span className="text-blue-700 font-bold underline">T</span> + T ⇒ F + T</div>
                <div><span className="text-blue-700 font-bold underline">F</span> + T ⇒ id + T</div>
                <div>id + <span className="text-blue-700 font-bold underline">T</span> ⇒ id + F</div>
                <div>id + <span className="text-blue-700 font-bold underline">F</span> ⇒ id + id</div>
              </div>
            </div>
            <div className="border rounded p-3 space-y-1">
              <p className="font-semibold text-green-700 text-sm uppercase tracking-wide">Rightmost Derivation</p>
              <p className="text-sm">Always expand the <strong>rightmost</strong> non-terminal first.</p>
              <div className="font-mono text-sm mt-2 space-y-0.5 bg-gray-50 rounded p-2">
                <div><span className="text-blue-700">E</span> ⇒ E + <span className="text-blue-700 font-bold underline">T</span></div>
                <div>E + <span className="text-blue-700 font-bold underline">F</span> ⇒ E + id</div>
                <div><span className="text-blue-700 font-bold underline">E</span> + id ⇒ T + id</div>
                <div><span className="text-blue-700 font-bold underline">T</span> + id ⇒ F + id</div>
                <div><span className="text-blue-700 font-bold underline">F</span> + id ⇒ id + id</div>
              </div>
            </div>
          </div>
          <p>
            Both leftmost and rightmost derivations produce the same terminal string, but follow
            different expansion orders. Every parse tree corresponds to exactly one leftmost and
            one rightmost derivation.
          </p>
        </div>
      ),
    },
    {
      title: "Parse Trees",
      body: (
        <div className="space-y-3 text-base text-gray-600 leading-relaxed">
          <p>
            A <strong>parse tree</strong> (also called a derivation tree or concrete syntax tree)
            is a rooted, ordered tree that represents the syntactic structure of a string according
            to a grammar.
          </p>
          <ul className="list-disc pl-5 space-y-1">
            <li>The <strong>root</strong> is labeled with the start symbol <em>S</em>.</li>
            <li>Each <strong>interior node</strong> is labeled with a non-terminal.</li>
            <li>Each <strong>leaf</strong> is labeled with a terminal or <em>ε</em> (epsilon).</li>
            <li>If an interior node A has children X₁, X₂, …, Xₙ (left to right), then <code className="bg-gray-100 px-1 rounded font-mono">A → X₁X₂…Xₙ</code> must be a production.</li>
            <li>The <strong>yield</strong> of a parse tree — reading leaves left to right — gives the derived terminal string.</li>
          </ul>
          <div className="bg-blue-50 border border-blue-100 rounded p-3 text-sm text-blue-800">
            <strong>Key insight:</strong> A derivation defines a sequence of rewriting steps, while a parse tree
            captures the hierarchical structure (grouping). Both leftmost and rightmost derivations
            for the same string produce the same parse tree.
          </div>
        </div>
      ),
    },
    {
      title: "Ambiguous Grammars",
      body: (
        <div className="space-y-3 text-base text-gray-600 leading-relaxed">
          <p>
            A grammar is <strong>ambiguous</strong> if there exists at least one string in its
            language that has more than one parse tree (equivalently, more than one leftmost
            derivation, or more than one rightmost derivation).
          </p>
          <div className="bg-gray-50 border rounded p-3 font-mono text-sm space-y-1">
            <div className="text-gray-400 mb-1">Ambiguous grammar:</div>
            <div><span className="text-blue-700">E</span> → <span className="text-blue-700">E</span> + <span className="text-blue-700">E</span> | <span className="text-blue-700">E</span> * <span className="text-blue-700">E</span> | ( <span className="text-blue-700">E</span> ) | <span className="text-green-700">id</span></div>
            <div className="text-gray-400 mt-2">For &quot;id + id * id&quot;, two parse trees exist:</div>
            <div className="text-gray-500">Tree 1: (id + id) * id &nbsp; Tree 2: id + (id * id)</div>
          </div>
          <ul className="list-disc pl-5 space-y-1">
            <li>Ambiguity is a property of the <em>grammar</em>, not the language.</li>
            <li>Some context-free languages are <strong>inherently ambiguous</strong> — every grammar for them is ambiguous.</li>
            <li>Compilers typically require unambiguous grammars to give a unique interpretation to programs.</li>
            <li>Ambiguity can often be eliminated by adding precedence and associativity rules.</li>
          </ul>
          <div className="bg-amber-50 border border-amber-200 rounded p-3 text-sm text-amber-800">
            <strong>Try it:</strong> Load the &quot;Ambiguous Arithmetic&quot; example in the Visualizer tab — you will see multiple parse trees for the same string.
          </div>
        </div>
      ),
    },
    {
      title: "Epsilon (ε) Productions",
      body: (
        <div className="space-y-3 text-base text-gray-600 leading-relaxed">
          <p>
            An <strong>epsilon production</strong> is a production of the form{" "}
            <code className="bg-gray-100 px-1 rounded font-mono">A → ε</code>, meaning the
            non-terminal A can be replaced by the empty string.
          </p>
          <p>
            Epsilon productions allow grammars to generate the empty string ε and are essential
            for describing recursive structures like balanced parentheses or optional constructs.
          </p>
          <div className="bg-gray-50 border rounded p-3 font-mono text-sm space-y-0.5">
            <div className="text-gray-400 mb-1">Balanced parentheses with ε:</div>
            <div><span className="text-blue-700">S</span> → ( <span className="text-blue-700">S</span> ) <span className="text-blue-700">S</span> | <span className="italic text-gray-400">ε</span></div>
          </div>
          <ul className="list-disc pl-5 space-y-1">
            <li>In the Visualizer, epsilon nodes appear as dashed gray boxes labeled <em>ε</em>.</li>
            <li>Enter <code className="bg-gray-100 px-1 rounded font-mono">ε</code> or <code className="bg-gray-100 px-1 rounded font-mono">eps</code> in the grammar editor.</li>
            <li>To test the empty string, leave the input field blank and click Derive.</li>
          </ul>
        </div>
      ),
    },
    {
      title: "The Earley Parsing Algorithm",
      body: (
        <div className="space-y-3 text-base text-gray-600 leading-relaxed">
          <p>
            This tool uses the <strong>Earley algorithm</strong> (Jay Earley, 1970), a chart-based
            parsing algorithm that can parse any context-free grammar — including ambiguous grammars
            and grammars with left recursion or epsilon productions.
          </p>
          <div className="grid sm:grid-cols-3 gap-3">
            {[
              { name: "Predict", desc: "For each non-terminal expected at position i, add all productions for that non-terminal to the chart at position i." },
              { name: "Scan", desc: "If the next expected symbol is a terminal and it matches the next input token, advance the dot past it." },
              { name: "Complete", desc: "When a production is fully matched, advance all items that were waiting for that non-terminal." },
            ].map((op) => (
              <div key={op.name} className="border rounded p-3">
                <p className="font-semibold text-blue-700 text-sm mb-1">{op.name}</p>
                <p className="text-sm text-gray-500">{op.desc}</p>
              </div>
            ))}
          </div>
          <div className="flex flex-wrap gap-4 text-sm text-gray-600">
            <span><strong>Time complexity:</strong> O(n³) in the worst case (ambiguous grammars), O(n²) for unambiguous, O(n) for most practical grammars.</span>
            <span><strong>Space complexity:</strong> O(n²) for the chart.</span>
          </div>
          <p className="text-sm text-gray-500">
            Unlike LL or LR parsers, the Earley algorithm requires no grammar transformation
            (no need to eliminate left recursion or left-factor). This makes it ideal for
            educational use with arbitrary CFGs.
          </p>
        </div>
      ),
    },
  ];

  return (
    <div className="max-w-3xl mx-auto py-6 space-y-3">
      <div className="mb-6">
        <h2 className="text-xl font-bold text-gray-800">Theory Reference</h2>
        <p className="text-sm text-gray-500 mt-1">
          Core concepts from the Theory of Automata &amp; Formal Languages (TAFL). Click a topic to expand.
        </p>
      </div>
      {sections.map((sec, i) => (
        <div key={i} className="border border-gray-200 rounded-md overflow-hidden">
          <button
            className="w-full flex items-center justify-between px-4 py-3 text-left bg-white hover:bg-gray-50 transition-colors"
            onClick={() => setOpen(open === i ? null : i)}
          >
            <span className="font-medium text-gray-800 text-base">{sec.title}</span>
            <svg
              className={`w-4 h-4 text-gray-400 shrink-0 transition-transform ${open === i ? "rotate-180" : ""}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          {open === i && (
            <div className="border-t border-gray-100 px-4 py-4 bg-white">
              {sec.body}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Page
// ─────────────────────────────────────────────────────────────────────────────
export default function Home() {
  const [tab, setTab] = useState<"tool" | "theory">("tool");

  const [grammarText, setGrammarText] = useState(GRAMMAR_EXAMPLES[0].grammar);
  const [inputString, setInputString] = useState(GRAMMAR_EXAMPLES[0].testString);
  const [error, setError] = useState<string | null>(null);
  const [grammarErrors, setGrammarErrors] = useState<string[]>([]);
  const [trees, setTrees] = useState<ParseTreeNode[]>([]);
  const [leftDerivation, setLeftDerivation] = useState<DerivationStep[]>([]);
  const [rightDerivation, setRightDerivation] = useState<DerivationStep[]>([]);
  const [selectedTree, setSelectedTree] = useState(0);
  const [hasResult, setHasResult] = useState(false);
  const [parsedGrammar, setParsedGrammar] = useState<Grammar | null>(null);

  const handleDerive = useCallback(() => {
    setError(null);
    setGrammarErrors([]);
    setTrees([]);
    setLeftDerivation([]);
    setRightDerivation([]);
    setSelectedTree(0);
    setHasResult(false);
    setParsedGrammar(null);

    const { grammar, errors } = parseGrammar(grammarText);
    if (errors.length > 0) {
      setGrammarErrors(errors.map((e) => `Line ${e.line}: ${e.message}`));
      return;
    }
    if (!grammar) { setError("Failed to parse grammar"); return; }

    setParsedGrammar(grammar);

    const result = parse(grammar, inputString);
    if (!result.success) { setError(result.error || "Parsing failed"); return; }

    setTrees(result.trees);
    setHasResult(true);

    if (result.trees.length > 0) {
      setLeftDerivation(getLeftmostDerivation(result.trees[0]));
      setRightDerivation(getRightmostDerivation(result.trees[0]));
    }
  }, [grammarText, inputString]);

  const handleTreeSelect = useCallback(
    (index: number) => {
      setSelectedTree(index);
      if (trees[index]) {
        setLeftDerivation(getLeftmostDerivation(trees[index]));
        setRightDerivation(getRightmostDerivation(trees[index]));
      }
    },
    [trees]
  );

  const handleExampleSelect = useCallback((idx: number) => {
    const ex = GRAMMAR_EXAMPLES[idx];
    setGrammarText(ex.grammar);
    setInputString(ex.testString);
    setError(null);
    setGrammarErrors([]);
    setTrees([]);
    setLeftDerivation([]);
    setRightDerivation([]);
    setHasResult(false);
    setParsedGrammar(null);
  }, []);

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* ── Header ───────────────────────────────────────────────── */}
      <header className="border-b border-gray-200 bg-white sticky top-0 z-20">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-14">
            {/* Logo / Title */}
            <div className="flex items-center gap-3">
              <div>
                <span className="font-bold text-gray-900 text-base leading-none">CFG Visualizer</span>
                <p className="text-[11px] text-gray-400 leading-none mt-0.5">Parse Tree &amp; Derivation Tool</p>
              </div>
            </div>

            {/* Tab Nav */}
            <nav className="flex items-center gap-1">
              {(["tool", "theory"] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  className={`px-4 py-1.5 text-sm rounded font-medium transition-colors ${
                    tab === t
                      ? "bg-blue-600 text-white"
                      : "text-gray-600 hover:bg-gray-100"
                  }`}
                >
                  {t === "tool" ? "Visualizer" : "Theory"}
                </button>
              ))}
            </nav>

            <Badge variant="outline" className="hidden sm:inline-flex text-xs font-mono">
              Earley Parser
            </Badge>
          </div>
        </div>
      </header>

      {/* ── Body ─────────────────────────────────────────────────── */}
      <main className="flex-1 container mx-auto px-4 py-6">

        {/* ── THEORY TAB ─────────────────────────────────────── */}
        {tab === "theory" && <TheorySection />}

        {/* ── VISUALIZER TAB ─────────────────────────────────── */}
        {tab === "tool" && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">

            {/* LEFT: Input */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold text-gray-700">Grammar</h2>
                <ExamplesDropdown examples={GRAMMAR_EXAMPLES} onSelect={handleExampleSelect} />
              </div>

              <GrammarEditor value={grammarText} onChange={setGrammarText} />

              {parsedGrammar && <GrammarInfoPanel grammar={parsedGrammar} />}

              <StringInput value={inputString} onChange={setInputString} onDerive={handleDerive} />

              {grammarErrors.length > 0 && (
                <Alert variant="destructive">
                  <AlertTitle>Grammar Error</AlertTitle>
                  <AlertDescription>
                    <ul className="list-disc pl-4 space-y-0.5 text-sm">
                      {grammarErrors.map((e, i) => <li key={i}>{e}</li>)}
                    </ul>
                  </AlertDescription>
                </Alert>
              )}

              {error && (
                <Alert variant="destructive">
                  <AlertTitle>String not in language</AlertTitle>
                  <AlertDescription className="text-sm">{error}</AlertDescription>
                </Alert>
              )}

              {hasResult && trees.length > 0 && (
                <div className="rounded-md border border-green-200 bg-green-50 px-4 py-3">
                  <div className="flex items-center gap-2">
                    <span className="shrink-0 w-5 h-5 rounded-full bg-green-600 text-white flex items-center justify-center text-xs font-bold">✓</span>
                    <span className="font-medium text-green-800 text-sm">String accepted</span>
                    {trees.length > 1 && (
                      <Badge className="bg-amber-100 text-amber-700 border-amber-300 text-[10px]">
                        {trees.length} parse trees — ambiguous
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-green-700 mt-1 pl-7">
                    <code className="font-mono font-semibold">{inputString || "ε"}</code> is in the language of this grammar.
                  </p>
                </div>
              )}

              {hasResult && leftDerivation.length > 0 && (
                <div className="lg:hidden">
                  <Separator className="my-2" />
                  <DerivationPanel leftDerivation={leftDerivation} rightDerivation={rightDerivation} />
                </div>
              )}
            </div>

            {/* RIGHT: Parse Tree + Derivations */}
            <div className="space-y-4">
              {hasResult && trees.length > 0 ? (
                <>
                  {trees.length > 1 && (
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs text-gray-500 font-medium">Parse tree:</span>
                      {trees.map((_, i) => (
                        <button
                          key={i}
                          onClick={() => handleTreeSelect(i)}
                          className={`px-3 py-1 text-sm rounded border font-medium transition-colors ${
                            i === selectedTree
                              ? "bg-blue-600 text-white border-blue-600"
                              : "border-gray-300 text-gray-600 hover:border-gray-400"
                          }`}
                        >
                          Tree {i + 1}
                        </button>
                      ))}
                    </div>
                  )}
                  <ParseTreePanel tree={trees[selectedTree]} />
                  <div className="hidden lg:block">
                    <DerivationPanel leftDerivation={leftDerivation} rightDerivation={rightDerivation} />
                  </div>
                </>
              ) : (
                <EmptyTreeState />
              )}
            </div>
          </div>
        )}
      </main>

      {/* ── Footer ───────────────────────────────────────────────── */}
      <footer className="border-t border-gray-200 mt-auto">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between text-xs text-gray-400">
          <span>CFG Derivation &amp; Parse Tree Visualizer</span>
          <span>Earley algorithm · supports ambiguous grammars &amp; ε-productions</span>
        </div>
      </footer>
    </div>
  );
}
