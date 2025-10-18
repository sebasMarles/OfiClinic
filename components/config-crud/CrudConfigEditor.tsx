// components/config-crud/CrudConfigEditor.tsx
"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";

import MetaHeader from "./editor/MetaHeader";
import KeysList from "./editor/KeyList";
import KeyDetail from "./editor/KeyDetail";

import {
  useMeta,
  useKeys,
  useDetails,
  useSaveMeta,
  useSaveDetail,
} from "./editor/hooks";
import {
  defaultDetailFor,
  UI_TYPES_BY_BASE,
  type Meta,
  type Detail,
} from "./editor/types";

export default function CrudConfigEditor({ model }: { model: string }) {
  // Data fetching
  const metaQ = useMeta(model);
  const keysQ = useKeys(model);
  const detailsQ = useDetails(model);

  // Local state
  const [metaDraft, setMetaDraft] = useState<Meta | null>(null);
  const [selectedKey, setSelectedKey] = useState<string>("");
  const [detailDraft, setDetailDraft] = useState<Detail | null>(null);

  // Mutations
  const saveMeta = useSaveMeta(model);
  const saveDetail = useSaveDetail(model);

  // hydrate meta draft
  useEffect(() => {
    if (metaQ.data) setMetaDraft(metaQ.data);
  }, [metaQ.data]);

  // pick first key by default
  useEffect(() => {
    if (keysQ.data?.keys?.length && !selectedKey) {
      setSelectedKey(keysQ.data.keys[0].key);
    }
  }, [keysQ.data, selectedKey]);

  // hydrate detail when selected key changes
  useEffect(() => {
    if (!selectedKey) return;
    const d = detailsQ.data?.details?.find((x) => x.key === selectedKey);
    if (d) {
      setDetailDraft(d);
    } else {
      const k = keysQ.data?.keys?.find((x) => x.key === selectedKey);
      if (k) setDetailDraft(defaultDetailFor(k));
    }
  }, [selectedKey, detailsQ.data, keysQ.data]);

  if (metaQ.isLoading || keysQ.isLoading || detailsQ.isLoading)
    return <div>Cargando…</div>;
  if (
    metaQ.isError ||
    keysQ.isError ||
    detailsQ.isError ||
    !metaDraft ||
    !keysQ.data
  )
    return <div>Error cargando.</div>;

  const allowedTypes = (() => {
    const k = keysQ.data.keys.find((x) => x.key === selectedKey);
    return k ? UI_TYPES_BY_BASE[k.baseType] : [];
  })();

  return (
    <div className="space-y-6">
      {/* Cabecera / meta */}
      <MetaHeader
        meta={metaDraft}
        onChange={setMetaDraft}
        onSave={() =>
          saveMeta.mutate(metaDraft!, {
            onSuccess: () => toast.success("Meta guardada"),
            onError: () => toast.error("No se pudo guardar meta"),
          })
        }
        saving={saveMeta.isPending}
      />

      {/* Layout 2 paneles */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <KeysList
          keys={keysQ.data.keys}
          selectedKey={selectedKey}
          onSelect={setSelectedKey}
        />

        <KeyDetail
          detail={detailDraft}
          allowedTypes={allowedTypes}
          onChange={setDetailDraft}
          onSave={() => {
            if (!detailDraft) return;
            saveDetail.mutate(
              {
                key: detailDraft.key,
                data: {
                  type: detailDraft.type,
                  title: detailDraft.title,
                  sortable: !!detailDraft.sortable,
                  filterable: !!detailDraft.filterable,
                  frozen: !!detailDraft.frozen,
                  required: !!detailDraft.required,
                  hidden: !!detailDraft.hidden,
                  hideable: !!detailDraft.hideable,
                  render: detailDraft.render ?? "grid-form",
                  listOptions: detailDraft.listOptions ?? null,
                },
              },
              {
                onSuccess: () => toast.success("Detalle guardado"),
                onError: () => toast.error("No se pudo guardar el detalle"),
              }
            );
          }}
          saving={saveDetail.isPending}
        />
      </div>
    </div>
  );
}
