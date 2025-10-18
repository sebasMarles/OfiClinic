// components/config-crud/CrudConfigEditor.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
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

function shallowEqual(a: any, b: any) {
  try {
    return JSON.stringify(a) === JSON.stringify(b);
  } catch {
    return false;
  }
}

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

  // Hydrate meta draft
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

  // ----- Unsaved changes guard (beforeunload) -----
  const originalMeta = metaQ.data;
  const originalDetail = useMemo(
    () => detailsQ.data?.details?.find((x) => x.key === selectedKey) || null,
    [detailsQ.data, selectedKey]
  );

  const isDirty = useMemo(() => {
    const metaChanged = !!(
      originalMeta &&
      metaDraft &&
      !shallowEqual(originalMeta, metaDraft)
    );
    const detailChanged = !!(
      originalDetail &&
      detailDraft &&
      !shallowEqual(originalDetail, detailDraft)
    );
    // si detailDraft existe pero no existe en DB (nuevo) y no igual al default => también dirty
    const newDetailDirty =
      detailDraft &&
      !originalDetail &&
      !!keysQ.data?.keys?.find((k) => k.key === selectedKey) &&
      !shallowEqual(
        detailDraft,
        defaultDetailFor(keysQ.data!.keys!.find((k) => k.key === selectedKey)!)
      );

    return metaChanged || detailChanged || !!newDetailDirty;
  }, [
    originalMeta,
    metaDraft,
    originalDetail,
    detailDraft,
    keysQ.data,
    selectedKey,
  ]);

  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (isDirty) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [isDirty]);

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
                  unique: !!detailDraft.unique,
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
