"use client";

import CodeMirror from "@uiw/react-codemirror";
import { Card, CardContent } from "@/components/ui/card";

interface GrammarEditorProps {
  value: string;
  onChange: (value: string) => void;
}

export function GrammarEditor({ value, onChange }: GrammarEditorProps) {
  return (
    <Card>
      <CardContent className="p-0">
        <div className="text-xs text-muted-foreground px-3 pt-3 pb-1 flex items-center gap-3 flex-wrap">
          <span>Format: <code className="bg-muted px-1 rounded">{"A → α | β"}</code></span>
          <span>Use <code className="bg-muted px-1 rounded">{"->"}</code> or <code className="bg-muted px-1 rounded">{"→"}</code></span>
          <span>Uppercase = non-terminal</span>
          <span><code className="bg-muted px-1 rounded">{"ε"}</code> = epsilon</span>
        </div>
        <CodeMirror
          value={value}
          height="200px"
          onChange={onChange}
          className="border-t text-sm"
          basicSetup={{
            lineNumbers: true,
            foldGutter: false,
            highlightActiveLine: true,
            autocompletion: false,
          }}
          placeholder={`E -> E + T | T\nT -> T * F | F\nF -> ( E ) | id`}
        />
      </CardContent>
    </Card>
  );
}
