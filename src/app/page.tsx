"use client";

import dynamic from "next/dynamic";
import { useCallback, useState } from "react";
import type {
  DerivationStep,
  ParseTreeNode,
} from "@/types/grammar";
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
  () => import("@/components/parse-tree-panel").then((mod) => mod.ParseTreePanel),
  {
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center h-96 text-muted-foreground">
        Loading tree visualizer…
      </div>
    ),
  }
);

export default function Home() {
  const [grammarText, setGrammarText] = useState(GRAMMAR_EXAMPLES[0].grammar);
  const [inputString, setInputString] = useState(GRAMMAR_EXAMPLES[0].testString);
  const [error, setError] = useState<string | null>(null);
  const [grammarErrors, setGrammarErrors] = useState<string[]>([]);
  const [trees, setTrees] = useState<ParseTreeNode[]>([]);
  const [leftDerivation, setLeftDerivation] = useState<DerivationStep[]>([]);
  const [rightDerivation, setRightDerivation] = useState<DerivationStep[]>([]);
  const [selectedTree, setSelectedTree] = useState(0);
  const [hasResult, setHasResult] = useState(false);

  const handleDerive = useCallback(() => {
    setError(null);
    setGrammarErrors([]);
    setTrees([]);
    setLeftDerivation([]);
    setRightDerivation([]);
    setSelectedTree(0);
    setHasResult(false);

    const { grammar, errors } = parseGrammar(grammarText);
    if (errors.length > 0) {
      setGrammarErrors(errors.map((e) => `Line ${e.line}: ${e.message}`));
      return;
    }
    if (!grammar) {
      setError("Failed to parse grammar");
      return;
    }

    const result = parse(grammar, inputString);
    if (!result.success) {
      setError(result.error || "Parsing failed");
      return;
    }

    setTrees(result.trees);
    setHasResult(true);

    if (result.trees.length > 0) {
      const tree = result.trees[0];
      setLeftDerivation(getLeftmostDerivation(tree));
      setRightDerivation(getRightmostDerivation(tree));
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
    const example = GRAMMAR_EXAMPLES[idx];
    setGrammarText(example.grammar);
    setInputString(example.testString);
    setError(null);
    setGrammarErrors([]);
    setTrees([]);
    setLeftDerivation([]);
    setRightDerivation([]);
    setHasResult(false);
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold tracking-tight">
                CFG Derivation &amp; Parse Tree Visualizer
              </h1>
              <p className="text-sm text-muted-foreground mt-1">
                Enter a context-free grammar and a string to see step-by-step
                derivations and parse tree visualization
              </p>
            </div>
            <Badge variant="secondary" className="hidden sm:inline-flex">
              Earley Parser
            </Badge>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Grammar Input</h2>
              <ExamplesDropdown
                examples={GRAMMAR_EXAMPLES}
                onSelect={handleExampleSelect}
              />
            </div>

            <GrammarEditor value={grammarText} onChange={setGrammarText} />

            <StringInput
              value={inputString}
              onChange={setInputString}
              onDerive={handleDerive}
            />

            {grammarErrors.length > 0 && (
              <Alert variant="destructive">
                <AlertTitle>Grammar Error</AlertTitle>
                <AlertDescription>
                  <ul className="list-disc pl-4 space-y-1">
                    {grammarErrors.map((err, i) => (
                      <li key={i}>{err}</li>
                    ))}
                  </ul>
                </AlertDescription>
              </Alert>
            )}

            {error && (
              <Alert variant="destructive">
                <AlertTitle>Parse Error</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {hasResult && trees.length > 0 && (
              <Alert>
                <AlertTitle className="flex items-center gap-2">
                  ✓ Parse Successful
                  {trees.length > 1 && (
                    <Badge variant="outline">
                      {trees.length} parse tree{trees.length > 1 ? "s" : ""}{" "}
                      found (ambiguous grammar)
                    </Badge>
                  )}
                </AlertTitle>
                <AlertDescription>
                  The string is in the language of the grammar.
                  {trees.length > 1 &&
                    " Multiple parse trees indicate the grammar is ambiguous."}
                </AlertDescription>
              </Alert>
            )}

            {hasResult && leftDerivation.length > 0 && (
              <div className="lg:hidden">
                <Separator className="my-4" />
                <DerivationPanel
                  leftDerivation={leftDerivation}
                  rightDerivation={rightDerivation}
                />
              </div>
            )}
          </div>

          <div className="space-y-4">
            {hasResult && trees.length > 0 ? (
              <>
                {trees.length > 1 && (
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-medium">Parse Tree:</span>
                    {trees.map((_, i) => (
                      <button
                        key={i}
                        onClick={() => handleTreeSelect(i)}
                        className={`px-3 py-1 text-sm rounded-md border transition-colors ${
                          i === selectedTree
                            ? "bg-primary text-primary-foreground border-primary"
                            : "bg-card border-border hover:bg-accent"
                        }`}
                      >
                        Tree {i + 1}
                      </button>
                    ))}
                  </div>
                )}

                <ParseTreePanel tree={trees[selectedTree]} />

                <div className="hidden lg:block">
                  <DerivationPanel
                    leftDerivation={leftDerivation}
                    rightDerivation={rightDerivation}
                  />
                </div>
              </>
            ) : (
              <div className="flex items-center justify-center h-96 rounded-lg border-2 border-dashed border-border">
                <div className="text-center text-muted-foreground">
                  <svg
                    className="mx-auto h-12 w-12 mb-3 opacity-50"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2"
                    />
                  </svg>
                  <p className="font-medium">No parse tree yet</p>
                  <p className="text-sm mt-1">
                    Enter a grammar and string, then click &ldquo;Derive&rdquo;
                    to see the parse tree
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      <footer className="border-t mt-8">
        <div className="container mx-auto px-4 py-4 text-center text-sm text-muted-foreground">
          CFG Derivation &amp; Parse Tree Visualizer — Built for understanding
          context-free grammars
        </div>
      </footer>
    </div>
  );
}
