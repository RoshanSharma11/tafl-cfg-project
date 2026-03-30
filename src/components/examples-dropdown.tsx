"use client";

import type { GrammarExample } from "@/types/grammar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface ExamplesDropdownProps {
  examples: GrammarExample[];
  onSelect: (index: number) => void;
}

export function ExamplesDropdown({ examples, onSelect }: ExamplesDropdownProps) {
  return (
    <Select onValueChange={(val) => onSelect(Number(val))}>
      <SelectTrigger className="w-[220px]">
        <SelectValue placeholder="Load example…" />
      </SelectTrigger>
      <SelectContent>
        {examples.map((ex, i) => (
          <SelectItem key={i} value={String(i)}>
            <div>
              <div className="font-medium">{ex.name}</div>
              <div className="text-xs text-muted-foreground">
                {ex.description}
              </div>
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
