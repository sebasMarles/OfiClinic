"use client";

import { useEffect, useMemo, useState } from "react";
import { GenericTable } from "@/components/generic-table/generic-table";
import { DynamicForm } from "@/components/generic-table/dynamic-form";
import type {
  TableConfig,
  ColumnConfig,
  RowAction as RowActionCfg,
  BulkAction as BulkActionCfg,
} from "@/types/table-config";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

type Meta = {
  model: string;
  title: string;
  enableSelection?: boolean;
  enableMultiSelection?: boolean;
  enablePagination?: boolean;
  pageSize?: number;
  enableSearch?: boolean;
  searchPlaceHolder?: string;
  enableFilters?: boolean;
  enableExport?: boolean;
  relations?: string[];
  bulkActions?: string[]; // ["delete","export"]
  rowActions?: string[]; // ["edit","delete"]
};

type KeyItem = {
  key: string;
  baseType: "String" | "Number" | "Boolean" | "DateTime";
  required: boolean;
};
type KeysResp = { model: string; keys: KeyItem[] };

type Detail = {
  key: string;
  type: string; // text|textarea|email|number|currency|boolean|date|select|badge
  title: string;
  sortable?: boolean;
  filterable?: boolean;
  frozen?: boolean;
  required?: boolean;
  hidden?: boolean;
  hideable?: boolean;
  render?: "grid" | "form" | "grid-form" | null;
  listOptions?: string | null; // CSV
  unique?: boolean;
};
type DetailsResp = { model: string; details: Detail[] };

type Row = Record<string, any> & { id: string };

// helpers
const UI_TYPES_BY_BASE: Record<KeyItem["baseType"], string[]> = {
  String: ["text", "textarea", "email", "select", "badge"],
  Number: ["number", "currency"],
  DateTime: ["date"],
  Boolean: ["boolean"],
};

function defaultDetailFor(k: KeyItem): Detail {
  const allowed = UI_TYPES_BY_BASE[k.baseType];
  return {
    key: k.key,
    type: allowed[0],
    title: k.key.charAt(0).toUpperCase() + k.key.slice(1),
    sortable: true,
    filterable: true,
    frozen: false,
    required: !!k.required,
    hidden: false,
    hideable: false,
    render: "grid-form",
    listOptions: null,
    unique: false,
  };
}

function mapMetaToActions(meta?: Meta) {
  const row: RowActionCfg[] = (
    meta?.rowActions?.length ? meta.rowActions : ["edit", "delete"]
  ).map((id) => {
    if (id === "edit")
      return {
        id: "edit",
        label: "Editar",
        action: "edit",
        icon: "pencil",
        variant: "ghost" as const,
      };
    if (id === "delete")
      return {
        id: "delete",
        label: "Eliminar",
        action: "delete",
        icon: "trash",
        variant: "destructive" as const,
        confirmMessage: "¿Eliminar este registro?",
      };
    if (id === "view")
      return {
        id: "view",
        label: "Ver",
        action: "view",
        icon: "eye",
        variant: "ghost" as const,
      };
    // por defecto: acción genérica
    return { id, label: id, action: id as any, variant: "outline" as const };
  });

  const bulk: BulkActionCfg[] = (
    meta?.bulkActions?.length ? meta.bulkActions : ["delete"]
  ).map((id) => {
    if (id === "delete")
      return {
        id: "delete",
        label: "Eliminar seleccionados",
        action: "delete",
        icon: "trash",
        variant: "destructive",
        confirmMessage: "¿Eliminar registros seleccionados?",
      };
    if (id === "export")
      return {
        id: "export",
        label: "Exportar CSV",
        action: "export",
        icon: "download",
        variant: "outline",
      };
    return { id, label: id, action: id as any, variant: "outline" };
  });

  return { row, bulk };
}

function detailsToColumns(details: Detail[]): ColumnConfig[] {
  return details.map((d) => ({
    key: d.key,
    title: d.title,
    type: d.type as ColumnConfig["type"],
    sortable: !!d.sortable,
    filterable: !!d.filterable,
    frozen: !!d.frozen,
    required: !!d.required,
    hidden: !!d.hidden,
    hideable: !!d.hideable,
    render: (d.render ?? "grid-form") as any,
    options: d.listOptions
      ? d.listOptions
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean)
      : undefined,
    unique: !!d.unique,
  }));
}

