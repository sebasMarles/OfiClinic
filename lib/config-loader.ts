// lib/config-loader.ts
import fs from "fs";
import path from "path";
import type { TableConfig } from "@/types/table-config";

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

function adaptToTableConfig(seed: any): TableConfig {
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

export async function getTableConfig(
  modelName: string
): Promise<TableConfig | null> {
  const slug = (modelName || "").trim();
  const seed = readModelJson(slug);
  if (seed) return adaptToTableConfig(seed);
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
