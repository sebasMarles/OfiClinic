// src/components/generic-table/table-toolbar.tsx
"use client";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import type { BulkAction, ColumnConfig } from "@/types/table-config";
import { Columns3, Download, Plus, Search, Upload } from "lucide-react";
import { useRef } from "react";

interface TableToolbarProps {
  searchValue: string;
  onSearchChange: (value: string) => void;
  searchPlaceholder?: string;
  columns: ColumnConfig[];
  visibleColumns: Set<string>;
  onColumnVisibilityChange: (columnKey: string) => void;
  selectedCount: number;
  bulkActions?: BulkAction[];
  onBulkAction: (actionId: string) => void;
  onAdd?: () => void;
  enableExport?: boolean;
  onExport?: () => void;
  // NUEVOS:
  inputId?: string; // para atajos: focus con '/'
  enableImport?: boolean;
  onImport?: (rows: Record<string, any>[]) => void;
}

export function TableToolbar({
  searchValue,
  onSearchChange,
  searchPlaceholder = "Search...",
  columns,
  visibleColumns,
  onColumnVisibilityChange,
  selectedCount,
  bulkActions = [],
  onBulkAction,
  onAdd,
  enableExport,
  onExport,
  inputId,
  enableImport,
  onImport,
}: TableToolbarProps) {
  const fileRef = useRef<HTMLInputElement | null>(null);
  const hideableColumns = columns.filter((col) => col.hideable);

  const parseCSV = async (file: File) => {
    const text = await file.text();
    const lines = text.split(/\r?\n/).filter(Boolean);
    if (lines.length === 0) return [];
    const headers = lines[0]
      .split(",")
      .map((h) => h.replace(/^"|"$/g, "").trim());
    const rows: Record<string, any>[] = [];
    for (let i = 1; i < lines.length; i++) {
      const cols =
        lines[i].match(/("([^"]|"")*"|[^,]*)/g)?.filter(Boolean) ?? [];
      const row: Record<string, any> = {};
      headers.forEach((h, idx) => {
        const raw = (cols[idx] ?? "").trim();
        const val = raw.replace(/^"|"$/g, "").replace(/""/g, '"');
        row[h] = val;
      });
      rows.push(row);
    }
    return rows;
  };

  return (
    <div className="flex items-center justify-between gap-4 py-4">
      <div className="flex flex-1 items-center gap-2">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            id={inputId}
            placeholder={searchPlaceholder}
            value={searchValue}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-9"
          />
        </div>

        {selectedCount > 0 && bulkActions.length > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">
              {selectedCount} selected
            </span>
            {bulkActions.map((action) => (
              <Button
                key={action.id}
                variant={action.variant || "outline"}
                size="sm"
                onClick={() => onBulkAction(action.id)}
              >
                {action.label}
              </Button>
            ))}
          </div>
        )}
      </div>

      <div className="flex items-center gap-2">
        {enableImport && onImport && (
          <>
            <input
              ref={fileRef}
              type="file"
              accept=".csv"
              className="hidden"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                const rows = await parseCSV(file);
                onImport(rows);
                e.currentTarget.value = "";
              }}
            />
            <Button
              variant="outline"
              size="sm"
              onClick={() => fileRef.current?.click()}
            >
              <Upload className="mr-2 h-4 w-4" />
              Import
            </Button>
          </>
        )}

        {enableExport && onExport && (
          <Button variant="outline" size="sm" onClick={onExport}>
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
        )}

        {hideableColumns.length > 0 && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <Columns3 className="mr-2 h-4 w-4" />
                Columns
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuLabel>Toggle columns</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {hideableColumns.map((column) => (
                <DropdownMenuCheckboxItem
                  key={column.key}
                  checked={visibleColumns.has(column.key)}
                  onCheckedChange={() => onColumnVisibilityChange(column.key)}
                >
                  {column.title}
                </DropdownMenuCheckboxItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        )}

        {onAdd && (
          <Button size="sm" onClick={onAdd}>
            <Plus className="mr-2 h-4 w-4" />
            Add New
          </Button>
        )}
      </div>
    </div>
  );
}
