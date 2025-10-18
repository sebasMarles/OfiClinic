// src/components/generic-table/generic-table.tsx
"use client";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import type { RowAction, TableConfig } from "@/types/table-config";
import { ArrowUpDown, Eye, MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { CellRenderer } from "./cell-renderer";
import { TablePagination } from "./table-pagination";
import { TableToolbar } from "./table-toolbar";

interface GenericTableProps {
  config: TableConfig;
  data: any[];
  isLoading: boolean;
  onRowAction: (action: string, row: any) => void;
  onAdd: () => void;
  onPageChange: (page: number) => void;
  onSortChange: (column: string, direction: "asc" | "desc") => void;
  onSearchChange?: (value: string) => void;
  searchValue?: string;
  onBulkAction?: (actionId: string, selectedRows: any[]) => void;
  // NUEVOS:
  searchInputId?: string;
  enableImport?: boolean;
  onImport?: (rows: Record<string, any>[]) => void;
}

export function GenericTable({
  config,
  data,
  onRowAction,
  onBulkAction,
  onAdd,
  isLoading = false,
  onSearchChange,
  searchValue = "",
  onPageChange,
  onSortChange,
  searchInputId,
  enableImport,
  onImport,
}: GenericTableProps) {
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());
  const [visibleColumns, setVisibleColumns] = useState<Set<string>>(new Set());

  // Inicializa columnas visibles coherentes
  useEffect(() => {
    setVisibleColumns(
      new Set(
        config.columns
          .filter((col) => !col.hidden && col.render !== "form")
          .map((col) => col.key)
      )
    );
  }, [config.columns]);

  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(config.pageSize || 10);

  // Filtrar datos según searchValue controlado
  const filteredData = useMemo(() => {
    if (!searchValue) return data;

    return data.filter((row) => {
      return config.columns.some((col) => {
        if (!col.filterable) return false;
        const value = row[col.key];
        return String(value ?? "")
          .toLowerCase()
          .includes(searchValue.toLowerCase());
      });
    });
  }, [data, searchValue, config.columns]);

  // Ordenar datos
  const sortedData = useMemo(() => {
    if (!sortColumn) return filteredData;

    return [...filteredData].sort((a, b) => {
      const aValue = a[sortColumn];
      const bValue = b[sortColumn];

      if (aValue === bValue) return 0;

      const comparison = aValue > bValue ? 1 : -1;
      return sortDirection === "asc" ? comparison : -comparison;
    });
  }, [filteredData, sortColumn, sortDirection]);

  // Paginación
  const paginatedData = useMemo(() => {
    if (!config.enablePagination) return sortedData;

    const startIndex = (currentPage - 1) * pageSize;
    return sortedData.slice(startIndex, startIndex + pageSize);
  }, [sortedData, currentPage, pageSize, config.enablePagination]);

  const totalPages = Math.ceil(sortedData.length / pageSize) || 1;

  // Manejar ordenamiento
  const handleSort = (columnKey: string) => {
    if (sortColumn === columnKey) {
      const newDirection = sortDirection === "asc" ? "desc" : "asc";
      setSortDirection(newDirection);
      onSortChange(columnKey, newDirection);
    } else {
      setSortColumn(columnKey);
      setSortDirection("asc");
      onSortChange(columnKey, "asc");
    }
  };

  // Selección de filas
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedRows(new Set(paginatedData.map((row) => row.id)));
    } else {
      setSelectedRows(new Set());
    }
  };

  const handleSelectRow = (rowId: string, checked: boolean) => {
    const newSelected = new Set(selectedRows);
    if (checked) {
      newSelected.add(rowId);
    } else {
      newSelected.delete(rowId);
    }
    setSelectedRows(newSelected);
  };

  // Visibilidad columnas
  const handleColumnVisibilityChange = (columnKey: string) => {
    const newVisible = new Set(visibleColumns);
    if (newVisible.has(columnKey)) {
      newVisible.delete(columnKey);
    } else {
      newVisible.add(columnKey);
    }
    setVisibleColumns(newVisible);
  };

  // Acciones masivas
  const handleBulkAction = (actionId: string) => {
    const selectedData = data.filter((row) => selectedRows.has(row.id));

    if (actionId === "delete") {
      const action = config.bulkActions?.find((a) => a.id === actionId);
      if (action?.confirmMessage) {
        if (confirm(action.confirmMessage)) {
          onBulkAction?.(actionId, selectedData);
          setSelectedRows(new Set());
        }
      }
    } else {
      onBulkAction?.(actionId, selectedData);
    }
  };

  // Acciones en fila
  const handleRowAction = (action: RowAction, row: any) => {
    if (action.confirmMessage) {
      if (confirm(action.confirmMessage)) {
        onRowAction?.(action.action, row);
      }
    } else {
      onRowAction?.(action.action, row);
    }
  };

  // Exportar CSV
  const handleExport = () => {
    const selectedData =
      selectedRows.size > 0
        ? data.filter((row) => selectedRows.has(row.id))
        : sortedData;

    const csv = convertToCSV(
      selectedData,
      config.columns.filter((col) => visibleColumns.has(col.key))
    );
    downloadCSV(csv, `${config.model}-export.csv`);
  };

  const visibleColumnConfigs = config.columns
    .filter((col) => !col.hidden && col.render !== "form")
    .filter((col) => visibleColumns.has(col.key));

  const frozenColumns = visibleColumnConfigs.filter((col) => col.frozen);
  const regularColumns = visibleColumnConfigs.filter((col) => !col.frozen);

  return (
    <div className="space-y-4">
      {config.enableSearch && (
        <TableToolbar
          inputId={searchInputId}
          searchValue={searchValue}
          onSearchChange={onSearchChange ?? (() => {})}
          searchPlaceholder={config.searchPlaceholder}
          columns={config.columns}
          visibleColumns={visibleColumns}
          onColumnVisibilityChange={handleColumnVisibilityChange}
          selectedCount={selectedRows.size}
          bulkActions={config.bulkActions}
          onBulkAction={handleBulkAction}
          onAdd={onAdd}
          enableExport={config.enableExport}
          onExport={handleExport}
          enableImport={enableImport}
          onImport={onImport}
        />
      )}

      <div className="rounded-md border">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                {config.enableSelection && (
                  <TableHead className="w-12">
                    {config.enableMultiSelection && (
                      <Checkbox
                        checked={
                          paginatedData.length > 0 &&
                          paginatedData.every((row) => selectedRows.has(row.id))
                        }
                        onCheckedChange={handleSelectAll}
                      />
                    )}
                  </TableHead>
                )}

                {frozenColumns.map((column) => (
                  <TableHead
                    key={column.key}
                    style={{ width: column.width }}
                    className={cn(
                      "sticky left-0 z-10 bg-background",
                      column.align === "center" && "text-center",
                      column.align === "right" && "text-right"
                    )}
                  >
                    {column.sortable ? (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="-ml-3 h-8"
                        onClick={() => handleSort(column.key)}
                      >
                        {column.title}
                        <ArrowUpDown className="ml-2 h-4 w-4" />
                      </Button>
                    ) : (
                      column.title
                    )}
                  </TableHead>
                ))}

                {regularColumns.map((column) => (
                  <TableHead
                    key={column.key}
                    style={{ width: column.width }}
                    className={cn(
                      column.align === "center" && "text-center",
                      column.align === "right" && "text-right"
                    )}
                  >
                    {column.sortable ? (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="-ml-3 h-8"
                        onClick={() => handleSort(column.key)}
                      >
                        {column.title}
                        <ArrowUpDown className="ml-2 h-4 w-4" />
                      </Button>
                    ) : (
                      column.title
                    )}
                  </TableHead>
                ))}

                {config.rowActions && config.rowActions.length > 0 && (
                  <TableHead className="w-12" />
                )}
              </TableRow>
            </TableHeader>

            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell
                    colSpan={
                      visibleColumnConfigs.length +
                      (config.enableSelection ? 1 : 0) +
                      (config.rowActions?.length ? 1 : 0)
                    }
                    className="h-24 text-center"
                  >
                    Loading...
                  </TableCell>
                </TableRow>
              ) : paginatedData.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={
                      visibleColumnConfigs.length +
                      (config.enableSelection ? 1 : 0) +
                      (config.rowActions?.length ? 1 : 0)
                    }
                    className="h-24 text-center"
                  >
                    No results found.
                  </TableCell>
                </TableRow>
              ) : (
                paginatedData.map((row) => (
                  <TableRow key={row.id}>
                    {config.enableSelection && (
                      <TableCell>
                        <Checkbox
                          checked={selectedRows.has(row.id)}
                          onCheckedChange={(checked) =>
                            handleSelectRow(row.id, checked as boolean)
                          }
                        />
                      </TableCell>
                    )}

                    {frozenColumns.map((column) => (
                      <TableCell
                        key={column.key}
                        className={cn(
                          "sticky left-0 z-10 bg-background",
                          column.align === "center" && "text-center",
                          column.align === "right" && "text-right"
                        )}
                      >
                        <CellRenderer
                          column={column}
                          value={row[column.key]}
                          row={row}
                        />
                      </TableCell>
                    ))}

                    {regularColumns.map((column) => (
                      <TableCell
                        key={column.key}
                        className={cn(
                          column.align === "center" && "text-center",
                          column.align === "right" && "text-right"
                        )}
                      >
                        <CellRenderer
                          column={column}
                          value={row[column.key]}
                          row={row}
                        />
                      </TableCell>
                    ))}

                    {config.rowActions && config.rowActions.length > 0 && (
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {config.rowActions.map((action) => (
                              <DropdownMenuItem
                                key={action.id}
                                onClick={() => handleRowAction(action, row)}
                                className={cn(
                                  action.variant === "destructive" &&
                                    "text-destructive focus:text-destructive"
                                )}
                              >
                                {action.icon === "eye" && (
                                  <Eye className="mr-2 h-4 w-4" />
                                )}
                                {action.icon === "pencil" && (
                                  <Pencil className="mr-2 h-4 w-4" />
                                )}
                                {action.icon === "trash" && (
                                  <Trash2 className="mr-2 h-4 w-4" />
                                )}
                                {action.label}
                              </DropdownMenuItem>
                            ))}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    )}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {config.enablePagination && sortedData.length > 0 && (
        <TablePagination
          currentPage={currentPage}
          totalPages={totalPages}
          pageSize={pageSize}
          totalItems={sortedData.length}
          onPageChange={(page) => {
            setCurrentPage(page);
            onPageChange(page);
          }}
          onPageSizeChange={(size) => {
            setPageSize(size);
            setCurrentPage(1);
            onPageChange(1);
          }}
        />
      )}
    </div>
  );
}

function convertToCSV(data: any[], columns: any[]): string {
  const headers = columns.map((col) => col.title).join(",");
  const rows = data.map((row) =>
    columns
      .map((col) => {
        const value = row[col.key];
        return `"${String(value ?? "").replace(/"/g, '""')}"`;
      })
      .join(",")
  );
  return [headers, ...rows].join("\n");
}

function downloadCSV(csv: string, filename: string) {
  const blob = new Blob([csv], { type: "text/csv" });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  window.URL.revokeObjectURL(url);
}
