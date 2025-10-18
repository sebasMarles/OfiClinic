"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { GenericTable } from "@/components/generic-table/generic-table";
import { DynamicForm } from "@/components/generic-table/dynamic-form";
import type {
  TableConfig,
  ColumnConfig,
  RowAction as RowActionCfg,
  BulkAction as BulkActionCfg,
} from "@/types/table-config";
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
  bulkActions?: string[];
  rowActions?: string[];
};

type KeyItem = {
  key: string;
  baseType: "String" | "Number" | "Boolean" | "DateTime";
  required: boolean;
};
type KeysResp = { model: string; keys: KeyItem[] };

type Detail = {
  key: string;
  type: string;
  title: string;
  sortable?: boolean;
  filterable?: boolean;
  frozen?: boolean;
  required?: boolean;
  hidden?: boolean;
  hideable?: boolean;
  render?: "grid" | "form" | "grid-form" | null;
  listOptions?: string | null;
};
type DetailsResp = { model: string; details: Detail[] };

type Row = Record<string, any> & { id: string };

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
  }));
}

export default function ManageModelClient({ model }: { model: string }) {
  const qc = useQueryClient();

  // state sólo para el buscador controlado del toolbar
  const [search, setSearch] = useState("");

  // CONFIG (meta/keys/details) via React Query
  const metaQ = useQuery<Meta>({
    queryKey: ["crud", "meta", model],
    queryFn: async () => {
      const r = await fetch(`/api/config-crud/${model}/meta`, {
        cache: "no-store",
      });
      if (!r.ok) throw new Error("meta_failed");
      return r.json();
    },
  });

  const keysQ = useQuery<KeysResp>({
    queryKey: ["crud", "keys", model],
    queryFn: async () => {
      const r = await fetch(`/api/config-crud/${model}/keys`, {
        cache: "no-store",
      });
      if (!r.ok) throw new Error("keys_failed");
      return r.json();
    },
  });

  const detailsQ = useQuery<DetailsResp>({
    queryKey: ["crud", "details", model],
    queryFn: async () => {
      const r = await fetch(`/api/config-crud/${model}/details`, {
        cache: "no-store",
      });
      if (!r.ok) throw new Error("details_failed");
      return r.json();
    },
  });

  // DATA via React Query (modo client-side: traemos un bloque razonable)
  const rowsQ = useQuery<{ data: Row[] }>({
    queryKey: ["crud", model, { take: 500 }],
    queryFn: async () => {
      const r = await fetch(`/api/crud/${model}?take=500`, {
        cache: "no-store",
      });
      if (!r.ok) throw new Error("list_failed");
      return r.json();
    },
  });

  // Mutations
  const createMut = useMutation({
    mutationFn: async (data: any) => {
      const r = await fetch(`/api/crud/${model}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!r.ok) throw new Error("create_failed");
      return r.json();
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["crud", model] }),
  });

  const updateMut = useMutation({
    mutationFn: async (payload: { id: string; data: any }) => {
      const r = await fetch(`/api/crud/${model}/${payload.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload.data),
      });
      if (!r.ok) throw new Error("update_failed");
      return r.json();
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["crud", model] }),
  });

  const deleteMut = useMutation({
    mutationFn: async (id: string) => {
      const r = await fetch(`/api/crud/${model}/${id}`, { method: "DELETE" });
      if (!r.ok) throw new Error("delete_failed");
      return r.json();
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["crud", model] }),
  });

  // Form
  const [openForm, setOpenForm] = useState(false);
  const [editRecord, setEditRecord] = useState<Row | null>(null);

  // Construir config tabla
  const tableConfig: TableConfig | null = useMemo(() => {
    if (!metaQ.data || !keysQ.data || !detailsQ.data) return null;

    // merge keys + details para asegurar 1:1
    const map = new Map<string, Detail>();
    (detailsQ.data.details || []).forEach((dd) => map.set(dd.key, dd));
    const merged: Detail[] = (keysQ.data.keys || []).map(
      (kk) => map.get(kk.key) ?? defaultDetailFor(kk)
    );

    const cols = detailsToColumns(merged);
    const actions = mapMetaToActions(metaQ.data);

    return {
      model: model.toLowerCase(),
      title: metaQ.data.title || model,
      description: undefined,
      columns: cols,
      rowActions: actions.row,
      bulkActions: actions.bulk,
      enableSelection: metaQ.data.enableSelection ?? true,
      enableMultiSelection: metaQ.data.enableMultiSelection ?? true,
      enablePagination: metaQ.data.enablePagination ?? true,
      pageSize: metaQ.data.pageSize ?? 10,
      enableSearch: metaQ.data.enableSearch ?? true,
      searchPlaceholder: metaQ.data.searchPlaceHolder ?? "Search...",
      enableFilters: metaQ.data.enableFilters ?? true,
      enableExport: metaQ.data.enableExport ?? true,
    };
  }, [metaQ.data, keysQ.data, detailsQ.data, model]);

  // Handlers
  const handleRowAction = async (action: string, row: Row) => {
    if (action === "edit") {
      setEditRecord(row);
      setOpenForm(true);
      return;
    }
    if (action === "delete") {
      if (!confirm("¿Eliminar este registro?")) return;
      await deleteMut.mutateAsync(row.id);
      return;
    }
    if (action === "view") {
      alert(JSON.stringify(row, null, 2));
      return;
    }
  };

  const handleBulkAction = async (actionId: string, selectedRows: Row[]) => {
    if (actionId === "delete") {
      if (!confirm("¿Eliminar registros seleccionados?")) return;
      await Promise.all(selectedRows.map((r) => deleteMut.mutateAsync(r.id)));
      return;
    }
    // export lo maneja GenericTable
  };

  const handleAdd = () => {
    setEditRecord(null);
    setOpenForm(true);
  };

  const handleSubmitForm = async (data: any) => {
    if (editRecord) {
      await updateMut.mutateAsync({ id: editRecord.id, data });
    } else {
      await createMut.mutateAsync(data);
    }
  };

  if (metaQ.isLoading || keysQ.isLoading || detailsQ.isLoading) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Cargando configuración…
      </div>
    );
  }

  if (!tableConfig || rowsQ.isLoading) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Cargando datos…
      </div>
    );
  }

  const rows = Array.isArray(rowsQ.data?.data) ? rowsQ.data!.data : [];

  return (
    <div className="space-y-4">
      <GenericTable
        config={tableConfig}
        data={rows}
        isLoading={rowsQ.isLoading}
        onRowAction={handleRowAction}
        onBulkAction={handleBulkAction}
        onAdd={handleAdd}
        onPageChange={() => {}}
        onSortChange={() => {}}
        searchValue={search}
        onSearchChange={setSearch}
      />

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
