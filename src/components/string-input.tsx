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
    <Card>
      <CardContent className="p-3">
        <label className="text-sm font-medium mb-2 block">
          Input String
        </label>
        <div className="flex gap-2">
          <input
            type="text"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") onDerive();
            }}
            placeholder="Enter a string to derive…"
            className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          />
          <Button onClick={onDerive} size="default">
            Derive
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
