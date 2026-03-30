"use client";

import { useMemo, useCallback, useRef } from "react";
import Tree from "react-d3-tree";
import type { RawNodeDatum } from "react-d3-tree";
import type { ParseTreeNode } from "@/types/grammar";
import { toTreeDatum } from "@/lib/tree-converter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface ParseTreePanelProps {
  tree: ParseTreeNode;
}

export function ParseTreePanel({ tree }: ParseTreePanelProps) {
  const treeData = useMemo(() => toTreeDatum(tree) as RawNodeDatum, [tree]);
  const treeRef = useRef<HTMLDivElement>(null);

  const handleDownloadSVG = useCallback(() => {
    if (!treeRef.current) return;
    const svg = treeRef.current.querySelector("svg");
    if (!svg) return;

    const clone = svg.cloneNode(true) as SVGElement;
    clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");

    const serializer = new XMLSerializer();
    const source = serializer.serializeToString(clone);
    const blob = new Blob([source], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = url;
    link.download = "parse-tree.svg";
    link.click();
    URL.revokeObjectURL(url);
  }, []);

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">Parse Tree</CardTitle>
          <Button variant="outline" size="sm" onClick={handleDownloadSVG}>
            Export SVG
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          Drag to pan, scroll to zoom.{" "}
          <span className="text-blue-600 dark:text-blue-400">■</span>{" "}
          Non-terminals &nbsp;
          <span className="text-green-600 dark:text-green-400">■</span>{" "}
          Terminals &nbsp;
          <span className="text-gray-400">■</span> Epsilon (ε)
        </p>
      </CardHeader>
      <CardContent className="p-0">
        <div
          ref={treeRef}
          className="w-full border-t bg-white dark:bg-gray-950"
          style={{ height: "420px" }}
        >
          <Tree
            data={treeData}
            orientation="vertical"
            pathFunc="step"
            translate={{ x: 300, y: 40 }}
            separation={{ siblings: 1.5, nonSiblings: 2 }}
            nodeSize={{ x: 100, y: 80 }}
            renderCustomNodeElement={(rd3tProps) => (
              <CustomNode {...rd3tProps} />
            )}
            zoomable
            draggable
            collapsible={false}
          />
        </div>
      </CardContent>
    </Card>
  );
}

interface CustomNodeProps {
  nodeDatum: RawNodeDatum;
  toggleNode: () => void;
}

function CustomNode({ nodeDatum }: CustomNodeProps) {
  const nodeType = nodeDatum.attributes?.type as string | undefined;
  const isTerminal = nodeType === "terminal";
  const isEpsilon = nodeType === "epsilon";
  const isNonTerminal = nodeType === "nonterminal";

  const fillColor = isEpsilon
    ? "#d1d5db"
    : isTerminal
    ? "#22c55e"
    : "#3b82f6";
  const textColor = isEpsilon
    ? "#6b7280"
    : isTerminal
    ? "#15803d"
    : "#1d4ed8";
  const strokeColor = isEpsilon
    ? "#9ca3af"
    : isTerminal
    ? "#16a34a"
    : "#2563eb";

  const name = String(nodeDatum.name);

  if (isNonTerminal) {
    return (
      <g>
        <circle
          r={20}
          fill={fillColor}
          fillOpacity={0.15}
          stroke={strokeColor}
          strokeWidth={2}
        />
        <text
          fill={textColor}
          fontSize={14}
          fontWeight="bold"
          fontFamily="monospace"
          textAnchor="middle"
          dominantBaseline="central"
        >
          {name}
        </text>
      </g>
    );
  }

  const textWidth = Math.max(name.length * 9, 24);
  const rectW = textWidth + 16;
  const rectH = 28;

  return (
    <g>
      <rect
        x={-rectW / 2}
        y={-rectH / 2}
        width={rectW}
        height={rectH}
        rx={6}
        ry={6}
        fill={fillColor}
        fillOpacity={isEpsilon ? 0.1 : 0.15}
        stroke={strokeColor}
        strokeWidth={2}
        strokeDasharray={isEpsilon ? "4 2" : undefined}
      />
      <text
        fill={textColor}
        fontSize={13}
        fontWeight={isEpsilon ? "normal" : "600"}
        fontFamily="monospace"
        fontStyle={isEpsilon ? "italic" : undefined}
        textAnchor="middle"
        dominantBaseline="central"
      >
        {name}
      </text>
    </g>
  );
}