export default function ManageModelClient({ model }: { model: string }) {
  // config
  const [meta, setMeta] = useState<Meta | null>(null);
  const [details, setDetails] = useState<Detail[]>([]);
  const [loadingCfg, setLoadingCfg] = useState(true);

  // datos
  const [rows, setRows] = useState<Row[]>([]);
  const [loadingRows, setLoadingRows] = useState(true);

  // búsqueda controlada
  const [search, setSearch] = useState("");

  // forms
  const [openForm, setOpenForm] = useState(false);
  const [editRecord, setEditRecord] = useState<Row | null>(null);

  // id del input para atajos ('/')
  const searchInputId = `table-search-${model.toLowerCase()}`;

  // cargar configuración (meta + keys + details)
  useEffect(() => {
    (async () => {
      setLoadingCfg(true);
      try {
        const [m, k, d] = await Promise.all([
          fetch(`/api/config-crud/${model}/meta`, { cache: "no-store" }),
          fetch(`/api/config-crud/${model}/keys`, { cache: "no-store" }),
          fetch(`/api/config-crud/${model}/details`, { cache: "no-store" }),
        ]);
        const metaJ: Meta = await m.json();
        const keysJ: KeysResp = await k.json();
        const detJ: DetailsResp = await d.json();

        // merge keys + details guardados para asegurar 1:1
        const map = new Map<string, Detail>();
        (detJ.details || []).forEach((dd) => map.set(dd.key, dd));
        const merged: Detail[] = (keysJ.keys || []).map(
          (kk) => map.get(kk.key) ?? defaultDetailFor(kk)
        );

        setMeta(metaJ);
        setDetails(merged);
      } catch (e) {
        console.error("load config failed", e);
        setMeta(null);
        setDetails([]);
      } finally {
        setLoadingCfg(false);
      }
    })();
  }, [model]);

  // cargar datos
  async function loadRows() {
    setLoadingRows(true);
    try {
      const r = await fetch(`/api/crud/${model}?take=500`, {
        cache: "no-store",
      });
      const j = await r.json();
      setRows(Array.isArray(j?.data) ? j.data : []);
    } catch (e) {
      console.error("load rows failed", e);
      setRows([]);
    } finally {
      setLoadingRows(false);
    }
  }
  useEffect(() => {
    loadRows();
  }, [model]);

  // config para GenericTable
  const tableConfig: TableConfig | null = useMemo(() => {
    if (!meta) return null;
    const cols = detailsToColumns(details);
    const actions = mapMetaToActions(meta);

    return {
      model: model.toLowerCase(),
      title: meta.title || model,
      description: undefined,
      columns: cols,
      rowActions: actions.row,
      bulkActions: actions.bulk,
      enableSelection: meta.enableSelection ?? true,
      enableMultiSelection: meta.enableMultiSelection ?? true,
      enablePagination: meta.enablePagination ?? true,
      pageSize: meta.pageSize ?? 10,
      enableSearch: meta.enableSearch ?? true,
      searchPlaceholder: meta.searchPlaceHolder ?? "Search...",
      enableFilters: meta.enableFilters ?? true,
      enableExport: meta.enableExport ?? true,
    };
  }, [meta, details, model]);

  // handlers tabla
  const handleRowAction = async (action: string, row: Row) => {
    if (action === "edit") {
      setEditRecord(row);
      setOpenForm(true);
      return;
    }
    if (action === "delete") {
      if (!confirm("¿Eliminar este registro?")) return;
      await fetch(`/api/crud/${model}/${row.id}`, { method: "DELETE" });
      await loadRows();
      return;
    }
    if (action === "view") {
      alert(JSON.stringify(row, null, 2));
      return;
    }
  };

  const handleBulkAction = async (actionId: string, selectedRows: Row[]) => {
    if (actionId === "delete") {
      for (const r of selectedRows) {
        await fetch(`/api/crud/${model}/${r.id}`, { method: "DELETE" });
      }
      await loadRows();
      return;
    }
    // "export" lo maneja GenericTable con onExport, no llega aquí
  };

  const handleAdd = () => {
    setEditRecord(null);
    setOpenForm(true);
  };

  // IMPORT CSV
  const handleImport = async (rows: Record<string, any>[]) => {
    for (const row of rows) {
      try {
        await fetch(`/api/crud/${model}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(row),
        });
      } catch (e) {
        console.error("import failed row:", row, e);
      }
    }
    await loadRows();
  };

  // submit del formulario (create / update)
  const handleSubmitForm = async (data: any) => {
    if (editRecord) {
      const res = await fetch(`/api/crud/${model}/${editRecord.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (res.status === 409) {
        const j = await res.json().catch(() => ({} as any));
        alert(j?.error || "Conflicto de unicidad");
        return;
      }
    } else {
      const res = await fetch(`/api/crud/${model}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (res.status === 409) {
        const j = await res.json().catch(() => ({} as any));
        alert(j?.error || "Conflicto de unicidad");
        return;
      }
    }
    await loadRows();
  };

  // ---- Atajos de teclado: '/', 'n', 'Escape' ----
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      // Si el foco está en un input/textarea, evita algunos atajos
      const tag = (e.target as HTMLElement)?.tagName?.toLowerCase();
      const inEditable =
        tag === "input" ||
        tag === "textarea" ||
        (e.target as HTMLElement)?.isContentEditable;

      if (e.key === "/" && !inEditable) {
        e.preventDefault();
        const elt = document.getElementById(
          searchInputId
        ) as HTMLInputElement | null;
        elt?.focus();
      }

      if (e.key.toLowerCase() === "n" && !inEditable) {
        e.preventDefault();
        handleAdd();
      }

      if (e.key === "Escape" && openForm) {
        setOpenForm(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [openForm, searchInputId]);

  if (loadingCfg || !tableConfig) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Cargando configuración…
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <GenericTable
        config={tableConfig}
        data={rows}
        isLoading={loadingRows}
        onRowAction={handleRowAction}
        onBulkAction={handleBulkAction}
        onAdd={handleAdd}
        onPageChange={() => {}}
        onSortChange={() => {}}
        searchValue={search}
        onSearchChange={setSearch}
        searchInputId={searchInputId}
        enableImport={true}
        onImport={handleImport}
      />

      {/* Formulario (create / edit) */}
      <DynamicForm
        open={openForm}
        onOpenChange={setOpenForm}
        columns={tableConfig.columns}
        initialData={editRecord || undefined}
        onSubmit={handleSubmitForm}
        title={editRecord ? `Editar ${model}` : `Nuevo ${model}`}
        description={tableConfig.title}
        modelSlug={tableConfig.model}
      />
    </div>
  );
}
