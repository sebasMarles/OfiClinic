// components/config-crud/editor/types.ts

export type Meta = {
  id?: string;
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

export type KeyItem = {
  key: string;
  baseType: "String" | "Number" | "Boolean" | "DateTime";
  required: boolean;
};
export type KeysResp = { model: string; keys: KeyItem[] };

export type Detail = {
  id?: string;
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
  unique?: boolean; // NUEVO
};
export type DetailsResp = { model: string; details: Detail[] };

export const UI_TYPES_BY_BASE: Record<KeyItem["baseType"], string[]> = {
  String: ["text", "textarea", "email", "select", "badge"],
  Number: ["number", "currency"],
  DateTime: ["date"],
  Boolean: ["boolean"],
};

export function defaultDetailFor(key: KeyItem): Detail {
  const allowed = UI_TYPES_BY_BASE[key.baseType];
  return {
    key: key.key,
    type: allowed[0],
    title: key.key.charAt(0).toUpperCase() + key.key.slice(1),
    sortable: true,
    filterable: true,
    frozen: false,
    required: !!key.required,
    hidden: false,
    hideable: false,
    render: "grid-form",
    listOptions: null,
    unique: false,
  };
}
