"use client";

import CodeMirror from "@uiw/react-codemirror";
import { Card, CardContent } from "@/components/ui/card";

interface GrammarEditorProps {
  value: string;
  onChange: (value: string) => void;
}

export function GrammarEditor({ value, onChange }: GrammarEditorProps) {
  return (
    <Card className="overflow-hidden rounded-md border-gray-200">
      <CardContent className="p-0">
        <div className="px-3 py-2 bg-gray-50 border-b border-gray-200 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-gray-500">
          <span>
            Format:{" "}
            <code className="bg-white border border-gray-200 px-1 rounded font-mono">A → α | β</code>
          </span>
          <span>
            <code className="font-mono text-blue-700">UPPERCASE</code> = non-terminal
          </span>
          <span>
            <code className="font-mono text-green-700">lowercase / symbols</code> = terminal
          </span>
          <span>
            <code className="font-mono italic text-gray-500">ε</code> or <code className="font-mono text-gray-500">eps</code> = epsilon
          </span>
        </div>
        <CodeMirror
          value={value}
          height="190px"
          onChange={onChange}
          className="text-sm"
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


