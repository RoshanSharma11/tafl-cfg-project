"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { DerivationStep } from "@/types/grammar";
import { formatSententialForm, formatProduction } from "@/lib/grammar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

// Speed options in ms per step
const SPEED_OPTIONS = [
  { label: "0.5×", ms: 1600 },
  { label: "1×",   ms: 800 },
  { label: "2×",   ms: 400 },
  { label: "4×",   ms: 200 },
];

interface DerivationPanelProps {
  leftDerivation: DerivationStep[];
  rightDerivation: DerivationStep[];
}

export function DerivationPanel({
  leftDerivation,
  rightDerivation,
}: DerivationPanelProps) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Step-by-Step Derivation</CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="leftmost">
          <TabsList className="mb-3">
            <TabsTrigger value="leftmost">Leftmost</TabsTrigger>
            <TabsTrigger value="rightmost">Rightmost</TabsTrigger>
          </TabsList>
          <TabsContent value="leftmost">
            <DerivationSteps steps={leftDerivation} label="Leftmost" />
          </TabsContent>
          <TabsContent value="rightmost">
            <DerivationSteps steps={rightDerivation} label="Rightmost" />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

function DerivationSteps({
  steps,
  label,
}: {
  steps: DerivationStep[];
  label: string;
}) {
  const [currentStep, setCurrentStep] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [speedIdx, setSpeedIdx] = useState(1); // default 1× = 800ms
  const [showAll, setShowAll] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setCurrentStep(0);
    setIsPlaying(false);
    setShowAll(false);
  }, [steps]);

  // Auto-scroll the step list to keep the current step visible
  useEffect(() => {
    if (!listRef.current) return;
    const active = listRef.current.querySelector("[data-active='true']");
    active?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [currentStep]);

  const stopPlayback = useCallback(() => {
    setIsPlaying(false);
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const startPlayback = useCallback(() => {
    setShowAll(false);
    setIsPlaying(true);
    setCurrentStep(0);
  }, []);

  useEffect(() => {
    if (isPlaying) {
      intervalRef.current = setInterval(() => {
        setCurrentStep((prev) => {
          if (prev >= steps.length - 1) {
            stopPlayback();
            return steps.length - 1;
          }
          return prev + 1;
        });
      }, SPEED_OPTIONS[speedIdx].ms);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isPlaying, steps.length, stopPlayback, speedIdx]);

  if (steps.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">No derivation available</p>
    );
  }

  const visibleSteps = showAll ? steps : steps.slice(0, currentStep + 1);

  return (
    <div className="space-y-3">
      {/* Controls row */}
      <div className="flex items-center gap-1.5 flex-wrap">
        <Button
          variant="outline" size="sm"
          onClick={() => { stopPlayback(); setCurrentStep(0); }}
          disabled={currentStep === 0 && !isPlaying}
          title="Go to start"
        >⏮</Button>
        <Button
          variant="outline" size="sm"
          onClick={() => { stopPlayback(); setCurrentStep((p) => Math.max(0, p - 1)); }}
          disabled={currentStep === 0}
          title="Previous step"
        >◀</Button>
        {isPlaying ? (
          <Button variant="outline" size="sm" onClick={stopPlayback} title="Pause">⏸</Button>
        ) : (
          <Button variant="default" size="sm" onClick={startPlayback} title="Play from start" className="gap-1">
            ▶ Play
          </Button>
        )}
        <Button
          variant="outline" size="sm"
          onClick={() => { stopPlayback(); setCurrentStep((p) => Math.min(steps.length - 1, p + 1)); }}
          disabled={currentStep === steps.length - 1}
          title="Next step"
        >▶</Button>
        <Button
          variant="outline" size="sm"
          onClick={() => { stopPlayback(); setCurrentStep(steps.length - 1); }}
          disabled={currentStep === steps.length - 1}
          title="Go to end"
        >⏭</Button>

        {/* Speed toggle */}
        <div className="flex items-center gap-0.5 ml-1 border rounded-md overflow-hidden">
          {SPEED_OPTIONS.map((opt, i) => (
            <button
              key={i}
              onClick={() => setSpeedIdx(i)}
              className={`px-2 py-1 text-[11px] font-mono transition-colors ${
                speedIdx === i
                  ? "bg-primary text-primary-foreground"
                  : "hover:bg-muted text-muted-foreground"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        <span className="text-xs text-muted-foreground ml-auto">
          {showAll ? "All" : currentStep + 1} / {steps.length}
        </span>
      </div>

      {/* Show All toggle */}
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground">
          {showAll
            ? `Showing all ${steps.length} steps`
            : `Step ${currentStep + 1} of ${steps.length}`}
        </span>
        <button
          onClick={() => { setShowAll((v) => !v); stopPlayback(); if (!showAll) setCurrentStep(steps.length - 1); }}
          className="text-xs text-primary underline-offset-2 hover:underline"
        >
          {showAll ? "Back to step-by-step" : "Show all steps"}
        </button>
      </div>

      <div ref={listRef} className="space-y-1 max-h-72 overflow-y-auto pr-1">
        <AnimatePresence mode="popLayout">
          {visibleSteps.map((step, i) => (
            <motion.div
              key={`${label}-${i}`}
              data-active={i === currentStep && !showAll}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.2 }}
              className={`flex items-start gap-2 text-sm rounded px-2 py-1.5 cursor-pointer transition-colors ${
                i === currentStep && !showAll
                  ? "bg-blue-50 border border-blue-200"
                  : "hover:bg-gray-50"
              }`}
              onClick={() => { stopPlayback(); setShowAll(false); setCurrentStep(i); }}
            >
              <Badge
                variant={i === currentStep && !showAll ? "default" : "secondary"}
                className="shrink-0 mt-0.5 font-mono text-xs"
              >
                {i}
              </Badge>
              <div className="flex-1 min-w-0">
                <div className="font-mono text-sm break-all">
                  <SententialFormDisplay
                    step={step}
                    isActive={i === currentStep && !showAll}
                  />
                </div>
                {step.productionUsed && (
                  <div className="text-[11px] text-gray-400 mt-0.5 font-mono">
                    <span className="text-blue-600">apply:</span>{" "}
                    {formatProduction(step.productionUsed)}
                  </div>
                )}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Compact full derivation string */}
      <div className="border-t pt-2 mt-1">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">
          {label} Derivation ({steps.length - 1} step{steps.length - 1 !== 1 ? "s" : ""}):
        </p>
        <p className="font-mono text-[11px] break-all leading-relaxed text-gray-400">
          {steps.map((s, i) => (
            <span key={i}>
              {i > 0 && <span className="text-blue-400 font-bold"> ⇒ </span>}
              <span className={i === steps.length - 1 ? "text-green-700 font-semibold" : ""}>
                {formatSententialForm(s.sententialForm)}
              </span>
            </span>
          ))}
        </p>
      </div>
    </div>
  );
}

function SententialFormDisplay({
  step,
  isActive,
}: {
  step: DerivationStep;
  isActive: boolean;
}) {
  return (
    <span>
      {step.sententialForm.map((sym, j) => {
        const isExpanded = isActive && j === step.expandedPosition;
        const isNT = sym.type === "nonterminal";

        return (
          <span
            key={j}
            className={
              isExpanded
                ? "bg-yellow-100 px-0.5 rounded font-bold text-yellow-900 ring-1 ring-yellow-200"
                : isNT
                ? "text-blue-600 font-semibold"
                : "text-green-700"
            }
          >
            {j > 0 && " "}
            {sym.value}
          </span>
        );
      })}
    </span>
  );
}

