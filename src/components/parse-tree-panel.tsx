"use client";

import { useMemo, useRef, useState, useCallback, useEffect } from "react";
import type { ParseTreeNode } from "@/types/grammar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

// ── Layout constants ─────────────────────────────────────────────────────────
const V_GAP = 90;      // vertical distance between level centers (px)
const NT_R = 22;       // non-terminal circle radius (px)
const T_PX = 13;       // terminal rect horizontal padding (px)
const T_PY = 8;        // terminal rect vertical padding (px)
const FONT_SIZE = 13;  // label font size (px)
const H_GAP = 30;      // extra horizontal gap between adjacent leaf edges (px)
const PAD = 56;        // canvas padding (px)

type NodeType = "nonterminal" | "terminal" | "epsilon";

interface LayoutNode {
  node: ParseTreeNode;
  x: number;      // in slot units
  depth: number;
  children: LayoutNode[];
  type: NodeType;
  label: string;
  w: number;      // visual width in px
  h: number;      // visual height in px
}

/** Build a tree layout using the leaf-slot centering algorithm. */
function buildLayout(root: ParseTreeNode): LayoutNode {
  let leafIdx = 0;

  function layout(node: ParseTreeNode, depth: number): LayoutNode {
    const isT = node.symbol.type === "terminal";
    const isE = isT && node.symbol.value === "ε";
    const type: NodeType = isE ? "epsilon" : isT ? "terminal" : "nonterminal";
    const label = node.symbol.value;
    const w =
      type === "nonterminal"
        ? NT_R * 2
        : Math.max(label.length * 8.5 + T_PX * 2, 32);
    const h = type === "nonterminal" ? NT_R * 2 : FONT_SIZE + T_PY * 2;

    const children = node.children.map((c) => layout(c, depth + 1));

    let x: number;
    if (children.length === 0) {
      x = leafIdx++;
    } else {
      x = (children[0].x + children[children.length - 1].x) / 2;
    }
    return { node, x, depth, children, type, label, w, h };
  }

  return layout(root, 0);
}

function maxLeafWidth(node: LayoutNode): number {
  if (node.children.length === 0) return node.w;
  return Math.max(...node.children.map(maxLeafWidth));
}

function allNodes(root: LayoutNode): LayoutNode[] {
  const out: LayoutNode[] = [];
  const visit = (n: LayoutNode) => {
    out.push(n);
    n.children.forEach(visit);
  };
  visit(root);
  return out;
}

function allEdges(root: LayoutNode): Array<{ p: LayoutNode; c: LayoutNode }> {
  const out: Array<{ p: LayoutNode; c: LayoutNode }> = [];
  const visit = (n: LayoutNode) => {
    n.children.forEach((c) => {
      out.push({ p: n, c });
      visit(c);
    });
  };
  visit(root);
  return out;
}

interface ParseTreePanelProps {
  tree: ParseTreeNode;
}

