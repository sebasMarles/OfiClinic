// components/config-crud/editor/KeysList.tsx
"use client";

import type { KeyItem } from "./types";

type Props = {
  keys: KeyItem[];
  selectedKey: string;
  onSelect: (key: string) => void;
};

export default function KeysList({ keys, selectedKey, onSelect }: Props) {
  return (
    <div className="md:col-span-2 border rounded p-3">
      <div className="font-medium mb-2">Key</div>
      <ul className="space-y-1">
        {keys.map((k, i) => (
          <li key={`${k.key}::${k.baseType}::${i}`}>
            <button
              className={`w-full text-left px-2 py-1 rounded ${
                selectedKey === k.key
                  ? "bg-neutral-200 dark:bg-neutral-800"
                  : ""
              }`}
              onClick={() => onSelect(k.key)}
            >
              {k.key} <span className="text-xs opacity-70">({k.baseType})</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
