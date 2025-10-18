// components/config-crud/editor/hooks.ts
"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { Meta, KeysResp, DetailsResp, Detail } from "./types";

export function useMeta(model: string) {
  return useQuery<Meta>({
    queryKey: ["cc", "meta", model],
    queryFn: async () => {
      const r = await fetch(`/api/config-crud/${model}/meta`, {
        cache: "no-store",
      });
      if (!r.ok) throw new Error("meta_failed");
      return r.json();
    },
  });
}

export function useKeys(model: string) {
  return useQuery<KeysResp>({
    queryKey: ["cc", "keys", model],
    queryFn: async () => {
      const r = await fetch(`/api/config-crud/${model}/keys`, {
        cache: "no-store",
      });
      if (!r.ok) throw new Error("keys_failed");
      return r.json();
    },
  });
}

export function useDetails(model: string) {
  return useQuery<DetailsResp>({
    queryKey: ["cc", "details", model],
    queryFn: async () => {
      const r = await fetch(`/api/config-crud/${model}/details`, {
        cache: "no-store",
      });
      if (!r.ok) throw new Error("details_failed");
      return r.json();
    },
  });
}

export function useSaveMeta(model: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: Meta) => {
      const r = await fetch(`/api/config-crud/${model}/meta`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!r.ok) throw new Error("save_meta_failed");
      return r.json();
    },
    onSuccess: (saved) => {
      qc.setQueryData(["cc", "meta", model], saved);
    },
  });
}

export function useSaveDetail(model: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { key: string; data: Partial<Detail> }) => {
      const r = await fetch(`/api/config-crud/${model}/details`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!r.ok) throw new Error("save_detail_failed");
      return r.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["cc", "details", model] });
    },
  });
}