export function ParseTreePanel({ tree }: ParseTreePanelProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [vb, setVb] = useState({ x: 0, y: 0, w: 800, h: 500 });
  const [panning, setPanning] = useState(false);
  const panData = useRef<{
    mx: number; my: number;
    vx: number; vy: number;
    sx: number; sy: number;
  } | null>(null);

  // Build layout from the parse tree
  const root = useMemo(() => buildLayout(tree), [tree]);

  // Compute pixel positions and SVG dimensions
  const { nodes, edges, svgW, svgH, toX, toY } = useMemo(() => {
    const nodes = allNodes(root);
    const edges = allEdges(root);
    const allX = nodes.map((n) => n.x);
    const minX = Math.min(...allX);
    const maxX = Math.max(...allX);
    const maxDepth = Math.max(...nodes.map((n) => n.depth));
    const slotW = Math.max(maxLeafWidth(root) + H_GAP, 68);

    const svgW = Math.max((maxX - minX) * slotW + PAD * 2, PAD * 4);
    const svgH = maxDepth * V_GAP + PAD * 2;
    const toX = (x: number) => (x - minX) * slotW + PAD;
    const toY = (d: number) => d * V_GAP + PAD;

    return { nodes, edges, svgW, svgH, toX, toY };
  }, [root]);

  // Reset viewBox whenever tree changes
  useEffect(() => {
    setVb({ x: 0, y: 0, w: svgW, h: svgH });
  }, [svgW, svgH]);

  // Attach non-passive wheel listener to enable e.preventDefault()
  useEffect(() => {
    const el = svgRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const rect = el.getBoundingClientRect();
      setVb((prev) => {
        const mx = prev.x + ((e.clientX - rect.left) / rect.width) * prev.w;
        const my = prev.y + ((e.clientY - rect.top) / rect.height) * prev.h;
        const factor = e.deltaY > 0 ? 1.12 : 1 / 1.12;
        const nw = prev.w * factor;
        const nh = prev.h * factor;
        return {
          x: mx - ((e.clientX - rect.left) / rect.width) * nw,
          y: my - ((e.clientY - rect.top) / rect.height) * nh,
          w: nw,
          h: nh,
        };
      });
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, []);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (e.button !== 0) return;
      const rect = svgRef.current?.getBoundingClientRect();
      if (!rect) return;
      setPanning(true);
      panData.current = {
        mx: e.clientX, my: e.clientY,
        vx: vb.x, vy: vb.y,
        sx: vb.w / rect.width,
        sy: vb.h / rect.height,
      };
    },
    [vb]
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!panning || !panData.current) return;
      const dx = e.clientX - panData.current.mx;
      const dy = e.clientY - panData.current.my;
      setVb((prev) => ({
        ...prev,
        x: panData.current!.vx - dx * panData.current!.sx,
        y: panData.current!.vy - dy * panData.current!.sy,
      }));
    },
    [panning]
  );

  const handleMouseUp = useCallback(() => {
    setPanning(false);
    panData.current = null;
  }, []);

  const handleFit = useCallback(() => {
    setVb({ x: 0, y: 0, w: svgW, h: svgH });
  }, [svgW, svgH]);

  const handleExport = useCallback(() => {
    if (!svgRef.current) return;
    const clone = svgRef.current.cloneNode(true) as SVGElement;
    clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
    clone.setAttribute("width", String(svgW));
    clone.setAttribute("height", String(svgH));
    clone.setAttribute("viewBox", `0 0 ${svgW} ${svgH}`);
    // Prepend white background for the exported file
    const bg = document.createElementNS("http://www.w3.org/2000/svg", "rect");
    bg.setAttribute("x", "0");
    bg.setAttribute("y", "0");
    bg.setAttribute("width", String(svgW));
    bg.setAttribute("height", String(svgH));
    bg.setAttribute("fill", "white");
    clone.insertBefore(bg, clone.firstChild);
    const blob = new Blob([new XMLSerializer().serializeToString(clone)], {
      type: "image/svg+xml",
    });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "parse-tree.svg";
    a.click();
    URL.revokeObjectURL(a.href);
  }, [svgW, svgH]);

  return (
    <Card className="overflow-hidden rounded-md border-gray-200">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-semibold text-gray-700">Parse Tree</CardTitle>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleFit} className="text-xs">
              Fit
            </Button>
            <Button variant="outline" size="sm" onClick={handleExport} className="text-xs">
              Export SVG
            </Button>
          </div>
        </div>
        <div className="flex items-center gap-4 text-xs text-gray-400 flex-wrap">
          <span className="flex items-center gap-1.5">
            <span className="inline-block w-3 h-3 rounded-full bg-blue-500" />
            Non-terminal
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block w-3 h-3 rounded bg-green-500" />
            Terminal
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block w-3 h-3 rounded border border-dashed border-gray-400" />
            ε (epsilon)
          </span>
          <span className="ml-auto">Drag to pan · Scroll to zoom</span>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div
          className="w-full border-t border-gray-200"
          style={{
            height: "480px",
            background: "#fafafa",
            cursor: panning ? "grabbing" : "grab",
          }}
        >
          <svg
            ref={svgRef}
            width="100%"
            height="100%"
            viewBox={`${vb.x} ${vb.y} ${vb.w} ${vb.h}`}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            style={{ userSelect: "none", display: "block" }}
          >
            <defs>
              <filter id="pt-shadow" x="-40%" y="-40%" width="180%" height="180%">
                <feDropShadow dx="0" dy="1" stdDeviation="2" floodColor="#1d4ed8" floodOpacity="0.15" />
              </filter>
              <filter id="pt-shadow-t" x="-40%" y="-40%" width="180%" height="180%">
                <feDropShadow dx="0" dy="1" stdDeviation="2" floodColor="#15803d" floodOpacity="0.15" />
              </filter>
            </defs>

            {/* Edges — smooth cubic bezier curves */}
            {edges.map(({ p, c }, i) => {
              const px = toX(p.x);
              const py = toY(p.depth) + (p.type === "nonterminal" ? NT_R : p.h / 2);
              const cx = toX(c.x);
              const cy = toY(c.depth) - (c.type === "nonterminal" ? NT_R : c.h / 2);
              const midY = (py + cy) / 2;
              return (
                <path
                  key={i}
                  d={`M ${px} ${py} C ${px} ${midY}, ${cx} ${midY}, ${cx} ${cy}`}
                  fill="none"
                  stroke="#d1d5db"
                  strokeWidth={1.5}
                  strokeLinecap="round"
                />
              );
            })}

            {/* Nodes */}
            {nodes.map((n, i) => {
              const nx = toX(n.x);
              const ny = toY(n.depth);

              if (n.type === "nonterminal") {
                return (
                  <g key={i} filter="url(#pt-shadow)">
                    <circle cx={nx} cy={ny} r={NT_R} fill="#2563eb" />
                    <text
                      x={nx} y={ny}
                      textAnchor="middle"
                      dominantBaseline="central"
                      fill="white"
                      fontSize={FONT_SIZE}
                      fontWeight="700"
                      fontFamily="monospace"
                    >
                      {n.label}
                    </text>
                  </g>
                );
              }

              const tw = Math.max(n.label.length * 8.5 + T_PX * 2, 32);
              const th = FONT_SIZE + T_PY * 2;

              if (n.type === "epsilon") {
                return (
                  <g key={i}>
                    <rect
                      x={nx - tw / 2} y={ny - th / 2}
                      width={tw} height={th}
                      rx={6}
                      fill="#f8fafc"
                      stroke="#94a3b8"
                      strokeWidth={1.5}
                      strokeDasharray="5 2.5"
                    />
                    <text
                      x={nx} y={ny}
                      textAnchor="middle"
                      dominantBaseline="central"
                      fill="#64748b"
                      fontSize={FONT_SIZE}
                      fontStyle="italic"
                      fontFamily="monospace"
                    >
                      {n.label}
                    </text>
                  </g>
                );
              }

              // Terminal node
              return (
                <g key={i} filter="url(#pt-shadow-t)">
                  <rect
                    x={nx - tw / 2} y={ny - th / 2}
                    width={tw} height={th}
                    rx={7}
                    fill="#16a34a"
                  />
                  <text
                    x={nx} y={ny}
                    textAnchor="middle"
                    dominantBaseline="central"
                    fill="white"
                    fontSize={FONT_SIZE}
                    fontWeight="700"
                    fontFamily="monospace"
                  >
                    {n.label}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>
      </CardContent>
    </Card>
  );
}
