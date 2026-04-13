"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

interface StringInputProps {
  value: string;
  onChange: (value: string) => void;
  onDerive: () => void;
}

export function StringInput({ value, onChange, onDerive }: StringInputProps) {
  return (
    <Card className="rounded-md border-gray-200">
      <CardContent className="p-3">
        <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 block">
          Input String
        </label>
        <div className="flex gap-2">
          <input
            type="text"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") onDerive(); }}
            placeholder="e.g. id + id * id"
            className="flex-1 rounded border border-gray-300 bg-white px-3 py-2 text-sm font-mono placeholder:text-gray-300 placeholder:font-sans focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
          <Button onClick={onDerive} className="shrink-0 bg-blue-600 hover:bg-blue-700 text-white font-semibold px-5">
            Derive
          </Button>
        </div>
        <p className="text-[11px] text-gray-400 mt-1.5">
          Separate multi-char terminals with spaces · <kbd className="border rounded px-1 text-[10px] font-mono">Enter</kbd> to derive · Leave empty for ε
        </p>
      </CardContent>
    </Card>
  );
}


