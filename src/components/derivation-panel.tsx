"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { DerivationStep } from "@/types/grammar";
import { formatSententialForm, formatProduction } from "@/lib/grammar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

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
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    setCurrentStep(0);
    setIsPlaying(false);
  }, [steps]);

  const stopPlayback = useCallback(() => {
    setIsPlaying(false);
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const startPlayback = useCallback(() => {
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
      }, 800);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isPlaying, steps.length, stopPlayback]);

  if (steps.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">No derivation available</p>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setCurrentStep(0)}
          disabled={currentStep === 0}
        >
          ⏮
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setCurrentStep((p) => Math.max(0, p - 1))}
          disabled={currentStep === 0}
        >
          ◀
        </Button>
        {isPlaying ? (
          <Button variant="outline" size="sm" onClick={stopPlayback}>
            ⏸
          </Button>
        ) : (
          <Button variant="outline" size="sm" onClick={startPlayback}>
            ▶
          </Button>
        )}
        <Button
          variant="outline"
          size="sm"
          onClick={() =>
            setCurrentStep((p) => Math.min(steps.length - 1, p + 1))
          }
          disabled={currentStep === steps.length - 1}
        >
          ▶|
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setCurrentStep(steps.length - 1)}
          disabled={currentStep === steps.length - 1}
        >
          ⏭
        </Button>
        <span className="text-xs text-muted-foreground ml-2">
          Step {currentStep + 1} of {steps.length}
        </span>
      </div>

      <div className="space-y-1 max-h-64 overflow-y-auto pr-1">
        <AnimatePresence mode="popLayout">
          {steps.slice(0, currentStep + 1).map((step, i) => (
            <motion.div
              key={`${label}-${i}`}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.25 }}
              className={`flex items-start gap-2 text-sm rounded-md px-2 py-1.5 ${
                i === currentStep
                  ? "bg-primary/10 border border-primary/20"
                  : "hover:bg-muted/50"
              }`}
            >
              <Badge
                variant="secondary"
                className="shrink-0 mt-0.5 font-mono text-xs"
              >
                {i}
              </Badge>
              <div className="flex-1 min-w-0">
                <div className="font-mono text-sm break-all">
                  <SententialFormDisplay
                    step={step}
                    isActive={i === currentStep}
                  />
                </div>
                {step.productionUsed && (
                  <div className="text-xs text-muted-foreground mt-0.5">
                    Apply: {formatProduction(step.productionUsed)}
                  </div>
                )}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      <div className="border-t pt-2 mt-2">
        <p className="text-xs text-muted-foreground mb-1">
          {label} Derivation ({steps.length - 1} steps):
        </p>
        <p className="font-mono text-xs break-all">
          {steps.map((s, i) => (
            <span key={i}>
              {i > 0 && <span className="text-muted-foreground"> ⇒ </span>}
              {formatSententialForm(s.sententialForm)}
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
            className={`${
              isExpanded
                ? "bg-yellow-200 dark:bg-yellow-800 px-0.5 rounded font-bold"
                : isNT
                ? "text-blue-600 dark:text-blue-400"
                : "text-green-700 dark:text-green-400"
            }`}
          >
            {j > 0 && " "}
            {sym.value}
          </span>
        );
      })}
    </span>
  );
}
