// lib/config-loader.ts
import fs from "fs";
import path from "path";
import type { TableConfig, ColumnConfig } from "@/types/table-config";
import { prisma } from "@/lib/prisma";

const ROOT = process.cwd();
const CRUD_DIR = path.join(ROOT, "config/crud");
const MODELS_DIR = path.join(ROOT, "config/models");
const CRUD_TABLE_FILE = path.join(CRUD_DIR, "crudTable.json");

function candidatesFor(model: string) {
  return [
    path.join(MODELS_DIR, `${model}.json`),
    path.join(MODELS_DIR, `${model.toLowerCase()}.json`),
    path.join(MODELS_DIR, `${model.toLowerCase()}s.json`),
  ];
}

function readModelJson(model: string): any | null {
  for (const f of candidatesFor(model)) {
    try {
      const raw = fs.readFileSync(f, "utf-8");
      return JSON.parse(raw);
    } catch {}
  }
  return null;
}

function detailsToColumns(details: any[]): ColumnConfig[] {
  return (details || []).map((d) => ({
    key: d.key,
    title: d.title || d.key,
    type: d.type || "text",
    sortable: d.sortable ?? true,
    filterable: d.filterable ?? true,
    frozen: d.frozen ?? false,
    required: d.required ?? false,
    hidden: d.hidden ?? false,
    hideable: d.hideable ?? false,
    render: d.render ?? "grid-form",
    options: d.listOptions
      ? String(d.listOptions)
          .split(",")
          .map((s: string) => s.trim())
          .filter(Boolean)
      : undefined,
    unique: d.unique ?? false, // importante
  }));
}

function adaptSeedToTableConfig(seed: any): TableConfig {
  return {
    model: seed.model,
    title: seed.title || seed.model,
    description: seed.description || undefined,
    columns: seed.columns || [],
    rowActions: seed.rowActions || [],
    bulkActions: seed.bulkActions || [],
    enableSelection: true,
    enableMultiSelection: true,
    enablePagination: true,
    pageSize: 20,
    enableSearch: true,
    enableFilters: true,
    enableExport: true,
  };
}

/**
 * 1) Intenta construir TableConfig desde DB (ConfigCrud + Details).
 * 2) Si no hay, intenta desde JSON en config/models.
 * 3) Si tampoco, devuelve null.
 */
export async function getTableConfig(
  modelName: string
): Promise<TableConfig | null> {
  const slug = (modelName || "").trim();
  if (!slug) return null;

  // 1) DB
  const cfg = await prisma.configCrud.findUnique({
    where: { model: slug },
    include: { details: true },
  });
  if (cfg) {
    const columns = detailsToColumns(cfg.details || []);
    return {
      model: cfg.model,
      title: cfg.title || cfg.model,
      description: undefined,
      columns,
      rowActions: [],
      bulkActions: [],
      enableSelection: cfg.enableSelection ?? true,
      enableMultiSelection: cfg.enableMultiSelection ?? true,
      enablePagination: cfg.enablePagination ?? true,
      pageSize: cfg.pageSize ?? 20,
      enableSearch: cfg.enableSearch ?? true,
      searchPlaceholder: cfg.searchPlaceHolder ?? "Search...",
      enableFilters: cfg.enableFilters ?? true,
      enableExport: cfg.enableExport ?? true,
    };
  }

  // 2) Fallback JSON
  const seed = readModelJson(slug);
  if (seed) return adaptSeedToTableConfig(seed);

  // 3) Nada
  return null;
}

export async function getAvailableModels(): Promise<string[]> {
  try {
    const raw = fs.readFileSync(CRUD_TABLE_FILE, "utf-8");
    const json = JSON.parse(raw);
    return Array.isArray(json?.models)
      ? json.models.map((m: any) => m.name)
      : [];
  } catch {
    return [];
  }
}
